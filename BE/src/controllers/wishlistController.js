const pool = require('../config/db');

/* ── GET /api/wishlists/me ────────────────────────────────────── */
async function getMyWishlist(req, res) {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.slug, c.price, c.original_price,
              c.glyph, c.thumb, c.tag, c.thumbnail_url,
              c.rating, c.review_count, c.student_count,
              c.instructor_name, c.level, c.status,
              w.created_at AS wishlistedAt
       FROM wishlists w
       JOIN courses c ON c.id = w.course_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId],
    );
    return res.json({ courses: rows });
  } catch (err) {
    console.error('[wishlist/get]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/wishlists/me/ids ────────────────────────────────── */
// Lightweight — returns just the course IDs for FE heart-icon state
async function getMyWishlistIds(req, res) {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      'SELECT course_id AS courseId FROM wishlists WHERE user_id = ?',
      [userId],
    );
    return res.json({ courseIds: rows.map(r => r.courseId) });
  } catch (err) {
    console.error('[wishlist/ids]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/wishlists ──────────────────────────────────────── */
async function addToWishlist(req, res) {
  const userId   = req.user.id;
  const courseId = parseInt(req.body.courseId, 10);
  if (!courseId) return res.status(400).json({ message: 'courseId không hợp lệ' });

  try {
    const [[course]] = await pool.query('SELECT id FROM courses WHERE id = ? LIMIT 1', [courseId]);
    if (!course) return res.status(404).json({ message: 'Khóa học không tồn tại' });

    await pool.query(
      'INSERT IGNORE INTO wishlists (user_id, course_id) VALUES (?, ?)',
      [userId, courseId],
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[wishlist/add]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── DELETE /api/wishlists/:courseId ─────────────────────────── */
async function removeFromWishlist(req, res) {
  const userId   = req.user.id;
  const courseId = parseInt(req.params.courseId, 10);

  try {
    await pool.query('DELETE FROM wishlists WHERE user_id = ? AND course_id = ?', [userId, courseId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[wishlist/remove]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { getMyWishlist, getMyWishlistIds, addToWishlist, removeFromWishlist };
