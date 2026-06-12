const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const { signAccess, signRefresh, verifyRefresh } = require('../utils/jwt');
const { sendResetPasswordEmail } = require('../utils/mailer');

const SALT_ROUNDS = 12;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

/* ── Helpers ──────────────────────────────────────────────────── */
function saveRefreshToken(userId, token) {
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  return pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt],
  );
}

/* ── POST /api/auth/register ──────────────────────────────────── */
async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email đã được sử dụng' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
      [email.toLowerCase(), password_hash, name.trim()],
    );

    const userId = result.insertId;
    const payload = { id: userId, email, role: 'USER' };
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh({ id: userId });

    await saveRefreshToken(userId, refreshToken);

    return res.status(201).json({
      user: { id: userId, name: name.trim(), email, role: 'USER' },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/auth/login ─────────────────────────────────────── */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, email, password_hash, full_name, avatar_url, role, status FROM users WHERE email = ?',
      [email.toLowerCase()],
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const user = rows[0];

    if (user.status === 'LOCKED') {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh({ id: user.id });

    await saveRefreshToken(user.id, refreshToken);

    return res.json({
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        avatar: user.avatar_url,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/auth/refresh ───────────────────────────────────── */
async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Thiếu refresh token' });

  try {
    const decoded = verifyRefresh(refreshToken);

    const [rows] = await pool.query(
      'SELECT id FROM refresh_tokens WHERE token = ? AND revoked = FALSE AND expires_at > NOW()',
      [refreshToken],
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã thu hồi' });
    }

    const [users] = await pool.query(
      'SELECT id, email, role FROM users WHERE id = ? AND status = "ACTIVE"',
      [decoded.id],
    );
    if (users.length === 0) return res.status(401).json({ message: 'Người dùng không tồn tại' });

    const user = users[0];
    const accessToken = signAccess({ id: user.id, email: user.email, role: user.role });

    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc hết hạn' });
  }
}

/* ── POST /api/auth/logout ────────────────────────────────────── */
async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?', [refreshToken]);
  }
  return res.json({ message: 'Đăng xuất thành công' });
}

/* ── GET /api/auth/me (protected) ────────────────────────────── */
async function me(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, full_name, avatar_url, phone, role, status, created_at FROM users WHERE id = ?',
      [req.user.id],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    const u = rows[0];
    return res.json({ id: u.id, name: u.full_name, email: u.email, avatar: u.avatar_url, phone: u.phone, role: u.role });
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/auth/forgot-password ───────────────────────────── */
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ message: 'Thiếu email' });

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);

    // Không tiết lộ email có tồn tại hay không
    if (rows.length === 0) {
      return res.json({ message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' });
    }

    const userId = rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

    await pool.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt],
    );

    const resetUrl = `${process.env.FE_ORIGIN || 'http://localhost:5173'}/reset-password?token=${token}`;

    // Dev fallback: luôn log link ra console để test không cần inbox thật
    console.log(`\n[forgot-password] Reset URL:\n  ${resetUrl}\n`);

    try {
      await sendResetPasswordEmail(email.toLowerCase(), resetUrl);
    } catch (mailErr) {
      console.error('[forgotPassword] Gửi email thất bại:', mailErr.message);
    }

    return res.json({ message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' });
  } catch (err) {
    console.error('[forgotPassword]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/auth/reset-password ───────────────────────────── */
async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Thiếu token hoặc mật khẩu mới' });

  try {
    const [rows] = await pool.query(
      `SELECT pr.id, pr.user_id FROM password_resets pr
       WHERE pr.token = ? AND pr.used = FALSE AND pr.expires_at > NOW()`,
      [token],
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn' });
    }

    const { id: resetId, user_id: userId } = rows[0];
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId]);
    await pool.query('UPDATE password_resets SET used = TRUE WHERE id = ?', [resetId]);
    // Thu hồi toàn bộ refresh token của user sau khi đổi mật khẩu
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?', [userId]);

    return res.json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (err) {
    console.error('[resetPassword]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { register, login, refresh, logout, me, forgotPassword, resetPassword };
