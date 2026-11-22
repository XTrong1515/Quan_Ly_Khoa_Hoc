/**
 * Migration — phí cổng thanh toán được trừ TRƯỚC khi chia hoa hồng
 * Run: node database/fee_migration.js   (chạy lại nhiều lần vẫn an toàn)
 *
 * order_items.payment_fee_rate / payment_fee — CHỤP LẠI lúc thanh toán (như commission_rate):
 *   instructor_earning = (price − payment_fee) × (100 − commission_rate)%
 * Đơn cũ giữ 0: lúc bán chưa trừ phí, không tính lại doanh thu quá khứ theo cấu hình mới.
 */
require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');

const DB = process.env.DB_NAME || 'course_mng';

async function addColumnIfMissing(table, column, definition) {
  const [rows] = await pool.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [DB, table, column],
  );
  if (rows.length) { console.log(`  skip: ${table}.${column} already exists`); return; }
  await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  added: ${table}.${column}`);
}

async function run() {
  console.log(`=== Payment fee migration (${DB}) ===\n\n[order_items]`);
  await addColumnIfMissing('order_items', 'payment_fee_rate',
    "DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '% phí cổng thanh toán lúc bán' AFTER price");
  await addColumnIfMissing('order_items', 'payment_fee',
    "DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'phí cổng (VND) trừ trước khi chia' AFTER payment_fee_rate");
  console.log('\nDone.');
}

run()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
