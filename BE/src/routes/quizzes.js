const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { submitAttempt }  = require('../controllers/quizController');

router.post('/:id/attempt', authMiddleware, submitAttempt);

module.exports = router;
