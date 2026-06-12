const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { updateDiscussion, deleteDiscussion } = require('../controllers/discussionController');

router.put('/:id',    authMiddleware, updateDiscussion);
router.delete('/:id', authMiddleware, deleteDiscussion);

module.exports = router;
