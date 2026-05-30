const pool = require('../config/db');

async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT DATABASE() AS db, VERSION() AS version, NOW() AS time');
    const { db, version, time } = rows[0];
    console.log('Ket noi thanh cong!');
    console.log(`  Database : ${db}`);
    console.log(`  MySQL    : ${version}`);
    console.log(`  Server time: ${time}`);
  } catch (err) {
    console.error('Ket noi that bai:', err.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

testConnection();
