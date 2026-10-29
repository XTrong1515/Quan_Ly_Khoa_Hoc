const request = require('supertest');
const app     = require('../src/app');
const {
  pool, resetDb, createUser, authHeader, createCourse, createLesson, enroll,
} = require('./helpers');

beforeAll(resetDb);
afterAll(() => pool.end());

describe('GET /api/enrollments/me — khóa đã lưu trữ', () => {
  it('ẩn khóa lưu trữ không còn bài học, vẫn hiện khóa lưu trữ còn nội dung', async () => {
    const student = await createUser();
    const emptyArchived = await createCourse({ status: 'ARCHIVED' });
    const archivedWithContent = await createCourse({ status: 'ARCHIVED' });
    await createLesson(archivedWithContent.id);
    const published = await createCourse({ status: 'PUBLISHED' });
    await createLesson(published.id);
    for (const c of [emptyArchived, archivedWithContent, published]) await enroll(student, c.id);

    const res = await request(app).get('/api/enrollments/me').set(authHeader(student));
    expect(res.status).toBe(200);
    const ids = res.body.enrollments.map((e) => e.courseId).sort();
    expect(ids).toEqual([archivedWithContent.id, published.id].sort());
  });
});
