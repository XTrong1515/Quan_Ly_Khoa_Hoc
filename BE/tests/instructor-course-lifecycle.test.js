/**
 * Giảng viên xóa / ngừng bán / khôi phục khóa học.
 * - Chưa từng bán (không học viên, không đơn hàng) → xóa thật, cascade bài học + dọn storage.
 * - Đã từng bán → Nháp / Bị từ chối chuyển Lưu trữ; khóa đã Lưu trữ thì giữ (409).
 * - Đang bán → "Ngừng bán" (ARCHIVED), người đã mua vẫn học, admin nhận thông báo.
 * - Lưu trữ → Khôi phục về Nháp.
 */
jest.mock('../src/utils/storage', () => ({
  ...jest.requireActual('../src/utils/storage'),
  deleteObject: jest.fn().mockResolvedValue(),
  deletePrefix: jest.fn().mockResolvedValue(),
}));

const request = require('supertest');
const app     = require('../src/app');
const storage = require('../src/utils/storage');
const {
  pool, resetDb, createUser, authHeader, createCourse, createLesson, enroll, createOrder,
} = require('./helpers');

const H = authHeader;
beforeAll(resetDb);
afterAll(() => pool.end());

let teacher; let other; let student; let admin;
beforeAll(async () => {
  teacher = await createUser({ role: 'INSTRUCTOR' });
  other   = await createUser({ role: 'INSTRUCTOR' });
  student = await createUser();
  admin   = await createUser({ role: 'ADMIN' });
});

const del     = (user, id) => request(app).delete(`/api/instructor/courses/${id}`).set(H(user));
const archive = (user, id) => request(app).post(`/api/instructor/courses/${id}/archive`).set(H(user));
const restore = (user, id) => request(app).post(`/api/instructor/courses/${id}/restore`).set(H(user));
const statusOf = async (id) => (await pool.query('SELECT status FROM courses WHERE id = ?', [id]))[0][0]?.status;

describe('Xóa khóa học', () => {
  it('nháp chưa từng bán → xóa thật: khóa, bài học biến mất; file video / tài liệu / HLS được dọn', async () => {
    const course = await createCourse({ instructor: teacher, status: 'DRAFT' });
    const lesson = await createLesson(course.id);
    await pool.query(
      "UPDATE lessons SET video_key = 'v/a.mp4', attachment_key = 'd/a.pdf', hls_prefix = 'v/hls/x/' WHERE id = ?", [lesson.id],
    );
    const res = await del(teacher, course.id);
    expect(res.body).toMatchObject({ ok: true, deleted: true });
    expect(await statusOf(course.id)).toBeUndefined();
    expect((await pool.query('SELECT id FROM lessons WHERE id = ?', [lesson.id]))[0]).toHaveLength(0);
    expect(storage.deleteObject).toHaveBeenCalledWith('v/a.mp4');
    expect(storage.deleteObject).toHaveBeenCalledWith('d/a.pdf');
    expect(storage.deletePrefix).toHaveBeenCalledWith('v/hls/x/');
  });

  it('bị từ chối nhưng đã có đơn hàng (dù chưa thanh toán) → chuyển Lưu trữ, không xóa', async () => {
    const course = await createCourse({ instructor: teacher, status: 'REJECTED' });
    await createOrder(student, [course.id]);
    const res = await del(teacher, course.id);
    expect(res.body).toMatchObject({ ok: true, deleted: false, status: 'ARCHIVED' });
    expect(await statusOf(course.id)).toBe('ARCHIVED');
  });

  it('đã lưu trữ & chưa từng bán → xóa được; đã lưu trữ & có học viên → 409 giữ lại', async () => {
    const empty = await createCourse({ instructor: teacher, status: 'ARCHIVED' });
    expect((await del(teacher, empty.id)).body.deleted).toBe(true);

    const sold = await createCourse({ instructor: teacher, status: 'ARCHIVED' });
    await enroll(student, sold.id);
    const res = await del(teacher, sold.id);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('COURSE_HAS_SALES');
    expect(await statusOf(sold.id)).toBe('ARCHIVED');
  });

  it('đang chờ duyệt / đang bán → 409; khóa của người khác → 404', async () => {
    const pending = await createCourse({ instructor: teacher, status: 'PENDING_REVIEW' });
    expect((await del(teacher, pending.id)).status).toBe(409);
    const live = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    expect((await del(teacher, live.id)).body.message).toMatch(/Ngừng bán/);
    const mine = await createCourse({ instructor: teacher, status: 'DRAFT' });
    expect((await del(other, mine.id)).status).toBe(404);
    expect(await statusOf(mine.id)).toBe('DRAFT');
  });
});

describe('Ngừng bán & khôi phục', () => {
  it('ngừng bán khóa đang bán: rời trang công khai, người đã mua vẫn học, admin được báo', async () => {
    const course = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    const lesson = await createLesson(course.id, { content: 'x' });
    await enroll(student, course.id);

    const res = await archive(teacher, course.id);
    expect(res.body).toMatchObject({ ok: true, status: 'ARCHIVED', students: 1 });
    expect((await request(app).get(`/api/courses/${course.slug}`)).status).toBe(404);
    expect((await request(app).get(`/api/lessons/${lesson.id}`).set(H(student))).status).toBe(200);

    const [notes] = await pool.query(
      "SELECT body FROM notifications WHERE user_id = ? AND type = 'course_archived_by_instructor'", [admin.id],
    );
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toMatch(/1 học viên/);
  });

  it('chỉ ngừng bán được khóa đang bán', async () => {
    const draft = await createCourse({ instructor: teacher, status: 'DRAFT' });
    expect((await archive(teacher, draft.id)).status).toBe(409);
  });

  it('khôi phục: Lưu trữ → Nháp (sửa được, gửi duyệt lại được); khóa khác trạng thái → 409', async () => {
    const course = await createCourse({ instructor: teacher, status: 'ARCHIVED' });
    await createLesson(course.id, { content: 'Nội dung' });
    expect((await restore(teacher, course.id)).body).toMatchObject({ ok: true, status: 'DRAFT' });
    expect(await statusOf(course.id)).toBe('DRAFT');
    expect((await request(app).post(`/api/instructor/courses/${course.id}/submit`).set(H(teacher))).status).toBe(200);
    expect((await restore(teacher, course.id)).status).toBe(409);
  });
});
