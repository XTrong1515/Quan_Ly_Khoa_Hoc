/**
 * Jest globalSetup — chạy 1 lần trước toàn bộ test.
 * Sao chép CẤU TRÚC bảng (không có dữ liệu) từ DB dev sang DB test,
 * nên schema test luôn khớp DB đang chạy dù các file migration lệch nhau.
 */
const mysql = require('mysql2/promise');
const { SOURCE_DB, TEST_DB, connectionConfig } = require('./test-db');

module.exports = async function globalSetup() {
  const conn = await mysql.createConnection(connectionConfig);
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    const [oldTables] = await conn.query(
      'SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [TEST_DB],
    );
    for (const { t } of oldTables) await conn.query(`DROP TABLE \`${TEST_DB}\`.\`${t}\``);

    const [tables] = await conn.query(
      "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'",
      [SOURCE_DB],
    );
    await conn.query(`USE \`${TEST_DB}\``);
    for (const { t } of tables) {
      const [[row]] = await conn.query(`SHOW CREATE TABLE \`${SOURCE_DB}\`.\`${t}\``);
      // Bỏ AUTO_INCREMENT=n để id bắt đầu lại từ 1
      await conn.query(row['Create Table'].replace(/ AUTO_INCREMENT=\d+/, ''));
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    await conn.end();
  }
};
