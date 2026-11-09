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

  it('chưa đạt → chỉ biết điểm, không lộ đúng/sai từng câu; đạt rồi mới xem đáp án', async () => {
    const other = await createLesson((await pool.query('SELECT course_id FROM lessons WHERE id = ?', [lesson.id]))[0][0].course_id);
    const { quizId, questions: [q] } = await createQuiz(other.id, [{ options: [true, false] }]);
    const [right, wrong] = q.optionIds;

    const failed = await submit(student, quizId, [{ questionId: q.id, optionIds: [wrong] }]);
    expect(failed.body).toMatchObject({ passed: false, score: 0, total: 1, correct: 0 });
    expect(failed.body.results).toBeUndefined();
    expect(JSON.stringify(failed.body)).not.toContain('correctOptionIds');

    const passed = await submit(student, quizId, [{ questionId: q.id, optionIds: [right] }]);
    expect(passed.body.passed).toBe(true);
    expect(passed.body.results[0].correctOptionIds).toEqual([right]);
  });

  it('làm sai phải chờ mới được nộp lại; thời gian chờ trả về cho FE; hết chờ thì nộp được', async () => {
    const other = await createLesson((await pool.query('SELECT course_id FROM lessons WHERE id = ?', [lesson.id]))[0][0].course_id);
    const { quizId, questions: [q] } = await createQuiz(other.id, [{ options: [true, false] }]);
    const [right, wrong] = q.optionIds;
    process.env.QUIZ_RETRY_SECONDS = '60';
    try {
      const failed = await submit(student, quizId, [{ questionId: q.id, optionIds: [wrong] }]);
      expect(failed.body.retryAfterSeconds).toBe(60);
      const blocked = await submit(student, quizId, [{ questionId: q.id, optionIds: [right] }]);
      expect(blocked.status).toBe(429);
      expect(blocked.body.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.body.results).toBeUndefined();
      expect((await request(app).get(`/api/lessons/${other.id}/quiz`).set(H(student))).body.quiz.retryAfterSeconds).toBeGreaterThan(0);

      await pool.query('UPDATE quiz_attempts SET submitted_at = DATE_SUB(NOW(), INTERVAL 2 MINUTE) WHERE quiz_id = ?', [quizId]);
      expect((await submit(student, quizId, [{ questionId: q.id, optionIds: [right] }])).body.passed).toBe(true);
    } finally {
      process.env.QUIZ_RETRY_SECONDS = '0';
    }
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

describe('Độ bền API', () => {
  it('query lặp tham số / lồng object không làm sập server', async () => {
    expect((await request(app).get('/api/courses?search=a&search=b&category[x]=1&level=1&level=2')).status).toBe(200);
    expect((await request(app).get('/health')).status).toBe(200);
  });

  it('page / limit không phải số → dùng mặc định, không lỗi 500', async () => {
    expect((await request(app).get('/api/courses?page=abc&limit=xyz')).status).toBe(200);
  });

  it('JSON hỏng → 400 dạng JSON; kiểu dữ liệu sai ở đăng nhập → 400', async () => {
    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBeTruthy();
    expect((await request(app).post('/api/auth/login').send({ email: 123, password: {} })).status).toBe(400);
  });

  it('handler async ném lỗi → 500 JSON thay vì sập tiến trình', async () => {
    const user = await createUser();
    const spy = jest.spyOn(pool, 'query').mockImplementationOnce(async () => { throw new Error('boom'); });
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).get('/api/notifications').set(H(user));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Lỗi máy chủ');
    spy.mockRestore();
    err.mockRestore();
  });
});

describe('Tài khoản bị khóa / đổi quyền', () => {
  it('khóa tài khoản: access token đang còn hạn bị từ chối ngay', async () => {
    const user = await createUser();
    expect((await request(app).get('/api/notifications').set(H(user))).status).toBe(200);
    await pool.query("UPDATE users SET status = 'LOCKED' WHERE id = ?", [user.id]);
    expect((await request(app).get('/api/notifications').set(H(user))).status).toBe(401);
  });

  it('hạ quyền admin: token cũ mất quyền ngay', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    expect((await request(app).get('/api/admin/users').set(H(admin))).status).toBe(200);
    await pool.query("UPDATE users SET role = 'USER' WHERE id = ?", [admin.id]);
    expect((await request(app).get('/api/admin/users').set(H(admin))).status).toBe(403);
  });
});

describe('Các ràng buộc khác', () => {
  it('upload ảnh: đuôi file theo loại ảnh, không theo tên người dùng gửi', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const res = await request(app).post('/api/admin/upload/image').set(H(admin))
      .attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'x.html', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/\.png$/);
    require('fs').unlinkSync(require('path').join(__dirname, '../uploads', res.body.url.split('/').pop()));
  });

  it('admin lọc khóa học theo danh mục và cấp độ', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const course = await createCourse({ status: 'PUBLISHED' });
    await createCourse({ status: 'PUBLISHED' });
    const byCategory = await request(app).get(`/api/admin/courses?category=${course.categoryId}`).set(H(admin));
    expect(byCategory.body.courses.map((c) => c.id)).toEqual([course.id]);
    await pool.query("UPDATE courses SET level = 'ADVANCED' WHERE id = ?", [course.id]);
    const byLevel = await request(app).get(`/api/admin/courses?category=${course.categoryId}&level=BEGINNER`).set(H(admin));
    expect(byLevel.body.courses).toEqual([]);
  });

  it('wishlist không nhận khóa chưa xuất bản', async () => {
    const user = await createUser();
    const draft = await createCourse({ status: 'DRAFT' });
    expect((await request(app).post('/api/wishlists').set(H(user)).send({ courseId: draft.id })).status).toBe(404);
  });

  it('đánh giá bị ẩn không xóa được để đăng lại', async () => {
    const student = await createUser();
    const course = await createCourse({ status: 'PUBLISHED' });
    await enroll(student, course.id);
    await pool.query("INSERT INTO reviews (user_id, course_id, rating, status) VALUES (?, ?, 1, 'HIDDEN')", [student.id, course.id]);
    expect((await request(app).delete(`/api/courses/${course.id}/reviews/me`).set(H(student))).status).toBe(409);
  });

  it('xóa danh mục còn khóa lưu trữ → 409, không lỗi 500', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const course = await createCourse({ status: 'ARCHIVED' });
    expect((await request(app).delete(`/api/admin/categories/${course.categoryId}`).set(H(admin))).status).toBe(409);
  });

  it('admin không xuất bản được khóa chưa có bài học; trạng thái lạ → 400', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const course = await createCourse({ status: 'DRAFT' });
    const put = (status) => request(app).put(`/api/admin/courses/${course.id}`).set(H(admin)).send({ status });
    expect((await put('PUBLISHED')).status).toBe(400);
    expect((await put('LUNG_TUNG')).status).toBe(400);
    await createLesson(course.id);
    expect((await put('PUBLISHED')).status).toBe(200);
  });

  it('giảng viên sở hữu được gỡ bình luận trong khóa của mình, giảng viên khác thì không', async () => {
    const owner = await createUser({ role: 'INSTRUCTOR' });
    const stranger = await createUser({ role: 'INSTRUCTOR' });
    const student = await createUser();
    const course = await createCourse({ instructor: owner, status: 'PUBLISHED' });
    const lesson = await createLesson(course.id);
    const [d] = await pool.query('INSERT INTO lesson_discussions (lesson_id, user_id, content) VALUES (?, ?, ?)', [lesson.id, student.id, 'x']);
    expect((await request(app).delete(`/api/discussions/${d.insertId}`).set(H(stranger))).status).toBe(403);
    expect((await request(app).delete(`/api/discussions/${d.insertId}`).set(H(owner))).status).toBe(200);
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
