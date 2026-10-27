const pool = require('../config/db');
const storage = require('../utils/storage');
const hls = require('../services/video/hls');

/*
 * Upload video / tài liệu của bài học lên object storage (dùng cho cả admin và giảng viên).
 * Route đã qua requireOwnership('lesson') → req.course = { courseId, ownerId, status }.
 *
 * Luồng: (1) POST /lessons/:id/uploads → presigned PUT
 *        (2) trình duyệt PUT file thẳng lên storage
 *        (3) PUT /lessons/:id/media → server kiểm tra object thật rồi gắn vào bài học
 */
const COLUMNS = {
  video:      { key: 'video_key' },
  attachment: { key: 'attachment_key', name: 'attachment_name' },
};

function storageGuard(res) {
  if (storage.isConfigured()) return false;
  res.status(503).json({ message: 'Chưa cấu hình object storage (S3_*)' });
  return true;
}

/* ── POST /lessons/:id/uploads  { kind, contentType, size } ───── */
async function createUpload(req, res) {
  if (storageGuard(res)) return;
  const { kind, contentType } = req.body ?? {};
  const size = Number(req.body?.size);
  const rule = storage.MEDIA_RULES[kind];

  if (!rule) return res.status(400).json({ message: 'kind phải là "video" hoặc "attachment"' });
  if (!rule.types[contentType]) {
    return res.status(400).json({ message: `Định dạng không hỗ trợ. Cho phép: ${Object.keys(rule.types).join(', ')}` });
  }
  if (!Number.isFinite(size) || size <= 0 || size > rule.maxBytes) {
    return res.status(400).json({ message: `Dung lượng tối đa ${Math.round(rule.maxBytes / 1024 / 1024)} MB` });
  }

  try {
    const key = storage.buildKey(req.course.courseId, parseInt(req.params.id, 10), kind, contentType);
    const uploadUrl = await storage.presignUpload(key, contentType);
    return res.status(201).json({ key, uploadUrl, method: 'PUT', headers: { 'Content-Type': contentType }, expiresIn: storage.UPLOAD_URL_TTL });
  } catch (err) {
    console.error('[media/upload]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── PUT /lessons/:id/media  { kind, key, filename? } ─────────── */
async function attachMedia(req, res) {
  if (storageGuard(res)) return;
  const lessonId = parseInt(req.params.id, 10);
  const { kind, key } = req.body ?? {};
  const rule = storage.MEDIA_RULES[kind];
  if (!rule || typeof key !== 'string') return res.status(400).json({ message: 'Thiếu kind hoặc key' });

  // Key phải nằm trong thư mục của chính bài học này — không cho trỏ sang file của bài/khóa khác
  if (!key.startsWith(storage.lessonPrefix(req.course.courseId, lessonId, kind)) || key.includes('..')) {
    return res.status(400).json({ message: 'Key không thuộc bài học này' });
  }

  try {
    const head = await storage.headObject(key);
    if (!head) return res.status(400).json({ message: 'Chưa tìm thấy file trên storage — upload chưa hoàn tất?' });
    if (head.size > rule.maxBytes || !rule.types[head.contentType]) {
      await storage.deleteObject(key);
      return res.status(400).json({ message: 'File không hợp lệ (sai định dạng hoặc quá dung lượng) — đã xóa' });
    }

    const cols = COLUMNS[kind];
    const [[current]] = await pool.query(`SELECT ${cols.key} AS oldKey FROM lessons WHERE id = ?`, [lessonId]);
    const filename = typeof req.body.filename === 'string' ? req.body.filename.slice(0, 255) : null;
    if (cols.name) {
      await pool.query(`UPDATE lessons SET ${cols.key} = ?, ${cols.name} = ? WHERE id = ?`, [key, filename, lessonId]);
    } else {
      await pool.query(`UPDATE lessons SET ${cols.key} = ? WHERE id = ?`, [key, lessonId]);
    }
    if (current?.oldKey && current.oldKey !== key) await storage.deleteObject(current.oldKey);

    // Video mới → mã hóa HLS ở nền (trong lúc chờ, học viên xem bản MP4 qua link có hạn)
    if (kind === 'video') {
      await pool.query("UPDATE lessons SET hls_status = 'PROCESSING', hls_error = NULL WHERE id = ?", [lessonId]);
      hls.enqueue(lessonId);
    }
    return res.json({ ok: true, key, size: head.size, hlsStatus: kind === 'video' ? 'PROCESSING' : undefined });
  } catch (err) {
    console.error('[media/attach]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── DELETE /lessons/:id/media/:kind ──────────────────────────── */
async function removeMedia(req, res) {
  const lessonId = parseInt(req.params.id, 10);
  const cols = COLUMNS[req.params.kind];
  if (!cols) return res.status(400).json({ message: 'kind không hợp lệ' });

  try {
    const [[current]] = await pool.query(`SELECT ${cols.key} AS oldKey, hls_prefix AS hlsPrefix FROM lessons WHERE id = ?`, [lessonId]);
    const sets = [`${cols.key} = NULL`];
    if (cols.name) sets.push(`${cols.name} = NULL`);
    if (req.params.kind === 'video') sets.push("hls_status = 'NONE'", 'hls_prefix = NULL', 'hls_key = NULL', 'hls_error = NULL');
    await pool.query(`UPDATE lessons SET ${sets.join(', ')} WHERE id = ?`, [lessonId]);
    await storage.deleteObject(current?.oldKey);
    if (req.params.kind === 'video') await storage.deletePrefix(current?.hlsPrefix);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[media/remove]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /lessons/:id/hls — mã hóa lại video (vd lần trước lỗi) ── */
async function reencodeHls(req, res) {
  const lessonId = parseInt(req.params.id, 10);
  try {
    const [[lesson]] = await pool.query('SELECT video_key, hls_status FROM lessons WHERE id = ?', [lessonId]);
    if (!lesson?.video_key) return res.status(400).json({ message: 'Bài học chưa có video trên storage' });
    if (lesson.hls_status === 'PROCESSING') return res.status(409).json({ message: 'Video đang được mã hóa' });
    await pool.query("UPDATE lessons SET hls_status = 'PROCESSING', hls_error = NULL WHERE id = ?", [lessonId]);
    hls.enqueue(lessonId);
    return res.status(202).json({ ok: true, hlsStatus: 'PROCESSING' });
  } catch (err) {
    console.error('[media/hls]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { createUpload, attachMedia, removeMedia, reencodeHls };
