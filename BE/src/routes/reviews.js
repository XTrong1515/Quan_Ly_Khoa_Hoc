const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { upsertCourseReview, deleteCourseReview, myReview } = require('../controllers/reviewController');

// Mounted at /api/courses — paths are /:id/reviews and /:id/reviews/me
router.post('/:id/reviews',      authMiddleware, upsertCourseReview);
router.get('/:id/reviews/me',    authMiddleware, myReview);
router.delete('/:id/reviews/me', authMiddleware, deleteCourseReview);

module.exports = router;
