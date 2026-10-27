/**
 * Video HLS mã hóa AES-128.
 *
 * Sau khi giảng viên upload video (MP4/WebM) lên storage private:
 *   tải về thư mục tạm → ffmpeg cắt thành đoạn .ts ~6 s, mã hóa AES-128 bằng khóa ngẫu nhiên của riêng video
 *   → upload index.m3u8 + seg_*.ts lên storage → lưu khóa (đã mã hóa bằng HLS_MASTER_KEY) vào DB.
 * Khi phát: server viết lại playlist — mỗi đoạn là presigned URL ngắn hạn, khóa giải mã chỉ cấp qua API
 * có kiểm tra quyền (requireEnrollment). Link .ts lộ ra ngoài cũng không xem được nếu không có khóa.
 *
 * Giới hạn (ghi vào báo cáo): khóa vẫn phải giao cho trình duyệt của người có quyền xem → chống tải /
 * chia sẻ link thông thường, KHÔNG chống được người cố tình hay quay màn hình (cần DRM).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const pool = require('../../config/db');
const storage = require('../../utils/storage');

const SEGMENT_SECONDS = 6;
const TIMEOUT_MS = Number(process.env.HLS_TIMEOUT_MS) || 30 * 60_000;
const KEY_URI = 'key'; // tương đối với .../hls/index.m3u8 → .../hls/key

/* ── Khóa: AES-128 cho video, bọc bằng master key AES-256-GCM ──── */
let masterKey;
function getMasterKey() {
  if (masterKey) return masterKey;
  const hex = process.env.HLS_MASTER_KEY;
  if (hex && /^[0-9a-f]{64}$/i.test(hex)) {
    masterKey = Buffer.from(hex, 'hex');
  } else {
    if (process.env.NODE_ENV === 'production') throw new Error('Thiếu HLS_MASTER_KEY (64 ký tự hex) khi chạy production');
    // Dev: suy ra từ JWT secret để không phải cấu hình thêm
    masterKey = Buffer.from(crypto.hkdfSync('sha256', process.env.JWT_ACCESS_SECRET || 'hoisted-dev', 'hoisted', 'hls-master-key', 32));
  }
  return masterKey;
}

function sealKey(key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
  const enc = Buffer.concat([cipher.update(key), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

function openKey(sealed) {
  const buf = Buffer.from(sealed, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getMasterKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]);
}

/* ── Playlist: đoạn → presigned URL, khóa → API ───────────────── */
async function rewritePlaylist(text, prefix, signSegment) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('#EXT-X-KEY')) out.push(line.replace(/URI="[^"]*"/, `URI="${KEY_URI}"`));
    else if (line && !line.startsWith('#')) out.push(await signSegment(`${prefix}${path.basename(line)}`));
    else out.push(line);
  }
  return out.join('\n');
}

/* ── ffmpeg ──────────────────────────────────────────────────────── */
const ffmpegPath = () => process.env.FFMPEG_PATH || require('ffmpeg-static');

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr = (stderr + d).slice(-4000); });
    const timer = setTimeout(() => proc.kill('SIGKILL'), TIMEOUT_MS);
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(stderr.split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 300) || `ffmpeg exit ${code}`));
    });
  });
}

/** Codec của luồng video / audio đầu tiên — đọc từ thông tin `ffmpeg -i` in ra (ffmpeg-static không kèm ffprobe). */
function probeCodecs(input) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath(), ['-hide_banner', '-i', input], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('error', reject);
    proc.on('close', () => resolve({
      video: stderr.match(/Stream #\S+.*?: Video: (\w+)/)?.[1] ?? null,
      audio: stderr.match(/Stream #\S+.*?: Audio: (\w+)/)?.[1] ?? null,
    }));
  });
}

async function encodeToHls(input, outDir, keyInfo) {
  const hlsArgs = [
    '-f', 'hls', '-hls_time', String(SEGMENT_SECONDS), '-hls_playlist_type', 'vod',
    '-hls_key_info_file', keyInfo, '-hls_segment_filename', path.join(outDir, 'seg_%04d.ts'),
    path.join(outDir, 'index.m3u8'),
  ];
  const { video, audio } = await probeCodecs(input);
  if (!video) throw new Error('File không có luồng video');
  // Chỉ chép thẳng khi trình duyệt phát được trong MPEG-TS (H.264 + AAC/MP3) — nhanh, không mất chất lượng.
  // ffmpeg vẫn "chép" được VP9/Opus vào .ts nhưng hls.js không phát được → phải chuyển mã.
  if (video === 'h264' && (!audio || audio === 'aac' || audio === 'mp3')) {
    try {
      await runFfmpeg(['-y', '-i', input, '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', ...hlsArgs]);
      return 'copy';
    } catch {
      for (const f of fs.readdirSync(outDir)) fs.rmSync(path.join(outDir, f));
    }
  }
  await runFfmpeg(['-y', '-i', input, '-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'libx264', '-preset', 'veryfast',
    '-crf', '23', '-pix_fmt', 'yuv420p', '-force_key_frames', `expr:gte(t,n_forced*${SEGMENT_SECONDS})`,
    '-c:a', 'aac', '-b:a', '128k', ...hlsArgs]);
  return 'transcode';
}

/* ── Xử lý 1 bài học ─────────────────────────────────────────────── */
async function processLesson(lessonId) {
  const [[lesson]] = await pool.query('SELECT id, course_id, video_key, hls_prefix FROM lessons WHERE id = ?', [lessonId]);
  if (!lesson) return;
  if (!lesson.video_key) {
    await pool.query("UPDATE lessons SET hls_status = 'NONE', hls_error = NULL WHERE id = ?", [lessonId]);
    return;
  }
  await pool.query("UPDATE lessons SET hls_status = 'PROCESSING', hls_error = NULL WHERE id = ?", [lessonId]);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hoisted-hls-'));
  const outDir = path.join(tmp, 'out');
  fs.mkdirSync(outDir);
  const prefix = `${storage.lessonPrefix(lesson.course_id, lessonId, 'hls')}${crypto.randomUUID()}/`;
  const started = Date.now();
  try {
    const input = path.join(tmp, `input${path.extname(lesson.video_key) || '.mp4'}`);
    await storage.downloadToFile(lesson.video_key, input);

    const key = crypto.randomBytes(16);
    const keyFile = path.join(tmp, 'video.key');
    fs.writeFileSync(keyFile, key);
    const keyInfo = path.join(tmp, 'keyinfo');
    fs.writeFileSync(keyInfo, `${KEY_URI}\n${keyFile}\n${crypto.randomBytes(16).toString('hex')}\n`);

    const mode = await encodeToHls(input, outDir, keyInfo);
    const files = fs.readdirSync(outDir);
    for (const f of files) {
      await storage.putObject(`${prefix}${f}`, fs.readFileSync(path.join(outDir, f)),
        f.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t');
    }

    // Video bị thay trong lúc mã hóa → bỏ kết quả này (bản mới sẽ được mã hóa lại)
    const [upd] = await pool.query(
      "UPDATE lessons SET hls_status = 'READY', hls_prefix = ?, hls_key = ?, hls_error = NULL WHERE id = ? AND video_key = ?",
      [prefix, sealKey(key), lessonId, lesson.video_key],
    );
    if (!upd.affectedRows) { await storage.deletePrefix(prefix); return; }
    if (lesson.hls_prefix && lesson.hls_prefix !== prefix) await storage.deletePrefix(lesson.hls_prefix);
    console.log(`[hls] lesson #${lessonId} READY (${mode}, ${files.length - 1} đoạn, ${Date.now() - started} ms)`);
  } catch (err) {
    console.error(`[hls] lesson #${lessonId} FAILED:`, err.message);
    await storage.deletePrefix(prefix);
    await pool.query("UPDATE lessons SET hls_status = 'FAILED', hls_error = ? WHERE id = ?", [String(err.message).slice(0, 500), lessonId]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* ── Hàng đợi: xử lý tuần tự (ffmpeg tốn CPU) ────────────────────── */
const queue = [];
let running = null;

function enqueue(lessonId) {
  if (process.env.HLS_AUTO === 'false') return; // tắt trong test
  if (!queue.includes(lessonId)) queue.push(lessonId);
  if (!running) running = drain().finally(() => { running = null; });
}

async function drain() {
  while (queue.length) {
    const id = queue.shift();
    try { await processLesson(id); } catch (err) { console.error('[hls/queue]', err.message); }
  }
}

/** Khi server khởi động: video đang mã hóa dở (server tắt giữa chừng) → làm lại. */
async function resumePending() {
  if (process.env.HLS_AUTO === 'false') return;
  const [rows] = await pool.query("SELECT id FROM lessons WHERE hls_status = 'PROCESSING'");
  rows.forEach((r) => enqueue(r.id));
  if (rows.length) console.log(`[hls] tiếp tục mã hóa ${rows.length} video`);
}

const idle = () => running ?? Promise.resolve();

module.exports = { sealKey, openKey, rewritePlaylist, processLesson, enqueue, resumePending, idle, KEY_URI };
