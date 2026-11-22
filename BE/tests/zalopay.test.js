/**
 * Cổng ZaloPay: tạo giao dịch (ký key1), xác nhận khi quay về (API query, không tin query string),
 * callback server-to-server (ký key2). fetch tới ZaloPay được mock — không gọi sandbox thật.
 */
const crypto  = require('crypto');
const request = require('supertest');
const app     = require('../src/app');
const zalopay = require('../src/services/payments/zalopay');
const {
  pool, resetDb, createUser, authHeader, createCourse, createOrder,
} = require('./helpers');

const KEY1 = 'test-key1';
const KEY2 = 'test-key2';
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest('hex');
const statusOf = async (id) => (await pool.query('SELECT status FROM orders WHERE id = ?', [id]))[0][0].status;

/** Hàng đợi phản hồi giả cho fetch; ghi lại body đã gửi. */
let replies = [];
const sent = [];
const realFetch = global.fetch;

beforeAll(async () => {
  await resetDb();
  Object.assign(process.env, { ZALOPAY_APP_ID: '2554', ZALOPAY_KEY1: KEY1, ZALOPAY_KEY2: KEY2, ZALOPAY_CALLBACK_URL: '' });
  global.fetch = jest.fn(async (url, init) => {
    sent.push({ url, body: Object.fromEntries(new URLSearchParams(init.body)) });
    const next = replies.shift();
    if (next instanceof Error) throw next;
    return { ok: true, json: async () => next };
  });
});
afterAll(async () => {
  global.fetch = realFetch;
  Object.assign(process.env, { ZALOPAY_APP_ID: '', ZALOPAY_KEY1: '', ZALOPAY_KEY2: '' });
  await pool.end();
});
beforeEach(() => { replies = []; sent.length = 0; });

describe('ZaloPay — app_trans_id', () => {
  it('bắt đầu bằng yymmdd giờ VN, ≤ 40 ký tự, suy ngược được orderId', () => {
    const id = zalopay.appTransIdFor(123456);
    expect(id.length).toBeLessThanOrEqual(40);
    expect(id.startsWith(`${zalopay.vnYymmdd()}_`)).toBe(true);
    expect(zalopay.orderIdFrom(id)).toBe(123456);
    expect(zalopay.orderIdFrom('ORD-20261122-ABC')).toBeNull();
    expect(zalopay.vnYymmdd(Date.UTC(2026, 10, 22, 18, 0))).toBe('261123'); // 18h UTC = 1h sáng hôm sau ở VN
  });
});

describe('POST /api/orders/:id/pay — tạo giao dịch ZaloPay', () => {
  let buyer; let course;
  beforeAll(async () => {
    buyer = await createUser();
    course = await createCourse({ status: 'PUBLISHED', price: 300000 });
  });

  it('ký MAC bằng key1 đúng thứ tự trường, trả order_url, ghi payment_method = ZALOPAY', async () => {
    const order = await createOrder(buyer, [course.id]);
    replies.push({ return_code: 1, order_url: 'https://qcgateway.zalopay.vn/openinapp?order=abc' });

    const res = await request(app).post(`/api/orders/${order.id}/pay`).set(authHeader(buyer));
    expect(res.status).toBe(200);
    expect(res.body.paymentUrl).toBe('https://qcgateway.zalopay.vn/openinapp?order=abc');

    const { url, body } = sent[0];
    expect(url).toMatch(/\/v2\/create$/);
    expect(body.amount).toBe('300000');
    expect(zalopay.orderIdFrom(body.app_trans_id)).toBe(order.id);
    expect(JSON.parse(body.embed_data).redirecturl).toMatch(/\/payment\/result$/);
    expect(body.callback_url).toBeUndefined(); // không có URL công khai → không gửi
    const input = [body.app_id, body.app_trans_id, body.app_user, body.amount, body.app_time, body.embed_data, body.item].join('|');
    expect(body.mac).toBe(hmac(KEY1, input));
    expect(Number(body.expire_duration_seconds)).toBeGreaterThanOrEqual(300);

    const [[o]] = await pool.query('SELECT payment_method FROM orders WHERE id = ?', [order.id]);
    expect(o.payment_method).toBe('ZALOPAY');
  });

  it('ZaloPay từ chối / không phản hồi → 502, đơn vẫn PENDING', async () => {
    const order = await createOrder(buyer, [course.id]);
    replies.push({ return_code: 2, sub_return_code: -402, sub_return_message: 'Chữ ký không hợp lệ' });
    expect((await request(app).post(`/api/orders/${order.id}/pay`).set(authHeader(buyer))).status).toBe(502);
    replies.push(new Error('timeout'));
    expect((await request(app).post(`/api/orders/${order.id}/pay`).set(authHeader(buyer))).status).toBe(502);
    expect(await statusOf(order.id)).toBe('PENDING');
  });

  it('đặt đơn không tạo sẵn giao dịch ZaloPay (FE mở cổng qua /pay)', async () => {
    const student = await createUser();
    const res = await request(app).post('/api/orders').set(authHeader(student)).send({ courseIds: [course.id] });
    expect(res.status).toBe(201);
    expect(res.body.paymentUrl).toBeNull();
    expect(sent).toHaveLength(0);
  });
});

describe('POST /api/orders/verify — học viên quay về từ ZaloPay', () => {
  let buyer; let other; let course;
  const verify = (user, body) => request(app).post('/api/orders/verify').set(authHeader(user)).send(body);
  beforeAll(async () => {
    buyer = await createUser();
    other = await createUser();
    course = await createCourse({ status: 'PUBLISHED', price: 300000 });
  });

  it('hỏi lại ZaloPay (query ký key1) — chỉ PAID khi ZaloPay xác nhận, không tin status=1 trên URL', async () => {
    const order = await createOrder(buyer, [course.id]);
    const apptransid = zalopay.appTransIdFor(order.id);

    replies.push({ return_code: 3, is_processing: true, amount: 0, zp_trans_id: 0 });
    let res = await verify(buyer, { apptransid, status: '1' });
    expect(res.body).toMatchObject({ success: false, status: 'PROCESSING' });
    expect(await statusOf(order.id)).toBe('PENDING');
    expect(sent[0].body.mac).toBe(hmac(KEY1, `2554|${apptransid}|${KEY1}`));

    replies.push({ return_code: 1, amount: 300000, zp_trans_id: 240000123 });
    res = await verify(buyer, { apptransid, status: '1' });
    expect(res.body).toMatchObject({ success: true, status: 'PAID', orderId: order.id });
    const [[o]] = await pool.query('SELECT transaction_id FROM orders WHERE id = ?', [order.id]);
    expect(o.transaction_id).toBe('240000123');
  });

  it('ZaloPay báo thất bại → FAILED cho lần trả này, đơn vẫn PENDING để trả lại', async () => {
    const order = await createOrder(buyer, [course.id]);
    replies.push({ return_code: 2, sub_return_code: -63 });
    const res = await verify(buyer, { apptransid: zalopay.appTransIdFor(order.id), status: '-49' });
    expect(res.body).toMatchObject({ success: false, status: 'FAILED' });
    expect(await statusOf(order.id)).toBe('PENDING');
  });

  it('redirect đã ký key2 báo hủy → FAILED ngay dù query còn "đang xử lý"; checksum sai / status=1 không đủ', async () => {
    const order = await createOrder(buyer, [course.id]);
    const apptransid = zalopay.appTransIdFor(order.id);
    const redirect = (status, key = KEY2) => {
      const q = { amount: '300000', appid: '2554', apptransid, bankcode: '', discountamount: '0', pmcid: '0', status };
      const input = [q.appid, q.apptransid, q.pmcid, q.bankcode, q.amount, q.discountamount, q.status].join('|');
      return { ...q, checksum: hmac(key, input) };
    };
    const processing = { return_code: 3, is_processing: true, amount: 0, zp_trans_id: 0 };

    replies.push(processing);
    expect((await verify(buyer, redirect('-49'))).body.status).toBe('FAILED');
    replies.push(processing);
    expect((await verify(buyer, redirect('-49', 'wrong-key'))).body.status).toBe('PROCESSING');
    replies.push(processing);
    expect((await verify(buyer, redirect('1'))).body).toMatchObject({ success: false, status: 'PROCESSING' });
    expect(await statusOf(order.id)).toBe('PENDING');
  });

  it('số tiền ZaloPay báo không khớp → 400; đơn của người khác → 403', async () => {
    const order = await createOrder(buyer, [course.id]);
    replies.push({ return_code: 1, amount: 1000, zp_trans_id: 1 });
    expect((await verify(buyer, { apptransid: zalopay.appTransIdFor(order.id) })).status).toBe(400);
    expect((await verify(other, { apptransid: zalopay.appTransIdFor(order.id) })).status).toBe(403);
    expect(await statusOf(order.id)).toBe('PENDING');
  });

  it('ZaloPay đã cấu hình → dev_mock=1 không còn đánh dấu PAID được', async () => {
    const order = await createOrder(buyer, [course.id]);
    const res = await verify(buyer, { vnp_TxnRef: order.code, vnp_ResponseCode: '00', dev_mock: '1' });
    expect(res.status).toBe(400);
    expect(await statusOf(order.id)).toBe('PENDING');
  });
});

describe('POST /api/orders/zalopay-callback (server-to-server)', () => {
  let buyer; let course;
  const callback = (data, key = KEY2) => {
    const json = JSON.stringify(data);
    return request(app).post('/api/orders/zalopay-callback').send({ data: json, mac: hmac(key, json), type: 1 });
  };
  const payload = (order, overrides = {}) => ({
    app_id: 2554, app_trans_id: zalopay.appTransIdFor(order.id), amount: 300000, zp_trans_id: 240000999, ...overrides,
  });
  beforeAll(async () => {
    buyer = await createUser();
    course = await createCourse({ status: 'PUBLISHED', price: 300000 });
  });

  it('MAC sai (không phải key2) → -1, đơn giữ nguyên', async () => {
    const order = await createOrder(buyer, [course.id]);
    const res = await callback(payload(order), KEY1);
    expect(res.body.return_code).toBe(-1);
    expect(await statusOf(order.id)).toBe('PENDING');
  });

  it('số tiền không khớp → -1', async () => {
    const order = await createOrder(buyer, [course.id]);
    expect((await callback(payload(order, { amount: 1000 }))).body.return_code).toBe(-1);
    expect(await statusOf(order.id)).toBe('PENDING');
  });

  it('hợp lệ, không cần đăng nhập → PAID + enrollment; ZaloPay gọi lại → 2', async () => {
    const student = await createUser();
    const order = await createOrder(student, [course.id]);
    expect((await callback(payload(order))).body.return_code).toBe(1);
    expect(await statusOf(order.id)).toBe('PAID');
    const [[e]] = await pool.query('SELECT COUNT(*) AS n FROM enrollments WHERE user_id = ? AND course_id = ?', [student.id, course.id]);
    expect(e.n).toBe(1);
    expect((await callback(payload(order))).body.return_code).toBe(2);
  });
});
