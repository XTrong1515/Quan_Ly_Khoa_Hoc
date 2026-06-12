const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

// read-all must come before /:id/read to avoid param conflict
router.get('/',              authMiddleware, ctrl.listNotifications);
router.put('/read-all',      authMiddleware, ctrl.markAllRead);
router.put('/:id/read',      authMiddleware, ctrl.markRead);

module.exports = router;
