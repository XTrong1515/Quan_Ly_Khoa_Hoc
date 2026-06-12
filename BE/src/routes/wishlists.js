const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/wishlistController');

router.get('/me',           authMiddleware, ctrl.getMyWishlist);
router.get('/me/ids',       authMiddleware, ctrl.getMyWishlistIds);
router.post('/',            authMiddleware, ctrl.addToWishlist);
router.delete('/:courseId', authMiddleware, ctrl.removeFromWishlist);

module.exports = router;
