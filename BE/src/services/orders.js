/**
 * Nghiệp vụ đơn hàng dùng chung — MỘT chỗ duy nhất chuyển đơn sang PAID
 * (callback VNPay, admin xác nhận chuyển khoản). Mô hình marketplace: tiền về tài khoản nền tảng,
 * hệ thống ghi nhận phần của giảng viên theo tỷ lệ hoa hồng, admin chi trả định kỳ.
 */
const pool = require('../config/db');

/** % nền tảng giữ lại khi giảng viên không có tỷ lệ riêng (users.commission_rate). */
const defaultCommission = () => Number(process.env.PLATFORM_COMMISSION ?? 30);

/** Phần giảng viên nhận (VND, làm tròn đồng). Khóa không có giảng viên → nền tảng giữ 100%. */
function splitRevenue(price, { instructorId, commissionRate }) {
  if (!instructorId) return { commissionRate: 100, instructorEarning: 0 };
  const rate = commissionRate ?? defaultCommission();
  return { commissionRate: rate, instructorEarning: Math.round((Number(price) * (100 - rate)) / 100) };
}

/**
 * PENDING → PAID trong 1 transaction:
 *  - UPDATE có điều kiện status = 'PENDING' → 2 callback đồng thời chỉ 1 cái xử lý (idempotent, chống race)
 *  - chụp instructor_id / commission_rate / instructor_earning vào order_items
 *  - tạo enrollment, tăng courses.student_count cho mỗi enrollment MỚI
 * Trả { changed: false } nếu đơn không còn PENDING; { changed: true, order } nếu vừa chuyển.
 */
async function markOrderPaid(orderId, { transactionId = null } = {}) {
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
      const split = splitRevenue(item.price, {
        instructorId: item.instructor_id,
        commissionRate: item.commission_rate === null ? null : Number(item.commission_rate),
      });
      await conn.query(
        'UPDATE order_items SET instructor_id = ?, commission_rate = ?, instructor_earning = ? WHERE id = ?',
        [item.instructor_id, split.commissionRate, split.instructorEarning, item.id],
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

module.exports = { markOrderPaid, splitRevenue, defaultCommission };
