const router = require('express').Router();
const { authMiddleware }    = require('../middleware/auth');
const { requireEnrollment } = require('../middleware/enrollment');
const { preview, detail, attachment } = require('../controllers/lessonController');
const { getQuizForUser }    = require('../controllers/quizController');
const { listDiscussions, createDiscussion } = require('../controllers/discussionController');

router.get('/:id/preview',      preview);
router.get('/:id/quiz',         authMiddleware, requireEnrollment(), getQuizForUser);
router.get('/:id/attachment',   authMiddleware, requireEnrollment(), attachment);
router.get('/:id/discussions',  authMiddleware, requireEnrollment({ allowPreview: true }), listDiscussions);
router.post('/:id/discussions', authMiddleware, requireEnrollment(), createDiscussion);
router.get('/:id',              authMiddleware, requireEnrollment({ allowPreview: true }), detail);

module.exports = router;
