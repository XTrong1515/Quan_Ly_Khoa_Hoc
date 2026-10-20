/**
 * Runner mặc định: chấm JavaScript trong V8 isolate riêng (isolated-vm).
 *
 * - Mỗi bài nộp có isolate riêng (heap riêng, giới hạn RAM); mỗi test chạy trong context mới
 *   → không rò trạng thái giữa các test, không có require / process / fetch / setTimeout.
 * - Giới hạn thời gian cho từng test (cả code đồng bộ lẫn Promise không bao giờ resolve).
 * - Các lệnh async của isolated-vm chạy trên thread pool riêng → không chặn event loop của Express.
 * - Giới hạn số bài chấm đồng thời để chống quá tải.
 * Yêu cầu Node chạy với --no-node-snapshot (Node >= 20).
 */
const ivm = require('isolated-vm');
const { UNDEFINED, parseActual, deepEqual, summarize } = require('./compare');

const MEMORY_MB      = Number(process.env.CODE_RUNNER_MEMORY_MB) || 64;
const MAX_CONCURRENT = Number(process.env.CODE_RUNNER_CONCURRENCY) || 4;
const MAX_LOG_LINES  = 50;
const MAX_LOG_CHARS  = 500;

/* ── Hàng đợi giới hạn số isolate chạy cùng lúc ─────────────────── */
let active = 0;
const waiting = [];
async function withSlot(fn) {
  if (active >= MAX_CONCURRENT) await new Promise((resolve) => waiting.push(resolve));
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

// console.log trong sandbox → chuỗi gửi ra ngoài qua callback
const CONSOLE_SHIM = `
  const __fmt = (x) => { if (typeof x === 'string') return x; try { const s = JSON.stringify(x); return s === undefined ? String(x) : s; } catch { return String(x); } };
  globalThis.console = { log: (...a) => __log(a.map(__fmt).join(' ')) };
  console.error = console.warn = console.info = console.debug = console.log;
`;

function classifyError(err, isolate) {
  const message = String(err?.message ?? err);
  if (isolate.isDisposed && /memory/i.test(message)) return { status: 'MEMORY_LIMIT', error: 'Vượt giới hạn bộ nhớ' };
  if (/memory limit/i.test(message)) return { status: 'MEMORY_LIMIT', error: 'Vượt giới hạn bộ nhớ' };
  if (/timed out|__deadline__/i.test(message)) return { status: 'TIME_LIMIT', error: 'Quá thời gian cho phép' };
  return { status: 'RUNTIME_ERROR', error: message.split('\n')[0].slice(0, 300) };
}

/** Chạy 1 test trong context mới của isolate. */
async function runOne(isolate, script, functionName, test, timeLimitMs) {
  const logs = [];
  const t0 = Date.now();
  let context;
  try {
    context = await isolate.createContext();
    await context.global.set('__log', new ivm.Callback((line) => {
      if (logs.length < MAX_LOG_LINES) logs.push(String(line).slice(0, MAX_LOG_CHARS));
    }));
    await context.eval(CONSOLE_SHIM);
    await script.run(context, { timeout: timeLimitMs });

    const call = `(async () => {
      if (typeof ${functionName} !== 'function') throw new ReferenceError('Không tìm thấy hàm ${functionName}()');
      const r = await ${functionName}(...${JSON.stringify(test.input)});
      if (r === undefined) return '${UNDEFINED}';
      const s = JSON.stringify(r);
      if (s === undefined) throw new TypeError('Kết quả không chuyển được sang JSON');
      return s;
    })()`;

    // timeout của isolated-vm chỉ tính phần chạy đồng bộ → thêm hạn chót cho Promise treo
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('__deadline__')), timeLimitMs + 50);
    });
    let raw;
    try {
      raw = await Promise.race([context.eval(call, { timeout: timeLimitMs, promise: true, copy: true }), deadline]);
    } finally {
      clearTimeout(timer);
    }

    const actual = parseActual(raw);
    const passed = deepEqual(actual, test.expected);
    return { passed, status: passed ? 'PASSED' : 'WRONG_ANSWER', actual, error: null, timeMs: Date.now() - t0, logs };
  } catch (err) {
    const { status, error } = classifyError(err, isolate);
    // Promise treo / vượt RAM: bỏ isolate này, test sau tạo isolate mới
    if (status !== 'RUNTIME_ERROR' && !isolate.isDisposed) isolate.dispose();
    return { passed: false, status, actual: undefined, error, timeMs: Date.now() - t0, logs };
  } finally {
    if (context && !isolate.isDisposed) context.release();
  }
}

/**
 * @param {{ code: string, functionName: string, tests: {input: any[], expected: any}[], timeLimitMs?: number }} job
 * @returns {Promise<{status, passed, total, timeMs, results, error?}>}
 */
async function runTests({ code, functionName, tests, timeLimitMs = 1000 }) {
  return withSlot(async () => {
    const started = Date.now();
    let isolate = null;
    let script = null;
    const results = [];

    const ensureIsolate = async () => {
      if (isolate && !isolate.isDisposed) return;
      isolate = new ivm.Isolate({ memoryLimit: MEMORY_MB });
      script = await isolate.compileScript(code, { filename: 'solution.js' });
    };

    try {
      try {
        await ensureIsolate();
      } catch (err) {
        return {
          status: 'COMPILE_ERROR', passed: 0, total: tests.length, timeMs: Date.now() - started,
          error: String(err.message).split('\n')[0].slice(0, 300), results: [],
        };
      }
      for (const test of tests) {
        // Đã quá thời gian / RAM thì dừng — tránh 1 bài nộp chiếm máy N × timeLimit
        if (results.some((r) => r.status === 'TIME_LIMIT' || r.status === 'MEMORY_LIMIT')) {
          results.push({ passed: false, status: 'SKIPPED', actual: undefined, error: 'Bỏ qua do test trước vượt giới hạn', timeMs: 0, logs: [] });
          continue;
        }
        await ensureIsolate();
        results.push(await runOne(isolate, script, functionName, test, timeLimitMs));
      }
      return summarize(results, Date.now() - started);
    } finally {
      if (isolate && !isolate.isDisposed) isolate.dispose();
    }
  });
}

module.exports = { name: 'isolated-vm', runTests };
