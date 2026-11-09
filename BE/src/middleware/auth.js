const pool = require('../config/db');
const { verifyAccess } = require('../utils/jwt');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }

  let decoded;
  try {
    decoded = verifyAccess(header.slice(7)); // { id, email, role }
  } catch {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }

  // Đọc trạng thái thật: khóa tài khoản / đổi quyền có hiệu lực ngay, không phải đợi access token hết hạn
  const [[account]] = await pool.query('SELECT role, status FROM users WHERE id = ?', [decoded.id]);
  if (!account || account.status !== 'ACTIVE') {
    return res.status(401).json({ message: 'Tài khoản không còn hoạt động' });
  }
  req.user = { ...decoded, role: account.role };
  return next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }
  next();
}

/** Cho phép khi role thuộc danh sách, vd requireRole('INSTRUCTOR', 'ADMIN'). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireAdmin, requireRole };
