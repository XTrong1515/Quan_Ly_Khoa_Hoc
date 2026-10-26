// Không bao giờ gửi email thật khi test (controller chờ SMTP trước khi trả response)
jest.mock('../src/utils/mailer', () => ({ sendResetPasswordEmail: jest.fn().mockResolvedValue() }));

const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const request = require('supertest');
const app     = require('../src/app');
const { pool, resetDb, createUser, authHeader, DEFAULT_PASSWORD } = require('./helpers');

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
