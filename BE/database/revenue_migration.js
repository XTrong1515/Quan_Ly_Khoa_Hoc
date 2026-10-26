/**
 * Migration — Giai đoạn 5: chia sẻ doanh thu & đối soát giảng viên (mô hình marketplace)
 * Run: node database/revenue_migration.js   (chạy lại nhiều lần vẫn an toàn)
 *
 * order_items.instructor_id / commission_rate / instructor_earning — CHỤP LẠI tại thời điểm thanh toán,
 *   nên đổi tỷ lệ hoa hồng sau này không làm sai doanh thu cũ.
 * users.bank_*        — tài khoản nhận tiền của giảng viên
 * instructor_payouts  — các lần admin chi trả (PENDING → PAID)
 *
 * Backfill: đơn PAID cũ chưa có số liệu chụp → tính theo tỷ lệ hiện tại (ghi chú trong báo cáo).
 */
require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');

const DB = process.env.DB_NAME || 'course_mng';
const DEFAULT_COMMISSION = Number(process.env.PLATFORM_COMMISSION ?? 30);

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
  console.log(`=== Revenue migration (${DB}) ===\n\n[order_items]`);
  await addColumnIfMissing('order_items', 'instructor_id',      'INT NULL');
  await addColumnIfMissing('order_items', 'commission_rate',    'DECIMAL(5,2) NULL COMMENT "% nền tảng giữ lại"');
  await addColumnIfMissing('order_items', 'instructor_earning', 'DECIMAL(12,2) NULL');

  const [[idx]] = await pool.query(
    "SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'order_items' AND INDEX_NAME = 'idx_instructor'",
    [DB],
  );
  if (!idx.n) { await pool.query('ALTER TABLE order_items ADD INDEX idx_instructor (instructor_id)'); console.log('  added: idx_instructor'); }

  console.log('\n[users]');
  await addColumnIfMissing('users', 'bank_name',           'VARCHAR(100) NULL');
  await addColumnIfMissing('users', 'bank_account_number', 'VARCHAR(30) NULL');
  await addColumnIfMissing('users', 'bank_account_name',   'VARCHAR(100) NULL');

  console.log('\n[instructor_payouts]');
  const [created] = await pool.query(`
    CREATE TABLE IF NOT EXISTS instructor_payouts (
      id             INT PRIMARY KEY AUTO_INCREMENT,
      instructor_id  INT NOT NULL,
      amount         DECIMAL(12,2) NOT NULL,
      period_from    DATE NULL,
      period_to      DATE NULL,
      status         ENUM('PENDING','PAID') NOT NULL DEFAULT 'PENDING',
      bank_snapshot  VARCHAR(255) NULL,
      bank_ref       VARCHAR(100) NULL,
      note           VARCHAR(500) NULL,
      created_by     INT NULL,
      paid_by        INT NULL,
      paid_at        TIMESTAMP NULL,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instructor_id) REFERENCES users(id),
      INDEX idx_instructor_status (instructor_id, status)
    )`);
  console.log(`  ${created.warningStatus ? 'skip' : 'created'}: instructor_payouts`);

  console.log('\n[backfill đơn PAID cũ]');
  const [backfill] = await pool.query(
    `UPDATE order_items oi
     JOIN orders o  ON o.id = oi.order_id AND o.status = 'PAID'
     JOIN courses c ON c.id = oi.course_id
     LEFT JOIN users u ON u.id = c.instructor_id
     SET oi.instructor_id      = c.instructor_id,
         oi.commission_rate    = IF(c.instructor_id IS NULL, 100, COALESCE(u.commission_rate, ?)),
         oi.instructor_earning = IF(c.instructor_id IS NULL, 0, ROUND(oi.price * (100 - COALESCE(u.commission_rate, ?)) / 100, 0))
     WHERE oi.commission_rate IS NULL`,
    [DEFAULT_COMMISSION, DEFAULT_COMMISSION],
  );
  console.log(`  ${backfill.affectedRows} dòng order_items được tính (hoa hồng mặc định ${DEFAULT_COMMISSION}%)`);
  console.log('\nDone.');
}

run()
  .catch((err) => { console.error('Migration failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
