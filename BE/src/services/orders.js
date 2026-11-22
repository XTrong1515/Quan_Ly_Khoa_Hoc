/**
 * Nghiệp vụ đơn hàng dùng chung — MỘT chỗ duy nhất chuyển đơn sang PAID
 * (callback VNPay, admin xác nhận chuyển khoản). Mô hình marketplace: tiền về tài khoản nền tảng,
 * hệ thống ghi nhận phần của giảng viên theo tỷ lệ hoa hồng, admin chi trả định kỳ.
 */
const pool = require('../config/db');

/** % nền tảng giữ lại khi giảng viên không có tỷ lệ riêng (users.commission_rate). */
const defaultCommission = () => Number(process.env.PLATFORM_COMMISSION ?? 30);

/**
 * % phí cổng thanh toán (ZaloPay/VNPay) trừ khỏi giá bán TRƯỚC khi chia hoa hồng.
 * Lấy theo hợp đồng với cổng; chụp vào order_items lúc thanh toán nên đổi về sau không làm sai số cũ.
 */
function paymentFeePercent() {
  const v = Number(process.env.PAYMENT_FEE_PERCENT ?? 0);
  return Number.isFinite(v) && v >= 0 && v < 100 ? v : 0;
}

/** Phí cổng của một khóa (VND, làm tròn đồng). */
const paymentFeeOf = (price, feeRate) => Math.round((Number(price) * (feeRate ?? 0)) / 100);

/** Phần giảng viên nhận (VND, làm tròn đồng) trên số tiền đã trừ phí cổng. Khóa không có giảng viên → nền tảng giữ 100%. */
function splitRevenue(price, { instructorId, commissionRate }) {
  if (!instructorId) return { commissionRate: 100, instructorEarning: 0 };
  const rate = commissionRate ?? defaultCommission();
  return { commissionRate: rate, instructorEarning: Math.round((Number(price) * (100 - rate)) / 100) };
}

/**
 * PENDING → PAID trong 1 transaction:
 *  - UPDATE có điều kiện status = 'PENDING' → 2 callback đồng thời chỉ 1 cái xử lý (idempotent, chống race)
 *  - chụp instructor_id / commission_rate / instructor_earning vào order_items
 *  - paymentFeeRate (% phí cổng, mặc định 0): phí trừ khỏi giá TRƯỚC khi chia — chỉ thanh toán qua cổng truyền vào;
 *    admin xác nhận chuyển khoản, đơn 0đ, seed giữ 0
 *  - tạo enrollment, tăng courses.student_count cho mỗi enrollment MỚI
 * Trả { changed: false } nếu đơn không còn PENDING; { changed: true, order } nếu vừa chuyển.
 */
async function markOrderPaid(orderId, { transactionId = null, paymentFeeRate = 0 } = {}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [upd] = await conn.query(
      "UPDATE orders SET status = 'PAID', transaction_id = ?, paid_at = NOW() WHERE id = ? AND status = 'PENDING'",
      [transactionId, orderId],
    );
    if (!upd.affectedRows) {
      await conn.rollback();
      return { changed: false };
    }

    const [[order]] = await conn.query('SELECT id, user_id, order_code, total_amount FROM orders WHERE id = ?', [orderId]);
    const [items] = await conn.query(
      `SELECT oi.id, oi.course_id, oi.price, c.instructor_id, u.commission_rate
       FROM order_items oi
       JOIN courses c ON c.id = oi.course_id
       LEFT JOIN users u ON u.id = c.instructor_id
       WHERE oi.order_id = ?`,
      [orderId],
    );

    for (const item of items) {
      const fee = paymentFeeOf(item.price, paymentFeeRate);
      const split = splitRevenue(Number(item.price) - fee, {
        instructorId: item.instructor_id,
        commissionRate: item.commission_rate === null ? null : Number(item.commission_rate),
      });
      await conn.query(
        `UPDATE order_items SET instructor_id = ?, commission_rate = ?, instructor_earning = ?,
                payment_fee_rate = ?, payment_fee = ? WHERE id = ?`,
        [item.instructor_id, split.commissionRate, split.instructorEarning, paymentFeeRate, fee, item.id],
      );
      const [enr] = await conn.query(
        'INSERT IGNORE INTO enrollments (user_id, course_id, order_id) VALUES (?, ?, ?)',
        [order.user_id, item.course_id, orderId],
      );
      if (enr.affectedRows) {
        await conn.query('UPDATE courses SET student_count = student_count + 1 WHERE id = ?', [item.course_id]);
      }
    }

    await conn.commit();
    return { changed: true, order };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { markOrderPaid, splitRevenue, defaultCommission, paymentFeePercent, paymentFeeOf };
