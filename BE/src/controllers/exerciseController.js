const pool = require('../config/db');
const { getRunner } = require('../services/code-runner');
const { FUNCTION_NAME_RE, display } = require('../services/code-runner/compare');
const { completeLesson } = require('./lessonProgressController');

/*
 * Bài tập lập trình JS (1 bài tập / bài học).
 * Học viên: route /api/lessons/:id/exercise* đã qua requireEnrollment → req.enrollmentId, req.staffView.
 * Soạn bài: route {apiBase}/lessons/:id/exercise* đã qua requireOwnership('lesson').
 * Test ẩn và lời giải KHÔNG BAO GIỜ gửi xuống phía học viên.
 */
const MAX_CODE = 20_000;
const MAX_TESTS = 50;

async function loadExercise(lessonId) {
  const [[exercise]] = await pool.query(
    `SELECT id, lesson_id AS lessonId, title, description_md AS descriptionMd, starter_code AS starterCode,
            solution_code AS solutionCode, function_name AS functionName, time_limit_ms AS timeLimitMs
     FROM coding_exercises WHERE lesson_id = ?`,
    [lessonId],
  );
  if (!exercise) return null;
  const [rows] = await pool.query(
    `SELECT id, input_json, expected_json, is_hidden FROM exercise_test_cases
     WHERE exercise_id = ? ORDER BY order_index ASC, id ASC`,
    [exercise.id],
  );
  exercise.tests = rows.map((r) => ({
    id: r.id, input: JSON.parse(r.input_json), expected: JSON.parse(r.expected_json), hidden: !!r.is_hidden,
  }));
  return exercise;
}

function checkCode(code) {
  if (typeof code !== 'string' || !code.trim()) return 'Chưa có code';
  if (code.length > MAX_CODE) return `Code tối đa ${MAX_CODE.toLocaleString('vi-VN')} ký tự`;
  return null;
}

/** Kết quả gửi cho học viên: test ẩn chỉ cho biết đạt / không. */
function shapeForLearner(run, tests) {
  return {
    status: run.status, passed: run.passed, total: run.total, timeMs: run.timeMs, error: run.error ?? null,
    results: run.results.map((r, i) => (tests[i].hidden
      ? { index: i + 1, hidden: true, passed: r.passed, status: r.status, timeMs: r.timeMs }
      : {
          index: i + 1, hidden: false, passed: r.passed, status: r.status, timeMs: r.timeMs,
          input: tests[i].input.map(display).join(', '), expected: display(tests[i].expected),
          actual: r.status === 'WRONG_ANSWER' || r.status === 'PASSED' ? display(r.actual) : null,
          error: r.error, logs: r.logs,
        })),
  };
}

/** Kết quả cho người soạn bài: thấy hết. */
function shapeForAuthor(run, tests) {
  return {
    status: run.status, passed: run.passed, total: run.total, timeMs: run.timeMs, error: run.error ?? null,
    results: run.results.map((r, i) => ({
      index: i + 1, hidden: tests[i].hidden, passed: r.passed, status: r.status, timeMs: r.timeMs,
      input: tests[i].input.map(display).join(', '), expected: display(tests[i].expected),
      actual: r.actual === undefined && r.status !== 'PASSED' && r.status !== 'WRONG_ANSWER' ? null : display(r.actual),
      error: r.error, logs: r.logs,
    })),
  };
}

const runJob = (exercise, code, tests) => getRunner().runTests({
  code, functionName: exercise.functionName, tests, timeLimitMs: exercise.timeLimitMs,
});

/* ══════════════════════ Phía học viên ══════════════════════ */

/* GET /api/lessons/:id/exercise */
async function getForLearner(req, res) {
  try {
    const exercise = await loadExercise(parseInt(req.params.id, 10));
    if (!exercise) return res.json({ exercise: null });

    const [[best]] = await pool.query(
      "SELECT COUNT(*) AS attempts, MAX(status = 'ACCEPTED') AS solved FROM code_submissions WHERE user_id = ? AND exercise_id = ?",
      [req.user.id, exercise.id],
    );
    const [[last]] = await pool.query(
      'SELECT source_code AS code, status, created_at AS createdAt FROM code_submissions WHERE user_id = ? AND exercise_id = ? ORDER BY id DESC LIMIT 1',
      [req.user.id, exercise.id],
    );

    return res.json({
      exercise: {
        id: exercise.id, title: exercise.title, descriptionMd: exercise.descriptionMd,
        starterCode: exercise.starterCode, functionName: exercise.functionName, timeLimitMs: exercise.timeLimitMs,
        publicTests: exercise.tests.filter((t) => !t.hidden).map((t, i) => ({
          index: i + 1, input: t.input.map(display).join(', '), expected: display(t.expected),
        })),
        hiddenCount: exercise.tests.filter((t) => t.hidden).length,
        attempts: Number(best.attempts), solved: !!Number(best.solved),
        lastSubmission: last ?? null,
      },
    });
  } catch (err) {
    console.error('[exercise/get]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* POST /api/lessons/:id/exercise/run  { code } — chỉ chạy test công khai, không lưu */
async function runForLearner(req, res) {
  const codeError = checkCode(req.body?.code);
  if (codeError) return res.status(400).json({ message: codeError });
  try {
    const exercise = await loadExercise(parseInt(req.params.id, 10));
    if (!exercise) return res.status(404).json({ message: 'Bài học không có bài tập' });
    const tests = exercise.tests.filter((t) => !t.hidden);
    if (!tests.length) return res.status(400).json({ message: 'Bài tập không có test công khai — hãy nộp bài' });
    const run = await runJob(exercise, req.body.code, tests);
    return res.json(shapeForLearner(run, tests));
  } catch (err) {
    console.error('[exercise/run]', err);
    return res.status(500).json({ message: 'Không chấm được bài lúc này' });
  }
}

/* POST /api/lessons/:id/exercise/submit  { code } — chạy toàn bộ test, lưu bài nộp */
async function submitForLearner(req, res) {
  const codeError = checkCode(req.body?.code);
  if (codeError) return res.status(400).json({ message: codeError });
  const lessonId = parseInt(req.params.id, 10);
  try {
    const exercise = await loadExercise(lessonId);
    if (!exercise) return res.status(404).json({ message: 'Bài học không có bài tập' });

    const run = await runJob(exercise, req.body.code, exercise.tests);
    await pool.query(
      `INSERT INTO code_submissions (user_id, exercise_id, source_code, status, passed, total, exec_time_ms, runner)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, exercise.id, req.body.code, run.status, run.passed, run.total, run.timeMs, getRunner().name],
    );

    // Đạt 100% → hoàn thành bài học (chỉ khi là học viên đã đăng ký)
    let progress = null;
    if (run.status === 'ACCEPTED' && req.enrollmentId) progress = await completeLesson(req.user.id, lessonId);

    return res.json({
      ...shapeForLearner(run, exercise.tests),
      lessonCompleted: !!progress, progressPercent: progress?.progressPercent ?? null,
    });
  } catch (err) {
    console.error('[exercise/submit]', err);
    return res.status(500).json({ message: 'Không chấm được bài lúc này' });
  }
}

/* GET /api/lessons/:id/exercise/submissions */
async function mySubmissions(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.status, s.passed, s.total, s.exec_time_ms AS timeMs, s.created_at AS createdAt, s.source_code AS code
       FROM code_submissions s JOIN coding_exercises e ON e.id = s.exercise_id
       WHERE e.lesson_id = ? AND s.user_id = ?
       ORDER BY s.id DESC LIMIT 20`,
      [parseInt(req.params.id, 10), req.user.id],
    );
    return res.json({ submissions: rows });
  } catch (err) {
    console.error('[exercise/submissions]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ══════════════════════ Phía soạn bài (admin / giảng viên) ══════════════════════ */

/** Chuẩn hóa + kiểm tra payload soạn bài. Trả { data } hoặc { error }. */
function parseExercisePayload(body = {}) {
  const title = String(body.title ?? '').trim();
  const descriptionMd = String(body.descriptionMd ?? '').trim();
  const functionName = String(body.functionName ?? '').trim();
  const timeLimitMs = Number(body.timeLimitMs ?? 1000);
  const starterCode = body.starterCode ?? '';
  const solutionCode = body.solutionCode ?? '';

  if (!title || title.length > 255) return { error: 'Tiêu đề bắt buộc (tối đa 255 ký tự)' };
  if (!descriptionMd) return { error: 'Đề bài bắt buộc' };
  if (!FUNCTION_NAME_RE.test(functionName)) return { error: 'Tên hàm không hợp lệ (vd: sum, findMax)' };
  if (!Number.isInteger(timeLimitMs) || timeLimitMs < 100 || timeLimitMs > 5000) return { error: 'Giới hạn thời gian 100–5000 ms' };
  if (String(starterCode).length > MAX_CODE || String(solutionCode).length > MAX_CODE) return { error: 'Code mẫu / lời giải quá dài' };

  const raw = Array.isArray(body.testCases) ? body.testCases : [];
  if (!raw.length || raw.length > MAX_TESTS) return { error: `Cần 1–${MAX_TESTS} test case` };

  const tests = [];
  for (const [i, t] of raw.entries()) {
    let input; let expected;
    try {
      input = typeof t.input === 'string' ? JSON.parse(t.input) : t.input;
      expected = typeof t.expected === 'string' ? JSON.parse(t.expected) : t.expected;
    } catch {
      return { error: `Test #${i + 1}: input / expected phải là JSON hợp lệ` };
    }
    if (!Array.isArray(input)) return { error: `Test #${i + 1}: input phải là mảng tham số, vd [1, 2]` };
    if (expected === undefined) return { error: `Test #${i + 1}: thiếu expected` };
    tests.push({ input, expected, hidden: !!t.hidden });
  }
  if (!tests.some((t) => !t.hidden)) return { error: 'Cần ít nhất 1 test công khai để học viên chạy thử' };

  return { data: { title, descriptionMd, functionName, timeLimitMs, starterCode: String(starterCode), solutionCode: String(solutionCode), tests } };
}

/* GET {apiBase}/lessons/:id/exercise */
async function getForAuthor(req, res) {
  try {
    const exercise = await loadExercise(parseInt(req.params.id, 10));
    return res.json({
      exercise: exercise && {
        ...exercise,
        tests: exercise.tests.map((t) => ({ input: JSON.stringify(t.input), expected: JSON.stringify(t.expected), hidden: t.hidden })),
      },
    });
  } catch (err) {
    console.error('[exercise/author-get]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* PUT {apiBase}/lessons/:id/exercise — tạo / cập nhật (thay toàn bộ test case) */
async function saveForAuthor(req, res) {
  const { data, error } = parseExercisePayload(req.body);
  if (error) return res.status(400).json({ message: error });
  const lessonId = parseInt(req.params.id, 10);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO coding_exercises (lesson_id, title, description_md, starter_code, solution_code, function_name, time_limit_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), description_md = VALUES(description_md),
         starter_code = VALUES(starter_code), solution_code = VALUES(solution_code),
         function_name = VALUES(function_name), time_limit_ms = VALUES(time_limit_ms)`,
      [lessonId, data.title, data.descriptionMd, data.starterCode, data.solutionCode, data.functionName, data.timeLimitMs],
    );
    const [[{ id }]] = await conn.query('SELECT id FROM coding_exercises WHERE lesson_id = ?', [lessonId]);
    await conn.query('DELETE FROM exercise_test_cases WHERE exercise_id = ?', [id]);
    await conn.query(
      'INSERT INTO exercise_test_cases (exercise_id, input_json, expected_json, is_hidden, order_index) VALUES ?',
      [data.tests.map((t, i) => [id, JSON.stringify(t.input), JSON.stringify(t.expected), t.hidden, i])],
    );
    await conn.commit();
    return res.json({ ok: true, id });
  } catch (err) {
    await conn.rollback();
    console.error('[exercise/save]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  } finally {
    conn.release();
  }
}

/* DELETE {apiBase}/lessons/:id/exercise */
async function deleteForAuthor(req, res) {
  try {
    await pool.query('DELETE FROM coding_exercises WHERE lesson_id = ?', [parseInt(req.params.id, 10)]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[exercise/delete]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* POST {apiBase}/lessons/:id/exercise/validate — chạy lời giải qua toàn bộ test (đề đúng chưa?) */
async function validateForAuthor(req, res) {
  // Kiểm tra bản nháp đang soạn nếu có gửi lên, không thì dùng bản đã lưu
  let exercise;
  if (req.body?.testCases) {
    const { data, error } = parseExercisePayload(req.body);
    if (error) return res.status(400).json({ message: error });
    exercise = data;
  } else {
    exercise = await loadExercise(parseInt(req.params.id, 10));
    if (!exercise) return res.status(404).json({ message: 'Bài học chưa có bài tập' });
  }
  const codeError = checkCode(exercise.solutionCode);
  if (codeError) return res.status(400).json({ message: 'Chưa có lời giải để kiểm tra' });

  try {
    const run = await runJob(exercise, exercise.solutionCode, exercise.tests);
    return res.json(shapeForAuthor(run, exercise.tests));
  } catch (err) {
    console.error('[exercise/validate]', err);
    return res.status(500).json({ message: 'Không chấm được lúc này' });
  }
}

module.exports = {
  getForLearner, runForLearner, submitForLearner, mySubmissions,
  getForAuthor, saveForAuthor, deleteForAuthor, validateForAuthor,
};
