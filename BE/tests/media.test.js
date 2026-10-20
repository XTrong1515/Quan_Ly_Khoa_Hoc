// headObject / deleteObject gọi storage thật → mock; presign là tính toán chữ ký tại chỗ nên dùng thật
jest.mock('../src/utils/storage', () => ({
  ...jest.requireActual('../src/utils/storage'),
  isConfigured: jest.fn(() => true),
  headObject: jest.fn(),
  deleteObject: jest.fn(),
}));

const request = require('supertest');
const app     = require('../src/app');
const storage = require('../src/utils/storage');
const {
  pool, resetDb, createUser, authHeader, createCourse, createLesson, enroll,
} = require('./helpers');

beforeAll(resetDb);
afterAll(() => pool.end());
beforeEach(() => { storage.headObject.mockReset(); storage.deleteObject.mockReset(); });

let teacher; let otherTeacher; let student; let outsider; let admin;
let course; let lesson; let previewLesson;
beforeAll(async () => {
  teacher      = await createUser({ role: 'INSTRUCTOR' });
  otherTeacher = await createUser({ role: 'INSTRUCTOR' });
  student      = await createUser();
  outsider     = await createUser();
  admin        = await createUser({ role: 'ADMIN' });
  course       = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
  lesson       = await createLesson(course.id);
  previewLesson = await createLesson(course.id);
  await pool.query('UPDATE lessons SET is_preview = 1, video_url = ? WHERE id = ?', ['https://youtu.be/free', previewLesson.id]);
  await pool.query('UPDATE lessons SET video_url = ? WHERE id = ?', ['https://youtu.be/paid-secret', lesson.id]);
  await enroll(student, course.id);
});

const prefix = (l, kind) => `courses/${course.id}/lessons/${l.id}/${kind}/`;
const presign = (user, body, l = lesson) =>
  request(app).post(`/api/instructor/lessons/${l.id}/uploads`).set(authHeader(user)).send(body);

describe('Trang khóa học công khai không lộ link video', () => {
  it('GET /api/courses/:slug không trả video_url của bất kỳ bài nào', async () => {
    const res = await request(app).get(`/api/courses/${course.slug}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('paid-secret');
    expect(res.body.lessons.every((l) => !('video_url' in l))).toBe(true);
  });

  it('bài xem thử lấy link qua /preview; bài trả phí bị chặn', async () => {
    const ok = await request(app).get(`/api/lessons/${previewLesson.id}/preview`);
    expect(ok.status).toBe(200);
    expect(ok.body.lesson.video_url).toBe('https://youtu.be/free');
    expect((await request(app).get(`/api/lessons/${lesson.id}/preview`)).status).toBe(403);
  });
});

describe('Bước 1 — xin presigned URL để upload', () => {
  it('chủ khóa học nhận URL có chữ ký, key nằm trong thư mục bài học, hết hạn 15 phút', async () => {
    const res = await presign(teacher, { kind: 'video', contentType: 'video/mp4', size: 50 * 1024 * 1024 });
    expect(res.status).toBe(201);
    expect(res.body.key.startsWith(prefix(lesson, 'video'))).toBe(true);
    expect(res.body.key).toMatch(/\.mp4$/);
    const url = new URL(res.body.uploadUrl);
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
  });

  it.each([
    ['sai định dạng video', { kind: 'video', contentType: 'video/x-msvideo', size: 1000 }],
    ['PDF giả làm video',   { kind: 'video', contentType: 'application/pdf', size: 1000 }],
    ['file .exe làm tài liệu', { kind: 'attachment', contentType: 'application/x-msdownload', size: 1000 }],
    ['quá dung lượng',      { kind: 'attachment', contentType: 'application/pdf', size: 51 * 1024 * 1024 }],
    ['size không hợp lệ',   { kind: 'video', contentType: 'video/mp4', size: -1 }],
    ['kind lạ',             { kind: 'avatar', contentType: 'image/png', size: 1000 }],
  ])('%s → 400', async (_label, body) => {
    expect((await presign(teacher, body)).status).toBe(400);
  });

  it('giảng viên khác → 404; học viên → 403', async () => {
    const body = { kind: 'video', contentType: 'video/mp4', size: 1000 };
    expect((await presign(otherTeacher, body)).status).toBe(404);
    expect((await presign(student, body)).status).toBe(403);
  });

  it('admin dùng được qua /api/admin', async () => {
    const res = await request(app).post(`/api/admin/lessons/${lesson.id}/uploads`).set(authHeader(admin))
      .send({ kind: 'attachment', contentType: 'application/pdf', size: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.key.startsWith(prefix(lesson, 'attachment'))).toBe(true);
  });
});

describe('Bước 3 — gắn file đã upload vào bài học', () => {
  const attach = (body, user = teacher) =>
    request(app).put(`/api/instructor/lessons/${lesson.id}/media`).set(authHeader(user)).send(body);

  it('key của bài học khác → 400 (không trỏ được sang file người khác)', async () => {
    const other = await createLesson(course.id);
    const res = await attach({ kind: 'video', key: `${prefix(other, 'video')}x.mp4` });
    expect(res.status).toBe(400);
    expect(storage.headObject).not.toHaveBeenCalled();
  });

  it('key có ".." → 400', async () => {
    expect((await attach({ kind: 'video', key: `${prefix(lesson, 'video')}../../x.mp4` })).status).toBe(400);
  });

  it('file chưa có trên storage → 400', async () => {
    storage.headObject.mockResolvedValue(null);
    expect((await attach({ kind: 'video', key: `${prefix(lesson, 'video')}a.mp4` })).status).toBe(400);
  });

  it('file thật sai định dạng (đổi Content-Type khi upload) → 400 và bị xóa', async () => {
    storage.headObject.mockResolvedValue({ size: 1000, contentType: 'text/html' });
    const key = `${prefix(lesson, 'video')}b.mp4`;
    expect((await attach({ kind: 'video', key })).status).toBe(400);
    expect(storage.deleteObject).toHaveBeenCalledWith(key);
  });

  it('hợp lệ → lưu video_key; thay video mới thì xóa file cũ', async () => {
    storage.headObject.mockResolvedValue({ size: 5000, contentType: 'video/mp4' });
    const first = `${prefix(lesson, 'video')}first.mp4`;
    expect((await attach({ kind: 'video', key: first })).status).toBe(200);
    expect((await pool.query('SELECT video_key FROM lessons WHERE id = ?', [lesson.id]))[0][0].video_key).toBe(first);

    const second = `${prefix(lesson, 'video')}second.mp4`;
    expect((await attach({ kind: 'video', key: second })).status).toBe(200);
    expect(storage.deleteObject).toHaveBeenCalledWith(first);
  });

  it('gắn PDF kèm tên file gốc', async () => {
    storage.headObject.mockResolvedValue({ size: 2000, contentType: 'application/pdf' });
    const key = `${prefix(lesson, 'attachment')}doc.pdf`;
    expect((await attach({ kind: 'attachment', key, filename: 'Slide bài 1.pdf' })).status).toBe(200);
    const [[row]] = await pool.query('SELECT attachment_key, attachment_name FROM lessons WHERE id = ?', [lesson.id]);
    expect(row).toEqual({ attachment_key: key, attachment_name: 'Slide bài 1.pdf' });
  });
});

describe('Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn', () => {
  it('học viên đã mua: link presigned trỏ tới file trên storage, kèm thời điểm hết hạn', async () => {
    const res = await request(app).get(`/api/lessons/${lesson.id}`).set(authHeader(student));
    expect(res.status).toBe(200);
    const { videoUrl, videoSource, videoExpiresAt } = res.body.lesson;
    expect(videoSource).toBe('storage');
    expect(videoUrl).toContain('second.mp4');
    expect(new URL(videoUrl).searchParams.get('X-Amz-Expires')).toBe('1800');
    expect(new Date(videoExpiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(res.body.lesson.hasAttachment).toBe(true);
  });

  it('chưa mua → 403, không nhận được link', async () => {
    const res = await request(app).get(`/api/lessons/${lesson.id}`).set(authHeader(outsider));
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain('X-Amz-Signature');
  });

  it('staffView chỉ bật cho admin / giảng viên sở hữu', async () => {
    const own = await request(app).get(`/api/lessons/${lesson.id}`).set(authHeader(teacher));
    expect(own.body.staffView).toBe(true);
    const learner = await request(app).get(`/api/lessons/${lesson.id}`).set(authHeader(student));
    expect(learner.body.staffView).toBe(false);
    const freePreview = await request(app).get(`/api/lessons/${previewLesson.id}`).set(authHeader(outsider));
    expect(freePreview.status).toBe(200);
    expect(freePreview.body.staffView).toBe(false);
  });

  it('giảng viên sở hữu và admin xem được dù không mua; giảng viên khác thì không', async () => {
    expect((await request(app).get(`/api/lessons/${lesson.id}`).set(authHeader(teacher))).status).toBe(200);
    expect((await request(app).get(`/api/lessons/${lesson.id}`).set(authHeader(admin))).status).toBe(200);
    expect((await request(app).get(`/api/lessons/${lesson.id}`).set(authHeader(otherTeacher))).status).toBe(403);
  });

  it('tài liệu PDF: link 5 phút, mở inline với tên file gốc', async () => {
    const res = await request(app).get(`/api/lessons/${lesson.id}/attachment`).set(authHeader(student));
    expect(res.status).toBe(200);
    const url = new URL(res.body.url);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('response-content-disposition')).toContain('inline');
    expect((await request(app).get(`/api/lessons/${lesson.id}/attachment`).set(authHeader(outsider))).status).toBe(403);
  });
});

describe('Dọn file trên storage', () => {
  it('gỡ video khỏi bài học → xóa object', async () => {
    const res = await request(app).delete(`/api/instructor/lessons/${lesson.id}/media/video`).set(authHeader(teacher));
    expect(res.status).toBe(200);
    expect(storage.deleteObject).toHaveBeenCalledWith(expect.stringContaining('second.mp4'));
    expect((await pool.query('SELECT video_key FROM lessons WHERE id = ?', [lesson.id]))[0][0].video_key).toBeNull();
  });

  it('xóa bài học → xóa luôn file đính kèm', async () => {
    const res = await request(app).delete(`/api/instructor/lessons/${lesson.id}`).set(authHeader(teacher));
    expect(res.status).toBe(200);
    expect(storage.deleteObject).toHaveBeenCalledWith(expect.stringContaining('doc.pdf'));
  });
});
