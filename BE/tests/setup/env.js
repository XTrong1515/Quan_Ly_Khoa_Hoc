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
process.env.AI_CHAT_RATE_LIMIT = '1000';
process.env.AI_GENERATE_RATE_LIMIT = '1000';
process.env.AUTH_LOGIN_RATE_LIMIT = '1000';
process.env.AUTH_REGISTER_RATE_LIMIT = '1000';
process.env.AUTH_RESET_RATE_LIMIT = '1000';
process.env.AUTH_REFRESH_RATE_LIMIT = '1000';
// Mặc định test chạy như khi CHƯA cấu hình VNPay (dotenv không ghi đè biến đã tồn tại);
// test riêng tự bật VNPay để kiểm tra chữ ký
process.env.VNPAY_TMN_CODE = '';
process.env.VNPAY_HASH_SECRET = '';
