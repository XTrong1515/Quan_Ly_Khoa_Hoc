const pool = require('../config/db');

/* ─────────────────────────────────────────────────────────────────
   UC20 — Dashboard
   ───────────────────────────────────────────────────────────────── */
async function dashboard(req, res) {
  try {
    const [statsRows] = await pool.query(`
      SELECT
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'PAID') AS totalRevenue,
        (SELECT COUNT(*) FROM users)                                               AS totalUsers,
        (SELECT COUNT(*) FROM courses WHERE status != 'ARCHIVED')                 AS totalCourses,
        (SELECT COUNT(*) FROM orders)                                              AS totalOrders
    `);

    const [revenueRows] = await pool.query(`
      SELECT DATE_FORMAT(paid_at, '%Y-%m-%d') AS date,
             CAST(SUM(total_amount) AS DECIMAL(14,2)) AS revenue
      FROM orders
      WHERE status = 'PAID'
        AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
      GROUP BY DATE_FORMAT(paid_at, '%Y-%m-%d')
      ORDER BY date ASC
    `);

    const [topCourses] = await pool.query(`
      SELECT c.title, c.student_count AS students,
             CAST(COALESCE(SUM(CASE WHEN o.status='PAID' THEN oi.price ELSE 0 END), 0) AS DECIMAL(14,2)) AS revenue
      FROM courses c
      LEFT JOIN order_items oi ON oi.course_id = c.id
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE c.status = 'PUBLISHED'
      GROUP BY c.id
      ORDER BY c.student_count DESC
      LIMIT 5
    `);

    const [recentOrders] = await pool.query(`
      SELECT o.id, o.order_code, o.total_amount, o.status, o.created_at,
             u.full_name AS userName, u.email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    return res.json({ stats: statsRows[0], revenueChart: revenueRows, topCourses, recentOrders });
  } catch (err) {
    console.error('[admin/dashboard]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ─────────────────────────────────────────────────────────────────
   UC21 — Course CRUD
   ───────────────────────────────────────────────────────────────── */
async function adminListCourses(req, res) {
  const { search = '', status = '', sort = 'newest', page = 1, limit = 15 } = req.query;
  const p      = Math.max(1, parseInt(page, 10));
  const lim    = Math.min(50, Math.max(10, parseInt(limit, 10)));
  const offset = (p - 1) * lim;

  const wheres = []; const params = [];
  if (search.trim()) {
    wheres.push('(c.title LIKE ? OR c.instructor_name LIKE ?)');
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  if (status) { wheres.push('c.status = ?'); params.push(status.toUpperCase()); }

  const where   = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
  const orderBy = { newest: 'c.created_at DESC', oldest: 'c.created_at ASC', students: 'c.student_count DESC' }[sort] ?? 'c.created_at DESC';

  try {
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id ${where}`, params);
    const [rows]      = await pool.query(
      `SELECT c.id, c.title, c.slug, c.price, c.level, c.status,
              c.student_count, c.total_lessons, c.rating, c.instructor_name,
              cat.name AS category, cat.id AS categoryId
       FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id
       ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, lim, offset],
    );
    return res.json({ courses: rows, total: countRows[0].total, page: p, totalPages: Math.ceil(countRows[0].total / lim) });
  } catch (err) {
    console.error('[admin/courses/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminGetCourse(req, res) {
  const id = parseInt(req.params.id, 10);
  try {
    const [rows] = await pool.query(
      `SELECT c.*, cat.name AS category FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id WHERE c.id = ?`,
      [id],
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy' });
    return res.json({ course: rows[0] });
  } catch (err) {
    console.error('[admin/courses/get]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminCreateCourse(req, res) {
  const {
    title, slug, shortDescription, description,
    price = 0, originalPrice, level = 'BEGINNER',
    categoryId, instructorName, glyph, thumb = 'yellow', tag,
    whatYouLearn, requirements, status = 'DRAFT',
    thumbnailUrl,
  } = req.body;

  if (!title || !slug || !categoryId) {
    return res.status(400).json({ message: 'Thiếu: title, slug, categoryId' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO courses
         (title, slug, short_description, description, price, original_price, level,
          category_id, instructor_name, glyph, thumb, tag, thumbnail_url,
          what_you_learn, requirements, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [title, slug, shortDescription ?? null, description ?? null,
       price, originalPrice ?? null, level, categoryId, instructorName ?? null,
       glyph ?? null, thumb, tag ?? null, thumbnailUrl ?? null,
       whatYouLearn ? JSON.stringify(whatYouLearn) : null,
       requirements ? JSON.stringify(requirements) : null,
       status],
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Slug đã tồn tại' });
    console.error('[admin/courses/create]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminUpdateCourse(req, res) {
  const id = parseInt(req.params.id, 10);
  const fields = [
    ['title','title'],['slug','slug'],['short_description','shortDescription'],
    ['description','description'],['price','price'],['original_price','originalPrice'],
    ['level','level'],['category_id','categoryId'],['instructor_name','instructorName'],
    ['glyph','glyph'],['thumb','thumb'],['tag','tag'],['status','status'],
    ['thumbnail_url','thumbnailUrl'],
  ];
  const updates = []; const params = [];
  for (const [col, key] of fields) {
    if (req.body[key] !== undefined) { updates.push(`${col} = ?`); params.push(req.body[key]); }
  }
  if (req.body.whatYouLearn !== undefined) { updates.push('what_you_learn = ?'); params.push(JSON.stringify(req.body.whatYouLearn)); }
  if (req.body.requirements  !== undefined) { updates.push('requirements = ?');   params.push(JSON.stringify(req.body.requirements)); }

  if (!updates.length) return res.status(400).json({ message: 'Không có gì để cập nhật' });

  try {
    params.push(id);
    await pool.query(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, params);
    return res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Slug đã tồn tại' });
    console.error('[admin/courses/update]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminDeleteCourse(req, res) {
  const id = parseInt(req.params.id, 10);
  try {
    const [enrollRows] = await pool.query('SELECT id FROM enrollments WHERE course_id = ? LIMIT 1', [id]);
    if (enrollRows.length) return res.status(409).json({ message: 'Không thể xóa: khóa học đã có học viên đăng ký' });
    await pool.query("UPDATE courses SET status = 'ARCHIVED' WHERE id = ?", [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin/courses/delete]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ─────────────────────────────────────────────────────────────────
   UC22 — Lesson CRUD
   ───────────────────────────────────────────────────────────────── */
async function _updateCourseTotals(courseId) {
  await pool.query(
    `UPDATE courses
     SET total_lessons          = (SELECT COUNT(*)               FROM lessons WHERE course_id = ?),
         total_duration_minutes = (SELECT COALESCE(SUM(duration_minutes),0) FROM lessons WHERE course_id = ?)
     WHERE id = ?`,
    [courseId, courseId, courseId],
  );
}

async function adminListLessons(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  try {
    const [sections] = await pool.query(
      'SELECT id, title, order_index FROM course_sections WHERE course_id = ? ORDER BY order_index ASC',
      [courseId],
    );
    const [lessons] = await pool.query(
      `SELECT l.id, l.title, l.duration_minutes, l.order_index, l.is_preview,
              l.video_url, l.attachment_url, l.section_id,
              cs.title AS sectionTitle
       FROM lessons l
       LEFT JOIN course_sections cs ON cs.id = l.section_id
       WHERE l.course_id = ? ORDER BY l.order_index ASC`,
      [courseId],
    );
    return res.json({ lessons, sections });
  } catch (err) {
    console.error('[admin/lessons/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminCreateLesson(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  const { title, videoUrl, content, durationMinutes = 0, sectionId, isPreview = false, attachmentUrl } = req.body;
  if (!title) return res.status(400).json({ message: 'Tên bài học là bắt buộc' });

  try {
    const [maxRows] = await pool.query(
      'SELECT COALESCE(MAX(order_index), 0) + 1 AS next FROM lessons WHERE course_id = ?', [courseId],
    );
    const [result] = await pool.query(
      `INSERT INTO lessons (course_id, section_id, title, video_url, content, duration_minutes, order_index, is_preview, attachment_url)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [courseId, sectionId ?? null, title, videoUrl ?? null, content ?? null,
       durationMinutes, maxRows[0].next, isPreview ? 1 : 0, attachmentUrl ?? null],
    );
    await _updateCourseTotals(courseId);
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('[admin/lessons/create]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminUpdateLesson(req, res) {
  const lessonId = parseInt(req.params.id, 10);
  const fields = [
    ['title','title'],['video_url','videoUrl'],['content','content'],
    ['duration_minutes','durationMinutes'],['section_id','sectionId'],['attachment_url','attachmentUrl'],
  ];
  const updates = []; const params = [];
  for (const [col, key] of fields) {
    if (req.body[key] !== undefined) { updates.push(`${col} = ?`); params.push(req.body[key]); }
  }
  if (req.body.isPreview !== undefined) { updates.push('is_preview = ?'); params.push(req.body.isPreview ? 1 : 0); }

  if (!updates.length) return res.status(400).json({ message: 'Không có gì để cập nhật' });

  try {
    params.push(lessonId);
    await pool.query(`UPDATE lessons SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT course_id FROM lessons WHERE id = ?', [lessonId]);
    if (rows.length) await _updateCourseTotals(rows[0].course_id);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin/lessons/update]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminReorderLessons(req, res) {
  const items = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Danh sách không hợp lệ' });
  try {
    await Promise.all(items.map(({ id, order_index }) =>
      pool.query('UPDATE lessons SET order_index = ? WHERE id = ?', [order_index, id]),
    ));
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin/lessons/reorder]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminDeleteLesson(req, res) {
  const lessonId = parseInt(req.params.id, 10);
  try {
    const [rows] = await pool.query('SELECT course_id FROM lessons WHERE id = ?', [lessonId]);
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy' });
    await pool.query('DELETE FROM lessons WHERE id = ?', [lessonId]);
    await _updateCourseTotals(rows[0].course_id);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin/lessons/delete]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ─────────────────────────────────────────────────────────────────
   UC23 — Category CRUD
   ───────────────────────────────────────────────────────────────── */
async function adminListCategories(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.slug, c.description, c.icon, c.color,
              COUNT(co.id) AS courseCount
       FROM categories c
       LEFT JOIN courses co ON co.category_id = c.id AND co.status != 'ARCHIVED'
       GROUP BY c.id ORDER BY c.name ASC`,
    );
    return res.json({ categories: rows });
  } catch (err) {
    console.error('[admin/categories/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminCreateCategory(req, res) {
  const { name, slug, description, icon, color } = req.body;
  if (!name || !slug) return res.status(400).json({ message: 'Tên và slug là bắt buộc' });
  try {
    const [result] = await pool.query(
      'INSERT INTO categories (name, slug, description, icon, color) VALUES (?,?,?,?,?)',
      [name, slug, description ?? null, icon ?? null, color ?? null],
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Slug đã tồn tại' });
    console.error('[admin/categories/create]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminUpdateCategory(req, res) {
  const id = parseInt(req.params.id, 10);
  const { name, slug, description, icon, color } = req.body;
  if (!name || !slug) return res.status(400).json({ message: 'Tên và slug là bắt buộc' });
  try {
    await pool.query(
      'UPDATE categories SET name=?, slug=?, description=?, icon=?, color=? WHERE id=?',
      [name, slug, description ?? null, icon ?? null, color ?? null, id],
    );
    return res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Slug đã tồn tại' });
    console.error('[admin/categories/update]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminDeleteCategory(req, res) {
  const id = parseInt(req.params.id, 10);
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM courses WHERE category_id = ? AND status != 'ARCHIVED'", [id],
    );
    if (rows[0].cnt > 0) return res.status(409).json({ message: 'Không thể xóa: danh mục đang có khóa học' });
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin/categories/delete]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ─────────────────────────────────────────────────────────────────
   UC24 — User management
   ───────────────────────────────────────────────────────────────── */
async function adminListUsers(req, res) {
  const { search = '', role = '', status = '', page = 1, limit = 20 } = req.query;
  const p = Math.max(1, parseInt(page, 10));
  const lim = Math.min(50, Math.max(10, parseInt(limit, 10)));
  const offset = (p - 1) * lim;

  const wheres = []; const params = [];
  if (search.trim()) { wheres.push('(u.email LIKE ? OR u.full_name LIKE ?)'); params.push(`%${search.trim()}%`, `%${search.trim()}%`); }
  if (role)   { wheres.push('u.role = ?');   params.push(role.toUpperCase()); }
  if (status) { wheres.push('u.status = ?'); params.push(status.toUpperCase()); }
  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

  try {
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${where}`, params);
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.status, u.created_at,
              (SELECT COUNT(*) FROM enrollments WHERE user_id = u.id) AS enrollments,
              (SELECT COUNT(*) FROM orders WHERE user_id = u.id AND status = 'PAID') AS paidOrders
       FROM users u ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, lim, offset],
    );
    return res.json({ users: rows, total: countRows[0].total, page: p, totalPages: Math.ceil(countRows[0].total / lim) });
  } catch (err) {
    console.error('[admin/users/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminUpdateUserStatus(req, res) {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  if (!['ACTIVE','LOCKED'].includes(status)) return res.status(400).json({ message: 'Status không hợp lệ' });
  if (id === req.user.id) return res.status(400).json({ message: 'Không thể tự khóa tài khoản của mình' });
  try {
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin/users/status]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ─────────────────────────────────────────────────────────────────
   UC25 — Order management
   ───────────────────────────────────────────────────────────────── */
async function adminListOrders(req, res) {
  const { search = '', status = '', page = 1, limit = 15, dateFrom, dateTo } = req.query;
  const p = Math.max(1, parseInt(page, 10));
  const lim = Math.min(50, Math.max(10, parseInt(limit, 10)));
  const offset = (p - 1) * lim;

  const wheres = []; const params = [];
  if (search.trim()) { wheres.push('(o.order_code LIKE ? OR u.email LIKE ?)'); params.push(`%${search.trim()}%`, `%${search.trim()}%`); }
  if (status)   { wheres.push('o.status = ?'); params.push(status.toUpperCase()); }
  if (dateFrom) { wheres.push('o.created_at >= ?'); params.push(dateFrom); }
  if (dateTo)   { wheres.push('o.created_at <= ?'); params.push(`${dateTo} 23:59:59`); }
  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

  try {
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM orders o JOIN users u ON u.id = o.user_id ${where}`, params,
    );
    const [rows] = await pool.query(
      `SELECT o.id, o.order_code, o.total_amount, o.status, o.payment_method,
              o.transaction_id, o.created_at, o.paid_at,
              u.full_name AS userName, u.email
       FROM orders o JOIN users u ON u.id = o.user_id
       ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, lim, offset],
    );
    return res.json({ orders: rows, total: countRows[0].total, page: p, totalPages: Math.ceil(countRows[0].total / lim) });
  } catch (err) {
    console.error('[admin/orders/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminGetOrder(req, res) {
  const id = parseInt(req.params.id, 10);
  try {
    const [orderRows] = await pool.query(
      `SELECT o.*, u.full_name AS userName, u.email
       FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`, [id],
    );
    if (!orderRows.length) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    const [items] = await pool.query(
      `SELECT oi.*, c.slug AS courseSlug FROM order_items oi
       LEFT JOIN courses c ON c.id = oi.course_id WHERE oi.order_id = ?`, [id],
    );
    return res.json({ order: orderRows[0], items });
  } catch (err) {
    console.error('[admin/orders/detail]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminCancelOrder(req, res) {
  const id = parseInt(req.params.id, 10);
  try {
    const [orderRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orderRows.length) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    const order = orderRows[0];

    await pool.query("UPDATE orders SET status = 'CANCELLED' WHERE id = ?", [id]);

    if (order.status === 'PAID') {
      const [items] = await pool.query('SELECT course_id FROM order_items WHERE order_id = ?', [id]);
      for (const item of items) {
        await pool.query(
          'DELETE FROM enrollments WHERE user_id = ? AND course_id = ? AND order_id = ?',
          [order.user_id, item.course_id, id],
        );
        await pool.query(
          'UPDATE courses SET student_count = GREATEST(0, student_count - 1) WHERE id = ?',
          [item.course_id],
        );
      }
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin/orders/cancel]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ─────────────────────────────────────────────────────────────────
   UC26 — Review moderation
   ───────────────────────────────────────────────────────────────── */
async function adminListReviews(req, res) {
  const { status = '', page = 1, limit = 15, type = 'course' } = req.query;
  const p = Math.max(1, parseInt(page, 10));
  const lim = Math.min(50, Math.max(10, parseInt(limit, 10)));
  const offset = (p - 1) * lim;

  const wheres = []; const params = [];
  if (status) { wheres.push('r.status = ?'); params.push(status.toUpperCase()); }
  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

  try {
    let countRows, rows;
    if (type === 'site') {
      [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM site_reviews r ${where}`, params);
      [rows] = await pool.query(
        `SELECT r.id, r.rating, r.comment, r.status, r.created_at,
                u.full_name AS userName, u.email, NULL AS courseTitle, NULL AS courseSlug, 'site' AS type
         FROM site_reviews r JOIN users u ON u.id = r.user_id
         ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
        [...params, lim, offset],
      );
    } else {
      [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM reviews r ${where}`, params);
      [rows] = await pool.query(
        `SELECT r.id, r.rating, r.comment, r.status, r.created_at,
                u.full_name AS userName, u.email,
                c.title AS courseTitle, c.slug AS courseSlug, 'course' AS type
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         JOIN courses c ON c.id = r.course_id
         ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
        [...params, lim, offset],
      );
    }
    return res.json({ reviews: rows, total: countRows[0].total, page: p, totalPages: Math.ceil(countRows[0].total / lim) });
  } catch (err) {
    console.error('[admin/reviews/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

async function adminUpdateReviewStatus(req, res) {
  const id = parseInt(req.params.id, 10);
  const { status, type = 'course' } = req.body;
  if (!['VISIBLE','HIDDEN'].includes(status)) return res.status(400).json({ message: 'Status không hợp lệ' });

  try {
    const table = type === 'site' ? 'site_reviews' : 'reviews';
    await pool.query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id]);

    if (type === 'course') {
      const [rows] = await pool.query('SELECT course_id FROM reviews WHERE id = ?', [id]);
      if (rows.length) {
        const cId = rows[0].course_id;
        await pool.query(
          `UPDATE courses
           SET rating       = COALESCE((SELECT ROUND(AVG(rating),2) FROM reviews WHERE course_id=? AND status='VISIBLE'), 0),
               review_count = (SELECT COUNT(*) FROM reviews WHERE course_id=? AND status='VISIBLE')
           WHERE id = ?`,
          [cId, cId, cId],
        );
      }
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin/reviews/status]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = {
  dashboard,
  adminListCourses, adminGetCourse, adminCreateCourse, adminUpdateCourse, adminDeleteCourse,
  adminListLessons, adminCreateLesson, adminUpdateLesson, adminReorderLessons, adminDeleteLesson,
  adminListCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
  adminListUsers, adminUpdateUserStatus,
  adminListOrders, adminGetOrder, adminCancelOrder,
  adminListReviews, adminUpdateReviewStatus,
};
