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

module.exports = { myEnrollments };
