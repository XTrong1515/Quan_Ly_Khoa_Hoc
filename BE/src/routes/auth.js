const router = require('express').Router();
const { register, login, refresh, logout, me, forgotPassword, resetPassword } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const {
  loginLimiter, registerLimiter, passwordResetLimiter, refreshLimiter,
} = require('../middleware/rateLimit');

router.post('/register',        registerLimiter, register);
router.post('/login',           loginLimiter, login);
router.post('/refresh',         refreshLimiter, refresh);
router.post('/logout',          logout);
router.get('/me',               authMiddleware, me);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password',  passwordResetLimiter, resetPassword);

module.exports = router;
