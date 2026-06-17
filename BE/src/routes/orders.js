const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const {
  createOrder, verifyPayment, payOrder,
  myOrders, getOrder,
  myTransactions,
} = require('../controllers/orderController');

router.use(authMiddleware);

router.get('/me',         myOrders);
router.post('/',          createOrder);
router.post('/verify',    verifyPayment);
router.get('/:id',        getOrder);
router.post('/:id/pay',   payOrder);

module.exports = router;
