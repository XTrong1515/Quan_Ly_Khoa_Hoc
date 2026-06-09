/**
 * Migration: align existing DB with updated schema
 * Run: node database/migrate.js
 */
require('dotenv').config();
const pool = require('../src/config/db');

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME || 'course_mng', table, column],
  );
  return rows.length > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`  skip: ${table}.${column} already exists`);
    return;
  }
  await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  added: ${table}.${column}`);
}

async function run() {
  console.log('=== Hoisted DB Migration ===');

  // categories: add icon and color
  console.log('\n[categories]');
  await addColumnIfMissing('categories', 'icon',  'VARCHAR(50)');
  await addColumnIfMissing('categories', 'color', 'VARCHAR(50)');

  // users: add username and bio
  console.log('\n[users]');
  await addColumnIfMissing('users', 'username', 'VARCHAR(50) NULL');
  await addColumnIfMissing('users', 'bio',      'TEXT NULL');

  // courses: add glyph, thumb, rating, student_count, review_count
  console.log('\n[courses]');
  await addColumnIfMissing('courses', 'glyph',         'VARCHAR(10)');
  await addColumnIfMissing('courses', 'thumb',         'VARCHAR(50)');
  await addColumnIfMissing('courses', 'rating',        'DECIMAL(3,2) DEFAULT 0');
  await addColumnIfMissing('courses', 'student_count', 'INT DEFAULT 0');
  await addColumnIfMissing('courses', 'review_count',  'INT DEFAULT 0');

  // Copy data from old columns
  console.log('\n[copy from old columns]');
  await pool.query(`UPDATE courses SET glyph = thumbnail_glyph WHERE glyph IS NULL AND thumbnail_glyph IS NOT NULL`);
  await pool.query(`UPDATE courses SET rating = avg_rating WHERE (rating = 0 OR rating IS NULL) AND avg_rating IS NOT NULL`);
  await pool.query(`UPDATE courses SET student_count = total_students WHERE (student_count = 0 OR student_count IS NULL) AND total_students IS NOT NULL`);
  console.log('  copied thumbnail_glyph → glyph, avg_rating → rating, total_students → student_count');

  // Seed category icon + color
  console.log('\n[category seed: icon + color]');
  const catSeeds = [
    ['js-core',  '{}', '#F7DF1E'],
    ['async',    '⟳',  '#34D399'],
    ['react',    'Rx', '#818CF8'],
    ['ts',       'TS', '#38BDF8'],
    ['node',     'Nx', '#F43F5E'],
    ['testing',  '✓',  '#A78BFA'],
  ];
  for (const [slug, icon, color] of catSeeds) {
    await pool.query('UPDATE categories SET icon = ?, color = ? WHERE slug = ?', [icon, color, slug]);
    console.log(`  category[${slug}]: icon=${icon} color=${color}`);
  }

  // Seed course thumb + review_count
  console.log('\n[course seed: thumb + review_count]');
  const courseSeeds = [
    ['javascript-the-hard-parts',   'yellow', 847],
    ['react-performance-deep-dive', 'indigo', 523],
    ['async-patterns-event-loop',   'green',  312],
    ['typescript-for-js-devs',      'sky',    619],
    ['nodejs-internals',            'rose',   287],
    ['vanilla-js-patterns',         'violet', 1024],
  ];
  for (const [slug, thumb, reviewCount] of courseSeeds) {
    await pool.query('UPDATE courses SET thumb = ?, review_count = ? WHERE slug = ?', [thumb, reviewCount, slug]);
    console.log(`  course[${slug}]: thumb=${thumb} review_count=${reviewCount}`);
  }

  console.log('\n✓ Migration complete');
  await pool.end();
}

run().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
