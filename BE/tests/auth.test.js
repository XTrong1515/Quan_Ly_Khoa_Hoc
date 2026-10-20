const request = require('supertest');
const app     = require('../src/app');
const { pool, resetDb, createUser, authHeader, DEFAULT_PASSWORD } = require('./helpers');

beforeAll(resetDb);
afterAll(() => pool.end());

describe('GET /health', () => {
  it('trả về ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('POST /api/auth/register', () => {
  it('tạo tài khoản mới với role USER', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Học Viên', email: 'new.student@test.local', password: DEFAULT_PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('USER');
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it('lưu mật khẩu dạng hash bcrypt, không lưu plaintext', async () => {
    const [[row]] = await pool.query('SELECT password_hash FROM users WHERE email = ?', ['new.student@test.local']);
    expect(row.password_hash).not.toBe(DEFAULT_PASSWORD);
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);
  });

  it('từ chối email đã tồn tại (409)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Trùng', email: 'new.student@test.local', password: DEFAULT_PASSWORD });
    expect(res.status).toBe(409);
  });

  it('từ chối khi thiếu thông tin (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@test.local' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('đăng nhập đúng trả về token và thông tin user', async () => {
    const user = await createUser();
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, email: user.email, role: 'USER' });
    expect(res.body.accessToken).toBeTruthy();
  });

  it('không phân biệt hoa thường của email', async () => {
    const user = await createUser();
    const res = await request(app).post('/api/auth/login').send({ email: user.email.toUpperCase(), password: user.password });
    expect(res.status).toBe(200);
  });

  it('sai mật khẩu → 401', async () => {
    const user = await createUser();
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('email không tồn tại → 401 với cùng thông báo (không lộ email nào có thật)', async () => {
    const user = await createUser();
    const wrongPw   = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong' });
    const noAccount = await request(app).post('/api/auth/login').send({ email: 'nobody@test.local', password: 'wrong' });
    expect(noAccount.status).toBe(401);
    expect(noAccount.body.message).toBe(wrongPw.body.message);
  });

  it('tài khoản bị khóa → 403', async () => {
    const user = await createUser({ status: 'LOCKED' });
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/auth/me', () => {
  it('có token hợp lệ → trả về user', async () => {
    const user = await createUser();
    const res = await request(app).get('/api/auth/me').set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
  });

  it('không có token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('token bị sửa → 401', async () => {
    const user = await createUser();
    const { Authorization } = authHeader(user);
    const res = await request(app).get('/api/auth/me').set('Authorization', `${Authorization.slice(0, -2)}xx`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh & logout', () => {
  async function loginAs(user) {
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    return res.body.refreshToken;
  }

  it('refresh token hợp lệ → cấp access token mới', async () => {
    const refreshToken = await loginAs(await createUser());
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('access token không dùng thay refresh token được (khác secret)', async () => {
    const user = await createUser();
    const accessToken = authHeader(user).Authorization.slice(7);
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: accessToken });
    expect(res.status).toBe(401);
  });

  it('sau khi logout, refresh token bị thu hồi', async () => {
    const refreshToken = await loginAs(await createUser());
    await request(app).post('/api/auth/logout').send({ refreshToken });
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it('user bị khóa sau khi đăng nhập không refresh được', async () => {
    const user = await createUser();
    const refreshToken = await loginAs(user);
    await pool.query("UPDATE users SET status = 'LOCKED' WHERE id = ?", [user.id]);
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });
});
