const path    = require('path');
const router  = require('express').Router();
const multer  = require('multer');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Đuôi file lấy từ loại ảnh đã kiểm tra, không lấy từ tên người dùng gửi (tránh lưu được x.html rồi phục vụ công khai)
const IMAGE_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    const ext  = IMAGE_EXT[file.mimetype];
    const name = `thumb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|png|webp|gif)$/;
    cb(null, allowed.test(file.mimetype));
  },
});

/* POST /api/admin/upload/image · /api/instructor/upload/image */
router.post('/image', authMiddleware, requireRole('ADMIN', 'INSTRUCTOR'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File không hợp lệ hoặc vượt quá 5MB' });
  const host = `${req.protocol}://${req.get('host')}`;
  return res.json({ url: `${host}/uploads/${req.file.filename}` });
});

module.exports = router;
