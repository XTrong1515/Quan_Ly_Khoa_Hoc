require('dotenv').config();
const pool = require('../src/config/db');
async function test() {
  const [cats] = await pool.query(
    "SELECT id, name, slug, icon, color FROM categories LIMIT 3"
  );
  console.log('categories:', JSON.stringify(cats, null, 2));
  const [courses] = await pool.query(
    "SELECT id, title, slug, glyph, thumb, rating, student_count, review_count FROM courses WHERE status='PUBLISHED' LIMIT 2"
  );
  console.log('courses:', JSON.stringify(courses, null, 2));
  pool.end();
}
test().catch(e => { console.error(e.message); pool.end(); });
