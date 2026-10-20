/**
 * Migration — Giai đoạn 3: bài tập lập trình JavaScript (chấm tự động)
 * Run: node database/exercise_migration.js   (chạy lại nhiều lần vẫn an toàn)
 *
 * coding_exercises     — 1 bài tập / bài học: đề, code mẫu, lời giải (ẩn), tên hàm cần viết
 * exercise_test_cases  — input (mảng tham số JSON) + expected (JSON); is_hidden = test ẩn khi chấm
 * code_submissions     — lịch sử nộp bài của học viên
 */
require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');

const TABLES = {
  coding_exercises: `
    CREATE TABLE IF NOT EXISTS coding_exercises (
      id              INT PRIMARY KEY AUTO_INCREMENT,
      lesson_id       INT NOT NULL UNIQUE,
      title           VARCHAR(255) NOT NULL,
      description_md  TEXT NOT NULL,
      starter_code    TEXT,
      solution_code   TEXT,
      function_name   VARCHAR(100) NOT NULL,
      time_limit_ms   INT NOT NULL DEFAULT 1000,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    )`,
  exercise_test_cases: `
    CREATE TABLE IF NOT EXISTS exercise_test_cases (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      exercise_id   INT NOT NULL,
      input_json    TEXT NOT NULL,
      expected_json TEXT NOT NULL,
      is_hidden     BOOLEAN NOT NULL DEFAULT FALSE,
      order_index   INT NOT NULL DEFAULT 0,
      FOREIGN KEY (exercise_id) REFERENCES coding_exercises(id) ON DELETE CASCADE,
      INDEX idx_exercise (exercise_id, order_index)
    )`,
  code_submissions: `
    CREATE TABLE IF NOT EXISTS code_submissions (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      user_id       INT NOT NULL,
      exercise_id   INT NOT NULL,
      source_code   MEDIUMTEXT NOT NULL,
      status        ENUM('ACCEPTED','WRONG_ANSWER','RUNTIME_ERROR','TIME_LIMIT','MEMORY_LIMIT','COMPILE_ERROR','ERROR') NOT NULL,
      passed        INT NOT NULL DEFAULT 0,
      total         INT NOT NULL DEFAULT 0,
      exec_time_ms  INT NULL,
      runner        VARCHAR(20) NOT NULL DEFAULT 'isolated-vm',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES coding_exercises(id) ON DELETE CASCADE,
      INDEX idx_user_exercise (user_id, exercise_id, created_at)
    )`,
};

async function run() {
  console.log(`=== Exercise migration (${process.env.DB_NAME || 'course_mng'}) ===`);
  for (const [name, sql] of Object.entries(TABLES)) {
    const [result] = await pool.query(sql);
    console.log(`  ${result.warningStatus ? 'skip' : 'created'}: ${name}`);
  }
  console.log('\nDone.');
}

run()
  .catch((err) => { console.error('Migration failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
