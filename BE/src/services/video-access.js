const pool = require('../config/db');

/*
 * Nhật ký xem video — bằng chứng phía server khi bài giảng bị quay / chụp màn hình rồi phát tán.
 * Watermark trên video hiện ID người xem + thời điểm; admin đối chiếu với bảng video_access_logs.
 * Không chặn được việc chụp màn hình (trình duyệt không cho biết khi người dùng chụp) — đây là truy vết.
 */

const THROTTLE_MINUTES = 10;

/**
 * Ghi một lần cấp quyền phát video. Bỏ qua nếu cùng người + bài + nguồn + IP đã được ghi trong 10 phút
 * (tua, tải lại trang, hls.js tự phục hồi…). IP khác → dòng mới (dấu hiệu dùng chung tài khoản).
 * Không bao giờ ném lỗi: ghi log thất bại không được làm hỏng việc phát video.
 */
async function logVideoAccess({ userId, lessonId, courseId, source, ip, userAgent }) {
  if (!userId || !lessonId || !courseId) return;
  const ua = userAgent ? String(userAgent).slice(0, 255) : null;
  const addr = ip ? String(ip).slice(0, 45) : null;
  try {
    await pool.query(
      `INSERT INTO video_access_logs (user_id, lesson_id, course_id, source, ip, user_agent)
       SELECT ?, ?, ?, ?, ?, ? FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM video_access_logs
         WHERE user_id = ? AND lesson_id = ? AND source = ? AND ip <=> ?
           AND created_at > NOW() - INTERVAL ? MINUTE
       )`,
      [userId, lessonId, courseId, source, addr, ua, userId, lessonId, source, addr, THROTTLE_MINUTES],
    );
  } catch (err) {
    console.error('[video-access/log]', err.message);
  }
}

/** Ghi từ một request Express đã qua authMiddleware + requireEnrollment. */
const logFromRequest = (req, { lessonId, source }) => logVideoAccess({
  userId: req.user?.id,
  lessonId,
  courseId: req.lessonCourseId,
  source,
  ip: req.ip,
  userAgent: req.get('user-agent'),
});

module.exports = { logVideoAccess, logFromRequest, THROTTLE_MINUTES };
