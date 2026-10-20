/**
 * Jest setupFiles — chạy trước mỗi file test, trước khi require app.
 * Trỏ DB_NAME sang DB test; dotenv trong src/config/db.js không ghi đè biến đã có.
 */
process.env.DOTENV_CONFIG_QUIET = 'true';
const { TEST_DB } = require('./test-db');

process.env.NODE_ENV = 'test';
process.env.DB_NAME  = TEST_DB;
process.env.CODE_RUN_RATE_LIMIT = '1000'; // test giới hạn tần suất riêng trong exercise.test.js
process.env.CODE_RUNNER = 'isolated-vm';
