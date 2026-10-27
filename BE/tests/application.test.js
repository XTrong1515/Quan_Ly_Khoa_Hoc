const request = require('supertest');
const app     = require('../src/app');
const { pool, resetDb, createUser, authHeader } = require('./helpers');

beforeAll(resetDb);
afterAll(() => pool.end());

const VALID = {
  headline: 'Frontend Engineer · 5 năm kinh nghiệm React',
  expertise: 'JavaScript, React, TypeScript',
  bio: 'Mình làm frontend 5 năm tại các công ty sản phẩm, từng đào tạo nội bộ cho 20+ bạn junior về JavaScript và React.',
  portfolioUrl: 'https://github.com/example',
  courseIdea: 'Khóa React Hooks từ cơ bản tới nâng cao, có dự án thực tế.',
};
const submit = (u, body = VALID) => request(app).post('/api/instructor-applications').set(authHeader(u)).send(body);
const me = (u) => request(app).get('/api/instructor-applications/me').set(authHeader(u));

describe('Học viên nộp đơn làm giảng viên', () => {
  it('khách chưa đăng nhập → 401', async () => {
    expect((await request(app).post('/api/instructor-applications').send(VALID)).status).toBe(401);
  });

  it.each([
    ['giới thiệu quá ngắn', { bio: 'ngắn' }],
    ['thiếu chuyên môn', { expertise: '' }],
    ['link không phải http(s)', { portfolioUrl: 'javascript:alert(1)' }],
    ['link sai định dạng', { portfolioUrl: 'không phải link' }],
  ])('%s → 400', async (_l, patch) => {
    expect((await submit(await createUser(), { ...VALID, ...patch })).status).toBe(400);
  });

  it('nộp đơn → PENDING, admin được báo; không nộp được đơn thứ 2 khi đang chờ', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const user = await createUser();
    expect((await me(user)).body).toMatchObject({ application: null, canApply: true });
    expect((await submit(user)).status).toBe(201);
    expect((await me(user)).body).toMatchObject({ application: { status: 'PENDING' }, canApply: false });
    expect((await submit(user)).status).toBe(409);
    const [[n]] = await pool.query("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND type = 'instructor_application'", [admin.id]);
    expect(n.n).toBe(1);
  });

  it('giảng viên / admin không nộp đơn → 409', async () => {
    expect((await submit(await createUser({ role: 'INSTRUCTOR' }))).status).toBe(409);
    expect((await submit(await createUser({ role: 'ADMIN' }))).status).toBe(409);
  });
});

describe('Admin duyệt đơn', () => {
  let admin;
  beforeAll(async () => { admin = await createUser({ role: 'ADMIN' }); });
  const appIdOf = async (u) => (await me(u)).body.application.id;

  it('duyệt → role INSTRUCTOR, chép headline/bio sang hồ sơ, người nộp được báo; vào được khu giảng viên', async () => {
    const user = await createUser();
    await submit(user);
    const id = await appIdOf(user);
    expect((await request(app).put(`/api/admin/instructor-applications/${id}/approve`).set(authHeader(admin))).status).toBe(200);

    const [[u]] = await pool.query('SELECT role, headline, bio FROM users WHERE id = ?', [user.id]);
    expect(u).toEqual({ role: 'INSTRUCTOR', headline: VALID.headline, bio: VALID.bio });
    const [[n]] = await pool.query("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND type = 'application_approved'", [user.id]);
    expect(n.n).toBe(1);

    // Token mới (sau refresh) mang role INSTRUCTOR → vào được /api/instructor
    const promoted = { ...user, role: 'INSTRUCTOR' };
    expect((await request(app).get('/api/instructor/courses').set(authHeader(promoted))).status).toBe(200);
    expect((await me(user)).body).toMatchObject({ role: 'INSTRUCTOR', canApply: false });
  });

  it('refresh token cấp access token mới mang role INSTRUCTOR (không cần đăng nhập lại)', async () => {
    const user = await createUser();
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    await submit(user);
    await request(app).put(`/api/admin/instructor-applications/${await appIdOf(user)}/approve`).set(authHeader(admin));
    const refreshed = await request(app).post('/api/auth/refresh').send({ refreshToken: login.body.refreshToken });
    const res = await request(app).get('/api/instructor/courses').set('Authorization', `Bearer ${refreshed.body.accessToken}`);
    expect(res.status).toBe(200);
  });

  it('từ chối bắt buộc có lý do; người nộp thấy lý do và nộp lại được', async () => {
    const user = await createUser();
    await submit(user);
    const id = await appIdOf(user);
    expect((await request(app).put(`/api/admin/instructor-applications/${id}/reject`).set(authHeader(admin)).send({})).status).toBe(400);
    expect((await request(app).put(`/api/admin/instructor-applications/${id}/reject`).set(authHeader(admin))
      .send({ note: 'Cần bổ sung portfolio' })).status).toBe(200);
    expect((await me(user)).body).toMatchObject({ application: { status: 'REJECTED', adminNote: 'Cần bổ sung portfolio' }, canApply: true });
    expect((await submit(user)).status).toBe(201);
  });

  it('duyệt 2 lần / duyệt đơn đã từ chối → 409', async () => {
    const user = await createUser();
    await submit(user);
    const id = await appIdOf(user);
    await request(app).put(`/api/admin/instructor-applications/${id}/approve`).set(authHeader(admin));
    expect((await request(app).put(`/api/admin/instructor-applications/${id}/approve`).set(authHeader(admin))).status).toBe(409);
    expect((await request(app).put(`/api/admin/instructor-applications/${id}/reject`).set(authHeader(admin)).send({ note: 'x' })).status).toBe(409);
  });

  it('danh sách + số đơn chờ; chỉ admin', async () => {
    const res = await request(app).get('/api/admin/instructor-applications?status=PENDING').set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.applications.every((a) => a.status === 'PENDING')).toBe(true);
    expect(res.body.pending).toBe(res.body.applications.length);
    expect((await request(app).get('/api/admin/instructor-applications').set(authHeader(await createUser()))).status).toBe(403);
  });
});
