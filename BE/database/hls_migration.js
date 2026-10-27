/**
 * Migration — video HLS mã hóa AES-128
 * Run: node database/hls_migration.js   (chạy lại nhiều lần vẫn an toàn)
 *
 * lessons.hls_status  NONE | PROCESSING | READY | FAILED
 * lessons.hls_prefix  thư mục chứa index.m3u8 + seg_*.ts trên object storage (private)
 * lessons.hls_key     khóa AES-128 của video, ĐÃ MÃ HÓA bằng HLS_MASTER_KEY (AES-256-GCM) — không lưu khóa thô
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
  console.log(`=== HLS migration (${DB}) ===\n\n[lessons]`);
  await addColumnIfMissing('lessons', 'hls_status', "ENUM('NONE','PROCESSING','READY','FAILED') NOT NULL DEFAULT 'NONE' AFTER video_key");
  await addColumnIfMissing('lessons', 'hls_prefix', 'VARCHAR(500) NULL AFTER hls_status');
  await addColumnIfMissing('lessons', 'hls_key',    'VARCHAR(255) NULL AFTER hls_prefix');
  await addColumnIfMissing('lessons', 'hls_error',  'VARCHAR(500) NULL AFTER hls_key');
  console.log('\nDone.');
}

run()
  .catch((err) => { console.error('Migration failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
