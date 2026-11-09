/**
 * Các luồng nghiệp vụ xuyên module: mua hàng, thanh toán VNPay (IPN), tiến độ học, quiz, vòng đời khóa học.
 */
const crypto  = require('crypto');
const request = require('supertest');
const app     = require('../src/app');
const { cancelExpiredOrders } = require('../src/jobs/expireOrders');
const {
  pool, resetDb, createUser, authHeader, createCourse, createLesson, enroll, createOrder,
} = require('./helpers');

jest.mock('../src/utils/mailer', () => ({ sendResetPasswordEmail: jest.fn().mockResolvedValue() }));

beforeAll(resetDb);
afterAll(() => pool.end());

const H = authHeader;
const statusOf = async (id) => (await pool.query('SELECT status FROM orders WHERE id = ?', [id]))[0][0].status;
const countOf = async (sql, args) => Number((await pool.query(sql, args))[0][0].n);
const studentCount = async (id) => (await pool.query('SELECT student_count FROM courses WHERE id = ?', [id]))[0][0].student_count;
const buy = (user, courseIds) => request(app).post('/api/orders').set(H(user)).send({ courseIds });

async function createQuiz(lessonId, questions, passScore = 100) {
  const [q] = await pool.query('INSERT INTO quizzes (lesson_id, title, pass_score) VALUES (?, ?, ?)', [lessonId, 'Quiz', passScore]);
  const out = [];
  for (const [position, { type = 'single', options }] of questions.entries()) {
    const [qq] = await pool.query('INSERT INTO quiz_questions (quiz_id, question, type, position) VALUES (?, ?, ?, ?)', [q.insertId, `Câu ${position}`, type, position]);
    const ids = [];
    for (const correct of options) {
      const [o] = await pool.query('INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES (?, ?, ?)', [qq.insertId, 'x', correct ? 1 : 0]);
      ids.push(o.insertId);
    }
    out.push({ id: qq.insertId, optionIds: ids });
  }
  return { quizId: q.insertId, questions: out };
}

describe('Đặt đơn', () => {
  it('giảng viên không mua được khóa của chính mình (không tự tạo doanh thu)', async () => {
    const teacher = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    const res = await buy(teacher, [course.id]);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/chính mình/);
  });

  it('đặt lại đúng các khóa đó → dùng lại đơn đang chờ, không sinh đơn trùng', async () => {
    const buyer = await createUser();
    const course = await createCourse({ status: 'PUBLISHED' });
    const first = await buy(buyer, [course.id]);
    expect(first.status).toBe(201);
    const second = await buy(buyer, [course.id, course.id]); // id lặp cũng được gộp
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ orderId: first.body.orderId, reused: true });
    expect(await countOf('SELECT COUNT(*) AS n FROM orders WHERE user_id = ?', [buyer.id])).toBe(1);
  });

  it('2 request đồng thời cho cùng khóa → chỉ có 1 đơn', async () => {
    const buyer = await createUser();
    const course = await createCourse({ status: 'PUBLISHED' });
    await Promise.all([buy(buyer, [course.id]), buy(buyer, [course.id]), buy(buyer, [course.id])]);
    expect(await countOf('SELECT COUNT(*) AS n FROM orders WHERE user_id = ?', [buyer.id])).toBe(1);
  });

  it('đơn mới chứa khóa đang nằm trong đơn chờ khác → 409 kèm mã đơn đó', async () => {
    const buyer = await createUser();
    const a = await createCourse({ status: 'PUBLISHED' });
    const b = await createCourse({ status: 'PUBLISHED' });
    const first = await buy(buyer, [a.id]);
    const res = await buy(buyer, [a.id, b.id]);
    expect(res.status).toBe(409);
    expect(res.body.pendingOrderId).toBe(first.body.orderId);
  });

  it('đơn toàn khóa 0đ → hoàn tất ngay, không qua VNPay', async () => {
    const buyer = await createUser();
    const course = await createCourse({ status: 'PUBLISHED', price: 0 });
    const res = await buy(buyer, [course.id]);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ free: true, paymentUrl: null });
    expect(await statusOf(res.body.orderId)).toBe('PAID');
    expect(await countOf('SELECT COUNT(*) AS n FROM enrollments WHERE user_id = ? AND course_id = ?', [buyer.id, course.id])).toBe(1);
  });

  it('thanh toán đơn cũ khi khóa đã ngừng bán → 409 và đơn bị hủy', async () => {
    const buyer = await createUser();
    const course = await createCourse({ status: 'PUBLISHED' });
    const order = await createOrder(buyer, [course.id]);
    await pool.query("UPDATE courses SET status = 'ARCHIVED' WHERE id = ?", [course.id]);
    const res = await request(app).post(`/api/orders/${order.id}/pay`).set(H(buyer));
    expect(res.status).toBe(409);
    expect(await statusOf(order.id)).toBe('CANCELLED');
  });

  it('học viên tự hủy đơn chờ; không hủy được đơn của người khác hoặc đơn đã trả', async () => {
    const buyer = await createUser();
    const other = await createUser();
    const course = await createCourse({ status: 'PUBLISHED' });
    const order = await createOrder(buyer, [course.id]);
    expect((await request(app).post(`/api/orders/${order.id}/cancel`).set(H(other))).status).toBe(404);
    expect((await request(app).post(`/api/orders/${order.id}/cancel`).set(H(buyer))).status).toBe(200);
    expect(await statusOf(order.id)).toBe('CANCELLED');
    expect((await request(app).post(`/api/orders/${order.id}/cancel`).set(H(buyer))).status).toBe(409);
  });

  it('đăng ký miễn phí đồng thời → 1 enrollment, số học viên tăng đúng 1', async () => {
    const buyer = await createUser();
    const course = await createCourse({ status: 'PUBLISHED', price: 0 });
    const post = () => request(app).post('/api/enrollments').set(H(buyer)).send({ courseId: course.id });
    const results = await Promise.all([post(), post(), post()]);
    expect(results.every((r) => r.status < 300)).toBe(true);
    expect(await studentCount(course.id)).toBe(1);
  });
});

describe('Job hết hạn đơn', () => {
  it('hủy đơn quá hạn, không đụng đơn đã thanh toán', async () => {
    const buyer = await createUser();
    const a = await createCourse({ status: 'PUBLISHED' });
    const b = await createCourse({ status: 'PUBLISHED' });
    const expired = await createOrder(buyer, [a.id]);
    const paid = await createOrder(buyer, [b.id]);
    await pool.query("UPDATE orders SET expires_at = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE id IN (?)", [[expired.id, paid.id]]);
    await pool.query("UPDATE orders SET status = 'PAID' WHERE id = ?", [paid.id]);
    await cancelExpiredOrders();
    expect(await statusOf(expired.id)).toBe('CANCELLED');
    expect(await statusOf(paid.id)).toBe('PAID');
  });
});

describe('Admin hủy đơn', () => {
  it('hủy đơn đã trả: gỡ enrollment của đơn, trừ học viên đúng 1 lần; hủy lần 2 → 409', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const buyer = await createUser();
    const course = await createCourse({ status: 'PUBLISHED', price: 200000 });
    const order = await createOrder(buyer, [course.id]);
    await request(app).post('/api/orders/verify').set(H(buyer)).send({ vnp_TxnRef: order.code, vnp_ResponseCode: '00', dev_mock: '1' });
    expect(await studentCount(course.id)).toBe(1);

    expect((await request(app).put(`/api/admin/orders/${order.id}/cancel`).set(H(admin))).status).toBe(200);
    expect(await studentCount(course.id)).toBe(0);
    expect((await request(app).put(`/api/admin/orders/${order.id}/cancel`).set(H(admin))).status).toBe(409);
    expect(await studentCount(course.id)).toBe(0);
  });
});

describe('VNPay IPN (server-to-server)', () => {
  const SECRET = 'TESTSECRET';
  let vnpApp; let vnpPool; let buyer; let course;

  const enc = (s) => encodeURIComponent(String(s)).replace(/%20/g, '+');
  const signed = (params) => {
    const data = Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join('&');
    return { ...params, vnp_SecureHash: crypto.createHmac('sha512', SECRET).update(Buffer.from(data, 'utf-8')).digest('hex') };
  };
  const ipn = (params) => request(vnpApp).get('/api/orders/vnpay-ipn').query(params);
  const success = (order, overrides = {}) => signed({
    vnp_TxnRef: order.code, vnp_Amount: 30000000, vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: 'VNP1', ...overrides,
  });

  beforeAll(async () => {
    jest.isolateModules(() => {
      process.env.VNPAY_TMN_CODE = 'TESTCODE';
      process.env.VNPAY_HASH_SECRET = SECRET;
      vnpApp = require('../src/app');
      vnpPool = require('../src/config/db');
      process.env.VNPAY_TMN_CODE = '';
      process.env.VNPAY_HASH_SECRET = '';
    });
    buyer = await createUser();
    course = await createCourse({ status: 'PUBLISHED', price: 300000 });
  });
  afterAll(() => vnpPool.end());

  it('chữ ký sai → 97, đơn giữ nguyên', async () => {
    const order = await createOrder(buyer, [course.id]);
    const res = await ipn({ ...success(order), vnp_SecureHash: 'deadbeef' });
    expect(res.body.RspCode).toBe('97');
    expect(await statusOf(order.id)).toBe('PENDING');
  });

  it('số tiền không khớp → 04', async () => {
    const order = await createOrder(buyer, [course.id]);
    const res = await ipn(success(order, { vnp_Amount: 100 }));
    expect(res.body.RspCode).toBe('04');
    expect(await statusOf(order.id)).toBe('PENDING');
  });

  it('không có đơn → 01', async () => {
    expect((await ipn(success({ code: 'KHONG-CO' }))).body.RspCode).toBe('01');
  });

  it('thành công không cần phiên đăng nhập → PAID + enrollment; VNPay gọi lại → 02', async () => {
    const student = await createUser();
    const order = await createOrder(student, [course.id]);
    expect((await ipn(success(order))).body.RspCode).toBe('00');
    expect(await statusOf(order.id)).toBe('PAID');
    expect(await countOf('SELECT COUNT(*) AS n FROM enrollments WHERE user_id = ? AND course_id = ?', [student.id, course.id])).toBe(1);
    expect((await ipn(success(order))).body.RspCode).toBe('02');
  });

  it('giao dịch thất bại → FAILED', async () => {
    const order = await createOrder(buyer, [course.id]);
    expect((await ipn(success(order, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }))).body.RspCode).toBe('00');
    expect(await statusOf(order.id)).toBe('FAILED');
  });

  it('VNPay báo đã thu tiền cho đơn đã hủy → không mở khóa, báo admin đúng 1 lần', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const student = await createUser();
    const order = await createOrder(student, [course.id]);
    await pool.query("UPDATE orders SET status = 'CANCELLED' WHERE id = ?", [order.id]);
    expect((await ipn(success(order))).body.RspCode).toBe('02');
    await ipn(success(order));
    expect(await statusOf(order.id)).toBe('CANCELLED');
    expect(await countOf('SELECT COUNT(*) AS n FROM enrollments WHERE user_id = ?', [student.id])).toBe(0);
    expect(await countOf("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND type = 'payment_after_cancel'", [admin.id])).toBe(1);
  });
});

describe('Tiến độ học', () => {
  let student; let course; let plain; let withQuiz; let enrollmentId;
  beforeAll(async () => {
    student = await createUser();
    course = await createCourse({ status: 'PUBLISHED' });
    plain = await createLesson(course.id);
    withQuiz = await createLesson(course.id);
    await enroll(student, course.id);
    [[{ id: enrollmentId }]] = await pool.query('SELECT id FROM enrollments WHERE user_id = ?', [student.id]);
  });
  const complete = (lessonId) => request(app).post(`/api/lesson-progress/${lessonId}/complete`).set(H(student));
  const enrollment = async () => (await pool.query('SELECT progress_percent, completed_at FROM enrollments WHERE id = ?', [enrollmentId]))[0][0];

  it('bài có quiz chưa đạt → không tự đánh dấu hoàn thành được; đạt quiz thì hoàn thành', async () => {
    const { quizId, questions } = await createQuiz(withQuiz.id, [{ options: [true, false] }]);
    const blocked = await complete(withQuiz.id);
    expect(blocked.status).toBe(409);
    expect(blocked.body.requirement).toBe('quiz');

    expect((await complete(plain.id)).body.progressPercent).toBe(50);
    const attempt = await request(app).post(`/api/quizzes/${quizId}/attempt`).set(H(student))
      .send({ answers: [{ questionId: questions[0].id, optionIds: [questions[0].optionIds[0]] }] });
    expect(attempt.body.passed).toBe(true);
    const row = await enrollment();
    expect(Number(row.progress_percent)).toBe(100);
    expect(row.completed_at).not.toBeNull();
  });

  it('thêm bài mới vào khóa đã xong → % giảm, mở lại trạng thái hoàn thành; xóa bài → tính lại', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const created = await request(app).post(`/api/admin/courses/${course.id}/lessons`).set(H(admin)).send({ title: 'Bài mới' });
    expect(created.status).toBe(201);
    let row = await enrollment();
    expect(Number(row.progress_percent)).toBe(67);
    expect(row.completed_at).toBeNull();

    expect((await request(app).delete(`/api/admin/lessons/${created.body.id}`).set(H(admin))).status).toBe(200);
    row = await enrollment();
    expect(Number(row.progress_percent)).toBe(100);
    expect(row.completed_at).not.toBeNull();
  });
});

describe('Nộp quiz', () => {
  let teacher; let student; let outsider; let lesson;
  beforeAll(async () => {
    teacher = await createUser({ role: 'INSTRUCTOR' });
    student = await createUser();
    outsider = await createUser();
    const course = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    lesson = await createLesson(course.id);
    await enroll(student, course.id);
  });
  const submit = (user, quizId, answers) => request(app).post(`/api/quizzes/${quizId}/attempt`).set(H(user)).send({ answers });

  it('người chưa đăng ký không nộp được (kết quả chứa đáp án đúng)', async () => {
    const { quizId, questions } = await createQuiz(lesson.id, [{ options: [true, false] }]);
    const res = await submit(outsider, quizId, [{ questionId: questions[0].id, optionIds: [questions[0].optionIds[0]] }]);
    expect(res.status).toBe(403);
    expect(res.body.results).toBeUndefined();
  });

  it('giảng viên sở hữu được chấm thử nhưng không lưu lượt làm', async () => {
    const [[{ id: quizId }]] = await pool.query('SELECT id FROM quizzes WHERE lesson_id = ?', [lesson.id]);
    const res = await submit(teacher, quizId, []);
    expect(res.status).toBe(200);
    expect(res.body.staffPreview).toBe(true);
    expect(await countOf('SELECT COUNT(*) AS n FROM quiz_attempts WHERE quiz_id = ? AND user_id = ?', [quizId, teacher.id])).toBe(0);
  });

  it('câu nhiều đáp án: phải chọn đúng và đủ', async () => {
    const other = await createLesson((await pool.query('SELECT course_id FROM lessons WHERE id = ?', [lesson.id]))[0][0].course_id);
    const { quizId, questions: [q] } = await createQuiz(other.id, [{ type: 'multiple', options: [true, true, false] }]);
    const [a, b, wrong] = q.optionIds;
    expect((await submit(student, quizId, [{ questionId: q.id, optionIds: [a] }])).body.passed).toBe(false);
    expect((await submit(student, quizId, [{ questionId: q.id, optionIds: [a, b, wrong] }])).body.passed).toBe(false);
    expect((await submit(student, quizId, [{ questionId: q.id, optionIds: [a, b] }])).body.passed).toBe(true);
  });

  it('soạn câu hỏi: bắt buộc có đáp án đúng; câu một đáp án chỉ 1 đáp án đúng', async () => {
    const [[{ id: quizId }]] = await pool.query('SELECT id FROM quizzes WHERE lesson_id = ?', [lesson.id]);
    const add = (body) => request(app).post(`/api/instructor/quizzes/${quizId}/questions`).set(H(teacher)).send(body);
    expect((await add({ question: 'Q', options: [{ text: 'a' }, { text: 'b' }] })).status).toBe(400);
    expect((await add({ question: 'Q', options: [{ text: 'a', isCorrect: true }, { text: 'b', isCorrect: true }] })).status).toBe(400);
    expect((await add({ question: 'Q', type: 'multiple', options: [{ text: 'a', isCorrect: true }, { text: 'b', isCorrect: true }] })).status).toBe(201);
  });
});

describe('Vòng đời khóa học', () => {
  let teacher;
  beforeAll(async () => { teacher = await createUser({ role: 'INSTRUCTOR' }); });
  const editLesson = (id) => request(app).put(`/api/instructor/lessons/${id}`).set(H(teacher)).send({ title: 'Sửa' });

  it('đang chờ duyệt: không sửa được nội dung; rút yêu cầu duyệt → về Nháp, sửa được', async () => {
    const course = await createCourse({ instructor: teacher, status: 'PENDING_REVIEW' });
    const lesson = await createLesson(course.id);
    const locked = await editLesson(lesson.id);
    expect(locked.status).toBe(409);
    expect(locked.body.message).toMatch(/chờ duyệt/);
    expect((await request(app).put('/api/instructor/lessons/reorder').set(H(teacher)).send([{ id: lesson.id, order_index: 1 }])).status).toBe(409);

    const res = await request(app).post(`/api/instructor/courses/${course.id}/withdraw`).set(H(teacher));
    expect(res.body.status).toBe('DRAFT');
    expect((await editLesson(lesson.id)).status).toBe(200);
    expect((await request(app).post(`/api/instructor/courses/${course.id}/withdraw`).set(H(teacher))).status).toBe(409);
  });

  it('khóa có học viên: giảng viên không xóa được bài học, vẫn sửa được', async () => {
    const student = await createUser();
    const course = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    const lesson = await createLesson(course.id);
    await enroll(student, course.id);
    expect((await request(app).delete(`/api/instructor/lessons/${lesson.id}`).set(H(teacher))).status).toBe(409);
    expect((await editLesson(lesson.id)).status).toBe(200);
  });

  it('bài xem thử của khóa chưa xuất bản không được mở', async () => {
    const student = await createUser();
    const course = await createCourse({ instructor: teacher, status: 'DRAFT' });
    const lesson = await createLesson(course.id);
    await pool.query('UPDATE lessons SET is_preview = 1 WHERE id = ?', [lesson.id]);
    expect((await request(app).get(`/api/lessons/${lesson.id}/preview`)).status).toBe(404);
    expect((await request(app).get(`/api/lessons/${lesson.id}`).set(H(student))).status).toBe(403);
  });

  it('giá khóa học: từ chối giá âm và giá dưới mức tối thiểu của VNPay, cho phép 0đ', async () => {
    const [[{ id: categoryId }]] = await pool.query('SELECT category_id AS id FROM courses LIMIT 1');
    const create = (price) => request(app).post('/api/instructor/courses').set(H(teacher))
      .send({ title: 'Giá', slug: `gia-${price}-${Date.now()}`, categoryId, price });
    expect((await create(-1000)).status).toBe(400);
    expect((await create(1000)).status).toBe(400);
    expect((await create(0)).status).toBe(201);
  });

  it('chi tiết khóa học báo isOwner cho giảng viên sở hữu', async () => {
    const course = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    expect((await request(app).get(`/api/courses/${course.slug}`).set(H(teacher))).body.isOwner).toBe(true);
    expect((await request(app).get(`/api/courses/${course.slug}`)).body.isOwner).toBe(false);
  });
});

describe('Đổi role giảng viên', () => {
  let admin;
  beforeAll(async () => { admin = await createUser({ role: 'ADMIN' }); });
  const setRole = (user, role) => request(app).put(`/api/admin/users/${user.id}/role`).set(H(admin)).send({ role });

  it('còn khóa đang bán → 409', async () => {
    const teacher = await createUser({ role: 'INSTRUCTOR' });
    await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    expect((await setRole(teacher, 'USER')).status).toBe(409);
  });

  it('còn doanh thu chưa chi trả → 409 (nếu không số dư sẽ biến mất khỏi trang chi trả)', async () => {
    const teacher = await createUser({ role: 'INSTRUCTOR' });
    const buyer = await createUser();
    const course = await createCourse({ instructor: teacher, status: 'PUBLISHED', price: 200000 });
    const order = await createOrder(buyer, [course.id]);
    await request(app).post('/api/orders/verify').set(H(buyer)).send({ vnp_TxnRef: order.code, vnp_ResponseCode: '00', dev_mock: '1' });
    await pool.query("UPDATE courses SET status = 'ARCHIVED' WHERE id = ?", [course.id]);
    expect((await setRole(teacher, 'USER')).status).toBe(409);
  });

  it('không còn ràng buộc → đổi được; user không tồn tại → 404', async () => {
    const teacher = await createUser({ role: 'INSTRUCTOR' });
    expect((await setRole(teacher, 'USER')).status).toBe(200);
    expect((await setRole({ id: 999999 }, 'USER')).status).toBe(404);
  });
});

describe('Tài khoản & đánh giá', () => {
  it('đăng ký chuẩn hóa email, đăng nhập được bằng email có khoảng trắng / chữ hoa', async () => {
    const email = `  Mixed${Date.now()}@Test.Local `;
    const reg = await request(app).post('/api/auth/register').send({ name: 'A', email, password: 'Passw0rd!' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe(email.trim().toLowerCase());
    expect((await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd!' })).status).toBe(200);
  });

  it('email sai định dạng → 400', async () => {
    expect((await request(app).post('/api/auth/register').send({ name: 'A', email: 'khong-phai-email', password: 'Passw0rd!' })).status).toBe(400);
  });

  it('đặt lại mật khẩu xong thì mọi link cũ đều vô hiệu', async () => {
    const user = await createUser();
    const expires = new Date(Date.now() + 3600_000);
    await pool.query('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?), (?, ?, ?)', [user.id, 'tok-a', expires, user.id, 'tok-b', expires]);
    const reset = (token) => request(app).post('/api/auth/reset-password').send({ token, password: 'NewPassw0rd!' });
    expect((await reset('tok-a')).status).toBe(200);
    expect((await reset('tok-b')).status).toBe(400);
  });

  it('sửa đánh giá đang bị ẩn (đánh giá duy nhất) không lỗi 500, điểm về 0', async () => {
    const student = await createUser();
    const course = await createCourse({ status: 'PUBLISHED' });
    await enroll(student, course.id);
    await pool.query("INSERT INTO reviews (user_id, course_id, rating, status) VALUES (?, ?, 5, 'HIDDEN')", [student.id, course.id]);
    const res = await request(app).post(`/api/courses/${course.id}/reviews`).set(H(student)).send({ rating: 4 });
    expect(res.status).toBe(200);
    const [[row]] = await pool.query('SELECT rating, review_count FROM courses WHERE id = ?', [course.id]);
    expect([Number(row.rating), row.review_count]).toEqual([0, 0]);
  });

  it('rating không phải số nguyên 1–5 → 400', async () => {
    const student = await createUser();
    const course = await createCourse({ status: 'PUBLISHED' });
    await enroll(student, course.id);
    for (const rating of ['abc', 4.5, 0, 6]) {
      expect((await request(app).post(`/api/courses/${course.id}/reviews`).set(H(student)).send({ rating })).status).toBe(400);
    }
  });
});
