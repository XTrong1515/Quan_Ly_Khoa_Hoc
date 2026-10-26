/**
 * Seed — dữ liệu DEMO cho buổi bảo vệ (chỉ dev). Run: node --no-node-snapshot database/seed_demo.js
 * Chạy sau seed_instructors.js. Đã seed rồi (có tài khoản demo.hocvien@hoisted.dev) thì bỏ qua.
 *
 * - 1 học viên demo: đã mua 2 khóa, có tiến độ học
 * - Khóa học ở các trạng thái DRAFT / PENDING_REVIEW / REJECTED để demo quy trình duyệt
 * - ~25 người mua, đơn PAID rải đều 60 ngày gần nhất → biểu đồ doanh thu admin / giảng viên
 * - Tài khoản ngân hàng + 1 lần chi trả cho giảng viên demo
 */
require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');
const { hash } = require('../src/utils/hash');
const { markOrderPaid } = require('../src/services/orders');
const { completeLesson } = require('../src/controllers/lessonProgressController');

const PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Demo@12345';
const STUDENT_EMAIL = 'demo.hocvien@hoisted.dev';
const INSTRUCTOR_EMAIL = 'will.sentance@hoisted.dev';

// Random có seed → chạy trên máy khác ra cùng dữ liệu
let seed = 20261204;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const FIRST = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hưng', 'Khánh', 'Lan', 'Linh', 'Minh', 'Nam', 'Ngọc', 'Phúc', 'Quân', 'Sơn', 'Thảo', 'Trang', 'Tú', 'Tuấn', 'Vy', 'Yến'];
const LAST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ'];

async function createUser(email, name, role = 'USER', passwordHash) {
  const [r] = await pool.query(
    "INSERT INTO users (email, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
    [email, passwordHash, name, role],
  );
  return r.insertId;
}

async function createPaidOrder(userId, courses, daysAgo) {
  const total = courses.reduce((s, c) => s + Number(c.price), 0);
  const code = `DEMO${Date.now()}${Math.floor(rand() * 1e6)}`;
  const [o] = await pool.query(
    "INSERT INTO orders (user_id, order_code, total_amount, status, payment_method, expires_at) VALUES (?, ?, ?, 'PENDING', 'VNPAY', DATE_ADD(NOW(), INTERVAL 1 DAY))",
    [userId, code, total],
  );
  await pool.query('INSERT INTO order_items (order_id, course_id, course_title, price) VALUES ?', [courses.map((c) => [o.insertId, c.id, c.title, c.price])]);
  await markOrderPaid(o.insertId, { transactionId: `DEMO-TX-${o.insertId}` });
  // Lùi thời điểm để biểu đồ có dữ liệu nhiều ngày
  const at = new Date(Date.now() - daysAgo * 86_400_000 - Math.floor(rand() * 10) * 3_600_000);
  await pool.query('UPDATE orders SET created_at = ?, paid_at = ? WHERE id = ?', [at, at, o.insertId]);
  await pool.query('UPDATE enrollments SET enrolled_at = ? WHERE order_id = ?', [at, o.insertId]);
  return o.insertId;
}

async function run() {
  const [[exists]] = await pool.query('SELECT id FROM users WHERE email = ?', [STUDENT_EMAIL]);
  if (exists) { console.log('Đã có dữ liệu demo (demo.hocvien@hoisted.dev) — bỏ qua.'); return; }

  const [[teacher]] = await pool.query("SELECT id FROM users WHERE email = ? AND role = 'INSTRUCTOR'", [INSTRUCTOR_EMAIL]);
  if (!teacher) throw new Error('Chưa có giảng viên demo — chạy database/seed_instructors.js trước');
  const [paidCourses] = await pool.query(
    "SELECT id, title, price, instructor_id FROM courses WHERE status = 'PUBLISHED' AND price > 0 AND instructor_id IS NOT NULL",
  );
  const [[category]] = await pool.query('SELECT id FROM categories ORDER BY id LIMIT 1');
  const pw = await hash(PASSWORD, 12);

  // 1) Học viên demo: mua 2 khóa của giảng viên demo, học được một phần
  const studentId = await createUser(STUDENT_EMAIL, 'Học Viên Demo', 'USER', pw);
  const teacherCourses = paidCourses.filter((c) => c.instructor_id === teacher.id);
  await createPaidOrder(studentId, teacherCourses.slice(0, 2), 12);
  const [[firstCourse]] = await pool.query('SELECT id FROM enrollments WHERE user_id = ? ORDER BY id LIMIT 1', [studentId]);
  const [lessons] = await pool.query(
    'SELECT l.id FROM lessons l JOIN enrollments e ON e.course_id = l.course_id WHERE e.id = ? ORDER BY l.order_index LIMIT 3',
    [firstCourse.id],
  );
  for (const l of lessons) await completeLesson(studentId, l.id); // cập nhật cả % tiến độ khóa học

  // 2) Khóa học ở các trạng thái để demo quy trình duyệt
  const demoCourses = [
    { title: 'Design Patterns trong JavaScript', status: 'DRAFT', reason: null },
    { title: 'Web Performance từ A đến Z', status: 'PENDING_REVIEW', reason: null },
    { title: 'GraphQL cơ bản cho Frontend', status: 'REJECTED', reason: 'Mô tả khóa học còn sơ sài, cần bổ sung mục tiêu và yêu cầu đầu vào.' },
  ];
  for (const c of demoCourses) {
    const slug = `${c.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-demo`;
    const [r] = await pool.query(
      `INSERT INTO courses (title, slug, short_description, price, level, category_id, instructor_id, instructor_name, status, reject_reason, submitted_at, glyph, thumb)
       VALUES (?, ?, ?, 399000, 'INTERMEDIATE', ?, ?, 'Will Sentance', ?, ?, ?, 'JS', 'violet')`,
      [c.title, slug, `Khóa học demo: ${c.title}.`, category.id, teacher.id, c.status, c.reason, c.status === 'DRAFT' ? null : new Date()],
    );
    await pool.query("INSERT INTO lessons (course_id, title, order_index, duration_minutes) VALUES (?, 'Giới thiệu', 1, 5)", [r.insertId]);
    await pool.query('UPDATE courses SET total_lessons = 1, total_duration_minutes = 5 WHERE id = ?', [r.insertId]);
  }

  // 3) ~25 người mua, đơn rải trong 60 ngày
  let orders = 0;
  for (let i = 1; i <= 25; i += 1) {
    const buyerId = await createUser(`demo.buyer${String(i).padStart(2, '0')}@hoisted.dev`, `${pick(LAST)} ${pick(FIRST)}`, 'USER', pw);
    const n = rand() < 0.3 ? 2 : 1;
    const chosen = [...new Set(Array.from({ length: n }, () => pick(paidCourses)))];
    await createPaidOrder(buyerId, chosen, Math.floor(rand() * 60));
    orders += 1;
  }

  // 4) Tài khoản ngân hàng + 1 lần chi trả đã thực hiện cho giảng viên demo
  await pool.query(
    "UPDATE users SET bank_name = 'Vietcombank', bank_account_number = '0123456789', bank_account_name = 'WILL SENTANCE', headline = 'Tác giả JavaScript: The Hard Parts' WHERE id = ?",
    [teacher.id],
  );
  const [[{ earned }]] = await pool.query(
    "SELECT COALESCE(SUM(oi.instructor_earning), 0) AS earned FROM order_items oi JOIN orders o ON o.id = oi.order_id AND o.status = 'PAID' WHERE oi.instructor_id = ?",
    [teacher.id],
  );
  const payout = Math.floor(Number(earned) * 0.5 / 1000) * 1000;
  if (payout > 0) {
    await pool.query(
      `INSERT INTO instructor_payouts (instructor_id, amount, status, bank_snapshot, bank_ref, note, paid_at, created_at)
       VALUES (?, ?, 'PAID', 'Vietcombank · 0123456789 · WILL SENTANCE', 'FT26DEMO0001', 'Chi trả demo', DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY))`,
      [teacher.id, payout],
    );
  }

  console.log(`✔ Học viên demo: ${STUDENT_EMAIL} (đã mua ${teacherCourses.slice(0, 2).length} khóa, hoàn thành ${lessons.length} bài)`);
  console.log(`✔ 3 khóa học demo: DRAFT / PENDING_REVIEW / REJECTED (giảng viên ${INSTRUCTOR_EMAIL})`);
  console.log(`✔ ${orders} người mua demo, đơn PAID rải 60 ngày gần nhất`);
  console.log(`✔ Đã chi trả demo ${payout.toLocaleString('vi-VN')}đ cho giảng viên; tài khoản ngân hàng đã điền`);
  console.log(`\nMật khẩu các tài khoản demo mới: ${PASSWORD}`);
}

run()
  .catch((err) => { console.error('Seed failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
