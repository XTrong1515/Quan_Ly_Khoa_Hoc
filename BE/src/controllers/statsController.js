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
        -- Điểm TB và số lượt cùng một tập: đánh giá VISIBLE trên khóa PUBLISHED (không dùng courses.rating có thể là số seed)
        (SELECT ROUND(AVG(r.rating), 1) FROM reviews r JOIN courses c ON c.id = r.course_id
          WHERE r.status = 'VISIBLE' AND c.status = 'PUBLISHED')                                AS avgRating,
        (SELECT COUNT(*) FROM reviews r JOIN courses c ON c.id = r.course_id
          WHERE r.status = 'VISIBLE' AND c.status = 'PUBLISHED')                                AS totalReviews
    `);
    return res.json({ ...row, avgRating: row.avgRating != null ? Number(row.avgRating) : 0 });
  } catch (err) {
    console.error('[stats]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { platformStats };
