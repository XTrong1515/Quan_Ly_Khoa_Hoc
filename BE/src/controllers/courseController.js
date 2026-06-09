const pool = require('../config/db');

const COURSE_COLS = `
  co.id, co.title, co.slug, co.short_description,
  co.glyph, co.thumb, co.price, co.original_price AS originalPrice,
  co.level, ROUND(co.total_duration_minutes / 60.0, 1) AS hours, co.total_lessons AS lessons,
  co.rating, co.review_count, co.student_count AS students,
  co.tag, co.instructor_name AS instructor, co.created_at,
  cat.name AS category, cat.slug AS categorySlug
`;

/* ── GET /api/courses ─────────────────────────────────────────── */
async function list(req, res) {
  const {
    search = '', category = '', level = '',
    minPrice, maxPrice, minRating,
    sort = 'newest',
    page = 1, limit = 12,
  } = req.query;

  const p   = Math.max(1, parseInt(page, 10));
  const lim = Math.min(50, Math.max(10, parseInt(limit, 10)));
  const offset = (p - 1) * lim;

  const wheres = ["co.status = 'PUBLISHED'"];
  const params = [];

  if (search.trim()) {
    wheres.push('(co.title LIKE ? OR co.short_description LIKE ?)');
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  if (category) {
    const cats = category.split(',').filter(Boolean);
    if (cats.length) {
      wheres.push(`cat.slug IN (${cats.map(() => '?').join(',')})`);
      params.push(...cats);
    }
  }
  if (level) {
    const levels = level.split(',').filter(Boolean).map((l) => l.toUpperCase());
    if (levels.length) {
      wheres.push(`co.level IN (${levels.map(() => '?').join(',')})`);
      params.push(...levels);
    }
  }
  if (minPrice !== undefined) { wheres.push('co.price >= ?'); params.push(Number(minPrice)); }
  if (maxPrice !== undefined) { wheres.push('co.price <= ?'); params.push(Number(maxPrice)); }
  if (minRating !== undefined) { wheres.push('co.rating >= ?'); params.push(Number(minRating)); }

  const ORDER_MAP = {
    newest:      'co.created_at DESC',
    bestselling: 'co.student_count DESC',
    price_asc:   'co.price ASC',
    price_desc:  'co.price DESC',
    rating:      'co.rating DESC',
  };
  const orderBy = ORDER_MAP[sort] || 'co.created_at DESC';
  const where   = wheres.join(' AND ');

  try {
    const [[countRows], [rows]] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total
         FROM courses co
         LEFT JOIN categories cat ON cat.id = co.category_id
         WHERE ${where}`,
        params,
      ),
      pool.query(
        `SELECT ${COURSE_COLS}
         FROM courses co
         LEFT JOIN categories cat ON cat.id = co.category_id
         WHERE ${where}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`,
        [...params, lim, offset],
      ),
    ]);

    return res.json({
      courses: rows,
      total: countRows[0].total,
      page: p,
      limit: lim,
      totalPages: Math.ceil(countRows[0].total / lim),
    });
  } catch (err) {
    console.error('[courses/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/courses/cart-items?ids=1,2,3 ───────────────────── */
async function cartItems(req, res) {
  const raw = req.query.ids ?? '';
  const ids = raw.split(',').map(Number).filter((n) => n > 0);
  if (ids.length === 0) return res.json({ courses: [] });

  try {
    const [rows] = await pool.query(
      `SELECT co.id, co.title, co.slug, co.glyph, co.thumb,
              co.price, co.original_price AS originalPrice,
              ROUND(co.total_duration_minutes / 60.0, 1) AS hours,
              co.total_lessons AS lessons,
              co.instructor_name AS instructor, co.rating, co.student_count AS students
       FROM courses co
       WHERE co.id IN (${ids.map(() => '?').join(',')}) AND co.status = 'PUBLISHED'`,
      ids,
    );
    return res.json({ courses: rows });
  } catch (err) {
    console.error('[courses/cartItems]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/courses/:slug ───────────────────────────────────── */
async function detail(req, res) {
  const { slug } = req.params;
  const userId   = req.user?.id ?? null;

  try {
    const [courseRows] = await pool.query(
      `SELECT ${COURSE_COLS}, co.description, co.thumbnail_url
       FROM courses co
       LEFT JOIN categories cat ON cat.id = co.category_id
       WHERE co.slug = ? AND co.status = 'PUBLISHED'`,
      [slug],
    );

    if (!courseRows.length) return res.status(404).json({ message: 'Không tìm thấy khóa học' });
    const course = courseRows[0];

    const [[lessonRows], [reviews]] = await Promise.all([
      pool.query(
        `SELECT l.id, cs.title AS section_title, l.title, l.order_index AS position,
                l.duration_minutes, l.is_preview, l.video_url
         FROM lessons l
         LEFT JOIN course_sections cs ON cs.id = l.section_id
         WHERE l.course_id = ? ORDER BY l.order_index ASC`,
        [course.id],
      ),
      pool.query(
        `SELECT r.id, r.rating, r.comment, r.created_at,
                u.full_name AS userName, u.avatar_url AS userAvatar
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.course_id = ? AND r.status = 'VISIBLE'
         ORDER BY r.created_at DESC LIMIT 10`,
        [course.id],
      ),
    ]);

    let isEnrolled = false;
    if (userId) {
      const [enrollRows] = await pool.query(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
        [userId, course.id],
      );
      isEnrolled = enrollRows.length > 0;
    }

    return res.json({ course, lessons: lessonRows, reviews, isEnrolled });
  } catch (err) {
    console.error('[courses/detail]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { list, cartItems, detail };
