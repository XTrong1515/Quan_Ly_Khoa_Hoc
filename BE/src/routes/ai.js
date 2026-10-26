const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { aiChatLimiter } = require('../middleware/rateLimit');
const ai = require('../controllers/aiController');

// Trợ lý học viên — cần đăng nhập (lưu lịch sử, cá nhân hóa theo khóa đã mua)
router.use(authMiddleware);

router.post('/chat',                aiChatLimiter, ai.chat);
router.get('/conversations',        ai.listConversations);
router.get('/conversations/:id',    ai.getConversation);
router.delete('/conversations/:id', ai.deleteConversation);

module.exports = router;
