/**
 * Migration — Giai đoạn 2: video / tài liệu lưu trên object storage (MinIO / R2 / S3)
 * Run: node database/media_migration.js   (chạy lại nhiều lần vẫn an toàn)
 *
 * lessons.video_key, attachment_key — object key trong bucket private (không lưu URL công khai)
 * lessons.attachment_name           — tên file gốc để hiển thị / tải về
 * video_url / attachment_url giữ lại cho nguồn ngoài (YouTube, link sẵn có).
 */
require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');

const DB = process.env.DB_NAME || 'course_mng';

async function addColumnIfMissing(table, column, definition) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB, table, column],
  );
  if (rows.length) {
    console.log(`  skip: ${table}.${column} already exists`);
    return;
  }
  await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  added: ${table}.${column}`);
}

async function run() {
  console.log(`=== Media migration (${DB}) ===\n\n[lessons]`);
  await addColumnIfMissing('lessons', 'video_key',       'VARCHAR(500) NULL AFTER video_url');
  await addColumnIfMissing('lessons', 'attachment_key',  'VARCHAR(500) NULL AFTER attachment_url');
  await addColumnIfMissing('lessons', 'attachment_name', 'VARCHAR(255) NULL AFTER attachment_key');
  console.log('\nDone.');
}

run()
  .catch((err) => { console.error('Migration failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
