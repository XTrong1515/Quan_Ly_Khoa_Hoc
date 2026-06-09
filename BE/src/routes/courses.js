const router = require('express').Router();
const { list, cartItems, detail } = require('../controllers/courseController');
const { verifyAccess } = require('../utils/jwt');

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try { req.user = verifyAccess(header.slice(7)); } catch { /* ignore */ }
  next();
}

// Static routes must come before /:slug
router.get('/cart-items', cartItems);
router.get('/',           list);
router.get('/:slug',      optionalAuth, detail);

module.exports = router;
