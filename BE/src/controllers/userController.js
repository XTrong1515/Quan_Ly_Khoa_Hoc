const bcrypt = require('../utils/hash');
const pool = require('../config/db');
const { passwordError } = require('../utils/password');

const SALT_ROUNDS = 12;

/* ── PUT /api/user/profile ────────────────────────────────────── */
async function updateProfile(req, res) {
  const { name, username, phone, bio } = req.body;
  const userId = req.user.id;

  // Kiểu / độ dài theo cột DB — sai kiểu (object, số) hay quá dài thì trả 400 thay vì 500
  const isText = (v) => v === undefined || v === null || typeof v === 'string';
  if (![name, username, phone, bio].every(isText)) return res.status(400).json({ message: 'Dữ liệu hồ sơ không hợp lệ' });
  if (!name?.trim()) return res.status(400).json({ message: 'Tên không được để trống' });
  if (name.trim().length > 100) return res.status(400).json({ message: 'Họ tên tối đa 100 ký tự' });
  if (username?.trim() && !/^[a-z0-9_.]{3,30}$/.test(username.trim())) {
    return res.status(400).json({ message: 'Tên đăng nhập: 3–30 ký tự, chỉ dùng a-z, 0-9, . hoặc _' });
  }
  if (phone?.trim() && !/^[0-9+\-\s().]{1,20}$/.test(phone.trim())) return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
  if (bio && bio.length > 2000) return res.status(400).json({ message: 'Giới thiệu tối đa 2000 ký tự' });

  const cleanUsername = username?.trim() || null;

  try {
    if (cleanUsername) {
      const [taken] = await pool.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [cleanUsername, userId],
      );
      if (taken.length > 0) return res.status(409).json({ message: 'Username đã được sử dụng' });
    }

    await pool.query(
      'UPDATE users SET full_name = ?, username = ?, phone = ?, bio = ? WHERE id = ?',
      [name.trim(), cleanUsername, phone?.trim() || null, bio?.trim() || null, userId],
    );

    const [rows] = await pool.query(
      'SELECT id, email, full_name, avatar_url, username, phone, bio, role FROM users WHERE id = ?',
      [userId],
    );
    const u = rows[0];

    return res.json({
      user: {
        id: u.id, name: u.full_name, email: u.email,
        avatar: u.avatar_url, username: u.username,
        phone: u.phone, bio: u.bio, role: u.role,
      },
    });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── PUT /api/user/password ───────────────────────────────────── */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Thiếu mật khẩu hiện tại hoặc mật khẩu mới' });
  }
  const pwError = passwordError(newPassword);
  if (pwError) return res.status(400).json({ message: pwError });

  try {
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });

    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId]);
    // Thu hồi toàn bộ refresh token (buộc login lại trên các thiết bị khác)
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?', [userId]);

    return res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('[changePassword]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/user/avatar ────────────────────────────────────── */
async function uploadAvatar(req, res) {
  if (!req.file) return res.status(400).json({ message: 'File không hợp lệ hoặc vượt quá 2MB' });
  const userId = req.user.id;
  const host   = `${req.protocol}://${req.get('host')}`;
  const url    = `${host}/uploads/${req.file.filename}`;

  try {
    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [url, userId]);
    return res.json({ avatar: url });
  } catch (err) {
    console.error('[uploadAvatar]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── DELETE /api/user/avatar ──────────────────────────────────── */
async function removeAvatar(req, res) {
  const userId = req.user.id;
  try {
    await pool.query('UPDATE users SET avatar_url = NULL WHERE id = ?', [userId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[removeAvatar]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { updateProfile, changePassword, uploadAvatar, removeAvatar };
