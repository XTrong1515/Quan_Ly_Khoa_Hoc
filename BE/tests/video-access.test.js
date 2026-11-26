/**
 * Nhật ký xem video (truy vết watermark).
 * - Lấy khóa giải mã HLS / được cấp link MP4 → ghi user, bài, IP, trình duyệt.
 * - Cùng người + bài + nguồn + IP trong 10 phút → chỉ 1 dòng.
 * - Không có quyền xem → không ghi. Bài không có video → không ghi.
 * - Admin tra theo người / bài / ngày; người khác không xem được nhật ký.
 */
const crypto  = require('crypto');
const request = require('supertest');
const app     = require('../src/app');
const hls     = require('../src/services/video/hls');
const {
  pool, resetDb, createUser, authHeader, createCourse, createLesson, enroll,
} = require('./helpers');

const H = authHeader;
beforeAll(resetDb);
afterAll(() => pool.end());

let teacher; let student; let outsider; let admin; let course;
beforeAll(async () => {
  teacher  = await createUser({ role: 'INSTRUCTOR' });
  student  = await createUser();
  outsider = await createUser();
  admin    = await createUser({ role: 'ADMIN' });
  course   = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
  await enroll(student, course.id);
});

async function hlsLesson() {
  const lesson = await createLesson(course.id);
  await pool.query(
    "UPDATE lessons SET video_key = ?, hls_status = 'READY', hls_prefix = ?, hls_key = ? WHERE id = ?",
    [`videos/${lesson.id}.mp4`, `videos/hls/${lesson.id}/`, hls.sealKey(crypto.randomBytes(16)), lesson.id],
  );
  return lesson;
}
const logsOf = async (lessonId) =>
  (await pool.query('SELECT user_id, source, ip, user_agent FROM video_access_logs WHERE lesson_id = ?', [lessonId]))[0];

describe('Ghi nhật ký', () => {
  it('lấy khóa giải mã HLS → 1 dòng (user, nguồn HLS, IP, trình duyệt); lấy lại trong 10 phút không ghi thêm', async () => {
    const lesson = await hlsLesson();
    const key = await request(app).get(`/api/lessons/${lesson.id}/hls/key`).set(H(student)).set('User-Agent', 'TestBrowser/1.0');
    expect(key.status).toBe(200);
    expect(key.body.length ?? key.body.byteLength).toBe(16);
    await request(app).get(`/api/lessons/${lesson.id}/hls/key`).set(H(student)).set('User-Agent', 'TestBrowser/1.0');

    const logs = await logsOf(lesson.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ user_id: student.id, source: 'HLS', user_agent: 'TestBrowser/1.0' });
    expect(logs[0].ip).toBeTruthy();
  });

  it('video chưa mã hóa HLS → mở bài (cấp link MP4) được ghi nguồn MP4', async () => {
    const lesson = await createLesson(course.id);
    await pool.query("UPDATE lessons SET video_key = ?, hls_status = 'PROCESSING' WHERE id = ?", [`videos/${lesson.id}.mp4`, lesson.id]);
    expect((await request(app).get(`/api/lessons/${lesson.id}`).set(H(student))).status).toBe(200);
    expect(await logsOf(lesson.id)).toEqual([expect.objectContaining({ user_id: student.id, source: 'MP4' })]);
  });

  it('bài không có video → không ghi; người chưa mua → bị chặn, không ghi', async () => {
    const textOnly = await createLesson(course.id, { content: 'chỉ có chữ' });
    await request(app).get(`/api/lessons/${textOnly.id}`).set(H(student));
    expect(await logsOf(textOnly.id)).toHaveLength(0);

    const lesson = await hlsLesson();
    expect((await request(app).get(`/api/lessons/${lesson.id}/hls/key`).set(H(outsider))).status).toBe(403);
    expect(await logsOf(lesson.id)).toHaveLength(0);
  });
});

describe('Admin tra cứu', () => {
  it('lọc theo người (ID trên watermark): kèm email, tên bài, khóa; đếm số IP', async () => {
    const lesson = await hlsLesson();
    await request(app).get(`/api/lessons/${lesson.id}/hls/key`).set(H(student));
    const res = await request(app).get('/api/admin/video-access').query({ userId: student.id }).set(H(admin));
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.distinctIps).toBeGreaterThanOrEqual(1);
    expect(res.body.logs[0]).toMatchObject({ userId: student.id, userEmail: student.email, lessonId: expect.any(Number) });
    expect(res.body.logs[0].lessonTitle).toBeTruthy();
    expect(res.body.logs[0].courseTitle).toBeTruthy();
  });

  it('lọc theo bài + ngày: ai đã xem bài này hôm nay', async () => {
    const lesson = await hlsLesson();
    await request(app).get(`/api/lessons/${lesson.id}/hls/key`).set(H(student));
    const [[{ today }]] = await pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today");
    const res = await request(app).get('/api/admin/video-access').query({ lessonId: lesson.id, from: today, to: today }).set(H(admin));
    expect(res.body.distinctUsers).toBe(1);
    expect(res.body.logs.map((l) => l.userId)).toEqual([student.id]);
  });

  it('không có bộ lọc → 400; học viên / giảng viên không xem được nhật ký', async () => {
    expect((await request(app).get('/api/admin/video-access').set(H(admin))).status).toBe(400);
    expect((await request(app).get('/api/admin/video-access').query({ userId: student.id }).set(H(student))).status).toBe(403);
    expect((await request(app).get('/api/admin/video-access').query({ userId: student.id }).set(H(teacher))).status).toBe(403);
  });
});
