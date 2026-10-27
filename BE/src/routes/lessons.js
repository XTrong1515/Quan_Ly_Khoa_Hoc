const router = require('express').Router();
const { authMiddleware }    = require('../middleware/auth');
const { requireEnrollment } = require('../middleware/enrollment');
const { preview, detail, attachment, hlsPlaylist, hlsKey } = require('../controllers/lessonController');
const { getQuizForUser }    = require('../controllers/quizController');
const { listDiscussions, createDiscussion } = require('../controllers/discussionController');

router.get('/:id/preview',      preview);
router.get('/:id/quiz',         authMiddleware, requireEnrollment(), getQuizForUser);
router.get('/:id/attachment',   authMiddleware, requireEnrollment(), attachment);
// Video HLS mã hóa: playlist (đoạn = presigned URL) + khóa giải mã — cùng quyền như xem bài học
router.get('/:id/hls/index.m3u8', authMiddleware, requireEnrollment({ allowPreview: true }), hlsPlaylist);
router.get('/:id/hls/key',        authMiddleware, requireEnrollment({ allowPreview: true }), hlsKey);
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
