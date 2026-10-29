const request = require('supertest');
const app     = require('../src/app');
const {
  pool, resetDb, createUser, authHeader, createCourse, createLesson,
} = require('./helpers');

beforeAll(resetDb);
afterAll(() => pool.end());

let teacher; let student;
beforeAll(async () => {
  teacher = await createUser({ role: 'INSTRUCTOR' });
  student = await createUser({ role: 'USER' });
});

/** Bài học + quiz 1 câu; `attempted` = có học viên đã làm quiz. */
async function lessonWithQuiz({ attempted }) {
  const course = await createCourse({ instructor: teacher });
  const lesson = await createLesson(course.id);
  const [q] = await pool.query('INSERT INTO quizzes (lesson_id, title, pass_score) VALUES (?, ?, ?)', [lesson.id, 'Quiz', 70]);
  if (attempted) {
    await pool.query('INSERT INTO quiz_attempts (quiz_id, user_id, score, passed) VALUES (?, ?, ?, ?)', [q.insertId, student.id, 100, 1]);
  }
  return { lessonId: lesson.id, quizId: q.insertId };
}

const exists = async (table, id) => (await pool.query(`SELECT id FROM ${table} WHERE id = ?`, [id]))[0].length === 1;

describe('Xóa quiz', () => {
  it('quiz chưa ai làm → xóa được', async () => {
    const { quizId } = await lessonWithQuiz({ attempted: false });
    const res = await request(app).delete(`/api/instructor/quizzes/${quizId}`).set(authHeader(teacher));
    expect(res.status).toBe(200);
    expect(await exists('quizzes', quizId)).toBe(false);
  });

  it('quiz đã có học viên làm → 409 kèm lý do, lịch sử làm bài còn nguyên', async () => {
    const { quizId } = await lessonWithQuiz({ attempted: true });
    const res = await request(app).delete(`/api/instructor/quizzes/${quizId}`).set(authHeader(teacher));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/học viên/);
    expect(await exists('quizzes', quizId)).toBe(true);
  });
});

describe('Xóa bài học có quiz', () => {
  it('quiz chưa ai làm → xóa bài học được (quiz bị xóa theo)', async () => {
    const { lessonId, quizId } = await lessonWithQuiz({ attempted: false });
    const res = await request(app).delete(`/api/instructor/lessons/${lessonId}`).set(authHeader(teacher));
    expect(res.status).toBe(200);
    expect(await exists('quizzes', quizId)).toBe(false);
  });

  it('quiz đã có học viên làm → 409, bài học không bị xóa', async () => {
    const { lessonId } = await lessonWithQuiz({ attempted: true });
    const res = await request(app).delete(`/api/instructor/lessons/${lessonId}`).set(authHeader(teacher));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/học viên/);
    expect(await exists('lessons', lessonId)).toBe(true);
  });
});
