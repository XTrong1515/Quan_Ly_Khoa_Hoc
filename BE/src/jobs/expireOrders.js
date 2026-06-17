const pool = require('../config/db');
const { createNotification } = require('../controllers/notificationController');

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 phút

async function cancelExpiredOrders() {
  try {
    const [expired] = await pool.query(
      `SELECT id, user_id, order_code FROM orders
       WHERE status = 'PENDING' AND expires_at IS NOT NULL AND expires_at <= NOW()`,
    );
    if (expired.length === 0) return;

    const ids = expired.map((o) => o.id);
    await pool.query(
      `UPDATE orders SET status = 'CANCELLED' WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );

    expired.forEach((o) => {
      createNotification(o.user_id, {
        type:  'order_expired',
        title: 'Đơn hàng đã bị hủy',
        body:  `Đơn hàng #${o.order_code} đã quá 24h chưa thanh toán nên đã bị tự động hủy.`,
        link:  '/me/orders',
      });
    });

    console.log(`[orders/expire] Cancelled ${expired.length} expired pending order(s)`);
  } catch (err) {
    console.error('[orders/expire]', err);
  }
}

function startExpireOrdersJob() {
  cancelExpiredOrders();
  const timer = setInterval(cancelExpiredOrders, CHECK_INTERVAL_MS);
  timer.unref?.();
}

module.exports = { startExpireOrdersJob, cancelExpiredOrders };
