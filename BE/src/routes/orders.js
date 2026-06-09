const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const {
  createOrder, verifyPayment,
  myOrders, getOrder,
  myTransactions,
} = require('../controllers/orderController');

router.use(authMiddleware);

router.get('/me',         myOrders);
router.post('/',          createOrder);
router.post('/verify',    verifyPayment);
router.get('/:id',        getOrder);

module.exports = router;
