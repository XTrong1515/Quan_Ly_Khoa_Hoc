/**
 * Seed — tạo tài khoản Giảng viên từ courses.instructor_name có sẵn và gán courses.instructor_id.
 * Run: node database/seed_instructors.js   (chạy sau instructor_migration.js; chạy lại vẫn an toàn)
 *
 * Email: <ten-khong-dau>@hoisted.dev — mật khẩu: SEED_INSTRUCTOR_PASSWORD (mặc định Instructor@123)
 * CHỈ dùng cho môi trường dev/demo.
 */
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const pool   = require('../src/config/db');

const PASSWORD = process.env.SEED_INSTRUCTOR_PASSWORD || 'Instructor@123';

const toEmail = (name) => `${name
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, '.')
  .replace(/^\.|\.$/g, '')}@hoisted.dev`;

async function run() {
  const [names] = await pool.query(
    `SELECT DISTINCT instructor_name AS name FROM courses
     WHERE instructor_id IS NULL AND instructor_name IS NOT NULL AND instructor_name <> ''`,
  );
  if (!names.length) {
    console.log('Không có khóa học nào cần gán giảng viên.');
    return;
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  for (const { name } of names) {
    const email = toEmail(name);
    const [existing] = await pool.query('SELECT id, role FROM users WHERE email = ?', [email]);
    let userId;
    if (existing.length) {
      userId = existing[0].id;
      if (existing[0].role === 'USER') await pool.query("UPDATE users SET role = 'INSTRUCTOR' WHERE id = ?", [userId]);
    } else {
      const [result] = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, status, headline)
         VALUES (?, ?, ?, 'INSTRUCTOR', 'ACTIVE', ?)`,
        [email, hash, name, 'Giảng viên JavaScript tại Hoisted'],
      );
      userId = result.insertId;
    }
    const [upd] = await pool.query(
      'UPDATE courses SET instructor_id = ? WHERE instructor_id IS NULL AND instructor_name = ?',
      [userId, name],
    );
    console.log(`  ${name.padEnd(16)} → ${email.padEnd(28)} (#${userId}, ${upd.affectedRows} khóa học)`);
  }
  console.log(`\nMật khẩu đăng nhập các tài khoản mới: ${PASSWORD}`);
}

run()
  .catch((err) => { console.error('Seed failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
