const pool = require('../config/db');
const storage = require('../utils/storage');
const hls = require('../services/video/hls');

/** URL phát video: file trên storage → presigned GET ngắn hạn; nếu không thì link ngoài (YouTube...). */
async function resolveVideo(lesson) {
  if (lesson.video_key) {
    return {
      videoUrl: await storage.presignDownload(lesson.video_key),
      videoSource: 'storage',
      videoExpiresAt: new Date(Date.now() + storage.VIDEO_URL_TTL * 1000).toISOString(),
    };
  }
  return { videoUrl: lesson.video_url, videoSource: lesson.video_url ? 'external' : null, videoExpiresAt: null };
}

/* ── GET /api/lessons/:id/preview ────────────────────────────── */
async function preview(req, res) {
  const lessonId = parseInt(req.params.id, 10);

  try {
    const [rows] = await pool.query(
      `SELECT l.id, l.title, l.duration_minutes, l.video_url, l.video_key, l.is_preview,
              c.title AS courseTitle, c.slug AS courseSlug
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       WHERE l.id = ?`,
      [lessonId],
    );

    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy bài học' });
    if (!rows[0].is_preview) return res.status(403).json({ message: 'Bài học này yêu cầu đăng ký khóa học' });

    const { video_key: _key, ...lesson } = rows[0];
    const video = await resolveVideo(rows[0]);
    return res.json({ lesson: { ...lesson, video_url: video.videoUrl, videoExpiresAt: video.videoExpiresAt } });
  } catch (err) {
    console.error('[lessons/preview]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/lessons/:id ─────────────────────────────────────── */
// requireEnrollment({ allowPreview: true }) middleware runs first:
//   sets req.enrollmentId (null for preview lessons) and req.lessonCourseId
async function detail(req, res) {
  const lessonId     = parseInt(req.params.id, 10);
  const enrollmentId = req.enrollmentId;   // null when is_preview + not enrolled
  const courseId     = req.lessonCourseId;

  try {
    const [lessonRows] = await pool.query(
      `SELECT l.id, l.title, l.video_url, l.video_key, l.hls_status, l.content, l.duration_minutes,
              l.attachment_url, l.attachment_key, l.attachment_name, l.is_preview,
              c.title AS courseTitle, c.slug AS courseSlug
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       WHERE l.id = ?`,
      [lessonId],
    );
    if (!lessonRows.length) return res.status(404).json({ message: 'Không tìm thấy bài học' });
    const lesson = lessonRows[0];

    // Saved playback progress (only if enrolled)
    let progress = { lastWatchedSeconds: 0, isCompleted: false };
    if (enrollmentId) {
      const [progRows] = await pool.query(
        `SELECT last_watched_seconds, is_completed
         FROM lesson_progress
         WHERE enrollment_id = ? AND lesson_id = ?
         LIMIT 1`,
        [enrollmentId, lessonId],
      );
      if (progRows.length) {
        progress = {
          lastWatchedSeconds: progRows[0].last_watched_seconds,
          isCompleted: !!progRows[0].is_completed,
        };
      }
    }

    // Curriculum: all lessons (kể cả bài chưa gán section → nhóm "Bài học khác" ở cuối) + completion flags
    const [sectionRows] = await pool.query(
      `SELECT cs.id AS sectionId, cs.title AS sectionTitle, cs.order_index AS sectionOrder,
              l.id AS lessonId, l.title AS lessonTitle, l.duration_minutes,
              l.order_index, l.is_preview,
              COALESCE(lp.is_completed, 0) AS isCompleted
       FROM lessons l
       LEFT JOIN course_sections cs ON cs.id = l.section_id AND cs.course_id = l.course_id
       LEFT JOIN lesson_progress lp
         ON lp.lesson_id = l.id AND lp.enrollment_id = ?
       WHERE l.course_id = ?
       ORDER BY cs.id IS NULL, cs.order_index ASC, l.order_index ASC, l.id ASC`,
      [enrollmentId ?? 0, courseId],
    );

    const sectionsMap = new Map(); // Map giữ thứ tự chèn (đã ORDER BY) — section null nằm cuối
    for (const row of sectionRows) {
      const key = row.sectionId ?? 'none';
      if (!sectionsMap.has(key)) {
        sectionsMap.set(key, {
          id: row.sectionId,
          title: row.sectionTitle ?? 'Bài học khác',
          order: row.sectionOrder,
          lessons: [],
        });
      }
      sectionsMap.get(key).lessons.push({
        id: row.lessonId,
        title: row.lessonTitle,
        durationMinutes: row.duration_minutes,
        orderIndex: row.order_index,
        isPreview: !!row.is_preview,
        isCompleted: !!row.isCompleted,
      });
    }

    return res.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        ...(await resolveVideo(lesson)),
        // HLS đã mã hóa xong → FE phát qua hls.js; videoUrl (MP4 có hạn) là bản dự phòng cho trình duyệt không hỗ trợ
        hlsUrl: lesson.hls_status === 'READY' ? `/api/lessons/${lesson.id}/hls/index.m3u8` : null,
        hlsStatus: lesson.hls_status,
        content: lesson.content,
        durationMinutes: lesson.duration_minutes,
        hasAttachment: !!(lesson.attachment_key || lesson.attachment_url),
        attachmentName: lesson.attachment_name,
        courseId,
        courseTitle: lesson.courseTitle,
        courseSlug: lesson.courseSlug,
      },
      sections: [...sectionsMap.values()],
      progress,
      enrollmentId,
      staffView: !!req.staffView, // admin / giảng viên sở hữu đang xem — FE không ghi tiến độ
    });
  } catch (err) {
    console.error('[lessons/detail]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/lessons/:id/attachment ─────────────────────────── */
// requireEnrollment() middleware runs first (strict — no preview exception)
async function attachment(req, res) {
  const lessonId = parseInt(req.params.id, 10);

  try {
    const [rows] = await pool.query(
      'SELECT attachment_url, attachment_key, attachment_name FROM lessons WHERE id = ?',
      [lessonId],
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy bài học' });

    const { attachment_url, attachment_key, attachment_name } = rows[0];
    if (attachment_key) {
      const url = await storage.presignDownload(attachment_key, {
        expiresIn: storage.FILE_URL_TTL, filename: attachment_name || 'tai-lieu.pdf', inline: true,
      });
      return res.json({ url, expiresIn: storage.FILE_URL_TTL });
    }
    if (!attachment_url) return res.status(404).json({ message: 'Bài học không có tài liệu đính kèm' });

    return res.json({ url: attachment_url });
  } catch (err) {
    console.error('[lessons/attachment]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/lessons/:id/hls/index.m3u8 ── (requireEnrollment) */
// Viết lại playlist mỗi lần xin: đoạn .ts → presigned URL ngắn hạn, khóa → endpoint có kiểm tra quyền
async function hlsPlaylist(req, res) {
  try {
    const [[lesson]] = await pool.query('SELECT hls_status, hls_prefix FROM lessons WHERE id = ?', [parseInt(req.params.id, 10)]);
    if (lesson?.hls_status !== 'READY') return res.status(404).json({ message: 'Video chưa sẵn sàng dạng HLS' });
    const raw = await storage.getObjectText(`${lesson.hls_prefix}index.m3u8`);
    const body = await hls.rewritePlaylist(raw, lesson.hls_prefix, (key) => storage.presignDownload(key));
    res.set({ 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' });
    return res.send(body);
  } catch (err) {
    console.error('[lessons/hls/playlist]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/lessons/:id/hls/key ── (requireEnrollment) — 16 byte khóa AES-128 */
async function hlsKey(req, res) {
  try {
    const [[lesson]] = await pool.query('SELECT hls_status, hls_key FROM lessons WHERE id = ?', [parseInt(req.params.id, 10)]);
    if (lesson?.hls_status !== 'READY' || !lesson.hls_key) return res.status(404).json({ message: 'Không có khóa' });
    res.set({ 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store, private' });
    return res.send(hls.openKey(lesson.hls_key));
  } catch (err) {
    console.error('[lessons/hls/key]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { preview, detail, attachment, hlsPlaylist, hlsKey };
