const pool = require('../config/db');
const admin = require('./adminController');
const { createNotification } = require('./notificationController');

/*
 * Khu vực Giảng viên. Mọi route đã qua authMiddleware + requireRole('INSTRUCTOR');
 * route có :id đã qua requireOwnership → req.course = { courseId, ownerId, status }.
 * Các thao tác ghi tái sử dụng handler của admin sau khi lọc input.
 */

// Giảng viên không tự đặt các trường này — do admin / quy trình duyệt quyết định
const ADMIN_ONLY_FIELDS = ['status', 'instructorId', 'instructorName', 'tag'];
// Khóa học đã xuất bản: đổi các trường này ảnh hưởng học viên đã mua → khóa lại
const LOCKED_WHEN_PUBLISHED = ['title', 'slug', 'price', 'originalPrice', 'categoryId'];

function stripAdminFields(body) {
  const clean = { ...body };
  for (const key of ADMIN_ONLY_FIELDS) delete clean[key];
  return clean;
}

/* ── GET /api/instructor/dashboard ────────────────────────────── */
async function dashboard(req, res) {
  try {
    const [byStatus] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM courses WHERE instructor_id = ? GROUP BY status', [req.user.id],
    );
    const [[totals]] = await pool.query(
      `SELECT COUNT(DISTINCT e.user_id) AS students,
              (SELECT COALESCE(SUM(total_lessons), 0) FROM courses WHERE instructor_id = ?) AS lessons,
              (SELECT ROUND(AVG(NULLIF(rating, 0)), 1) FROM courses WHERE instructor_id = ? AND status = 'PUBLISHED') AS avgRating
       FROM enrollments e JOIN courses c ON c.id = e.course_id
       WHERE c.instructor_id = ?`,
      [req.user.id, req.user.id, req.user.id],
    );
    const statusCounts = Object.fromEntries(byStatus.map((r) => [r.status, r.count]));
    // SUM/AVG trả DECIMAL → mysql2 trả chuỗi
    return res.json({
      statusCounts,
      students:  totals.students,
      lessons:   Number(totals.lessons),
      avgRating: totals.avgRating === null ? null : Number(totals.avgRating),
    });
  } catch (err) {
    console.error('[instructor/dashboard]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/instructor/courses ──────────────────────────────── */
async function listMyCourses(req, res) {
  const { search = '', status = '' } = req.query;
  const wheres = ['c.instructor_id = ?']; const params = [req.user.id];
  if (search.trim()) { wheres.push('c.title LIKE ?'); params.push(`%${search.trim()}%`); }
  if (status) { wheres.push('c.status = ?'); params.push(status.toUpperCase()); }

  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.slug, c.price, c.original_price, c.level, c.status,
              c.short_description, c.glyph, c.thumb, c.tag, c.thumbnail_url,
              c.student_count, c.total_lessons, c.rating, c.instructor_name,
              c.reject_reason, c.submitted_at, c.reviewed_at, c.updated_at,
              cat.name AS category, cat.id AS categoryId
       FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id
       WHERE ${wheres.join(' AND ')}
       ORDER BY c.updated_at DESC`,
      params,
    );
    return res.json({ courses: rows, total: rows.length, page: 1, totalPages: 1 });
  } catch (err) {
    console.error('[instructor/courses/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/instructor/courses ─────────────────────────────── */
async function createMyCourse(req, res) {
  req.body = { ...stripAdminFields(req.body), status: 'DRAFT', instructorId: req.user.id };
  return admin.adminCreateCourse(req, res);
}

/* ── PUT /api/instructor/courses/:id ──────────────────────────── */
async function updateMyCourse(req, res) {
  const { status } = req.course;
  if (status === 'PENDING_REVIEW') {
    return res.status(409).json({ message: 'Khóa học đang chờ duyệt — không thể chỉnh sửa lúc này' });
  }
  if (status === 'ARCHIVED') {
    return res.status(409).json({ message: 'Khóa học đã lưu trữ' });
  }

  const body = stripAdminFields(req.body);
  if (status === 'PUBLISHED') {
    const [[current]] = await pool.query(
      'SELECT title, slug, price, original_price, category_id FROM courses WHERE id = ?', [req.course.courseId],
    );
    const currentValue = {
      title: current.title, slug: current.slug, price: Number(current.price),
      originalPrice: current.original_price === null ? null : Number(current.original_price),
      categoryId: current.category_id,
    };
    // Form gửi lại đủ trường — chỉ chặn khi giá trị thật sự thay đổi
    const changed = LOCKED_WHEN_PUBLISHED.filter((key) => {
      if (body[key] === undefined) return false;
      const next = ['price', 'originalPrice', 'categoryId'].includes(key) && body[key] !== null ? Number(body[key]) : body[key];
      return next !== currentValue[key] && !(key === 'originalPrice' && !next && !currentValue[key]);
    });
    if (changed.length) {
      return res.status(409).json({
        message: 'Khóa học đã xuất bản: không thể đổi tên, slug, giá hoặc danh mục. Vui lòng liên hệ quản trị viên.',
        fields: changed,
      });
    }
    for (const key of LOCKED_WHEN_PUBLISHED) delete body[key];
  }

  req.body = body;
  if (!Object.keys(body).length) return res.json({ ok: true });
  return admin.adminUpdateCourse(req, res);
}

/* ── DELETE /api/instructor/courses/:id ───────────────────────── */
async function deleteMyCourse(req, res) {
  if (!['DRAFT', 'REJECTED'].includes(req.course.status)) {
    return res.status(409).json({ message: 'Chỉ xóa được khóa học ở trạng thái Nháp hoặc Bị từ chối' });
  }
  return admin.adminDeleteCourse(req, res);
}

/* ── POST /api/instructor/courses/:id/submit ──────────────────── */
async function submitMyCourse(req, res) {
  const { courseId, status } = req.course;
  if (!['DRAFT', 'REJECTED'].includes(status)) {
    return res.status(409).json({ message: 'Chỉ gửi duyệt được khóa học Nháp hoặc Bị từ chối' });
  }

  try {
    const [[{ lessons }]] = await pool.query('SELECT COUNT(*) AS lessons FROM lessons WHERE course_id = ?', [courseId]);
    if (!lessons) return res.status(400).json({ message: 'Khóa học cần ít nhất 1 bài học trước khi gửi duyệt' });

    await pool.query(
      `UPDATE courses SET status = 'PENDING_REVIEW', submitted_at = NOW(), reject_reason = NULL
       WHERE id = ?`,
      [courseId],
    );

    const [[course]] = await pool.query('SELECT title FROM courses WHERE id = ?', [courseId]);
    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'");
    await Promise.all(admins.map(({ id }) => createNotification(id, {
      type: 'course_submitted',
      title: 'Khóa học mới chờ duyệt',
      body: `"${course.title}" — ${req.user.email}`,
      link: '/admin/courses?status=PENDING_REVIEW',
    })));

    return res.json({ ok: true, status: 'PENDING_REVIEW' });
  } catch (err) {
    console.error('[instructor/courses/submit]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── Bài học: section phải thuộc đúng khóa học ────────────────── */
async function requireOwnSection(req, res, next) {
  const { sectionId } = req.body ?? {};
  if (sectionId === undefined || sectionId === null || sectionId === '') return next();
  try {
    const [rows] = await pool.query(
      'SELECT id FROM course_sections WHERE id = ? AND course_id = ?', [sectionId, req.course.courseId],
    );
    if (!rows.length) return res.status(400).json({ message: 'Section không thuộc khóa học này' });
    next();
  } catch (err) {
    console.error('[instructor/section]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = {
  dashboard, listMyCourses, createMyCourse, updateMyCourse, deleteMyCourse, submitMyCourse,
  requireOwnSection,
};
