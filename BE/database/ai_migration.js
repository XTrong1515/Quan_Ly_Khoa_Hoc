/**
 * Migration — Giai đoạn 4: trợ lý AI
 * Run: node database/ai_migration.js   (chạy lại nhiều lần vẫn an toàn)
 *
 * ai_conversations — hội thoại với trợ lý; kind = LEARNER (trợ lý học viên) | INSTRUCTOR (trợ lý giảng viên)
 * ai_messages      — từng tin nhắn; courses = khóa học được gợi ý (JSON), kèm số token / độ trễ để đánh giá
 */
require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');

const TABLES = {
  ai_conversations: `
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id          INT PRIMARY KEY AUTO_INCREMENT,
      user_id     INT NOT NULL,
      title       VARCHAR(120) NOT NULL,
      kind        ENUM('LEARNER','INSTRUCTOR') NOT NULL DEFAULT 'LEARNER',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_kind_updated (user_id, kind, updated_at)
    )`,
  ai_messages: `
    CREATE TABLE IF NOT EXISTS ai_messages (
      id               INT PRIMARY KEY AUTO_INCREMENT,
      conversation_id  INT NOT NULL,
      role             ENUM('user','assistant') NOT NULL,
      content          TEXT NOT NULL,
      courses          JSON NULL,
      tokens_in        INT NULL,
      tokens_out       INT NULL,
      latency_ms       INT NULL,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
      INDEX idx_conversation (conversation_id, id)
    )`,
};

async function run() {
  console.log(`=== AI migration (${process.env.DB_NAME || 'course_mng'}) ===`);
  for (const [name, sql] of Object.entries(TABLES)) {
    const [result] = await pool.query(sql);
    console.log(`  ${result.warningStatus ? 'skip' : 'created'}: ${name}`);
  }

  // Cột thêm sau khi bảng đã có dữ liệu (chạy lại an toàn: bỏ qua cột đã tồn tại)
  const COLUMNS = [
    // trợ lý giảng viên — hội thoại cũ đều là của học viên
    ['ai_conversations', 'kind', `ALTER TABLE ai_conversations
      ADD COLUMN kind ENUM('LEARNER','INSTRUCTOR') NOT NULL DEFAULT 'LEARNER' AFTER title,
      ADD INDEX idx_user_kind_updated (user_id, kind, updated_at)`],
    // hội thoại mở từ trang học → AI có ngữ cảnh bài học khi hỏi tiếp
    ['ai_conversations', 'lesson_id', `ALTER TABLE ai_conversations
      ADD COLUMN lesson_id INT NULL AFTER kind,
      ADD CONSTRAINT fk_ai_conversations_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL`],
    // người dùng đánh giá câu trả lời: 1 = hữu ích, -1 = chưa tốt
    ['ai_messages', 'feedback', 'ALTER TABLE ai_messages ADD COLUMN feedback TINYINT NULL AFTER latency_ms'],
  ];
  for (const [table, column, sql] of COLUMNS) {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    if (cols.length) { console.log(`  skip: ${table}.${column}`); continue; }
    await pool.query(sql);
    console.log(`  added: ${table}.${column}`);
  }
  console.log('\nDone.');
}

run()
  .catch((err) => { console.error('Migration failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
