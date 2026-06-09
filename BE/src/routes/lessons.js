const router = require('express').Router();
const { authMiddleware }    = require('../middleware/auth');
const { requireEnrollment } = require('../middleware/enrollment');
const { preview, detail, attachment } = require('../controllers/lessonController');

router.get('/:id/preview',    preview);
router.get('/:id/attachment', authMiddleware, requireEnrollment(), attachment);
router.get('/:id',            authMiddleware, requireEnrollment({ allowPreview: true }), detail);

module.exports = router;
