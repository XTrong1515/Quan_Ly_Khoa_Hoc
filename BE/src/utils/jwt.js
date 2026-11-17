const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Secret mặc định nằm công khai trong repo: ai đọc được code là ký được token cho bất kỳ user id nào.
 * Production bắt buộc tự đặt secret đủ dài (≥ 32 ký tự) — thiếu thì dừng ngay lúc khởi động
 * (cùng cách với HLS_MASTER_KEY) thay vì chạy âm thầm với secret công khai.
 */
function secret(name, devFallback) {
  const value = process.env[name];
  // Giá trị mẫu chép nguyên từ .env.example ("change-me-…") cũng là secret công khai
  if (value && value.length >= 32 && !value.startsWith('change-me')) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Thiếu ${name} (tối thiểu 32 ký tự) khi chạy production — không dùng secret mặc định`);
  }
  return value || devFallback;
}

const ACCESS_SECRET = secret('JWT_ACCESS_SECRET', 'hoisted-access-secret-dev-change-in-prod');
const REFRESH_SECRET = secret('JWT_REFRESH_SECRET', 'hoisted-refresh-secret-dev-change-in-prod');
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';

function signAccess(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefresh(payload) {
  // jti ngẫu nhiên: 2 lần đăng nhập trong cùng 1 giây (cùng iat) không sinh ra token trùng
  // → tránh lỗi UNIQUE trên refresh_tokens.token (trước đây trả 500)
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };
