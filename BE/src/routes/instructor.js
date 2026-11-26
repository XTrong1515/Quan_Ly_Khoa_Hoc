const router = require('express').Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { requireOwnership, requireLessonsOwnership, requireEditableContent: editable } = require('../middleware/ownership');
const ctrl  = require('../controllers/instructorController');
const admin = require('../controllers/adminController');
const quiz  = require('../controllers/quizController');
const media = require('../controllers/mediaController');
const payout = require('../controllers/payoutController');
const exercise = require('../controllers/exerciseController');
const { codeRunLimiter, aiGenerateLimiter, aiChatLimiter } = require('../middleware/rateLimit');
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
router.post('/courses/:id/withdraw', ownCourse, ctrl.withdrawMyCourse);

// Bài học (reorder trước /:id). `editable`: khóa khi đang chờ duyệt / đã lưu trữ
router.get('/courses/:courseId/lessons',  requireOwnership('course', 'courseId'), admin.adminListLessons);
router.post('/courses/:courseId/lessons', requireOwnership('course', 'courseId'), editable, ctrl.requireOwnSection, admin.adminCreateLesson);
router.put('/lessons/reorder',            requireLessonsOwnership, admin.adminReorderLessons);
router.put('/lessons/:id',                ownLesson, editable, ctrl.requireOwnSection, admin.adminUpdateLesson);
// Xóa thật chỉ khi bài chưa có dữ liệu học viên (adminDeleteLesson kiểm tra) — có rồi thì ẩn bài
router.delete('/lessons/:id',             ownLesson, editable, admin.adminDeleteLesson);
router.put('/lessons/:id/visibility',     ownLesson, editable, admin.adminSetLessonVisibility);

// Bài tập lập trình
router.get('/lessons/:id/exercise',           ownLesson, exercise.getForAuthor);
router.put('/lessons/:id/exercise',           ownLesson, editable, exercise.saveForAuthor);
router.delete('/lessons/:id/exercise',        ownLesson, editable, exercise.deleteForAuthor);
router.post('/lessons/:id/exercise/validate', ownLesson, codeRunLimiter, exercise.validateForAuthor);

// Trợ lý AI cho giảng viên (chat stream SSE, lịch sử riêng với trợ lý học viên)
router.post('/ai/chat',                aiChatLimiter, ai.studioChat);
router.get('/ai/conversations',        ai.studioListConversations);
router.get('/ai/conversations/:id',    ai.studioGetConversation);
router.delete('/ai/conversations/:id', ai.studioDeleteConversation);
router.patch('/ai/conversations/:id',  ai.studioRenameConversation);
router.put('/ai/messages/:id/feedback', ai.studioMessageFeedback);

// AI sinh bản nháp câu hỏi quiz (giảng viên duyệt trước khi lưu)
router.post('/lessons/:id/ai/quiz', ownLesson, aiGenerateLimiter, ai.generateQuizDraft);
router.post('/lessons/:id/ai/content', ownLesson, aiGenerateLimiter, ai.generateLessonContent);

// Video / tài liệu trên object storage
router.post('/lessons/:id/uploads',       ownLesson, editable, media.createUpload);
router.put('/lessons/:id/media',          ownLesson, editable, media.attachMedia);
router.delete('/lessons/:id/media/:kind', ownLesson, editable, media.removeMedia);
router.post('/lessons/:id/hls',           ownLesson, editable, media.reencodeHls);

// Quiz
router.get('/lessons/:lessonId/quiz',  requireOwnership('lesson', 'lessonId'), quiz.getQuizAdmin);
router.post('/lessons/:lessonId/quiz', requireOwnership('lesson', 'lessonId'), editable, quiz.createQuiz);
router.put('/quizzes/:id',             ownQuiz, editable, quiz.updateQuiz);
router.delete('/quizzes/:id',          ownQuiz, editable, quiz.deleteQuiz);
router.post('/quizzes/:id/questions',  ownQuiz, editable, quiz.addQuestion);
router.put('/quiz-questions/:id',      ownQuestion, editable, quiz.updateQuestion);
router.delete('/quiz-questions/:id',   ownQuestion, editable, quiz.deleteQuestion);

module.exports = router;
