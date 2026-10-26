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

module.exports = { codeRunLimiter, aiChatLimiter, aiGenerateLimiter };
