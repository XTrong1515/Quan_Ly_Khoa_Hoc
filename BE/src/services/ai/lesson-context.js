/**
 * Ngữ cảnh bài học cho trợ lý học viên khi hỏi từ trang học (/learn).
 * Quyền xem giống requireEnrollment({ allowPreview: true }): admin / giảng viên sở hữu,
 * bài xem thử của khóa đang bán, hoặc học viên đã ghi danh. Không có quyền → null.
 *
 * KHÔNG đưa vào: lời giải bài tập, test case (kể cả công khai), đáp án quiz — AI chỉ được gợi ý hướng làm.
 */
const pool = require('../../config/db');
const { plainText } = require('./quiz-generator');

const CONTENT_MAX = 6000;

async function loadLessonContext(user, lessonId) {
  const id = parseInt(lessonId, 10);
  if (!id) return null;
  const [[row]] = await pool.query(
    `SELECT l.id, l.title, l.content, l.is_preview, l.course_id,
            c.title AS courseTitle, c.instructor_id, c.status AS courseStatus, s.title AS sectionTitle
     FROM lessons l
     JOIN courses c ON c.id = l.course_id
     LEFT JOIN course_sections s ON s.id = l.section_id
     WHERE l.id = ?`,
    [id],
  );
  if (!row) return null;

  const staff = user.role === 'ADMIN' || (user.role === 'INSTRUCTOR' && row.instructor_id === user.id);
  const preview = row.is_preview && row.courseStatus === 'PUBLISHED';
  if (!staff && !preview) {
    const [[enrolled]] = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1', [user.id, row.course_id],
    );
    if (!enrolled) return null;
  }

  const [[exercise]] = await pool.query(
    'SELECT title, description_md, function_name FROM coding_exercises WHERE lesson_id = ?', [id],
  );
  const [[quiz]] = await pool.query('SELECT COUNT(*) AS n FROM quizzes WHERE lesson_id = ?', [id]);

  return {
    id: row.id,
    courseId: row.course_id,
    course: row.courseTitle,
    section: row.sectionTitle ?? null,
    title: row.title,
    content: plainText(row.content, CONTENT_MAX),
    hasQuiz: Number(quiz.n) > 0,
    exercise: exercise ? {
      title: exercise.title,
      functionName: exercise.function_name,
      description: plainText(exercise.description_md, 1500),
    } : null,
  };
}

module.exports = { loadLessonContext };
