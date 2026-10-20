const request = require('supertest');
const app     = require('../src/app');
const {
  pool, resetDb, createUser, authHeader, createCategory, createCourse, createLesson,
} = require('./helpers');

beforeAll(resetDb);
afterAll(() => pool.end());

let admin; let teacherA; let teacherB; let student;
beforeAll(async () => {
  admin    = await createUser({ role: 'ADMIN' });
  teacherA = await createUser({ role: 'INSTRUCTOR', name: 'Giảng Viên A' });
  teacherB = await createUser({ role: 'INSTRUCTOR', name: 'Giảng Viên B' });
  student  = await createUser({ role: 'USER' });
});

const statusOf = async (courseId) => (await pool.query('SELECT status FROM courses WHERE id = ?', [courseId]))[0][0].status;

describe('Phân quyền khu vực /api/instructor', () => {
  it('khách → 401', async () => {
    expect((await request(app).get('/api/instructor/courses')).status).toBe(401);
  });
  it.each([['USER'], ['ADMIN']])('%s → 403', async (role) => {
    const user = role === 'USER' ? student : admin;
    expect((await request(app).get('/api/instructor/courses').set(authHeader(user))).status).toBe(403);
  });
  it('USER không upload ảnh được qua /api/instructor/upload', async () => {
    expect((await request(app).post('/api/instructor/upload/image').set(authHeader(student))).status).toBe(403);
  });
});

describe('Giảng viên tạo & quản lý khóa học của mình', () => {
  it('tạo khóa học: luôn là DRAFT, gán đúng chủ — bỏ qua status/instructorId/tag gửi lên', async () => {
    const { id: categoryId } = await createCategory();
    const res = await request(app).post('/api/instructor/courses').set(authHeader(teacherA)).send({
      title: 'JS cơ bản', slug: `js-co-ban-${Date.now()}`, categoryId, price: 200000,
      status: 'PUBLISHED', instructorId: teacherB.id, tag: 'Bestseller',
    });
    expect(res.status).toBe(201);
    const [[row]] = await pool.query('SELECT status, instructor_id, instructor_name, tag FROM courses WHERE id = ?', [res.body.id]);
    expect(row).toMatchObject({ status: 'DRAFT', instructor_id: teacherA.id, instructor_name: 'Giảng Viên A', tag: null });
  });

  it('dashboard trả số liệu dạng number', async () => {
    const res = await request(app).get('/api/instructor/dashboard').set(authHeader(teacherA));
    expect(res.status).toBe(200);
    expect(res.body.statusCounts.DRAFT).toBeGreaterThan(0);
    expect(typeof res.body.lessons).toBe('number');
  });

  it('danh sách chỉ gồm khóa học của chính mình', async () => {
    await createCourse({ instructor: teacherB });
    const res = await request(app).get('/api/instructor/courses').set(authHeader(teacherA));
    expect(res.status).toBe(200);
    expect(res.body.courses.length).toBeGreaterThan(0);
    const [owners] = await pool.query('SELECT DISTINCT instructor_id FROM courses WHERE id IN (?)', [res.body.courses.map((c) => c.id)]);
    expect(owners).toEqual([{ instructor_id: teacherA.id }]);
  });
});

describe('Chống IDOR — giảng viên B không đụng được dữ liệu của A', () => {
  let course; let lesson; let quizId; let questionId;
  beforeAll(async () => {
    course = await createCourse({ instructor: teacherA });
    lesson = await createLesson(course.id);
    const q = await request(app).post(`/api/instructor/lessons/${lesson.id}/quiz`).set(authHeader(teacherA)).send({ title: 'Quiz A', passScore: 70 });
    quizId = q.body.id ?? (await pool.query('SELECT id FROM quizzes WHERE lesson_id = ?', [lesson.id]))[0][0].id;
    await request(app).post(`/api/instructor/quizzes/${quizId}/questions`).set(authHeader(teacherA))
      .send({ question: '1+1?', type: 'single', options: [{ text: '2', isCorrect: true }, { text: '3', isCorrect: false }] });
    questionId = (await pool.query('SELECT id FROM quiz_questions WHERE quiz_id = ?', [quizId]))[0][0].id;
  });

  it('chủ khóa học thao tác được bình thường', async () => {
    const res = await request(app).get(`/api/instructor/courses/${course.id}/lessons`).set(authHeader(teacherA));
    expect(res.status).toBe(200);
    expect(res.body.lessons).toHaveLength(1);
  });

  it.each([
    ['get',    () => `/api/instructor/courses/${course.id}`],
    ['put',    () => `/api/instructor/courses/${course.id}`],
    ['delete', () => `/api/instructor/courses/${course.id}`],
    ['post',   () => `/api/instructor/courses/${course.id}/submit`],
    ['get',    () => `/api/instructor/courses/${course.id}/lessons`],
    ['post',   () => `/api/instructor/courses/${course.id}/lessons`],
    ['put',    () => `/api/instructor/lessons/${lesson.id}`],
    ['delete', () => `/api/instructor/lessons/${lesson.id}`],
    ['get',    () => `/api/instructor/lessons/${lesson.id}/quiz`],
    ['put',    () => `/api/instructor/quizzes/${quizId}`],
    ['delete', () => `/api/instructor/quizzes/${quizId}`],
    ['post',   () => `/api/instructor/quizzes/${quizId}/questions`],
    ['put',    () => `/api/instructor/quiz-questions/${questionId}`],
    ['delete', () => `/api/instructor/quiz-questions/${questionId}`],
  ])('%s %s → 404', async (method, url) => {
    const res = await request(app)[method](url()).set(authHeader(teacherB)).send({ title: 'hack', price: 0 });
    expect(res.status).toBe(404);
  });

  it('dữ liệu của A không bị thay đổi sau các request trên', async () => {
    const [[c]] = await pool.query('SELECT title, status FROM courses WHERE id = ?', [course.id]);
    expect(c.title).not.toBe('hack');
    expect(c.status).toBe('DRAFT');
    expect((await pool.query('SELECT id FROM lessons WHERE id = ?', [lesson.id]))[0]).toHaveLength(1);
    expect((await pool.query('SELECT id FROM quiz_questions WHERE id = ?', [questionId]))[0]).toHaveLength(1);
  });

  it('sắp xếp bài học có lẫn bài của người khác → 404', async () => {
    const own = await createCourse({ instructor: teacherB });
    const ownLesson = await createLesson(own.id);
    const res = await request(app).put('/api/instructor/lessons/reorder').set(authHeader(teacherB))
      .send([{ id: ownLesson.id, order_index: 1 }, { id: lesson.id, order_index: 2 }]);
    expect(res.status).toBe(404);
  });

  it('gán bài học vào section của khóa học khác → 400', async () => {
    const own = await createCourse({ instructor: teacherB });
    const [sec] = await pool.query('INSERT INTO course_sections (course_id, title, order_index) VALUES (?, ?, 1)', [course.id, 'Section A']);
    const res = await request(app).post(`/api/instructor/courses/${own.id}/lessons`).set(authHeader(teacherB))
      .send({ title: 'Bài mới', sectionId: sec.insertId });
    expect(res.status).toBe(400);
  });
});

describe('Quy trình gửi duyệt → duyệt / từ chối', () => {
  it('khóa học chưa có bài học → không gửi duyệt được', async () => {
    const course = await createCourse({ instructor: teacherA });
    const res = await request(app).post(`/api/instructor/courses/${course.id}/submit`).set(authHeader(teacherA));
    expect(res.status).toBe(400);
  });

  it('gửi duyệt → PENDING_REVIEW, admin nhận thông báo, khóa chỉnh sửa, chưa hiện công khai', async () => {
    const course = await createCourse({ instructor: teacherA });
    await createLesson(course.id);
    const res = await request(app).post(`/api/instructor/courses/${course.id}/submit`).set(authHeader(teacherA));
    expect(res.status).toBe(200);
    expect(await statusOf(course.id)).toBe('PENDING_REVIEW');

    const [notes] = await pool.query("SELECT id FROM notifications WHERE user_id = ? AND type = 'course_submitted'", [admin.id]);
    expect(notes.length).toBeGreaterThan(0);

    const edit = await request(app).put(`/api/instructor/courses/${course.id}`).set(authHeader(teacherA)).send({ shortDescription: 'x' });
    expect(edit.status).toBe(409);
    expect((await request(app).post(`/api/instructor/courses/${course.id}/submit`).set(authHeader(teacherA))).status).toBe(409);
    expect((await request(app).get(`/api/courses/${course.slug}`)).status).toBe(404);
  });

  it('admin duyệt → PUBLISHED, hiện công khai kèm thông tin giảng viên, giảng viên được báo', async () => {
    const course = await createCourse({ instructor: teacherA, status: 'PENDING_REVIEW' });
    const res = await request(app).put(`/api/admin/courses/${course.id}/approve`).set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(await statusOf(course.id)).toBe('PUBLISHED');

    const pub = await request(app).get(`/api/courses/${course.slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.instructor).toMatchObject({ id: teacherA.id, name: 'Giảng Viên A' });
    expect(pub.body.instructor.courseCount).toBeGreaterThan(0);
    expect(typeof pub.body.instructor.studentCount).toBe('number');

    const [notes] = await pool.query("SELECT id FROM notifications WHERE user_id = ? AND type = 'course_approved'", [teacherA.id]);
    expect(notes.length).toBeGreaterThan(0);
  });

  it('từ chối bắt buộc có lý do; giảng viên thấy lý do; gửi lại thì lý do được xóa', async () => {
    const course = await createCourse({ instructor: teacherA, status: 'PENDING_REVIEW' });
    await createLesson(course.id);
    expect((await request(app).put(`/api/admin/courses/${course.id}/reject`).set(authHeader(admin)).send({})).status).toBe(400);

    const res = await request(app).put(`/api/admin/courses/${course.id}/reject`).set(authHeader(admin)).send({ reason: 'Thiếu mô tả' });
    expect(res.status).toBe(200);
    const mine = await request(app).get('/api/instructor/courses').set(authHeader(teacherA));
    expect(mine.body.courses.find((c) => c.id === course.id)).toMatchObject({ status: 'REJECTED', reject_reason: 'Thiếu mô tả' });

    expect((await request(app).post(`/api/instructor/courses/${course.id}/submit`).set(authHeader(teacherA))).status).toBe(200);
    const [[row]] = await pool.query('SELECT status, reject_reason FROM courses WHERE id = ?', [course.id]);
    expect(row).toEqual({ status: 'PENDING_REVIEW', reject_reason: null });
  });

  it('duyệt khóa học không ở trạng thái chờ duyệt → 409', async () => {
    const course = await createCourse({ instructor: teacherA, status: 'DRAFT' });
    expect((await request(app).put(`/api/admin/courses/${course.id}/approve`).set(authHeader(admin))).status).toBe(409);
  });

  it('chỉ ADMIN được duyệt', async () => {
    const course = await createCourse({ instructor: teacherA, status: 'PENDING_REVIEW' });
    expect((await request(app).put(`/api/admin/courses/${course.id}/approve`).set(authHeader(teacherA))).status).toBe(403);
  });
});

describe('Khóa học đã xuất bản', () => {
  let course;
  beforeAll(async () => { course = await createCourse({ instructor: teacherA, status: 'PUBLISHED', price: 300000 }); });

  it('không đổi được giá / tên', async () => {
    const res = await request(app).put(`/api/instructor/courses/${course.id}`).set(authHeader(teacherA)).send({ price: 1000 });
    expect(res.status).toBe(409);
    expect(res.body.fields).toEqual(['price']);
  });

  it('gửi lại nguyên giá cũ + đổi mô tả ngắn → được', async () => {
    const res = await request(app).put(`/api/instructor/courses/${course.id}`).set(authHeader(teacherA))
      .send({ price: 300000, shortDescription: 'Mô tả mới' });
    expect(res.status).toBe(200);
    const [[row]] = await pool.query('SELECT short_description, price, status FROM courses WHERE id = ?', [course.id]);
    expect(row).toMatchObject({ short_description: 'Mô tả mới', status: 'PUBLISHED' });
    expect(Number(row.price)).toBe(300000);
  });

  it('không xóa được', async () => {
    expect((await request(app).delete(`/api/instructor/courses/${course.id}`).set(authHeader(teacherA))).status).toBe(409);
  });
});

describe('Admin quản lý giảng viên', () => {
  it('đổi role USER → INSTRUCTOR', async () => {
    const user = await createUser();
    const res = await request(app).put(`/api/admin/users/${user.id}/role`).set(authHeader(admin)).send({ role: 'INSTRUCTOR' });
    expect(res.status).toBe(200);
    expect((await pool.query('SELECT role FROM users WHERE id = ?', [user.id]))[0][0].role).toBe('INSTRUCTOR');
  });

  it('role không hợp lệ → 400', async () => {
    const user = await createUser();
    expect((await request(app).put(`/api/admin/users/${user.id}/role`).set(authHeader(admin)).send({ role: 'SUPERUSER' })).status).toBe(400);
  });

  it('gán khóa học cho giảng viên → đồng bộ instructor_name; gán cho USER → 400', async () => {
    const course = await createCourse();
    const ok = await request(app).put(`/api/admin/courses/${course.id}`).set(authHeader(admin)).send({ instructorId: teacherB.id });
    expect(ok.status).toBe(200);
    const [[row]] = await pool.query('SELECT instructor_id, instructor_name FROM courses WHERE id = ?', [course.id]);
    expect(row).toEqual({ instructor_id: teacherB.id, instructor_name: 'Giảng Viên B' });

    expect((await request(app).put(`/api/admin/courses/${course.id}`).set(authHeader(admin)).send({ instructorId: student.id })).status).toBe(400);
  });

  it('lọc khóa học chờ duyệt + đếm pendingReview', async () => {
    await createCourse({ instructor: teacherA, status: 'PENDING_REVIEW' });
    const res = await request(app).get('/api/admin/courses?status=PENDING_REVIEW').set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.courses.every((c) => c.status === 'PENDING_REVIEW')).toBe(true);
    expect(res.body.pendingReview).toBe(res.body.total);
  });

  it('kéo-thả sắp xếp khóa học hoạt động (trước đây route bị /:id chặn)', async () => {
    const c1 = await createCourse(); const c2 = await createCourse();
    const res = await request(app).put('/api/admin/courses/reorder').set(authHeader(admin))
      .send([{ id: c1.id, display_order: 2 }, { id: c2.id, display_order: 1 }]);
    expect(res.status).toBe(200);
    const [[row]] = await pool.query('SELECT display_order FROM courses WHERE id = ?', [c1.id]);
    expect(row.display_order).toBe(2);
  });
});
