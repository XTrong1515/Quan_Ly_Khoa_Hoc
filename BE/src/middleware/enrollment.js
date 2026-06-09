const pool = require('../config/db');

/**
 * Verifies the requesting user is enrolled in the course that owns the lesson.
 *
 * Sets on req:
 *   req.lessonCourseId  — course_id of the lesson
 *   req.enrollmentId    — enrollment row id (null when allowPreview + is_preview lesson)
 *
 * Options:
 *   allowPreview (default false) — let is_preview lessons through without enrollment
 *
 * On 403 the response includes courseSlug so the FE can redirect back to the course page.
 */
function requireEnrollment({ allowPreview = false } = {}) {
  return async function (req, res, next) {
    const lessonId = parseInt(req.params.id, 10);
    const userId   = req.user.id;

    if (!lessonId) return res.status(400).json({ message: 'lessonId không hợp lệ' });

    try {
      const [lessonRows] = await pool.query(
        `SELECT l.course_id, l.is_preview, c.slug AS courseSlug
         FROM lessons l
         JOIN courses c ON c.id = l.course_id
         WHERE l.id = ?`,
        [lessonId],
      );

      if (!lessonRows.length) {
        return res.status(404).json({ message: 'Không tìm thấy bài học' });
      }

      const { course_id, is_preview, courseSlug } = lessonRows[0];

      if (allowPreview && is_preview) {
        req.lessonCourseId = course_id;
        req.enrollmentId   = null;
        return next();
      }

      const [enrollRows] = await pool.query(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1',
        [userId, course_id],
      );

      if (!enrollRows.length) {
        return res.status(403).json({
          message: 'Bạn chưa đăng ký khóa học này',
          courseSlug,
        });
      }

      req.lessonCourseId = course_id;
      req.enrollmentId   = enrollRows[0].id;
      next();
    } catch (err) {
      console.error('[requireEnrollment]', err);
      return res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  };
}

module.exports = { requireEnrollment };
