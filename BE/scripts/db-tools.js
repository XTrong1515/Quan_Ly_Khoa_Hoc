/**
 * Công cụ CSDL cho dev / máy demo:
 *   node scripts/db-tools.js export-schema      → database/full_schema.sql (cấu trúc DB hiện tại, không dữ liệu)
 *   node scripts/db-tools.js setup [dbName]     → tạo DB mới từ full_schema.sql (từ chối nếu DB đã có bảng)
 *   node scripts/db-tools.js backup             → backups/<db>-<thời điểm>.sql (cấu trúc + dữ liệu)
 *   node scripts/db-tools.js restore <file.sql> [dbName]
 *
 * Dùng mysqldump / mysql của MySQL Server (MYSQL_BIN hoặc thư mục cài mặc định trên Windows).
 * Mật khẩu truyền qua file cấu hình tạm (--defaults-extra-file) → không lộ trên dòng lệnh / danh sách tiến trình.
 */
require('dotenv').config({ quiet: true, path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');

const ROOT = path.join(__dirname, '..');
const SCHEMA_FILE = path.join(ROOT, 'database/full_schema.sql');
const DB = process.env.DB_NAME || 'course_mng';
const conn = {
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
};

function findBin(name) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  const candidates = [
    process.env.MYSQL_BIN && path.join(process.env.MYSQL_BIN, exe),
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\' + exe,
    'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\' + exe,
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  return found ?? exe; // fallback: trong PATH
}

/** Chạy mysqldump / mysql với file cấu hình tạm chứa mật khẩu. */
function runMysqlTool(name, args, { input, output } = {}) {
  const cnf = path.join(os.tmpdir(), `hoisted-${process.pid}-${Date.now()}.cnf`);
  fs.writeFileSync(cnf, `[client]\nhost=${conn.host}\nport=${conn.port}\nuser=${conn.user}\npassword="${conn.password.replace(/"/g, '\\"')}"\n`, { mode: 0o600 });
  try {
    const res = spawnSync(findBin(name), [`--defaults-extra-file=${cnf}`, ...args], {
      input: input ? fs.readFileSync(input) : undefined,
      maxBuffer: 512 * 1024 * 1024,
    });
    if (res.error) throw new Error(`Không chạy được ${name}: ${res.error.message} (đặt MYSQL_BIN = thư mục bin của MySQL)`);
    if (res.status !== 0) throw new Error(`${name} lỗi: ${res.stderr.toString().trim()}`);
    if (output) fs.writeFileSync(output, res.stdout);
    return res.stdout;
  } finally {
    fs.rmSync(cnf, { force: true });
  }
}

async function tableCount(dbName) {
  const c = await mysql.createConnection(conn);
  const [[{ n }]] = await c.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [dbName]);
  await c.end();
  return n;
}

const commands = {
  'export-schema': async () => {
    const dump = runMysqlTool('mysqldump', ['--no-data', '--skip-comments', '--routines=false', '--triggers=false', DB]).toString()
      .replace(/ AUTO_INCREMENT=\d+/g, '');
    const header = `-- Hoisted — cấu trúc CSDL đầy đủ, sinh từ DB "${DB}" lúc ${new Date().toISOString()}\n-- Sinh lại: npm run db:export-schema · Dựng DB mới: npm run db:setup\n\n`;
    fs.writeFileSync(SCHEMA_FILE, header + dump);
    console.log(`✔ database/full_schema.sql — ${(dump.match(/CREATE TABLE/g) || []).length} bảng`);
  },

  setup: async (name = DB) => {
    if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error('Tên DB không hợp lệ');
    if (!fs.existsSync(SCHEMA_FILE)) throw new Error('Chưa có database/full_schema.sql');
    const c = await mysql.createConnection(conn);
    await c.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await c.end();
    if (await tableCount(name) > 0) throw new Error(`DB "${name}" đã có bảng — không ghi đè (dùng DB trống)`);
    runMysqlTool('mysql', [name], { input: SCHEMA_FILE });
    console.log(`✔ Đã dựng DB "${name}" — ${await tableCount(name)} bảng`);
  },

  backup: async () => {
    const dir = path.join(ROOT, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${DB}-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
    runMysqlTool('mysqldump', ['--single-transaction', '--routines', '--triggers', '--default-character-set=utf8mb4', DB], { output: file });
    console.log(`✔ Đã sao lưu ${DB} → ${path.relative(ROOT, file)} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
  },

  restore: async (file, name = DB) => {
    if (!file || !fs.existsSync(file)) throw new Error('Cách dùng: restore <file.sql> [dbName]');
    if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error('Tên DB không hợp lệ');
    const c = await mysql.createConnection(conn);
    await c.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await c.end();
    if (await tableCount(name) > 0) throw new Error(`DB "${name}" đã có bảng — khôi phục vào DB trống để tránh ghi đè`);
    runMysqlTool('mysql', ['--default-character-set=utf8mb4', name], { input: file });
    console.log(`✔ Đã khôi phục vào "${name}" — ${await tableCount(name)} bảng`);
  },
};

const [cmd, ...args] = process.argv.slice(2);
if (!commands[cmd]) {
  console.log('Lệnh: export-schema | setup [dbName] | backup | restore <file.sql> [dbName]');
  process.exit(1);
}
commands[cmd](...args).catch((err) => { console.error('✘', err.message); process.exit(1); });
