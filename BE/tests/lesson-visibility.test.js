/**
 * Ẩn bài học (xóa mềm) & ngừng bán khóa học có học viên.
 * - Bài đã có dữ liệu học viên: không xóa thật (409 LESSON_HAS_LEARNER_DATA) → ẩn; bài chưa ai học thì xóa được.
 * - Bài ẩn: học viên không thấy / không mở được, không tính vào tổng số bài và % tiến độ; dữ liệu cũ giữ nguyên.
 * - Khóa đang bán phải còn ≥ 1 bài hiển thị.
 * - "Xóa" khóa có học viên = ngừng bán (ARCHIVED), người đã mua vẫn học tiếp.
 */
const request = require('supertest');
const app     = require('../src/app');
const {
  pool, resetDb, createUser, authHeader, createCourse, createLesson, enroll,
} = require('./helpers');

const H = authHeader;
beforeAll(resetDb);
afterAll(() => pool.end());

let teacher; let otherTeacher; let student; let admin;
beforeAll(async () => {
  teacher      = await createUser({ role: 'INSTRUCTOR' });
  otherTeacher = await createUser({ role: 'INSTRUCTOR' });
  student      = await createUser();
  admin        = await createUser({ role: 'ADMIN' });
});

const hide = (user, lessonId, hidden = true, base = '/api/instructor') =>
  request(app).put(`${base}/lessons/${lessonId}/visibility`).set(H(user)).send({ hidden });

async function enrollmentOf(user, courseId) {
  const [[row]] = await pool.query(
    'SELECT id, CAST(progress_percent AS SIGNED) AS progress_percent FROM enrollments WHERE user_id = ? AND course_id = ?', [user.id, courseId],
  );
  return row;
}

/** Khóa đang bán, 2 bài; học viên đã hoàn thành bài B (→ 50%). */
async function publishedCourseWithProgress() {
  const course = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
  const a = await createLesson(course.id, { content: 'Bài A' });
  const b = await createLesson(course.id, { content: 'Bài B' });
  await enroll(student, course.id);
  const res = await request(app).post(`/api/lesson-progress/${b.id}/complete`).set(H(student));
  expect(res.body.progressPercent).toBe(50);
  return { course, a, b };
}

describe('Xóa bài học', () => {
  it('khóa có học viên nhưng bài chưa ai học → xóa thật được', async () => {
    const course = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    await createLesson(course.id);
    const fresh = await createLesson(course.id);
    await enroll(student, course.id);
    expect((await request(app).delete(`/api/instructor/lessons/${fresh.id}`).set(H(teacher))).status).toBe(200);
  });

  it('bài đã có học viên học → 409 kèm số học viên, gợi ý ẩn; bài vẫn còn', async () => {
    const { b } = await publishedCourseWithProgress();
    const res = await request(app).delete(`/api/instructor/lessons/${b.id}`).set(H(teacher));
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'LESSON_HAS_LEARNER_DATA', learners: 1 });
    expect(res.body.message).toMatch(/ẩn/);
    expect((await pool.query('SELECT id FROM lessons WHERE id = ?', [b.id]))[0]).toHaveLength(1);
  });

  it('thảo luận của chính giảng viên không tính là dữ liệu học viên', async () => {
    const course = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    await createLesson(course.id);
    const lesson = await createLesson(course.id);
    await pool.query('INSERT INTO lesson_discussions (lesson_id, user_id, content) VALUES (?, ?, ?)', [lesson.id, teacher.id, 'Chào cả lớp']);
    expect((await request(app).delete(`/api/instructor/lessons/${lesson.id}`).set(H(teacher))).status).toBe(200);
  });
});

describe('Ẩn / hiện bài học', () => {
  it('ẩn: tổng số bài và % tiến độ chỉ tính bài hiển thị; hiện lại → như cũ, dữ liệu không mất', async () => {
    const { course, a, b } = await publishedCourseWithProgress();

    expect((await hide(teacher, a.id)).status).toBe(200);
    expect((await enrollmentOf(student, course.id)).progress_percent).toBe(100);
    const [[afterHide]] = await pool.query('SELECT total_lessons FROM courses WHERE id = ?', [course.id]);
    expect(afterHide.total_lessons).toBe(1);

    expect((await hide(teacher, a.id, false)).status).toBe(200);
    expect((await enrollmentOf(student, course.id)).progress_percent).toBe(50);
    const [[afterShow]] = await pool.query('SELECT total_lessons FROM courses WHERE id = ?', [course.id]);
    expect(afterShow.total_lessons).toBe(2);

    // Ẩn bài đã học rồi hiện lại: lịch sử hoàn thành còn nguyên
    await hide(teacher, b.id);
    await hide(teacher, b.id, false);
    const [progress] = await pool.query('SELECT is_completed FROM lesson_progress WHERE lesson_id = ?', [b.id]);
    expect(progress).toEqual([{ is_completed: 1 }]);
  });

  it('học viên không thấy / không mở / không làm được gì với bài đã ẩn; giảng viên vẫn xem được', async () => {
    const { course, a, b } = await publishedCourseWithProgress();
    const [q] = await pool.query('INSERT INTO quizzes (lesson_id, title, pass_score) VALUES (?, ?, ?)', [a.id, 'Quiz', 70]);
    await hide(teacher, a.id);

    expect((await request(app).get(`/api/lessons/${a.id}`).set(H(student))).status).toBe(404);
    expect((await request(app).post(`/api/lesson-progress/${a.id}/complete`).set(H(student))).status).toBe(403);
    expect((await request(app).post(`/api/quizzes/${q.insertId}/attempt`).set(H(student)).send({ answers: [] })).status).toBe(404);

    // Mục lục trong trình phát & trang khóa học công khai không còn bài A
    const player = await request(app).get(`/api/lessons/${b.id}`).set(H(student));
    const ids = player.body.sections.flatMap((s) => s.lessons.map((l) => l.id));
    expect(ids).toEqual([b.id]);
    const pub = await request(app).get(`/api/courses/${course.slug}`);
    expect(JSON.stringify(pub.body)).not.toContain(`"id":${a.id},`);

    // Giảng viên sở hữu: mở được, mục lục có bài A kèm cờ hidden
    const staff = await request(app).get(`/api/lessons/${b.id}`).set(H(teacher));
    const hiddenRow = staff.body.sections.flatMap((s) => s.lessons).find((l) => l.id === a.id);
    expect(hiddenRow).toMatchObject({ hidden: true });
    expect((await request(app).get(`/api/lessons/${a.id}`).set(H(teacher))).status).toBe(200);

    // Danh sách soạn bài trả hidden_at
    const list = await request(app).get(`/api/instructor/courses/${course.id}/lessons`).set(H(teacher));
    expect(list.body.lessons.find((l) => l.id === a.id).hidden_at).toBeTruthy();
  });

  it('khóa đang bán phải còn ít nhất 1 bài hiển thị (ẩn và xóa đều bị chặn)', async () => {
    const course = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    const only = await createLesson(course.id);
    const res = await hide(teacher, only.id);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ít nhất 1 bài/);
    expect((await request(app).delete(`/api/instructor/lessons/${only.id}`).set(H(teacher))).status).toBe(409);
  });

  it('khóa nháp: ẩn được cả bài cuối cùng', async () => {
    const course = await createCourse({ instructor: teacher, status: 'DRAFT' });
    const only = await createLesson(course.id);
    expect((await hide(teacher, only.id)).status).toBe(200);
  });

  it('phân quyền & dữ liệu vào: giảng viên khác 404, học viên 403, body sai 400, admin được', async () => {
    const course = await createCourse({ instructor: teacher, status: 'DRAFT' });
    const lesson = await createLesson(course.id);
    expect((await hide(otherTeacher, lesson.id)).status).toBe(404);
    expect((await hide(student, lesson.id)).status).toBe(403);
    expect((await request(app).put(`/api/instructor/lessons/${lesson.id}/visibility`).set(H(teacher)).send({ hidden: 'yes' })).status).toBe(400);
    expect((await hide(admin, lesson.id, true, '/api/admin')).status).toBe(200);
  });

  it('khóa đang chờ duyệt: không ẩn được (khóa nội dung như khi sửa)', async () => {
    const course = await createCourse({ instructor: teacher, status: 'PENDING_REVIEW' });
    await createLesson(course.id);
    const lesson = await createLesson(course.id);
    expect((await hide(teacher, lesson.id)).status).toBe(409);
  });
});

describe('Ngừng bán khóa học có học viên', () => {
  it('admin "xóa" khóa đã có học viên → ARCHIVED; học viên vẫn học tiếp, khóa biến khỏi trang công khai', async () => {
    const course = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    const lesson = await createLesson(course.id, { content: 'x' });
    await enroll(student, course.id);

    const res = await request(app).delete(`/api/admin/courses/${course.id}`).set(H(admin));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ARCHIVED', students: 1 });

    expect((await request(app).get(`/api/courses/${course.slug}`)).status).toBe(404);
    expect((await request(app).get(`/api/lessons/${lesson.id}`).set(H(student))).status).toBe(200);
    const mine = await request(app).get('/api/enrollments/me').set(H(student));
    expect(mine.body.enrollments.map((e) => e.courseId)).toContain(course.id);
  });
});
