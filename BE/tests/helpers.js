/**
 * Helpers dùng chung cho test API.
 */
const bcrypt = require('bcryptjs');
const pool   = require('../src/config/db');
const { signAccess } = require('../src/utils/jwt');

const DEFAULT_PASSWORD = 'Passw0rd!';

/** Xóa sạch dữ liệu mọi bảng trong DB test (giữ cấu trúc). */
async function resetDb() {
  const [tables] = await pool.query(
    "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'",
  );
  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { t } of tables) await conn.query(`TRUNCATE TABLE \`${t}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    conn.release();
  }
}

let seq = 0;

/** Tạo user trực tiếp trong DB. Trả về { id, email, role, password }. */
async function createUser({ role = 'USER', status = 'ACTIVE', password = DEFAULT_PASSWORD, email, name } = {}) {
  seq += 1;
  const userEmail = (email || `user${seq}_${Date.now()}@test.local`).toLowerCase();
  const hash = await bcrypt.hash(password, 4); // cost thấp cho test nhanh
  const [result] = await pool.query(
    'INSERT INTO users (email, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, ?)',
    [userEmail, hash, name || `Test User ${seq}`, role, status],
  );
  return { id: result.insertId, email: userEmail, role, password };
}

/** Header Authorization cho user. */
function authHeader(user) {
  return { Authorization: `Bearer ${signAccess({ id: user.id, email: user.email, role: user.role })}` };
}

async function createCategory() {
  seq += 1;
  const [result] = await pool.query('INSERT INTO categories (name, slug) VALUES (?, ?)', [`Cat ${seq}`, `cat-${seq}-${Date.now()}`]);
  return { id: result.insertId };
}

/** Tạo khóa học trực tiếp trong DB (bỏ qua quy trình duyệt). */
async function createCourse({ instructor, status = 'DRAFT', price = 100000, categoryId } = {}) {
  seq += 1;
  const catId = categoryId ?? (await createCategory()).id;
  const slug = `course-${seq}-${Date.now()}`;
  const [result] = await pool.query(
    `INSERT INTO courses (title, slug, price, category_id, instructor_id, instructor_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [`Course ${seq}`, slug, price, catId, instructor?.id ?? null, instructor ? `Instructor ${instructor.id}` : null, status],
  );
  return { id: result.insertId, slug, categoryId: catId };
}

async function createLesson(courseId, { sectionId = null } = {}) {
  seq += 1;
  const [result] = await pool.query(
    'INSERT INTO lessons (course_id, section_id, title, order_index) VALUES (?, ?, ?, ?)',
    [courseId, sectionId, `Lesson ${seq}`, seq],
  );
  return { id: result.insertId };
}

module.exports = {
  pool, resetDb, createUser, authHeader, DEFAULT_PASSWORD,
  createCategory, createCourse, createLesson,
};
