const crypto = require('crypto');
const pool   = require('../config/db');
const { createNotification } = require('./notificationController');
const { markOrderPaid } = require('../services/orders');
const zalopay = require('../services/payments/zalopay');

const VNPAY_URL  = process.env.VNPAY_URL  || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const TMN_CODE   = process.env.VNPAY_TMN_CODE   || '';
const HASH_SECRET = process.env.VNPAY_HASH_SECRET || '';
const RETURN_URL = process.env.VNPAY_RETURN_URL || 'http://localhost:5173/payment/result';

/* ── Helpers ──────────────────────────────────────────────────── */

// Matches Java URLEncoder / PHP urlencode: spaces → '+', special chars → %XX
function vnpEncode(str) {
  return encodeURIComponent(String(str)).replace(/%20/g, '+');
}

function genOrderCode() {
  const now    = new Date();
  const pad    = (n) => String(n).padStart(2, '0');
  const date   = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${date}-${suffix}`;
}

const VNPAY_LINK_TTL_MS = 15 * 60 * 1000;

/** yyyyMMddHHmmss theo giờ Việt Nam — VNPay yêu cầu GMT+7, server có thể chạy múi giờ khác. */
function vnpDate(ms) {
  return new Date(ms + 7 * 60 * 60 * 1000).toISOString().replace(/\D/g, '').slice(0, 14);
}

function buildVNPayUrl(orderCode, amountVND, ipAddr, orderExpiresAt) {
  const now = Date.now();
  // Link hết hạn sớm, và không bao giờ sống lâu hơn đơn → hạn chế trường hợp trả tiền cho đơn vừa bị hủy
  const linkExpiresAt = Math.min(now + VNPAY_LINK_TTL_MS, new Date(orderExpiresAt).getTime());

  const raw = {
    vnp_Version:   '2.1.0',
    vnp_Command:   'pay',
    vnp_TmnCode:   TMN_CODE,
    vnp_Locale:    'vn',
    vnp_CurrCode:  'VND',
    vnp_TxnRef:    orderCode,
    vnp_OrderInfo: `Thanh toan don hang ${orderCode}`,
    vnp_OrderType: 'other',
    vnp_Amount:    String(Math.round(amountVND) * 100),
    vnp_ReturnUrl: RETURN_URL,
    vnp_IpAddr:    ipAddr,
    vnp_CreateDate: vnpDate(now),
    vnp_ExpireDate: vnpDate(linkExpiresAt),
  };

  // Sort keys alphabetically — required by VNPay spec
  const sorted    = Object.keys(raw).sort().reduce((acc, k) => { acc[k] = raw[k]; return acc; }, {});
  // URL-encode key=value before hashing — matches Java URLEncoder / PHP urlencode (VNPay spec)
  const signData  = Object.keys(sorted).map((k) => `${vnpEncode(k)}=${vnpEncode(sorted[k])}`).join('&');
  const hmac      = crypto.createHmac('sha512', HASH_SECRET);
  const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  const urlParams = new URLSearchParams(sorted);
  urlParams.append('vnp_SecureHash', signature);
  return `${VNPAY_URL}?${urlParams.toString()}`;
}

function resolveIpAddr(req) {
  let ipAddr = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
  // VNPay requires IPv4 — normalize IPv6 loopback addresses
  if (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') ipAddr = '127.0.0.1';
  else if (ipAddr.startsWith('::ffff:')) ipAddr = ipAddr.slice(7);
  return ipAddr;
}

const vnpayConfigured = () => Boolean(TMN_CODE && HASH_SECRET);

/**
 * Cổng đang dùng: PAYMENT_PROVIDER (zalopay mặc định | vnpay) nếu đã cấu hình, không thì cổng nào đã cấu hình,
 * null = chưa cấu hình cổng nào → thanh toán giả lập (chỉ ngoài production).
 */
function activeGateway() {
  const preferred = (process.env.PAYMENT_PROVIDER || 'zalopay').toLowerCase();
  if (preferred === 'vnpay' && vnpayConfigured()) return 'vnpay';
  if (preferred === 'zalopay' && zalopay.isConfigured()) return 'zalopay';
  if (zalopay.isConfigured()) return 'zalopay';
  if (vnpayConfigured()) return 'vnpay';
  return null;
}

class GatewayError extends Error {}

/** URL để học viên trả tiền cho đơn. ZaloPay phải gọi API tạo giao dịch → async; lỗi cổng ném GatewayError. */
async function resolvePaymentUrl(order, req) {
  const gateway = activeGateway();
  if (gateway === 'zalopay') {
    let url;
    try {
      ({ paymentUrl: url } = await zalopay.createPaymentUrl({
        orderId: order.id, orderCode: order.order_code, userId: req.user.id,
        amountVND: order.total_amount, orderExpiresAt: order.expires_at,
      }));
    } catch (err) {
      console.error('[orders/zalopay-create]', err.message);
      throw new GatewayError('Không tạo được giao dịch ZaloPay. Thử lại sau giây lát.');
    }
    await pool.query("UPDATE orders SET payment_method = 'ZALOPAY' WHERE id = ? AND status = 'PENDING'", [order.id]);
    return url;
  }
  if (gateway === 'vnpay') {
    await pool.query("UPDATE orders SET payment_method = 'VNPAY' WHERE id = ? AND status = 'PENDING'", [order.id]);
    return buildVNPayUrl(order.order_code, order.total_amount, resolveIpAddr(req), order.expires_at);
  }
  // Dev fallback: chưa cấu hình cổng nào → giả lập trang kết quả thành công
  const mockParams = new URLSearchParams({
    vnp_TxnRef:        order.order_code,
    vnp_ResponseCode:  '00',
    vnp_Amount:        String(Math.round(order.total_amount) * 100),
    vnp_TransactionNo: `DEV${Date.now()}`,
    dev_mock:          '1',
  });
  return `/payment/result?${mockParams.toString()}`;
}

/**
 * Link trả về ngay lúc đặt đơn. FE mở cổng qua POST /:id/pay ở trang chờ thanh toán, nên với ZaloPay
 * (mỗi link là 1 giao dịch tạo trên server ZaloPay) không tạo sẵn giao dịch thừa ở bước này.
 */
const checkoutPaymentUrl = (order, req) => (activeGateway() === 'zalopay' ? null : resolvePaymentUrl(order, req));

function verifyVNPaySignature(params) {
  const secureHash = params.vnp_SecureHash;
  if (!secureHash || !HASH_SECRET) return false;

  const filtered = Object.keys(params)
    .filter((k) => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
    .sort()
    .reduce((acc, k) => { acc[k] = params[k]; return acc; }, {});

  // URL-encode before hashing — matches Java URLEncoder / PHP urlencode (VNPay spec)
  const signData  = Object.keys(filtered).map((k) => `${vnpEncode(k)}=${vnpEncode(filtered[k])}`).join('&');
  const hmac      = crypto.createHmac('sha512', HASH_SECRET);
  const computed  = Buffer.from(hmac.update(Buffer.from(signData, 'utf-8')).digest('hex'));
  const received  = Buffer.from(String(secureHash).toLowerCase());
  return computed.length === received.length && crypto.timingSafeEqual(computed, received);
}

const vnpayAmountMatches = (order, params) => Number(params.vnp_Amount) === Math.round(Number(order.total_amount)) * 100;

// vnp_TransactionStatus chỉ vắng trong dev mock; dữ liệu thật đã được chữ ký bảo vệ
const vnpaySucceeded = (params) => params.vnp_ResponseCode === '00'
  && (params.vnp_TransactionStatus === undefined || params.vnp_TransactionStatus === '00');

/** VNPay báo đã thu tiền nhưng đơn đã hủy → không tự mở khóa học, báo admin đối soát (chỉ 1 lần cho mỗi đơn). */
async function flagPaidAfterCancel(order, transactionId) {
  const [r] = await pool.query(
    "UPDATE orders SET transaction_id = ? WHERE id = ? AND status = 'CANCELLED' AND transaction_id IS NULL",
    [transactionId ?? 'UNKNOWN', order.id],
  );
  if (!r.affectedRows) return;
  console.error(`[orders/payment] Đơn ${order.order_code} đã hủy nhưng VNPay báo thu tiền (GD ${transactionId})`);
  const [admins] = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'");
  await Promise.all(admins.map(({ id }) => createNotification(id, {
    type:  'payment_after_cancel',
    title: 'Cần đối soát: đơn đã hủy nhưng VNPay báo thu tiền',
    body:  `Đơn #${order.order_code} — mã GD ${transactionId ?? 'không rõ'}. Kiểm tra và hoàn tiền cho học viên.`,
    link:  '/admin/orders',
  })));
}

/** Áp kết quả thanh toán lên đơn. Dùng chung cho return URL và IPN — gọi lặp lại không xử lý trùng. */
async function applyPaymentResult(order, { success, transactionId }) {
  if (order.status === 'CANCELLED' && success) return flagPaidAfterCancel(order, transactionId);
  if (order.status !== 'PENDING') return undefined;

  if (!success) {
    await pool.query(
      "UPDATE orders SET status = 'FAILED', transaction_id = ? WHERE id = ? AND status = 'PENDING'",
      [transactionId ?? null, order.id],
    );
    return undefined;
  }

  // markOrderPaid chỉ chuyển đơn còn PENDING → return URL và IPN đến cùng lúc không xử lý trùng
  const { changed } = await markOrderPaid(order.id, { transactionId: transactionId ?? null });
  if (changed) {
    // Fire-and-forget notification — outside transaction so it never blocks payment
    setImmediate(() => {
      createNotification(order.user_id, {
        type:  'order_paid',
        title: 'Thanh toán thành công',
        body:  `Đơn hàng #${order.order_code} đã được xác nhận. Bắt đầu học ngay!`,
        link:  '/me',
      });
    });
  }
  return undefined;
}

/** Các khóa có mua được không. Trả { courses } hoặc { reject: { status, message } }. */
async function checkPurchasable(db, userId, ids) {
  const [courses] = await db.query(
    "SELECT id, title, price, instructor_id FROM courses WHERE id IN (?) AND status = 'PUBLISHED'",
    [ids],
  );
  if (courses.length !== ids.length) {
    return { reject: { status: 400, message: 'Một hoặc nhiều khóa học không còn được bán' } };
  }
  if (courses.some((c) => c.instructor_id === userId)) {
    return { reject: { status: 400, message: 'Bạn không thể mua khóa học do chính mình giảng dạy' } };
  }
  const [enrolled] = await db.query(
    'SELECT course_id FROM enrollments WHERE user_id = ? AND course_id IN (?)',
    [userId, ids],
  );
  if (enrolled.length > 0) {
    return { reject: { status: 400, message: 'Bạn đã đăng ký một hoặc nhiều khóa học này rồi' } };
  }
  return { courses };
}

/* ── POST /api/orders ─────────────────────────────────────────── */
async function createOrder(req, res) {
  const { courseIds } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return res.status(400).json({ message: 'courseIds không được rỗng' });
  }

  const ids = [...new Set(courseIds.map(Number))];
  if (ids.some((n) => !Number.isInteger(n) || n <= 0)) {
    return res.status(400).json({ message: 'courseIds không hợp lệ' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    // Khóa dòng user → 2 request đặt đơn đồng thời xử lý lần lượt, không sinh đơn trùng
    await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);

    const { courses, reject } = await checkPurchasable(conn, userId, ids);
    if (reject) {
      await conn.rollback();
      return res.status(reject.status).json({ message: reject.message });
    }

    // Không cho 2 đơn chờ cùng chứa 1 khóa: trả cả 2 sẽ bị thu tiền 2 lần cho 1 khóa học
    const [pending] = await conn.query(
      `SELECT o.id, o.order_code, o.total_amount, o.expires_at, GROUP_CONCAT(oi.course_id) AS courseIds
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ? AND o.status = 'PENDING' AND o.expires_at > NOW()
       GROUP BY o.id`,
      [userId],
    );
    const overlapping = pending
      .map((o) => ({ ...o, courses: o.courseIds.split(',').map(Number) }))
      .filter((o) => o.courses.some((id) => ids.includes(id)));

    const totalAmount = courses.reduce((sum, c) => sum + parseFloat(c.price), 0);
    const same = overlapping.find((o) => o.courses.length === ids.length && o.courses.every((id) => ids.includes(id)));
    // Giá đã đổi từ lúc đặt đơn chờ: giỏ hàng đang hiện giá mới, trả lại đơn cũ sẽ thu theo giá cũ.
    // Không tự hủy đơn cũ (học viên có thể đang mở trang VNPay của nó) — để học viên hủy rồi đặt lại.
    if (same && Math.abs(Number(same.total_amount) - totalAmount) > 0.001) {
      await conn.rollback();
      return res.status(409).json({
        message: `Giá khóa học đã thay đổi kể từ khi bạn đặt đơn #${same.order_code}. Hãy hủy đơn đó rồi đặt lại để thanh toán theo giá hiện tại.`,
        pendingOrderId: same.id,
      });
    }
    if (same) {
      await conn.commit();
      return res.json({
        orderId: same.id,
        orderCode: same.order_code,
        paymentUrl: await checkoutPaymentUrl(same, req),
        expiresAt: same.expires_at,
        reused: true,
      });
    }
    if (overlapping.length) {
      await conn.rollback();
      return res.status(409).json({
        message: 'Bạn đang có đơn chờ thanh toán chứa khóa học này. Hãy thanh toán hoặc hủy đơn đó trước.',
        pendingOrderId: overlapping[0].id,
      });
    }

    const orderCode   = genOrderCode();

    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, order_code, total_amount, status, expires_at)
       VALUES (?, ?, ?, 'PENDING', DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [userId, orderCode, totalAmount],
    );
    const orderId = orderResult.insertId;

    const itemValues = courses.map((c) => [orderId, c.id, c.title, c.price]);
    await conn.query('INSERT INTO order_items (order_id, course_id, course_title, price) VALUES ?', [itemValues]);

    const [[{ expires_at: expiresAt }]] = await conn.query('SELECT expires_at FROM orders WHERE id = ?', [orderId]);

    await conn.commit();

    // Toàn khóa 0đ: VNPay không nhận giao dịch 0đ → hoàn tất luôn, vẫn đi qua markOrderPaid như mọi đơn
    if (totalAmount === 0) {
      await markOrderPaid(orderId, { transactionId: 'FREE' });
      return res.status(201).json({ orderId, orderCode, paymentUrl: null, expiresAt, free: true });
    }

    const paymentUrl = await checkoutPaymentUrl(
      { id: orderId, order_code: orderCode, total_amount: totalAmount, expires_at: expiresAt }, req,
    );
    return res.status(201).json({ orderId, orderCode, paymentUrl, expiresAt });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error('[orders/create]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  } finally {
    if (conn) conn.release();
  }
}

/* ── GET /api/orders/vnpay-ipn ─────────────────────────────────── */
// VNPay gọi thẳng server-to-server → đơn vẫn được xác nhận khi học viên đóng trình duyệt sau khi trả tiền.
// Không có phiên đăng nhập, chữ ký HMAC là bằng chứng duy nhất. Luôn trả HTTP 200 kèm RspCode theo đặc tả VNPay.
async function vnpayIpn(req, res) {
  const params = req.query;
  const reply  = (RspCode, Message) => res.status(200).json({ RspCode, Message });

  try {
    if (!verifyVNPaySignature(params)) return reply('97', 'Invalid signature');

    const [[order]] = await pool.query(
      'SELECT id, user_id, order_code, status, total_amount FROM orders WHERE order_code = ?',
      [params.vnp_TxnRef],
    );
    if (!order) return reply('01', 'Order not found');
    if (!vnpayAmountMatches(order, params)) return reply('04', 'Invalid amount');

    await applyPaymentResult(order, { success: vnpaySucceeded(params), transactionId: params.vnp_TransactionNo });
    return order.status === 'PENDING' ? reply('00', 'Confirm Success') : reply('02', 'Order already confirmed');
  } catch (err) {
    console.error('[orders/ipn]', err);
    return reply('99', 'Unknown error');
  }
}

/* ── POST /api/orders/zalopay-callback ─────────────────────────── */
// ZaloPay gọi server-to-server khi thu tiền thành công (cần ZALOPAY_CALLBACK_URL công khai).
// Chữ ký HMAC-SHA256(key2, data) là bằng chứng duy nhất. return_code: 1 = đã nhận, 2 = đã xử lý trước đó,
// 0 = lỗi tạm (ZaloPay gọi lại), -1 = dữ liệu không hợp lệ.
async function zalopayCallback(req, res) {
  const reply = (code, message) => res.status(200).json({ return_code: code, return_message: message });
  try {
    const data = zalopay.verifyCallback(req.body);
    if (!data) return reply(-1, 'mac not equal');

    const orderId = zalopay.orderIdFrom(data.app_trans_id);
    if (!orderId) return reply(-1, 'order not found');
    const [[order]] = await pool.query(
      'SELECT id, user_id, order_code, status, total_amount FROM orders WHERE id = ?',
      [orderId],
    );
    if (!order) return reply(-1, 'order not found');
    if (Number(data.amount) !== Math.round(Number(order.total_amount))) return reply(-1, 'invalid amount');

    await applyPaymentResult(order, { success: true, transactionId: String(data.zp_trans_id) });
    return order.status === 'PENDING' ? reply(1, 'success') : reply(2, 'already processed');
  } catch (err) {
    console.error('[orders/zalopay-callback]', err);
    return reply(0, 'retry');
  }
}

/**
 * Học viên quay về từ cổng ZaloPay (?apptransid=…&status=…). Không tin query string:
 * hỏi lại ZaloPay bằng API query (ký key1) rồi mới áp kết quả. Đang xử lý → status PROCESSING để FE hỏi lại.
 */
async function verifyZaloPayReturn(req, res) {
  const appTransId = String(req.body.apptransid);
  const orderId = zalopay.orderIdFrom(appTransId);
  if (!zalopay.isConfigured()) return res.status(400).json({ message: 'Cổng ZaloPay chưa được cấu hình' });
  if (!orderId) return res.status(400).json({ message: 'Mã giao dịch ZaloPay không hợp lệ' });

  try {
    const [[order]] = await pool.query(
      'SELECT id, user_id, order_code, status, total_amount FROM orders WHERE id = ?',
      [orderId],
    );
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (order.user_id !== req.user.id) return res.status(403).json({ message: 'Không có quyền' });

    let result;
    try {
      result = await zalopay.queryOrder(appTransId);
    } catch (err) {
      console.error('[orders/zalopay-query]', err.message);
      return res.status(502).json({ message: 'Chưa liên lạc được với ZaloPay để xác nhận giao dịch.' });
    }

    if (result.state === 'PAID') {
      if (result.amount !== Math.round(Number(order.total_amount))) {
        return res.status(400).json({ message: 'Số tiền thanh toán không khớp đơn hàng' });
      }
      await applyPaymentResult(order, { success: true, transactionId: result.zpTransId });
    }
    // Một lần mở cổng thất bại không đánh FAILED cả đơn: học viên có thể mở lại cổng và trả bằng giao dịch khác

    const [[current]] = await pool.query('SELECT status FROM orders WHERE id = ?', [order.id]);
    // Sandbox vẫn trả "đang xử lý" một lúc sau khi học viên bấm hủy → dùng status trên redirect
    // (đã ký key2) để báo thất bại sớm. Không bao giờ dùng nó để mở khóa học.
    const cancelledOnGateway = zalopay.verifyRedirect(req.body) && String(req.body.status) !== '1';
    let status = current.status;
    if (status === 'PENDING') status = result.state === 'FAILED' || cancelledOnGateway ? 'FAILED' : 'PROCESSING';
    return res.json({
      success: current.status === 'PAID',
      status,
      orderCode: order.order_code,
      orderId: order.id,
      amount: Number(order.total_amount),
    });
  } catch (err) {
    console.error('[orders/verify-zalopay]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/orders/:id/cancel ──────────────────────────────── */
async function cancelMyOrder(req, res) {
  const orderId = parseInt(req.params.id, 10);
  const userId  = req.user.id;
  try {
    const [r] = await pool.query(
      "UPDATE orders SET status = 'CANCELLED' WHERE id = ? AND user_id = ? AND status = 'PENDING'",
      [orderId, userId],
    );
    if (r.affectedRows) return res.json({ ok: true });
    const [[order]] = await pool.query('SELECT id FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
    return order
      ? res.status(409).json({ message: 'Chỉ hủy được đơn đang chờ thanh toán' })
      : res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  } catch (err) {
    console.error('[orders/cancel]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/orders/verify ──────────────────────────────────── */
async function verifyPayment(req, res) {
  const params  = req.body ?? {};
  const userId  = req.user.id;

  if (params.apptransid) return verifyZaloPayReturn(req, res);

  const orderCode     = params.vnp_TxnRef;
  const transactionId = params.vnp_TransactionNo;
  // Thanh toán giả lập CHỈ khi chưa cấu hình cổng nào và không chạy production.
  // (Trước đây chỉ cần gửi dev_mock=1 là bỏ qua kiểm tra chữ ký → tự đánh dấu PAID không cần trả tiền.)
  const wantsMock   = params.dev_mock === '1' || params.dev_mock === 1;
  const mockAllowed = activeGateway() === null && process.env.NODE_ENV !== 'production';

  if (!orderCode) return res.status(400).json({ message: 'Thiếu thông tin đơn hàng' });

  try {
    if (vnpayConfigured()) {
      if (!verifyVNPaySignature(params)) {
        return res.status(400).json({ message: 'Chữ ký thanh toán không hợp lệ' });
      }
    } else if (!(wantsMock && mockAllowed)) {
      return res.status(400).json({ message: 'Cổng thanh toán chưa được cấu hình' });
    }

    const [orders] = await pool.query(
      'SELECT id, user_id, order_code, status, total_amount FROM orders WHERE order_code = ?',
      [orderCode],
    );
    if (orders.length === 0) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const order = orders[0];
    if (order.user_id !== userId) return res.status(403).json({ message: 'Không có quyền' });
    if (vnpayConfigured() && !vnpayAmountMatches(order, params)) {
      return res.status(400).json({ message: 'Số tiền thanh toán không khớp đơn hàng' });
    }

    await applyPaymentResult(order, { success: vnpaySucceeded(params), transactionId });

    const [[current]] = await pool.query('SELECT status FROM orders WHERE id = ?', [order.id]);
    return res.json({ success: current.status === 'PAID', status: current.status, orderCode, orderId: order.id });
  } catch (err) {
    console.error('[orders/verify]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/orders/:id/pay ─────────────────────────────────── */
async function payOrder(req, res) {
  const orderId = parseInt(req.params.id, 10);
  const userId  = req.user.id;

  try {
    const [orders] = await pool.query(
      'SELECT id, order_code, status, total_amount, expires_at FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId],
    );
    if (orders.length === 0) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const order = orders[0];
    if (order.status !== 'PENDING') {
      return res.status(400).json({ message: 'Đơn hàng không còn ở trạng thái chờ thanh toán' });
    }

    if (order.expires_at && new Date(order.expires_at).getTime() <= Date.now()) {
      await pool.query("UPDATE orders SET status = 'CANCELLED' WHERE id = ? AND status = 'PENDING'", [orderId]);
      return res.status(410).json({ message: 'Đơn hàng đã hết hạn thanh toán (quá 24h) và đã bị hủy' });
    }

    // Đơn có thể đã nằm đó tới 24h: khóa có thể đã ngừng bán, hoặc học viên đã sở hữu qua đơn khác
    const [items] = await pool.query('SELECT course_id FROM order_items WHERE order_id = ?', [orderId]);
    const { reject } = await checkPurchasable(pool, userId, items.map((i) => i.course_id));
    if (reject) {
      await pool.query("UPDATE orders SET status = 'CANCELLED' WHERE id = ? AND status = 'PENDING'", [orderId]);
      return res.status(409).json({ message: `${reject.message}. Đơn hàng đã được hủy, vui lòng đặt đơn mới.` });
    }

    const paymentUrl = await resolvePaymentUrl(order, req);
    return res.json({ paymentUrl });
  } catch (err) {
    if (err instanceof GatewayError) return res.status(502).json({ message: err.message });
    console.error('[orders/pay]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/orders/me ───────────────────────────────────────── */
async function myOrders(req, res) {
  const userId = req.user.id;
  const { status = '', page = 1, limit = 10 } = req.query;

  const p      = Math.max(1, parseInt(page, 10) || 1);
  const lim    = Math.min(50, Math.max(5, parseInt(limit, 10) || 0));
  const offset = (p - 1) * lim;

  const wheres = ['o.user_id = ?'];
  const params = [userId];

  if (status) {
    wheres.push('o.status = ?');
    params.push(status.toUpperCase());
  }

  const where = wheres.join(' AND ');

  try {
    const [[countRows], [orders]] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM orders o WHERE ${where}`, params),
      pool.query(
        `SELECT o.id, o.order_code, o.total_amount, o.status,
                o.payment_method, o.transaction_id, o.paid_at, o.created_at, o.expires_at
         FROM orders o
         WHERE ${where}
         ORDER BY o.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, lim, offset],
      ),
    ]);

    const total = countRows[0].total;

    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      const [items]  = await pool.query(
        `SELECT order_id, course_id, course_title, price
         FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
        orderIds,
      );
      const itemMap = {};
      items.forEach((i) => {
        if (!itemMap[i.order_id]) itemMap[i.order_id] = [];
        itemMap[i.order_id].push(i);
      });
      orders.forEach((o) => { o.items = itemMap[o.id] ?? []; });
    }

    return res.json({ orders, total, page: p, limit: lim, totalPages: Math.ceil(total / lim) });
  } catch (err) {
    console.error('[orders/me]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/orders/:id ──────────────────────────────────────── */
async function getOrder(req, res) {
  const orderId = parseInt(req.params.id, 10);
  const userId  = req.user.id;

  try {
    const [orders] = await pool.query(
      `SELECT id, order_code, total_amount, status, payment_method,
              transaction_id, paid_at, created_at, expires_at
       FROM orders WHERE id = ? AND user_id = ?`,
      [orderId, userId],
    );
    if (orders.length === 0) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const order  = orders[0];
    const [items] = await pool.query(
      'SELECT course_id, course_title, price FROM order_items WHERE order_id = ?',
      [orderId],
    );
    order.items = items;

    return res.json({ order });
  } catch (err) {
    console.error('[orders/detail]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/transactions/me ─────────────────────────────────── */
async function myTransactions(req, res) {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT id, order_code, total_amount AS amount, status,
              payment_method, transaction_id, paid_at, created_at
       FROM orders
       WHERE user_id = ? AND status IN ('PAID', 'FAILED')
       ORDER BY created_at DESC`,
      [userId],
    );
    return res.json({ transactions: rows });
  } catch (err) {
    console.error('[transactions/me]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { createOrder, verifyPayment, vnpayIpn, zalopayCallback, payOrder, cancelMyOrder, myOrders, getOrder, myTransactions };
