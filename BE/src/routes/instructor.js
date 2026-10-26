const router = require('express').Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { requireOwnership, requireLessonsOwnership } = require('../middleware/ownership');
const ctrl  = require('../controllers/instructorController');
const admin = require('../controllers/adminController');
const quiz  = require('../controllers/quizController');
const media = require('../controllers/mediaController');
const payout = require('../controllers/payoutController');
const exercise = require('../controllers/exerciseController');
const { codeRunLimiter, aiGenerateLimiter } = require('../middleware/rateLimit');
const ai = require('../controllers/aiController');

// Khu vực giảng viên — đường dẫn giống /api/admin để FE dùng chung component (apiBase)
router.use(authMiddleware, requireRole('INSTRUCTOR'));

const ownCourse   = requireOwnership('course');
const ownLesson   = requireOwnership('lesson');
const ownQuiz     = requireOwnership('quiz');
const ownQuestion = requireOwnership('question');

router.get('/dashboard',  ctrl.dashboard);
router.get('/categories', admin.adminListCategories);

// Doanh thu & hồ sơ nhận tiền
router.get('/revenue', payout.myRevenue);
router.get('/profile', payout.getProfile);
router.put('/profile', payout.updateProfile);

// Khóa học
router.get('/courses',             ctrl.listMyCourses);
router.post('/courses',            ctrl.createMyCourse);
router.get('/courses/:id',         ownCourse, admin.adminGetCourse);
router.put('/courses/:id',         ownCourse, ctrl.updateMyCourse);
router.delete('/courses/:id',      ownCourse, ctrl.deleteMyCourse);
router.post('/courses/:id/submit', ownCourse, ctrl.submitMyCourse);

// Bài học (reorder trước /:id)
router.get('/courses/:courseId/lessons',  requireOwnership('course', 'courseId'), admin.adminListLessons);
router.post('/courses/:courseId/lessons', requireOwnership('course', 'courseId'), ctrl.requireOwnSection, admin.adminCreateLesson);
router.put('/lessons/reorder',            requireLessonsOwnership, admin.adminReorderLessons);
router.put('/lessons/:id',                ownLesson, ctrl.requireOwnSection, admin.adminUpdateLesson);
router.delete('/lessons/:id',             ownLesson, admin.adminDeleteLesson);

// Bài tập lập trình
router.get('/lessons/:id/exercise',           ownLesson, exercise.getForAuthor);
router.put('/lessons/:id/exercise',           ownLesson, exercise.saveForAuthor);
router.delete('/lessons/:id/exercise',        ownLesson, exercise.deleteForAuthor);
router.post('/lessons/:id/exercise/validate', ownLesson, codeRunLimiter, exercise.validateForAuthor);

// AI sinh bản nháp câu hỏi quiz (giảng viên duyệt trước khi lưu)
router.post('/lessons/:id/ai/quiz', ownLesson, aiGenerateLimiter, ai.generateQuizDraft);

// Video / tài liệu trên object storage
router.post('/lessons/:id/uploads',       ownLesson, media.createUpload);
router.put('/lessons/:id/media',          ownLesson, media.attachMedia);
router.delete('/lessons/:id/media/:kind', ownLesson, media.removeMedia);

// Quiz
router.get('/lessons/:lessonId/quiz',  requireOwnership('lesson', 'lessonId'), quiz.getQuizAdmin);
router.post('/lessons/:lessonId/quiz', requireOwnership('lesson', 'lessonId'), quiz.createQuiz);
router.put('/quizzes/:id',             ownQuiz, quiz.updateQuiz);
router.delete('/quizzes/:id',          ownQuiz, quiz.deleteQuiz);
router.post('/quizzes/:id/questions',  ownQuiz, quiz.addQuestion);
router.put('/quiz-questions/:id',      ownQuestion, quiz.updateQuestion);
router.delete('/quiz-questions/:id',   ownQuestion, quiz.deleteQuestion);

module.exports = router;
