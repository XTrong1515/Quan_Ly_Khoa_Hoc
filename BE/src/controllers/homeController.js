const pool = require('../config/db');

/* ── GET /api/home ────────────────────────────────────────────── */
async function home(req, res) {
  try {
    const [[categories], [featured], [newest]] = await Promise.all([
      pool.query(`
        SELECT c.id, c.name, c.slug, c.icon, c.color,
               COUNT(co.id) AS count
        FROM categories c
        LEFT JOIN courses co ON co.category_id = c.id AND co.status = 'PUBLISHED'
        GROUP BY c.id
        ORDER BY c.id ASC
      `),
      pool.query(`
        SELECT co.id, co.title, co.slug, co.glyph, co.thumb,
               co.price, co.original_price AS originalPrice,
               co.level,
               ROUND(co.total_duration_minutes / 60.0, 1) AS hours,
               co.total_lessons AS lessons,
               co.rating, co.student_count AS students, co.tag,
               co.instructor_name AS instructor,
               cat.name AS category
        FROM courses co
        LEFT JOIN categories cat ON cat.id = co.category_id
        WHERE co.status = 'PUBLISHED'
        ORDER BY co.student_count DESC
        LIMIT 8
      `),
      pool.query(`
        SELECT co.id, co.title, co.slug, co.glyph, co.thumb,
               co.price, co.original_price AS originalPrice,
               co.level,
               ROUND(co.total_duration_minutes / 60.0, 1) AS hours,
               co.total_lessons AS lessons,
               co.rating, co.student_count AS students, co.tag,
               co.instructor_name AS instructor,
               cat.name AS category
        FROM courses co
        LEFT JOIN categories cat ON cat.id = co.category_id
        WHERE co.status = 'PUBLISHED'
        ORDER BY co.created_at DESC
        LIMIT 4
      `),
    ]);

    return res.json({ categories, featured, newest });
  } catch (err) {
    console.error('[home]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { home };
