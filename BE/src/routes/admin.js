const router = require('express').Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(authMiddleware, requireAdmin);

// UC20 — Dashboard
router.get('/dashboard', ctrl.dashboard);

// UC21 — Course CRUD
router.get('/courses',          ctrl.adminListCourses);
router.get('/courses/export',   ctrl.adminExportCourses);
router.get('/courses/:id',      ctrl.adminGetCourse);
router.post('/courses',     ctrl.adminCreateCourse);
// Course reorder (must be before /:id to avoid param conflict)
router.put('/courses/reorder',  ctrl.adminReorderCourses);
router.put('/courses/:id',  ctrl.adminUpdateCourse);
router.delete('/courses/:id', ctrl.adminDeleteCourse);

// Duyệt khóa học do giảng viên gửi
router.put('/courses/:id/approve', ctrl.adminApproveCourse);
router.put('/courses/:id/reject',  ctrl.adminRejectCourse);

// UC22 — Lesson CRUD (reorder before /:id to avoid param conflict)
router.get('/courses/:courseId/lessons',  ctrl.adminListLessons);
router.post('/courses/:courseId/lessons', ctrl.adminCreateLesson);
router.put('/lessons/reorder',            ctrl.adminReorderLessons);
router.put('/lessons/:id',                ctrl.adminUpdateLesson);
router.delete('/lessons/:id',             ctrl.adminDeleteLesson);

// Video / tài liệu trên object storage (requireOwnership: admin bypass, chỉ để lấy courseId)
const media = require('../controllers/mediaController');
const { requireOwnership } = require('../middleware/ownership');
router.post('/lessons/:id/uploads',        requireOwnership('lesson'), media.createUpload);
router.put('/lessons/:id/media',           requireOwnership('lesson'), media.attachMedia);
router.delete('/lessons/:id/media/:kind',  requireOwnership('lesson'), media.removeMedia);

// AI sinh bản nháp câu hỏi quiz
const ai = require('../controllers/aiController');
const { codeRunLimiter, aiGenerateLimiter } = require('../middleware/rateLimit');
router.post('/lessons/:id/ai/quiz', requireOwnership('lesson'), aiGenerateLimiter, ai.generateQuizDraft);

// Bài tập lập trình
const exercise = require('../controllers/exerciseController');
router.get('/lessons/:id/exercise',           requireOwnership('lesson'), exercise.getForAuthor);
router.put('/lessons/:id/exercise',           requireOwnership('lesson'), exercise.saveForAuthor);
router.delete('/lessons/:id/exercise',        requireOwnership('lesson'), exercise.deleteForAuthor);
router.post('/lessons/:id/exercise/validate', requireOwnership('lesson'), codeRunLimiter, exercise.validateForAuthor);

// UC23 — Category CRUD
router.get('/categories',       ctrl.adminListCategories);
router.post('/categories',      ctrl.adminCreateCategory);
router.put('/categories/:id',   ctrl.adminUpdateCategory);
router.delete('/categories/:id', ctrl.adminDeleteCategory);

// UC24 — User management
router.get('/users',                  ctrl.adminListUsers);
router.post('/users',                 ctrl.adminCreateUser);
router.get('/users/export',           ctrl.adminExportUsers);
router.post('/users/bulk',            ctrl.adminBulkUsers);
router.put('/users/:id/status',       ctrl.adminUpdateUserStatus);
router.put('/users/:id/role',         ctrl.adminUpdateUserRole);
router.get('/users/:id/enrollments',  ctrl.adminGetUserEnrollments);

// Đối soát & chi trả doanh thu giảng viên
const payout = require('../controllers/payoutController');
router.get('/payouts/summary',    payout.payoutSummary);
router.get('/payouts',            payout.listPayouts);
router.post('/payouts',           payout.createPayout);
router.put('/payouts/:id/paid',   payout.markPayoutPaid);
router.delete('/payouts/:id',     payout.cancelPayout);
router.put('/users/:id/commission', payout.setCommission);

// UC25 — Order management
router.get('/orders',            ctrl.adminListOrders);
router.get('/orders/export',     ctrl.adminExportOrders);
router.get('/orders/:id',        ctrl.adminGetOrder);
router.put('/orders/:id/cancel', ctrl.adminCancelOrder);
router.put('/orders/:id/confirm', ctrl.adminConfirmOrder);

// UC26 — Review moderation
router.get('/reviews',           ctrl.adminListReviews);
router.put('/reviews/:id/status', ctrl.adminUpdateReviewStatus);

// UC27 — Quiz management
const quiz = require('../controllers/quizController');
router.get('/lessons/:lessonId/quiz',     quiz.getQuizAdmin);
router.post('/lessons/:lessonId/quiz',    quiz.createQuiz);
router.put('/quizzes/:id',               quiz.updateQuiz);
router.delete('/quizzes/:id',            quiz.deleteQuiz);
router.post('/quizzes/:id/questions',    quiz.addQuestion);
router.put('/quiz-questions/:id',        quiz.updateQuestion);
router.delete('/quiz-questions/:id',     quiz.deleteQuestion);

module.exports = router;
