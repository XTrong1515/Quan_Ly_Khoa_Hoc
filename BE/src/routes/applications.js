const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/applicationController');

// Đơn đăng ký làm giảng viên (người dùng đã đăng nhập)
router.use(authMiddleware);
router.get('/me', ctrl.myApplication);
router.post('/',  ctrl.submitApplication);

module.exports = router;
