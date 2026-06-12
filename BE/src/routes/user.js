const path   = require('path');
const router = require('express').Router();
const multer = require('multer');
const { updateProfile, changePassword, uploadAvatar, removeAvatar } = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

const avatarStorage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype));
  },
});

router.use(authMiddleware);

router.put('/profile',  updateProfile);
router.put('/password', changePassword);
router.post('/avatar',  avatarUpload.single('avatar'), uploadAvatar);
router.delete('/avatar', removeAvatar);

module.exports = router;
