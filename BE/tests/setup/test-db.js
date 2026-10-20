/**
 * Test DB config — dùng chung cho global-setup và env.
 * DB test = DB_NAME_TEST, mặc định `${DB_NAME}_test` (vd course_mng_test).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), quiet: true });

const SOURCE_DB = process.env.DB_NAME || 'course_mng';
const TEST_DB   = process.env.DB_NAME_TEST || `${SOURCE_DB}_test`;

// Chặn tuyệt đối việc test chạy (và TRUNCATE) trên DB thật
if (TEST_DB === SOURCE_DB || !TEST_DB.endsWith('_test')) {
  throw new Error(`DB test không hợp lệ: "${TEST_DB}" — phải khác DB dev và kết thúc bằng "_test"`);
}

const connectionConfig = {
  host:     process.env.DB_HOST || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

module.exports = { SOURCE_DB, TEST_DB, connectionConfig };
