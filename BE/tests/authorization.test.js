const request = require('supertest');
const app     = require('../src/app');
const { pool, resetDb, createUser, authHeader } = require('./helpers');

beforeAll(resetDb);
afterAll(() => pool.end());

// Các route admin đại diện cho từng nhóm chức năng
const ADMIN_ENDPOINTS = [
  ['get',  '/api/admin/dashboard'],
  ['get',  '/api/admin/users'],
  ['get',  '/api/admin/orders'],
  ['get',  '/api/admin/courses'],
  ['post', '/api/admin/categories'],
  ['post', '/api/admin/upload/image'],
];

describe('Phân quyền khu vực admin', () => {
  it.each(ADMIN_ENDPOINTS)('%s %s — khách chưa đăng nhập → 401', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
  });

  it.each(ADMIN_ENDPOINTS)('%s %s — USER → 403', async (method, url) => {
    const user = await createUser({ role: 'USER' });
    const res = await request(app)[method](url).set(authHeader(user));
    expect(res.status).toBe(403);
  });

  it('ADMIN truy cập được dashboard', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const res = await request(app).get('/api/admin/dashboard').set(authHeader(admin));
    expect(res.status).toBe(200);
    // Số liệu thật cho sparkline + trạng thái đơn (không còn dữ liệu giả ở FE)
    expect(Object.keys(res.body.trend)).toEqual(['days', 'revenue', 'users', 'enrollments', 'orders']);
    expect(res.body.trend.users.reduce((s, d) => s + d.value, 0)).toBeGreaterThanOrEqual(1); // chính admin vừa tạo
    expect(Array.isArray(res.body.orderStatus)).toBe(true);
  });
});

describe('Route yêu cầu đăng nhập', () => {
  it.each([
    ['get', '/api/orders/me'],
    ['get', '/api/transactions/me'],
    ['get', '/api/wishlists/me'],
    ['get', '/api/notifications'],
  ])('%s %s — khách → 401', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
  });
});
