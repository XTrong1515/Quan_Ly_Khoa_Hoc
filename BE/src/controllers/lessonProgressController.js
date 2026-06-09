const pool = require('../config/db');

/* ── PUT /api/lesson-progress/:lessonId ─────────────────────── */
async function updateProgress(req, res) {
  const userId = req.user.id;
  const lessonId = parseInt(req.params.lessonId, 10);
  const { lastWatchedSeconds = 0 } = req.body;

  try {
    const [rows] = await pool.query(
      `SELECT e.id FROM enrollments e
       JOIN lessons l ON l.course_id = e.course_id
       WHERE e.user_id = ? AND l.id = ?
       LIMIT 1`,
      [userId, lessonId],
    );
    if (!rows.length) return res.status(403).json({ message: 'Chưa đăng ký khóa học' });

    const enrollmentId = rows[0].id;
    await pool.query(
      `INSERT INTO lesson_progress (enrollment_id, lesson_id, last_watched_seconds, is_completed)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
         last_watched_seconds = VALUES(last_watched_seconds),
         updated_at = NOW()`,
      [enrollmentId, lessonId, Math.floor(lastWatchedSeconds)],
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('[lesson-progress/update]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/lesson-progress/:lessonId/complete ────────────── */
async function markComplete(req, res) {
  const userId = req.user.id;
  const lessonId = parseInt(req.params.lessonId, 10);

  try {
    const [enrollRows] = await pool.query(
      `SELECT e.id, e.course_id FROM enrollments e
       JOIN lessons l ON l.course_id = e.course_id
       WHERE e.user_id = ? AND l.id = ?
       LIMIT 1`,
      [userId, lessonId],
    );
    if (!enrollRows.length) return res.status(403).json({ message: 'Chưa đăng ký khóa học' });

    const { id: enrollmentId, course_id: courseId } = enrollRows[0];

    await pool.query(
      `INSERT INTO lesson_progress (enrollment_id, lesson_id, is_completed, completed_at)
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE
         is_completed = 1,
         completed_at = COALESCE(completed_at, NOW()),
         updated_at   = NOW()`,
      [enrollmentId, lessonId],
    );

    // Recalculate enrollment progress
    const [countRows] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM lessons WHERE course_id = ?) AS total,
         (SELECT COUNT(*) FROM lesson_progress lp
          WHERE lp.enrollment_id = ? AND lp.is_completed = 1) AS completed`,
      [courseId, enrollmentId],
    );

    const { total, completed } = countRows[0];
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (progressPercent === 100) {
      await pool.query(
        `UPDATE enrollments SET progress_percent = ?, completed_at = NOW() WHERE id = ?`,
        [progressPercent, enrollmentId],
      );
    } else {
      await pool.query(
        `UPDATE enrollments SET progress_percent = ? WHERE id = ?`,
        [progressPercent, enrollmentId],
      );
    }

    return res.json({ ok: true, progressPercent });
  } catch (err) {
    console.error('[lesson-progress/complete]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { updateProgress, markComplete };
