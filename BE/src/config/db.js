require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'course_mng',
  waitForConnections: true,
  connectionLimit: 10,
  // Prevent stale connections: MySQL closes idle connections after wait_timeout (default 8h).
  // enableKeepAlive sends periodic TCP keepalives so the pool never holds a dead connection.
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

module.exports = pool;
