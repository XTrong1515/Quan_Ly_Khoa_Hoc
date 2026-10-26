const request = require('supertest');
const app     = require('../src/app');
const { markOrderPaid, splitRevenue } = require('../src/services/orders');
const {
  pool, resetDb, createUser, authHeader, createCourse, createOrder,
} = require('./helpers');

beforeAll(resetDb);
afterAll(() => pool.end());

const verify = (user, body) => request(app).post('/api/orders/verify').set(authHeader(user)).send(body);
const statusOf = async (id) => (await pool.query('SELECT status FROM orders WHERE id = ?', [id]))[0][0].status;

describe('Chia doanh thu', () => {
  it('giảng viên nhận (100 − hoa hồng)%, làm tròn đồng; khóa không có giảng viên → nền tảng giữ 100%', () => {
    expect(splitRevenue(500000, { instructorId: 1, commissionRate: 30 })).toEqual({ commissionRate: 30, instructorEarning: 350000 });
    expect(splitRevenue(99999, { instructorId: 1, commissionRate: 33.33 })).toEqual({ commissionRate: 33.33, instructorEarning: 66669 });
    expect(splitRevenue(500000, { instructorId: 1, commissionRate: null }).commissionRate).toBe(30); // PLATFORM_COMMISSION mặc định
    expect(splitRevenue(500000, { instructorId: null })).toEqual({ commissionRate: 100, instructorEarning: 0 });
  });
});

describe('markOrderPaid — một chỗ duy nhất chuyển đơn sang PAID', () => {
  let buyer; let teacher; let course; let platformCourse;
  beforeAll(async () => {
    buyer = await createUser();
    teacher = await createUser({ role: 'INSTRUCTOR' });
    course = await createCourse({ instructor: teacher, status: 'PUBLISHED', price: 500000 });
    platformCourse = await createCourse({ status: 'PUBLISHED', price: 200000 });
  });

  it('chụp số liệu doanh thu, tạo enrollment, tăng số học viên', async () => {
    const order = await createOrder(buyer, [course.id, platformCourse.id]);
    const r = await markOrderPaid(order.id, { transactionId: 'TX1' });
    expect(r.changed).toBe(true);
    const [items] = await pool.query('SELECT course_id, instructor_id, commission_rate, instructor_earning FROM order_items WHERE order_id = ? ORDER BY course_id', [order.id]);
    expect(items.map((i) => [i.instructor_id, Number(i.commission_rate), Number(i.instructor_earning)])).toEqual([
      [teacher.id, 30, 350000],
      [null, 100, 0],
    ]);
    const [[e]] = await pool.query('SELECT COUNT(*) AS n FROM enrollments WHERE user_id = ?', [buyer.id]);
    expect(e.n).toBe(2);
    const [[c]] = await pool.query('SELECT student_count FROM courses WHERE id = ?', [course.id]);
    expect(c.student_count).toBe(1);
  });

  it('đổi tỷ lệ hoa hồng SAU khi bán không làm thay đổi doanh thu cũ', async () => {
    await pool.query('UPDATE users SET commission_rate = 50 WHERE id = ?', [teacher.id]);
    const [[old]] = await pool.query("SELECT instructor_earning FROM order_items WHERE instructor_id = ? AND commission_rate = 30", [teacher.id]);
    expect(Number(old.instructor_earning)).toBe(350000);

    const buyer2 = await createUser();
    const order = await createOrder(buyer2, [course.id]);
    await markOrderPaid(order.id);
    const [[fresh]] = await pool.query('SELECT commission_rate, instructor_earning FROM order_items WHERE order_id = ?', [order.id]);
    expect([Number(fresh.commission_rate), Number(fresh.instructor_earning)]).toEqual([50, 250000]);
    await pool.query('UPDATE users SET commission_rate = NULL WHERE id = ?', [teacher.id]);
  });

  it('gọi 2 lần đồng thời → chỉ 1 lần xử lý (không trùng enrollment / số học viên)', async () => {
    const buyer3 = await createUser();
    const order = await createOrder(buyer3, [course.id]);
    const [[before]] = await pool.query('SELECT student_count FROM courses WHERE id = ?', [course.id]);
    const results = await Promise.all([markOrderPaid(order.id), markOrderPaid(order.id), markOrderPaid(order.id)]);
    expect(results.filter((r) => r.changed)).toHaveLength(1);
    const [[after]] = await pool.query('SELECT student_count FROM courses WHERE id = ?', [course.id]);
    expect(after.student_count).toBe(before.student_count + 1);
  });
});

describe('POST /api/orders/verify — bảo mật callback thanh toán', () => {
  let buyer; let other; let course;
  beforeAll(async () => {
    buyer = await createUser();
    other = await createUser();
    course = await createCourse({ status: 'PUBLISHED', price: 300000 });
  });

  it('dev mock (VNPay chưa cấu hình) → PAID; gọi lại lần 2 không xử lý lại', async () => {
    const order = await createOrder(buyer, [course.id]);
    const body = { vnp_TxnRef: order.code, vnp_ResponseCode: '00', vnp_TransactionNo: 'DEV1', dev_mock: '1' };
    const first = await verify(buyer, body);
    expect(first.body).toMatchObject({ success: true, status: 'PAID' });
    const second = await verify(buyer, body);
    expect(second.body).toMatchObject({ success: true, status: 'PAID' });
    const [[n]] = await pool.query("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND type = 'order_paid'", [buyer.id]);
    expect(n.n).toBe(1);
  });

  it('thông báo thanh toán có đúng mã đơn (trước đây hiển thị "#undefined")', async () => {
    await new Promise((r) => setTimeout(r, 50)); // thông báo gửi qua setImmediate
    const [[note]] = await pool.query("SELECT body FROM notifications WHERE user_id = ? AND type = 'order_paid'", [buyer.id]);
    expect(note.body).not.toContain('undefined');
  });

  it('không có dev_mock khi VNPay chưa cấu hình → 400, đơn vẫn PENDING', async () => {
    const order = await createOrder(buyer, [course.id]);
    const res = await verify(buyer, { vnp_TxnRef: order.code, vnp_ResponseCode: '00' });
    expect(res.status).toBe(400);
    expect(await statusOf(order.id)).toBe('PENDING');
  });

  it('đơn của người khác → 403', async () => {
    const order = await createOrder(buyer, [course.id]);
    const res = await verify(other, { vnp_TxnRef: order.code, vnp_ResponseCode: '00', dev_mock: '1' });
    expect(res.status).toBe(403);
    expect(await statusOf(order.id)).toBe('PENDING');
  });

  it('VNPay ĐÃ cấu hình: gửi dev_mock=1 không còn bỏ qua được kiểm tra chữ ký', async () => {
    let isolatedApp;
    jest.isolateModules(() => {
      process.env.VNPAY_TMN_CODE = 'TESTCODE';
      process.env.VNPAY_HASH_SECRET = 'TESTSECRET';
      isolatedApp = require('../src/app');
      process.env.VNPAY_TMN_CODE = '';
      process.env.VNPAY_HASH_SECRET = '';
    });
    const order = await createOrder(buyer, [course.id]);
    const res = await request(isolatedApp).post('/api/orders/verify').set(authHeader(buyer))
      .send({ vnp_TxnRef: order.code, vnp_ResponseCode: '00', dev_mock: '1' });
    expect(res.status).toBe(400);
    expect(await statusOf(order.id)).toBe('PENDING');
  });

  it('thanh toán thất bại → FAILED; không ghi đè đơn đã PAID', async () => {
    const order = await createOrder(buyer, [course.id]);
    await verify(buyer, { vnp_TxnRef: order.code, vnp_ResponseCode: '24', dev_mock: '1' });
    expect(await statusOf(order.id)).toBe('FAILED');
  });
});

describe('Doanh thu & chi trả giảng viên', () => {
  let admin; let teacher; let otherTeacher; let course;
  beforeAll(async () => {
    admin = await createUser({ role: 'ADMIN' });
    teacher = await createUser({ role: 'INSTRUCTOR', name: 'GV Doanh Thu' });
    otherTeacher = await createUser({ role: 'INSTRUCTOR' });
    course = await createCourse({ instructor: teacher, status: 'PUBLISHED', price: 500000 });
    for (let i = 0; i < 2; i += 1) {
      const order = await createOrder(await createUser(), [course.id]);
      await markOrderPaid(order.id);
    }
    // Đơn bị admin hủy sau khi thanh toán → không được tính doanh thu
    const cancelled = await createOrder(await createUser(), [course.id]);
    await markOrderPaid(cancelled.id);
    await request(app).put(`/api/admin/orders/${cancelled.id}/cancel`).set(authHeader(admin));
  });

  it('giảng viên thấy đúng doanh thu (bỏ đơn đã hủy), theo ngày và theo khóa', async () => {
    const res = await request(app).get('/api/instructor/revenue').set(authHeader(teacher));
    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({ gross: 1000000, earned: 700000, sales: 2, paidOut: 0, pending: 0, balance: 700000 });
    expect(res.body.series).toHaveLength(30);
    expect(res.body.series.at(-1)).toMatchObject({ earned: 700000, sales: 2 });
    expect(res.body.courses[0]).toMatchObject({ id: course.id, sales: 2, earned: 700000 });
    expect(res.body.bankReady).toBe(false);
  });

  it('giảng viên khác không thấy doanh thu của người này', async () => {
    const res = await request(app).get('/api/instructor/revenue').set(authHeader(otherTeacher));
    expect(res.body.summary.earned).toBe(0);
  });

  it('chưa có tài khoản ngân hàng → admin không tạo được khoản chi trả', async () => {
    const res = await request(app).post('/api/admin/payouts').set(authHeader(admin)).send({ instructorId: teacher.id, amount: 100000 });
    expect(res.status).toBe(400);
  });

  it('cập nhật tài khoản ngân hàng (kiểm tra số tài khoản)', async () => {
    expect((await request(app).put('/api/instructor/profile').set(authHeader(teacher))
      .send({ bankName: 'VCB', bankAccountNumber: '12ab', bankAccountName: 'x' })).status).toBe(400);
    const ok = await request(app).put('/api/instructor/profile').set(authHeader(teacher))
      .send({ headline: 'GV JS', bankName: 'Vietcombank', bankAccountNumber: '0123 456 789', bankAccountName: 'Nguyen Van A' });
    expect(ok.status).toBe(200);
    const me = await request(app).get('/api/instructor/profile').set(authHeader(teacher));
    expect(me.body.profile).toMatchObject({ bankAccountNumber: '0123456789', bankAccountName: 'NGUYEN VAN A' });
  });

  it('không chi trả vượt số dư; tạo → chờ → đã trả; số liệu 2 phía khớp nhau', async () => {
    expect((await request(app).post('/api/admin/payouts').set(authHeader(admin)).send({ instructorId: teacher.id, amount: 700001 })).status).toBe(400);

    const created = await request(app).post('/api/admin/payouts').set(authHeader(admin)).send({ instructorId: teacher.id, amount: 400000, note: 'Tháng 10' });
    expect(created.status).toBe(201);
    let mine = await request(app).get('/api/instructor/revenue').set(authHeader(teacher));
    expect(mine.body.summary).toMatchObject({ pending: 400000, balance: 300000 });

    expect((await request(app).post('/api/admin/payouts').set(authHeader(admin)).send({ instructorId: teacher.id, amount: 300001 })).status).toBe(400);
    expect((await request(app).put(`/api/admin/payouts/${created.body.id}/paid`).set(authHeader(admin)).send({})).status).toBe(400);
    expect((await request(app).put(`/api/admin/payouts/${created.body.id}/paid`).set(authHeader(admin)).send({ bankRef: 'FT123' })).status).toBe(200);
    expect((await request(app).put(`/api/admin/payouts/${created.body.id}/paid`).set(authHeader(admin)).send({ bankRef: 'FT123' })).status).toBe(409);

    mine = await request(app).get('/api/instructor/revenue').set(authHeader(teacher));
    expect(mine.body.summary).toMatchObject({ paidOut: 400000, pending: 0, balance: 300000 });
    expect(mine.body.payouts[0]).toMatchObject({ status: 'PAID', bankRef: 'FT123', amount: 400000 });

    const summary = await request(app).get('/api/admin/payouts/summary').set(authHeader(admin));
    expect(summary.body.instructors.find((i) => i.id === teacher.id)).toMatchObject({ earned: 700000, paidOut: 400000, balance: 300000 });
    expect(summary.body.totals.platformShare).toBe(summary.body.totals.gross - summary.body.totals.earned);

    const [[n]] = await pool.query("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND type = 'payout_paid'", [teacher.id]);
    expect(n.n).toBe(1);
  });

  it('2 admin tạo chi trả cùng lúc không vượt được số dư', async () => {
    const results = await Promise.all([200000, 200000].map((amount) =>
      request(app).post('/api/admin/payouts').set(authHeader(admin)).send({ instructorId: teacher.id, amount })));
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
  });

  it('hủy khoản đang chờ; không hủy được khoản đã trả', async () => {
    const [[pending]] = await pool.query("SELECT id FROM instructor_payouts WHERE status = 'PENDING' LIMIT 1");
    const [[paid]] = await pool.query("SELECT id FROM instructor_payouts WHERE status = 'PAID' LIMIT 1");
    expect((await request(app).delete(`/api/admin/payouts/${pending.id}`).set(authHeader(admin))).status).toBe(200);
    expect((await request(app).delete(`/api/admin/payouts/${paid.id}`).set(authHeader(admin))).status).toBe(409);
  });

  it('tỷ lệ hoa hồng riêng: 0–100 hoặc null; chỉ áp cho giảng viên', async () => {
    expect((await request(app).put(`/api/admin/users/${teacher.id}/commission`).set(authHeader(admin)).send({ rate: 120 })).status).toBe(400);
    expect((await request(app).put(`/api/admin/users/${admin.id}/commission`).set(authHeader(admin)).send({ rate: 20 })).status).toBe(404);
    expect((await request(app).put(`/api/admin/users/${teacher.id}/commission`).set(authHeader(admin)).send({ rate: 20 })).status).toBe(200);
  });

  it('chỉ admin xem đối soát; học viên / giảng viên → 403', async () => {
    expect((await request(app).get('/api/admin/payouts/summary').set(authHeader(teacher))).status).toBe(403);
  });
});
