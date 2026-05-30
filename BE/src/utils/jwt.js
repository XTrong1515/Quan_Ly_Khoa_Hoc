const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'hoisted-access-secret-dev-change-in-prod';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'hoisted-refresh-secret-dev-change-in-prod';
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';

function signAccess(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefresh(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };
