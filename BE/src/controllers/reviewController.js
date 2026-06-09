const pool = require('../config/db');

/* ── POST /api/courses/:id/reviews ──────────────────────────── */
async function upsertCourseReview(req, res) {
  const userId  = req.user.id;
  const courseId = parseInt(req.params.id, 10);
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating phải từ 1 đến 5 sao' });
  }
  if (comment && comment.length > 1000) {
    return res.status(400).json({ message: 'Nhận xét tối đa 1000 ký tự' });
  }

  try {
    const [enrollRows] = await pool.query(
      `SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1`,
      [userId, courseId],
    );
    if (!enrollRows.length) {
      return res.status(403).json({ message: 'Chỉ học viên đã đăng ký mới có thể đánh giá' });
    }

    await pool.query(
      `INSERT INTO reviews (user_id, course_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         rating  = VALUES(rating),
         comment = VALUES(comment)`,
      [userId, courseId, rating, comment ?? null],
    );

    // Recalculate course rating
    await pool.query(
      `UPDATE courses
       SET rating       = (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE course_id = ? AND status = 'VISIBLE'),
           review_count = (SELECT COUNT(*)             FROM reviews WHERE course_id = ? AND status = 'VISIBLE')
       WHERE id = ?`,
      [courseId, courseId, courseId],
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('[reviews/upsert]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── DELETE /api/courses/:id/reviews/me ─────────────────────── */
async function deleteCourseReview(req, res) {
  const userId  = req.user.id;
  const courseId = parseInt(req.params.id, 10);

  try {
    await pool.query(
      `DELETE FROM reviews WHERE user_id = ? AND course_id = ?`,
      [userId, courseId],
    );

    await pool.query(
      `UPDATE courses
       SET rating       = COALESCE((SELECT ROUND(AVG(rating), 2) FROM reviews WHERE course_id = ? AND status = 'VISIBLE'), 0),
           review_count = (SELECT COUNT(*) FROM reviews WHERE course_id = ? AND status = 'VISIBLE')
       WHERE id = ?`,
      [courseId, courseId, courseId],
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('[reviews/delete]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/courses/:id/reviews/me ─────────────────────────── */
async function myReview(req, res) {
  const userId  = req.user.id;
  const courseId = parseInt(req.params.id, 10);

  try {
    const [rows] = await pool.query(
      `SELECT id, rating, comment, created_at FROM reviews WHERE user_id = ? AND course_id = ? LIMIT 1`,
      [userId, courseId],
    );
    return res.json({ review: rows[0] ?? null });
  } catch (err) {
    console.error('[reviews/me]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/site-reviews ──────────────────────────────────── */
async function createSiteReview(req, res) {
  const userId = req.user.id;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating phải từ 1 đến 5 sao' });
  }

  try {
    await pool.query(
      `INSERT INTO site_reviews (user_id, rating, comment) VALUES (?, ?, ?)`,
      [userId, rating, comment ?? null],
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[site-reviews/create]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { upsertCourseReview, deleteCourseReview, myReview, createSiteReview };
