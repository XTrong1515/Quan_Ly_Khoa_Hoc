/**
 * Migration — ẩn bài học (xóa mềm)
 * Run: node database/lesson_visibility_migration.js   (chạy lại nhiều lần vẫn an toàn)
 *
 * lessons.hidden_at — bài đã có dữ liệu học viên (tiến độ, lượt làm quiz, bài nộp, thảo luận, ghi chú)
 * thì không xóa thật được (xóa cascade sẽ mất lịch sử người đã mua). Ẩn thay vì xóa:
 *   - học viên không thấy / không mở được, không tính vào tổng số bài và % tiến độ
 *   - dữ liệu cũ giữ nguyên, hiện lại được (hidden_at = NULL)
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

async function addIndexIfMissing(table, index, columns) {
  const [rows] = await pool.query(
    'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
    [DB, table, index],
  );
  if (rows.length) { console.log(`  skip: index ${index} already exists`); return; }
  await pool.query(`ALTER TABLE ${table} ADD INDEX ${index} (${columns})`);
  console.log(`  added: index ${index}`);
}

async function run() {
  console.log(`=== Lesson visibility migration (${DB}) ===\n\n[lessons]`);
  await addColumnIfMissing('lessons', 'hidden_at',
    "DATETIME NULL DEFAULT NULL COMMENT 'NULL = hiển thị; có giá trị = đã ẩn với học viên (xóa mềm)'");
  await addIndexIfMissing('lessons', 'idx_lessons_course_hidden', 'course_id, hidden_at');
  console.log('\nDone.');
}

run()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
