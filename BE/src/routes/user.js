const router = require('express').Router();
const { updateProfile, changePassword } = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware); // tất cả route bên dưới đều cần token

router.put('/profile',  updateProfile);
router.put('/password', changePassword);

module.exports = router;
