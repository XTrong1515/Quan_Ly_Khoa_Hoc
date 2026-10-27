/**
 * Migration — đơn đăng ký làm giảng viên
 * Run: node database/application_migration.js   (chạy lại nhiều lần vẫn an toàn)
 */
require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');

async function run() {
  console.log(`=== Instructor application migration (${process.env.DB_NAME || 'course_mng'}) ===`);
  const [r] = await pool.query(`
    CREATE TABLE IF NOT EXISTS instructor_applications (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      user_id       INT NOT NULL,
      headline      VARCHAR(255) NOT NULL,
      expertise     VARCHAR(255) NOT NULL,
      bio           TEXT NOT NULL,
      portfolio_url VARCHAR(500) NULL,
      course_idea   TEXT NULL,
      status        ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
      admin_note    VARCHAR(500) NULL,
      reviewed_by   INT NULL,
      reviewed_at   TIMESTAMP NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_status (status, created_at),
      INDEX idx_user (user_id, created_at)
    )`);
  console.log(`  ${r.warningStatus ? 'skip' : 'created'}: instructor_applications`);

  // Nội dung bài học soạn bằng Markdown / AI có thể dài: TEXT (64 KB ≈ 20k ký tự tiếng Việt) → MEDIUMTEXT
  const [[col]] = await pool.query(
    "SELECT DATA_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lessons' AND COLUMN_NAME = 'content'",
    [process.env.DB_NAME || 'course_mng'],
  );
  if (col?.t === 'text') {
    await pool.query('ALTER TABLE lessons MODIFY content MEDIUMTEXT NULL');
    console.log('  modified: lessons.content → MEDIUMTEXT');
  } else {
    console.log(`  skip: lessons.content is ${col?.t}`);
  }
  console.log('\nDone.');
}

run()
  .catch((err) => { console.error('Migration failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
