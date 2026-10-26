const { rateLimit } = require('express-rate-limit');

/** Giới hạn chạy / nộp code theo user (sau authMiddleware) — chống dùng sandbox để DoS server. */
const codeRunLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.CODE_RUN_RATE_LIMIT) || 20,
  keyGenerator: (req) => `user:${req.user.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Bạn chạy code quá nhanh — vui lòng thử lại sau ít giây' },
});

/** Chat với trợ lý AI — mỗi tin nhắn tốn quota LLM. */
const aiChatLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: Number(process.env.AI_CHAT_RATE_LIMIT) || 30,
  keyGenerator: (req) => `user:${req.user.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Bạn đã hỏi trợ lý quá nhiều trong 1 giờ — vui lòng thử lại sau' },
});

/** AI sinh nội dung cho giảng viên (quiz...). */
const aiGenerateLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: Number(process.env.AI_GENERATE_RATE_LIMIT) || 10,
  keyGenerator: (req) => `user:${req.user.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Bạn đã dùng AI sinh nội dung quá nhiều — vui lòng thử lại sau ít phút' },
});

/* ── Xác thực — chống dò mật khẩu / spam (theo IP, vì chưa đăng nhập) ── */
const authLimit = (name, fallback) => Number(process.env[name]) || fallback;
const authMessage = (message) => ({ message });

/** Chỉ đếm lần đăng nhập SAI; khóa theo IP + email để 1 IP không dò được nhiều tài khoản. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: authLimit('AUTH_LOGIN_RATE_LIMIT', 10),
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: authMessage('Đăng nhập sai quá nhiều lần — vui lòng thử lại sau 15 phút'),
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: authLimit('AUTH_REGISTER_RATE_LIMIT', 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: authMessage('Tạo tài khoản quá nhiều lần — vui lòng thử lại sau'),
});

/** Quên / đặt lại mật khẩu — chống spam email và dò token. */
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: authLimit('AUTH_RESET_RATE_LIMIT', 5),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: authMessage('Yêu cầu quá nhiều lần — vui lòng thử lại sau 15 phút'),
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: authLimit('AUTH_REFRESH_RATE_LIMIT', 60),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: authMessage('Quá nhiều yêu cầu làm mới phiên đăng nhập'),
});

module.exports = {
  codeRunLimiter, aiChatLimiter, aiGenerateLimiter,
  loginLimiter, registerLimiter, passwordResetLimiter, refreshLimiter,
};
