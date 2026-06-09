const pool = require('../config/db');

/* ── GET /api/enrollments/me ─────────────────────────────────── */
async function myEnrollments(req, res) {
  const userId = req.user.id;
  const { status } = req.query; // 'in_progress' | 'completed'

  let condition = '';
  if (status === 'completed')  condition = 'AND e.progress_percent = 100';
  else if (status === 'in_progress') condition = 'AND e.progress_percent < 100';

  try {
    const [rows] = await pool.query(
      `SELECT
         e.id, e.progress_percent, e.enrolled_at, e.completed_at,
         c.id AS courseId, c.title, c.slug, c.thumbnail_url, c.glyph, c.thumb,
         c.instructor_name, c.total_lessons, c.total_duration_minutes,
         (SELECT l.id
          FROM lessons l
          LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = e.id
          WHERE l.course_id = c.id
            AND (lp.is_completed IS NULL OR lp.is_completed = 0)
          ORDER BY l.order_index ASC
          LIMIT 1
         ) AS nextLessonId
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ? ${condition}
       ORDER BY e.enrolled_at DESC`,
      [userId],
    );

    return res.json({ enrollments: rows });
  } catch (err) {
    console.error('[enrollments/me]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/enrollments/me/course-ids ──────────────────────── */
// Lightweight endpoint used by the cart page to check owned courses
async function myEnrolledCourseIds(req, res) {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      'SELECT course_id AS courseId FROM enrollments WHERE user_id = ?',
      [userId],
    );
    return res.json({ courseIds: rows.map((r) => r.courseId) });
  } catch (err) {
    console.error('[enrollments/me/course-ids]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/enrollments ───────────────────────────────────── */
// Direct enrollment for free courses (price = 0) — skips the order/payment flow
async function enrollFree(req, res) {
  const userId   = req.user.id;
  const courseId = parseInt(req.body.courseId, 10);

  if (!courseId || courseId <= 0) {
    return res.status(400).json({ message: 'courseId không hợp lệ' });
  }

  try {
    const [courseRows] = await pool.query(
      "SELECT id, price FROM courses WHERE id = ? AND status = 'PUBLISHED'",
      [courseId],
    );
    if (!courseRows.length) {
      return res.status(404).json({ message: 'Không tìm thấy khóa học' });
    }
    if (parseFloat(courseRows[0].price) > 0) {
      return res.status(400).json({ message: 'Khóa học này không miễn phí. Vui lòng thanh toán để đăng ký.' });
    }

    // Idempotent — return success if already enrolled
    const [existing] = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1',
      [userId, courseId],
    );
    if (existing.length) {
      return res.json({ enrollmentId: existing[0].id, alreadyEnrolled: true });
    }

    const [result] = await pool.query(
      'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)',
      [userId, courseId],
    );

    return res.status(201).json({ enrollmentId: result.insertId });
  } catch (err) {
    console.error('[enrollments/enrollFree]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { myEnrollments, myEnrolledCourseIds, enrollFree };
