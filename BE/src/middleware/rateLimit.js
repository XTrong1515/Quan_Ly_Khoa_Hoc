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

module.exports = { codeRunLimiter };
