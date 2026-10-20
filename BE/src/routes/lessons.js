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
// Bài tập lập trình
const exercise = require('../controllers/exerciseController');
const { codeRunLimiter } = require('../middleware/rateLimit');
const learner = [authMiddleware, requireEnrollment({ allowPreview: true })];
router.get('/:id/exercise',              ...learner, exercise.getForLearner);
router.post('/:id/exercise/run',         ...learner, codeRunLimiter, exercise.runForLearner);
router.post('/:id/exercise/submit',      ...learner, codeRunLimiter, exercise.submitForLearner);
router.get('/:id/exercise/submissions',  ...learner, exercise.mySubmissions);

router.get('/:id',              authMiddleware, requireEnrollment({ allowPreview: true }), detail);

module.exports = router;
