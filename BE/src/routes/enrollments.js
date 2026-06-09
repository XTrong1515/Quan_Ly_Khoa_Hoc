const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { myEnrollments, myEnrolledCourseIds, enrollFree } = require('../controllers/enrollmentController');

router.get('/me/course-ids', authMiddleware, myEnrolledCourseIds);
router.get('/me',            authMiddleware, myEnrollments);
router.post('/',             authMiddleware, enrollFree);

module.exports = router;
