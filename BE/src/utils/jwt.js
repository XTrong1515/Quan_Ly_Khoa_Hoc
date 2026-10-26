const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'hoisted-access-secret-dev-change-in-prod';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'hoisted-refresh-secret-dev-change-in-prod';
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
