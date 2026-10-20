const request = require('supertest');
const app     = require('../src/app');
const runner  = require('../src/services/code-runner/isolated-vm-runner');
const {
  pool, resetDb, createUser, authHeader, createCourse, createLesson, enroll,
} = require('./helpers');

beforeAll(resetDb);
afterAll(() => pool.end());

const SUM_TESTS = [{ input: [2, 3], expected: 5 }, { input: [-1, 1], expected: 0 }];
const run = (code, tests = SUM_TESTS, timeLimitMs = 300) => runner.runTests({ code, functionName: 'sum', tests, timeLimitMs });

describe('Sandbox isolated-vm — chấm đúng & an toàn', () => {
  it.each([
    ['code đúng',             'function sum(a, b) { return a + b }',                            'ACCEPTED'],
    ['arrow function',        'const sum = (a, b) => a + b',                                    'ACCEPTED'],
    ['async function',        'async function sum(a, b) { return a + b }',                      'ACCEPTED'],
    ['kết quả sai',           'function sum(a, b) { return a - b }',                            'WRONG_ANSWER'],
    ['throw lỗi',             'function sum() { throw new Error("boom") }',                     'RUNTIME_ERROR'],
    ['sai tên hàm',           'function add(a, b) { return a + b }',                            'RUNTIME_ERROR'],
    ['lỗi cú pháp',           'function sum(a, b { return a + b }',                             'COMPILE_ERROR'],
    ['vòng lặp vô hạn',       'function sum() { while (true) {} }',                             'TIME_LIMIT'],
    ['vòng lặp ở top-level',  'while (true) {}',                                                'TIME_LIMIT'],
    ['Promise không resolve', 'function sum() { return new Promise(() => {}) }',                'TIME_LIMIT'],
    ['tràn bộ nhớ',           'function sum() { const a = []; while (true) a.push(new Array(1e6).fill(1)) }', 'MEMORY_LIMIT'],
    ['đệ quy vô hạn',         'function sum(a) { return sum(a) }',                              'RUNTIME_ERROR'],
  ])('%s → %s', async (_label, code, status) => {
    expect((await run(code)).status).toBe(status);
  });

  it('không có require / process / fetch / setTimeout, không thoát được qua constructor', async () => {
    const out = await run(
      `function sum() { return [typeof require, typeof process, typeof fetch, typeof setTimeout,
        this.constructor.constructor("return typeof process")()].join(",") }`,
      [{ input: [], expected: 'undefined,undefined,undefined,undefined,undefined' }],
    );
    expect(out.status).toBe('ACCEPTED');
  });

  it('mỗi test chạy trong context mới — biến toàn cục không rò giữa các test', async () => {
    const out = await run('let calls = 0; function sum(a, b) { calls += 1; return calls }',
      [{ input: [1, 1], expected: 1 }, { input: [1, 1], expected: 1 }]);
    expect(out.status).toBe('ACCEPTED');
  });

  it('so sánh object không phụ thuộc thứ tự key; mảng phải đúng thứ tự', async () => {
    const tests = [{ input: [], expected: { a: 1, b: [1, 2] } }];
    expect((await run('function sum() { return { b: [1, 2], a: 1 } }', tests)).status).toBe('ACCEPTED');
    expect((await run('function sum() { return { a: 1, b: [2, 1] } }', tests)).status).toBe('WRONG_ANSWER');
  });

  it('ghi lại console.log để hiển thị cho học viên', async () => {
    const out = await run('function sum(a, b) { console.log("a =", a, { b }); return a + b }');
    expect(out.results[0].logs).toEqual(['a = 2 {"b":3}']);
  });

  it('quá thời gian ở test đầu → bỏ qua các test sau', async () => {
    const out = await run('function sum() { while (true) {} }',
      [{ input: [], expected: 1 }, { input: [], expected: 1 }, { input: [], expected: 1 }]);
    expect(out.results.map((r) => r.status)).toEqual(['TIME_LIMIT', 'SKIPPED', 'SKIPPED']);
  });

  it('server vẫn phục vụ request khác trong lúc đang chấm bài có vòng lặp vô hạn', async () => {
    const slow = run('function sum() { while (true) {} }', SUM_TESTS, 1500);
    const t0 = Date.now();
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(Date.now() - t0).toBeLessThan(500);
    await slow;
  });
});

describe('API bài tập', () => {
  let teacher; let otherTeacher; let student; let outsider; let course; let lesson;
  const H = (u) => authHeader(u);
  const exerciseBody = (overrides = {}) => ({
    title: 'Tổng hai số', descriptionMd: 'Viết hàm `sum(a, b)` trả về a + b.',
    functionName: 'sum', timeLimitMs: 500,
    starterCode: 'function sum(a, b) {\n  // TODO\n}',
    solutionCode: 'function sum(a, b) { return a + b }',
    testCases: [
      { input: '[1, 2]', expected: '3' },
      { input: '[10, -4]', expected: '6' },
      { input: '[100, 200]', expected: '300', hidden: true },
    ],
    ...overrides,
  });

  beforeAll(async () => {
    teacher = await createUser({ role: 'INSTRUCTOR' });
    otherTeacher = await createUser({ role: 'INSTRUCTOR' });
    student = await createUser();
    outsider = await createUser();
    course = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
    lesson = await createLesson(course.id);
    await createLesson(course.id); // để % tiến độ < 100
    await enroll(student, course.id);
  });

  describe('Soạn bài (giảng viên)', () => {
    it.each([
      ['tên hàm không hợp lệ', { functionName: 'sum(); process.exit()' }],
      ['input không phải mảng', { testCases: [{ input: '5', expected: '5' }] }],
      ['JSON sai',              { testCases: [{ input: '[1,', expected: '1' }] }],
      ['toàn test ẩn',          { testCases: [{ input: '[1, 2]', expected: '3', hidden: true }] }],
      ['không có test',         { testCases: [] }],
      ['giới hạn thời gian lạ', { timeLimitMs: 60000 }],
    ])('%s → 400', async (_label, overrides) => {
      const res = await request(app).put(`/api/instructor/lessons/${lesson.id}/exercise`).set(H(teacher)).send(exerciseBody(overrides));
      expect(res.status).toBe(400);
    });

    it('giảng viên khác không soạn / xem được → 404', async () => {
      expect((await request(app).put(`/api/instructor/lessons/${lesson.id}/exercise`).set(H(otherTeacher)).send(exerciseBody())).status).toBe(404);
      expect((await request(app).get(`/api/instructor/lessons/${lesson.id}/exercise`).set(H(otherTeacher))).status).toBe(404);
    });

    it('lưu bài tập; lưu lại thì thay toàn bộ test case', async () => {
      expect((await request(app).put(`/api/instructor/lessons/${lesson.id}/exercise`).set(H(teacher))
        .send(exerciseBody({ testCases: [{ input: '[0, 0]', expected: '0' }] }))).status).toBe(200);
      const res = await request(app).put(`/api/instructor/lessons/${lesson.id}/exercise`).set(H(teacher)).send(exerciseBody());
      expect(res.status).toBe(200);
      const got = await request(app).get(`/api/instructor/lessons/${lesson.id}/exercise`).set(H(teacher));
      expect(got.body.exercise.tests).toHaveLength(3);
      expect(got.body.exercise.solutionCode).toContain('return a + b');
    });

    it('kiểm tra đề: lời giải đúng → ACCEPTED; đề sai expected → báo test sai', async () => {
      const ok = await request(app).post(`/api/instructor/lessons/${lesson.id}/exercise/validate`).set(H(teacher)).send({});
      expect(ok.status).toBe(200);
      expect(ok.body.status).toBe('ACCEPTED');

      const draft = exerciseBody({ testCases: [{ input: '[1, 2]', expected: '4' }] });
      const bad = await request(app).post(`/api/instructor/lessons/${lesson.id}/exercise/validate`).set(H(teacher)).send(draft);
      expect(bad.body.status).toBe('WRONG_ANSWER');
      expect(bad.body.results[0]).toMatchObject({ expected: '4', actual: '3' });
    });
  });

  describe('Làm bài (học viên)', () => {
    it('đề bài không chứa lời giải và test ẩn', async () => {
      const res = await request(app).get(`/api/lessons/${lesson.id}/exercise`).set(H(student));
      expect(res.status).toBe(200);
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('return a + b');
      expect(body).not.toContain('300');
      expect(res.body.exercise).toMatchObject({ functionName: 'sum', hiddenCount: 1, attempts: 0, solved: false });
      expect(res.body.exercise.publicTests).toHaveLength(2);
    });

    it('chưa mua → 403', async () => {
      expect((await request(app).get(`/api/lessons/${lesson.id}/exercise`).set(H(outsider))).status).toBe(403);
      expect((await request(app).post(`/api/lessons/${lesson.id}/exercise/submit`).set(H(outsider)).send({ code: 'x' })).status).toBe(403);
    });

    it('chạy thử: chỉ chạy test công khai, không lưu', async () => {
      const res = await request(app).post(`/api/lessons/${lesson.id}/exercise/run`).set(H(student))
        .send({ code: 'function sum(a, b) { return a + b }' });
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM code_submissions');
      expect(n).toBe(0);
    });

    it('nộp sai test ẩn: test ẩn chỉ báo đạt/không, không lộ input/expected', async () => {
      const code = 'function sum(a, b) { return a + b > 100 ? 0 : a + b }';
      const res = await request(app).post(`/api/lessons/${lesson.id}/exercise/submit`).set(H(student)).send({ code });
      expect(res.body.status).toBe('WRONG_ANSWER');
      const hidden = res.body.results.find((r) => r.hidden);
      expect(hidden).toEqual({ index: 3, hidden: true, passed: false, status: 'WRONG_ANSWER', timeMs: expect.any(Number) });
      expect(res.body.lessonCompleted).toBe(false);
    });

    it('nộp đúng → ACCEPTED, lưu bài nộp, hoàn thành bài học và cập nhật % tiến độ', async () => {
      const res = await request(app).post(`/api/lessons/${lesson.id}/exercise/submit`).set(H(student))
        .send({ code: 'function sum(a, b) { return a + b }' });
      expect(res.body).toMatchObject({ status: 'ACCEPTED', passed: 3, total: 3, lessonCompleted: true, progressPercent: 50 });

      const subs = await request(app).get(`/api/lessons/${lesson.id}/exercise/submissions`).set(H(student));
      expect(subs.body.submissions.map((s) => s.status)).toEqual(['ACCEPTED', 'WRONG_ANSWER']);
      const again = await request(app).get(`/api/lessons/${lesson.id}/exercise`).set(H(student));
      expect(again.body.exercise).toMatchObject({ attempts: 2, solved: true });
    });

    it('code rỗng hoặc quá 20.000 ký tự → 400', async () => {
      expect((await request(app).post(`/api/lessons/${lesson.id}/exercise/run`).set(H(student)).send({ code: '' })).status).toBe(400);
      expect((await request(app).post(`/api/lessons/${lesson.id}/exercise/run`).set(H(student)).send({ code: 'x'.repeat(20001) })).status).toBe(400);
    });

    it('giảng viên sở hữu nộp thử được nhưng không tính tiến độ', async () => {
      const res = await request(app).post(`/api/lessons/${lesson.id}/exercise/submit`).set(H(teacher))
        .send({ code: 'function sum(a, b) { return a + b }' });
      expect(res.body).toMatchObject({ status: 'ACCEPTED', lessonCompleted: false });
    });

    it('xóa bài tập → học viên thấy exercise = null', async () => {
      expect((await request(app).delete(`/api/instructor/lessons/${lesson.id}/exercise`).set(H(teacher))).status).toBe(200);
      const res = await request(app).get(`/api/lessons/${lesson.id}/exercise`).set(H(student));
      expect(res.body.exercise).toBeNull();
    });
  });
});

describe('Giới hạn tần suất chạy code', () => {
  it('vượt giới hạn → 429', async () => {
    const express = require('express');
    let limiter;
    jest.isolateModules(() => {
      process.env.CODE_RUN_RATE_LIMIT = '2';
      ({ codeRunLimiter: limiter } = require('../src/middleware/rateLimit'));
      process.env.CODE_RUN_RATE_LIMIT = '1000';
    });
    const mini = express();
    mini.use((req, _res, next) => { req.user = { id: 1 }; next(); });
    mini.post('/run', limiter, (_req, res) => res.json({ ok: true }));
    const codes = [];
    for (let i = 0; i < 3; i += 1) codes.push((await request(mini).post('/run')).status);
    expect(codes).toEqual([200, 200, 429]);
  });
});

describe('Judge0 runner (fetch giả lập)', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; delete process.env.JUDGE0_URL; delete process.env.JUDGE0_LANGUAGE_ID; });

  it('gửi theo lô, đọc kết quả sau marker, phân loại trạng thái', async () => {
    process.env.JUDGE0_URL = 'http://judge0.local';
    process.env.JUDGE0_LANGUAGE_ID = '93';
    const b64 = (s) => Buffer.from(s).toString('base64');
    let submitted;
    global.fetch = jest.fn(async (url, opts = {}) => {
      if (opts.method === 'POST') {
        submitted = JSON.parse(opts.body);
        return { ok: true, json: async () => [{ token: 't1' }, { token: 't2' }] };
      }
      return {
        ok: true,
        json: async () => ({
          submissions: [
            { status: { id: 3 }, stdout: b64('log line\n__HOISTED_RESULT__5'), time: '0.012' },
            { status: { id: 5, description: 'Time Limit Exceeded' }, stdout: null, time: '1.0' },
          ],
        }),
      };
    });
    let judge0;
    jest.isolateModules(() => { judge0 = require('../src/services/code-runner/judge0-runner'); });
    const out = await judge0.runTests({ code: 'function sum(a,b){return a+b}', functionName: 'sum', tests: SUM_TESTS, timeLimitMs: 1000 });

    expect(submitted.submissions).toHaveLength(2);
    expect(submitted.submissions[0].language_id).toBe(93);
    expect(Buffer.from(submitted.submissions[0].stdin, 'base64').toString()).toBe('[2,3]');
    expect(out.results.map((r) => r.status)).toEqual(['PASSED', 'TIME_LIMIT']);
    expect(out.results[0].logs).toEqual(['log line']);
    expect(out.status).toBe('TIME_LIMIT');
  });
});
