const { verifyAccess } = require('../utils/jwt');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }
  try {
    req.user = verifyAccess(header.slice(7)); // { id, email, role }
    next();
  } catch {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }
  next();
}

module.exports = { authMiddleware, requireAdmin };
