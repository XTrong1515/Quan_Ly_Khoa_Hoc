/**
 * Migration — Giai đoạn 1: tác nhân Giảng viên + quy trình duyệt khóa học
 * Run: node database/instructor_migration.js   (chạy lại nhiều lần vẫn an toàn)
 *
 * - users.role thêm INSTRUCTOR; users.headline, users.commission_rate
 * - courses.instructor_id (FK users), trạng thái PENDING_REVIEW / REJECTED
 * - courses.reject_reason, submitted_at, reviewed_at, reviewed_by
 */
require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');

const DB = process.env.DB_NAME || 'course_mng';

async function columnType(table, column) {
  const [rows] = await pool.query(
    `SELECT COLUMN_TYPE AS type FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB, table, column],
  );
  return rows[0]?.type ?? null;
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnType(table, column)) {
    console.log(`  skip: ${table}.${column} already exists`);
    return;
  }
  await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  added: ${table}.${column}`);
}

async function ensureEnum(table, column, values, definitionTail) {
  const type = await columnType(table, column);
  if (values.every((v) => type?.includes(`'${v}'`))) {
    console.log(`  skip: ${table}.${column} already has ${values.join(', ')}`);
    return;
  }
  const list = values.map((v) => `'${v}'`).join(',');
  await pool.query(`ALTER TABLE ${table} MODIFY ${column} ENUM(${list}) ${definitionTail}`);
  console.log(`  modified: ${table}.${column} → ENUM(${list})`);
}

async function constraintExists(table, name) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [DB, table, name],
  );
  return rows.length > 0;
}

async function run() {
  console.log(`=== Instructor migration (${DB}) ===`);

  console.log('\n[users]');
  await ensureEnum('users', 'role', ['USER', 'INSTRUCTOR', 'ADMIN'], "DEFAULT 'USER'");
  await addColumnIfMissing('users', 'headline',        'VARCHAR(255) NULL');
  await addColumnIfMissing('users', 'bio',             'TEXT NULL');
  await addColumnIfMissing('users', 'commission_rate', 'DECIMAL(5,2) NULL'); // NULL = dùng PLATFORM_COMMISSION

  console.log('\n[courses]');
  await ensureEnum('courses', 'status', ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'], "DEFAULT 'DRAFT'");
  await addColumnIfMissing('courses', 'instructor_id', 'INT NULL AFTER instructor_name');
  await addColumnIfMissing('courses', 'reject_reason', 'VARCHAR(500) NULL');
  await addColumnIfMissing('courses', 'submitted_at',  'TIMESTAMP NULL');
  await addColumnIfMissing('courses', 'reviewed_at',   'TIMESTAMP NULL');
  await addColumnIfMissing('courses', 'reviewed_by',   'INT NULL');

  if (await constraintExists('courses', 'fk_course_instructor')) {
    console.log('  skip: fk_course_instructor already exists');
  } else {
    await pool.query(
      `ALTER TABLE courses
         ADD CONSTRAINT fk_course_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL`,
    );
    console.log('  added: fk_course_instructor');
  }

  console.log('\nDone.');
}

run()
  .catch((err) => { console.error('Migration failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
