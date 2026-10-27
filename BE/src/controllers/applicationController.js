const pool = require('../config/db');
const { createNotification } = require('./notificationController');

/*
 * Đơn đăng ký làm giảng viên: USER nộp đơn → admin duyệt (role → INSTRUCTOR) hoặc từ chối kèm lý do.
 * Mỗi người chỉ có tối đa 1 đơn đang chờ.
 */

const FIELDS = {
  headline:  { min: 10, max: 255,  label: 'Chức danh / giới thiệu ngắn' },
  expertise: { min: 3,  max: 255,  label: 'Chuyên môn' },
  bio:       { min: 50, max: 3000, label: 'Giới thiệu bản thân' },
};

function parseApplication(body = {}) {
  const data = {};
  for (const [key, rule] of Object.entries(FIELDS)) {
    const value = typeof body[key] === 'string' ? body[key].trim() : '';
    if (value.length < rule.min || value.length > rule.max) {
      return { error: `${rule.label}: ${rule.min}–${rule.max} ký tự` };
    }
    data[key] = value;
  }
  const url = typeof body.portfolioUrl === 'string' ? body.portfolioUrl.trim() : '';
  if (url) {
    let parsed;
    try { parsed = new URL(url); } catch { return { error: 'Link portfolio không hợp lệ' }; }
    if (!['http:', 'https:'].includes(parsed.protocol) || url.length > 500) return { error: 'Link portfolio phải là http(s), tối đa 500 ký tự' };
  }
  data.portfolioUrl = url || null;
  const idea = typeof body.courseIdea === 'string' ? body.courseIdea.trim() : '';
  if (idea.length > 2000) return { error: 'Ý tưởng khóa học tối đa 2000 ký tự' };
  data.courseIdea = idea || null;
  return { data };
}

const COLUMNS = `a.id, a.headline, a.expertise, a.bio, a.portfolio_url AS portfolioUrl, a.course_idea AS courseIdea,
  a.status, a.admin_note AS adminNote, a.reviewed_at AS reviewedAt, a.created_at AS createdAt`;

/* ══════════════════════ Người dùng ══════════════════════ */

/* GET /api/instructor-applications/me */
async function myApplication(req, res) {
  try {
    const [[latest]] = await pool.query(
      `SELECT ${COLUMNS} FROM instructor_applications a WHERE a.user_id = ? ORDER BY a.id DESC LIMIT 1`,
      [req.user.id],
    );
    const [[user]] = await pool.query('SELECT role FROM users WHERE id = ?', [req.user.id]);
    return res.json({
      application: latest ?? null,
      role: user.role,
      canApply: user.role === 'USER' && latest?.status !== 'PENDING',
    });
  } catch (err) {
    console.error('[applications/me]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* POST /api/instructor-applications */
async function submitApplication(req, res) {
  const { data, error } = parseApplication(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const [[user]] = await pool.query('SELECT role, full_name FROM users WHERE id = ?', [req.user.id]);
    if (user.role !== 'USER') return res.status(409).json({ message: 'Tài khoản của bạn đã là giảng viên / quản trị viên' });
    const [[pending]] = await pool.query(
      "SELECT id FROM instructor_applications WHERE user_id = ? AND status = 'PENDING' LIMIT 1", [req.user.id],
    );
    if (pending) return res.status(409).json({ message: 'Bạn đã có đơn đang chờ duyệt' });

    const [r] = await pool.query(
      `INSERT INTO instructor_applications (user_id, headline, expertise, bio, portfolio_url, course_idea)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, data.headline, data.expertise, data.bio, data.portfolioUrl, data.courseIdea],
    );
    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'");
    await Promise.all(admins.map(({ id }) => createNotification(id, {
      type: 'instructor_application',
      title: 'Đơn đăng ký giảng viên mới',
      body: `${user.full_name} — ${data.expertise}`,
      link: '/admin/instructor-applications',
    })));
    return res.status(201).json({ id: r.insertId });
  } catch (err) {
    console.error('[applications/submit]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ══════════════════════ Admin ══════════════════════ */

/* GET /api/admin/instructor-applications?status=PENDING|APPROVED|REJECTED */
async function listApplications(req, res) {
  const status = ['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status) ? req.query.status : null;
  try {
    const [rows] = await pool.query(
      `SELECT ${COLUMNS}, u.id AS userId, u.full_name AS name, u.email, u.avatar_url AS avatar, u.role
       FROM instructor_applications a JOIN users u ON u.id = a.user_id
       ${status ? 'WHERE a.status = ?' : ''}
       ORDER BY a.status = 'PENDING' DESC, a.id DESC LIMIT 200`,
      status ? [status] : [],
    );
    const [[{ pending }]] = await pool.query("SELECT COUNT(*) AS pending FROM instructor_applications WHERE status = 'PENDING'");
    return res.json({ applications: rows, pending });
  } catch (err) {
    console.error('[admin/applications/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* PUT /api/admin/instructor-applications/:id/approve */
async function approveApplication(req, res) {
  const id = parseInt(req.params.id, 10);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [upd] = await conn.query(
      "UPDATE instructor_applications SET status = 'APPROVED', reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status = 'PENDING'",
      [req.user.id, id],
    );
    if (!upd.affectedRows) { await conn.rollback(); return res.status(409).json({ message: 'Đơn không ở trạng thái chờ duyệt' }); }

    const [[app]] = await conn.query('SELECT user_id, headline, bio FROM instructor_applications WHERE id = ?', [id]);
    // Chỉ nâng USER → INSTRUCTOR (không hạ quyền ADMIN); giữ headline / bio đã có nếu người dùng tự điền trước
    await conn.query(
      `UPDATE users SET role = IF(role = 'USER', 'INSTRUCTOR', role),
              headline = COALESCE(headline, ?), bio = COALESCE(NULLIF(bio, ''), ?)
       WHERE id = ?`,
      [app.headline, app.bio, app.user_id],
    );
    await conn.commit();

    await createNotification(app.user_id, {
      type: 'application_approved',
      title: 'Bạn đã trở thành giảng viên 🎉',
      body: 'Đơn đăng ký được duyệt — vào Khu vực giảng viên để tạo khóa học đầu tiên.',
      link: '/become-instructor',
    });
    return res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error('[admin/applications/approve]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  } finally {
    conn.release();
  }
}

/* PUT /api/admin/instructor-applications/:id/reject  { note } */
async function rejectApplication(req, res) {
  const id = parseInt(req.params.id, 10);
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
  if (!note) return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối' });
  try {
    const [upd] = await pool.query(
      "UPDATE instructor_applications SET status = 'REJECTED', admin_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status = 'PENDING'",
      [note, req.user.id, id],
    );
    if (!upd.affectedRows) return res.status(409).json({ message: 'Đơn không ở trạng thái chờ duyệt' });
    const [[app]] = await pool.query('SELECT user_id FROM instructor_applications WHERE id = ?', [id]);
    await createNotification(app.user_id, {
      type: 'application_rejected',
      title: 'Đơn đăng ký giảng viên chưa được duyệt',
      body: note,
      link: '/become-instructor',
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin/applications/reject]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { myApplication, submitApplication, listApplications, approveApplication, rejectApplication };
