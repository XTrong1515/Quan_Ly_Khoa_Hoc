/**
 * Đồng bộ số liệu khóa học với dữ liệu thật (chạy lại nhiều lần không sao):
 *   - rating / review_count   ← đánh giá VISIBLE
 *   - student_count           ← số enrollment
 *   - total_lessons / total_duration_minutes ← bài học hiện có
 *   - (chỉ khi có --dedupe-sections) xóa section RỖNG bị trùng tên với section khác cùng khóa (do chạy seed 2 lần)
 * Dữ liệu mẫu ban đầu (schema.sql) ghi sẵn số giả kiểu "847 đánh giá · 12.441 học viên" — script này thay bằng số thật.
 *
 * Run: npm run db:recompute-stats                         (chỉ đồng bộ số liệu)
 *      npm run db:recompute-stats -- --dedupe-sections    (thêm bước dọn section trùng — nên `npm run db:backup` trước)
 * Không tự xóa section theo mặc định: giảng viên có thể cố ý tạo 2 section rỗng cùng tên làm khung trước.
 */
require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');

const DEDUPE = process.argv.includes('--dedupe-sections');

// Section rỗng có "bản sao" cùng khóa + cùng tên: giữ bản có bài học, nếu đều rỗng thì giữ bản tạo trước
const DUPE_WHERE = `
  FROM course_sections s
  JOIN course_sections keep
    ON keep.course_id = s.course_id AND keep.title = s.title AND keep.id <> s.id
  WHERE NOT EXISTS (SELECT 1 FROM lessons l WHERE l.section_id = s.id)
    AND (EXISTS (SELECT 1 FROM lessons l WHERE l.section_id = keep.id) OR keep.id < s.id)`;

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [candidates] = await conn.query(`SELECT DISTINCT s.id, s.course_id, s.title ${DUPE_WHERE}`);
    let removed = 0;
    if (candidates.length && DEDUPE) {
      const [res] = await conn.query('DELETE FROM course_sections WHERE id IN (?)', [candidates.map((c) => c.id)]);
      removed = res.affectedRows;
    }

    const [stats] = await conn.query(`
      UPDATE courses c SET
        rating = COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.course_id = c.id AND r.status = 'VISIBLE'), 0),
        review_count = (SELECT COUNT(*) FROM reviews r WHERE r.course_id = c.id AND r.status = 'VISIBLE'),
        student_count = (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id),
        total_lessons = (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id),
        total_duration_minutes = (SELECT COALESCE(SUM(l.duration_minutes), 0) FROM lessons l WHERE l.course_id = c.id)
    `);

    await conn.commit();
    console.log(`✔ Cập nhật số liệu ${stats.affectedRows} khóa học (${stats.changedRows} khóa thay đổi)`);
    if (candidates.length) {
      console.log(DEDUPE
        ? `✔ Đã xóa ${removed} section rỗng bị trùng tên:`
        : `ℹ ${candidates.length} section rỗng bị trùng tên (chưa xóa — chạy lại với --dedupe-sections để dọn):`);
      for (const c of candidates) console.log(`   khóa #${c.course_id} · section #${c.id} "${c.title}"`);
    }

    const [empty] = await pool.query(
      "SELECT id, title FROM courses WHERE status = 'PUBLISHED' AND total_lessons = 0 ORDER BY id",
    );
    if (empty.length) {
      console.log(`⚠ ${empty.length} khóa PUBLISHED chưa có bài học nào:`);
      for (const c of empty) console.log(`   #${c.id} ${c.title}`);
    }
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

run()
  .catch((err) => { console.error('✖', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
