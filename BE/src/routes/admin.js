const router = require('express').Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(authMiddleware, requireAdmin);

// UC20 — Dashboard
router.get('/dashboard', ctrl.dashboard);

// UC21 — Course CRUD
router.get('/courses',      ctrl.adminListCourses);
router.get('/courses/:id',  ctrl.adminGetCourse);
router.post('/courses',     ctrl.adminCreateCourse);
router.put('/courses/:id',  ctrl.adminUpdateCourse);
router.delete('/courses/:id', ctrl.adminDeleteCourse);

// UC22 — Lesson CRUD (reorder before /:id to avoid param conflict)
router.get('/courses/:courseId/lessons',  ctrl.adminListLessons);
router.post('/courses/:courseId/lessons', ctrl.adminCreateLesson);
router.put('/lessons/reorder',            ctrl.adminReorderLessons);
router.put('/lessons/:id',                ctrl.adminUpdateLesson);
router.delete('/lessons/:id',             ctrl.adminDeleteLesson);

// UC23 — Category CRUD
router.get('/categories',       ctrl.adminListCategories);
router.post('/categories',      ctrl.adminCreateCategory);
router.put('/categories/:id',   ctrl.adminUpdateCategory);
router.delete('/categories/:id', ctrl.adminDeleteCategory);

// UC24 — User management
router.get('/users',              ctrl.adminListUsers);
router.put('/users/:id/status',   ctrl.adminUpdateUserStatus);

// UC25 — Order management
router.get('/orders',           ctrl.adminListOrders);
router.get('/orders/:id',       ctrl.adminGetOrder);
router.put('/orders/:id/cancel', ctrl.adminCancelOrder);

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
