const crypto = require('crypto');
const pool   = require('../config/db');
const { createNotification } = require('./notificationController');

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

function buildVNPayUrl(orderCode, amountVND, ipAddr) {
  const now  = new Date();
  const pad  = (n) => String(n).padStart(2, '0');
  const createDate = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

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
    vnp_CreateDate: createDate,
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
  const computed  = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  return computed === secureHash;
}

/* ── POST /api/orders ─────────────────────────────────────────── */
async function createOrder(req, res) {
  const { courseIds } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return res.status(400).json({ message: 'courseIds không được rỗng' });
  }

  const ids = courseIds.map(Number).filter((n) => n > 0);
  if (ids.length !== courseIds.length) {
    return res.status(400).json({ message: 'courseIds không hợp lệ' });
  }

  try {
    const placeholders = ids.map(() => '?').join(',');

    const [courses] = await pool.query(
      `SELECT id, title, price FROM courses WHERE id IN (${placeholders}) AND status = 'PUBLISHED'`,
      ids,
    );
    if (courses.length !== ids.length) {
      return res.status(400).json({ message: 'Một hoặc nhiều khóa học không tồn tại' });
    }

    const [enrolled] = await pool.query(
      `SELECT course_id FROM enrollments WHERE user_id = ? AND course_id IN (${placeholders})`,
      [userId, ...ids],
    );
    if (enrolled.length > 0) {
      return res.status(400).json({ message: 'Bạn đã đăng ký một hoặc nhiều khóa học này rồi' });
    }

    const totalAmount = courses.reduce((sum, c) => sum + parseFloat(c.price), 0);
    const orderCode   = genOrderCode();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [orderResult] = await conn.query(
        `INSERT INTO orders (user_id, order_code, total_amount, status) VALUES (?, ?, ?, 'PENDING')`,
        [userId, orderCode, totalAmount],
      );
      const orderId = orderResult.insertId;

      const itemValues = courses.map((c) => [orderId, c.id, c.title, c.price]);
      await conn.query('INSERT INTO order_items (order_id, course_id, course_title, price) VALUES ?', [itemValues]);

      await conn.commit();

      let ipAddr = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
      // VNPay requires IPv4 — normalize IPv6 loopback addresses
      if (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') ipAddr = '127.0.0.1';
      else if (ipAddr.startsWith('::ffff:')) ipAddr = ipAddr.slice(7);

      let paymentUrl;
      if (TMN_CODE && HASH_SECRET) {
        paymentUrl = buildVNPayUrl(orderCode, totalAmount, ipAddr);
      } else {
        // Dev fallback: bypass VNPay, simulate success redirect
        const mockParams = new URLSearchParams({
          vnp_TxnRef:        orderCode,
          vnp_ResponseCode:  '00',
          vnp_Amount:        String(Math.round(totalAmount) * 100),
          vnp_TransactionNo: `DEV${Date.now()}`,
          dev_mock:          '1',
        });
        paymentUrl = `/payment/result?${mockParams.toString()}`;
      }

      return res.status(201).json({ orderId, orderCode, paymentUrl });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[orders/create]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/orders/verify ──────────────────────────────────── */
async function verifyPayment(req, res) {
  const params  = req.body ?? {};
  const userId  = req.user.id;

  const orderCode     = params.vnp_TxnRef;
  const responseCode  = params.vnp_ResponseCode;
  const transactionId = params.vnp_TransactionNo;
  const isDev         = params.dev_mock === '1' || params.dev_mock === 1;

  if (!orderCode) return res.status(400).json({ message: 'Thiếu thông tin đơn hàng' });

  try {
    // Verify VNPay signature (skip for dev mock or unconfigured)
    if (!isDev && TMN_CODE && HASH_SECRET) {
      if (!verifyVNPaySignature(params)) {
        return res.status(400).json({ message: 'Chữ ký thanh toán không hợp lệ' });
      }
    }

    const [orders] = await pool.query(
      'SELECT id, user_id, status, total_amount FROM orders WHERE order_code = ?',
      [orderCode],
    );
    if (orders.length === 0) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const order = orders[0];
    if (order.user_id !== userId) return res.status(403).json({ message: 'Không có quyền' });

    // Already processed (idempotent)
    if (order.status !== 'PENDING') {
      return res.json({ success: order.status === 'PAID', status: order.status, orderCode });
    }

    const success = responseCode === '00';
    const conn    = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (success) {
        await conn.query(
          `UPDATE orders SET status = 'PAID', transaction_id = ?, paid_at = NOW() WHERE id = ?`,
          [transactionId ?? null, order.id],
        );

        const [items] = await conn.query('SELECT course_id FROM order_items WHERE order_id = ?', [order.id]);
        if (items.length > 0) {
          const enrollValues = items.map((i) => [userId, i.course_id, order.id]);
          await conn.query('INSERT IGNORE INTO enrollments (user_id, course_id, order_id) VALUES ?', [enrollValues]);
        }

        // Fire-and-forget notification — outside transaction so it never blocks payment
        setImmediate(() => {
          createNotification(userId, {
            type:  'order_paid',
            title: 'Thanh toán thành công',
            body:  `Đơn hàng #${order.order_code} đã được xác nhận. Bắt đầu học ngay!`,
            link:  '/me',
          });
        });
      } else {
        await conn.query(
          `UPDATE orders SET status = 'FAILED', transaction_id = ? WHERE id = ?`,
          [transactionId ?? null, order.id],
        );
      }

      await conn.commit();
      return res.json({ success, status: success ? 'PAID' : 'FAILED', orderCode, orderId: order.id });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[orders/verify]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/orders/me ───────────────────────────────────────── */
async function myOrders(req, res) {
  const userId = req.user.id;
  const { status = '', page = 1, limit = 10 } = req.query;

  const p      = Math.max(1, parseInt(page, 10));
  const lim    = Math.min(50, Math.max(5, parseInt(limit, 10)));
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
                o.payment_method, o.transaction_id, o.paid_at, o.created_at
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
              transaction_id, paid_at, created_at
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

module.exports = { createOrder, verifyPayment, myOrders, getOrder, myTransactions };
