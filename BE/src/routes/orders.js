const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  createOrder, verifyPayment, vnpayIpn, zalopayCallback, payOrder, cancelMyOrder,
  myOrders, getOrder,
  myTransactions,
} = require('../controllers/orderController');

// VNPay gọi server-to-server, không có JWT — phải đứng trước authMiddleware; xác thực bằng chữ ký HMAC
router.get('/vnpay-ipn', vnpayIpn);
// ZaloPay cũng gọi server-to-server (POST JSON { data, mac, type }) — xác thực bằng HMAC key2
// Tài liệu ghi body JSON; nhận thêm form-urlencoded phòng khi cổng gửi kiểu form (body rỗng → mac sai)
router.post('/zalopay-callback', express.urlencoded({ extended: false }), zalopayCallback);

router.use(authMiddleware);

router.get('/me',         myOrders);
router.post('/',          createOrder);
router.post('/verify',    verifyPayment);
router.get('/:id',        getOrder);
router.post('/:id/pay',   payOrder);
router.post('/:id/cancel', cancelMyOrder);

module.exports = router;
