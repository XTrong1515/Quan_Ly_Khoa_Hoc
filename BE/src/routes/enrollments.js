const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { myEnrollments } = require('../controllers/enrollmentController');

router.get('/me', authMiddleware, myEnrollments);

module.exports = router;
