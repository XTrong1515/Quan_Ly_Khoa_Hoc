const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { updateProgress, markComplete } = require('../controllers/lessonProgressController');

router.put('/:lessonId',          authMiddleware, updateProgress);
router.post('/:lessonId/complete', authMiddleware, markComplete);

module.exports = router;
