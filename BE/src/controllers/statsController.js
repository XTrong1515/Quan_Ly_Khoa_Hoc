const pool = require('../config/db');

/* ── GET /api/stats (public) ──────────────────────────────────── */
async function platformStats(req, res) {
  try {
    const [[row]] = await pool.query(`
      SELECT
        (SELECT COUNT(*)   FROM users)                                                             AS totalUsers,
        (SELECT COUNT(*)   FROM users   WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))      AS newUsersThisWeek,
        (SELECT COUNT(*)   FROM courses WHERE status = 'PUBLISHED' AND price = 0)                 AS freeCourses,
        (SELECT COUNT(*)   FROM courses WHERE status = 'PUBLISHED')                               AS totalPublishedCourses,
        (SELECT ROUND(AVG(rating), 1) FROM courses WHERE status = 'PUBLISHED' AND rating > 0)     AS avgRating,
        (SELECT COUNT(*)   FROM reviews WHERE status = 'APPROVED')                                AS totalReviews
    `);
    return res.json(row);
  } catch (err) {
    console.error('[stats]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { platformStats };
