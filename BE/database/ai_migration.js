/**
 * Migration — Giai đoạn 4: trợ lý AI
 * Run: node database/ai_migration.js   (chạy lại nhiều lần vẫn an toàn)
 *
 * ai_conversations — hội thoại của học viên với trợ lý
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
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_updated (user_id, updated_at)
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
  console.log('\nDone.');
}

run()
  .catch((err) => { console.error('Migration failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
