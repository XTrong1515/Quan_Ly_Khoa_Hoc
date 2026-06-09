const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { preview, detail, attachment } = require('../controllers/lessonController');

router.get('/:id/preview',    preview);
router.get('/:id/attachment', authMiddleware, attachment);
router.get('/:id',            authMiddleware, detail);

module.exports = router;
