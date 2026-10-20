/**
 * Runner tùy chọn: chấm qua Judge0 (tự host hoặc RapidAPI) — bật bằng CODE_RUNNER=judge0 + JUDGE0_URL.
 * Code học viên + harness đọc tham số từ stdin, in kết quả JSON sau marker; mỗi test = 1 submission (gửi theo lô).
 */
const { UNDEFINED, parseActual, deepEqual, summarize } = require('./compare');

const MARKER = '__HOISTED_RESULT__';
const POLL_MS = 500;
const POLL_LIMIT = 40;

const b64 = (s) => Buffer.from(String(s ?? ''), 'utf8').toString('base64');
const unb64 = (s) => (s ? Buffer.from(s, 'base64').toString('utf8') : '');

function config() {
  const base = (process.env.JUDGE0_URL || '').replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json' };
  if (base.includes('rapidapi.com')) {
    headers['X-RapidAPI-Key'] = process.env.JUDGE0_KEY;
    headers['X-RapidAPI-Host'] = new URL(base).host;
  } else if (process.env.JUDGE0_KEY) {
    headers['X-Auth-Token'] = process.env.JUDGE0_KEY;
  }
  return { base, headers };
}

let languageId = Number(process.env.JUDGE0_LANGUAGE_ID) || null;
async function getLanguageId({ base, headers }) {
  if (languageId) return languageId;
  const res = await fetch(`${base}/languages`, { headers });
  if (!res.ok) throw new Error(`Judge0 /languages HTTP ${res.status}`);
  const js = (await res.json()).filter((l) => /^JavaScript/i.test(l.name)).sort((a, b) => b.id - a.id)[0];
  if (!js) throw new Error('Judge0 không có JavaScript');
  languageId = js.id;
  return languageId;
}

const harness = (code, functionName) => `${code}
;(async () => {
  const args = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const r = await ${functionName}(...args);
  const s = r === undefined ? '${UNDEFINED}' : JSON.stringify(r);
  process.stdout.write('\\n${MARKER}' + s);
})().catch((e) => { process.stderr.write(String(e && e.message || e)); process.exit(1); });
`;

function toResult(sub, test) {
  const stdout = unb64(sub.stdout);
  const idx = stdout.lastIndexOf(MARKER);
  const logs = (idx >= 0 ? stdout.slice(0, idx) : stdout).split('\n').filter(Boolean).slice(0, 50);
  const statusId = sub.status?.id;
  const timeMs = sub.time ? Math.round(Number(sub.time) * 1000) : null;

  if (statusId === 3 && idx >= 0) {
    const actual = parseActual(stdout.slice(idx + MARKER.length));
    const passed = deepEqual(actual, test.expected);
    return { passed, status: passed ? 'PASSED' : 'WRONG_ANSWER', actual, error: null, timeMs, logs };
  }
  if (statusId === 5) return { passed: false, status: 'TIME_LIMIT', actual: undefined, error: 'Quá thời gian cho phép', timeMs, logs };
  if (statusId === 6) return { passed: false, status: 'COMPILE_ERROR', actual: undefined, error: unb64(sub.compile_output).slice(0, 300), timeMs, logs };
  const error = (unb64(sub.stderr) || sub.status?.description || 'Lỗi thực thi').split('\n')[0].slice(0, 300);
  return { passed: false, status: 'RUNTIME_ERROR', actual: undefined, error, timeMs, logs };
}

async function runTests({ code, functionName, tests, timeLimitMs = 1000 }) {
  const cfg = config();
  const started = Date.now();
  const language_id = await getLanguageId(cfg);
  const source_code = b64(harness(code, functionName));

  const submitRes = await fetch(`${cfg.base}/submissions/batch?base64_encoded=true`, {
    method: 'POST',
    headers: cfg.headers,
    body: JSON.stringify({
      submissions: tests.map((t) => ({
        language_id, source_code, stdin: b64(JSON.stringify(t.input)),
        cpu_time_limit: Math.max(1, timeLimitMs / 1000), memory_limit: 128000,
      })),
    }),
  });
  if (!submitRes.ok) throw new Error(`Judge0 submit HTTP ${submitRes.status}`);
  const tokens = (await submitRes.json()).map((s) => s.token).join(',');

  for (let i = 0; i < POLL_LIMIT; i += 1) {
    const res = await fetch(
      `${cfg.base}/submissions/batch?tokens=${tokens}&base64_encoded=true&fields=status,stdout,stderr,compile_output,time`,
      { headers: cfg.headers },
    );
    if (!res.ok) throw new Error(`Judge0 poll HTTP ${res.status}`);
    const { submissions } = await res.json();
    if (submissions.every((s) => s.status?.id > 2)) { // 1 = In Queue, 2 = Processing
      const results = submissions.map((s, idx) => toResult(s, tests[idx]));
      const compile = results.find((r) => r.status === 'COMPILE_ERROR');
      if (compile) return { status: 'COMPILE_ERROR', passed: 0, total: tests.length, timeMs: Date.now() - started, error: compile.error, results: [] };
      return summarize(results, Date.now() - started);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error('Judge0 chấm quá lâu');
}

module.exports = { name: 'judge0', runTests };
