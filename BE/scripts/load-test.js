/**
 * Kiểm thử tải — số liệu cho Chương 4. Run: npm run load-test
 *
 * - Dùng DB test (<DB_NAME>_test): dựng lại schema, sao catalog khóa học từ DB dev, tạo 1 học viên đã mua.
 * - Server chạy ở TIẾN TRÌNH RIÊNG (NODE_ENV=production) để công cụ đo không tranh event loop.
 * - autocannon bắn tải vào các endpoint chính ở nhiều mức kết nối đồng thời.
 * Kết quả: tests/load/LATEST.md + tests/load/results/<thời điểm>.json
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const autocannon = require('autocannon');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { SOURCE_DB, TEST_DB, connectionConfig } = require('../tests/setup/test-db');
const copySchema = require('../tests/setup/global-setup');

const PORT = Number(process.env.LOAD_PORT) || 3199;
const BASE = `http://127.0.0.1:${PORT}`;
const DURATION = Number(process.env.LOAD_DURATION) || 15;
const HASHER = require('../src/utils/hash').implementation;
const LEVELS = (process.env.LOAD_LEVELS || '50,200').split(',').map(Number);
const PASSWORD = 'LoadTest#2026';

async function prepareDb() {
  await copySchema();
  const conn = await mysql.createConnection({ ...connectionConfig, multipleStatements: true });
  await conn.query(`SET FOREIGN_KEY_CHECKS = 0;
    INSERT INTO \`${TEST_DB}\`.categories      SELECT * FROM \`${SOURCE_DB}\`.categories;
    INSERT INTO \`${TEST_DB}\`.courses         SELECT * FROM \`${SOURCE_DB}\`.courses;
    INSERT INTO \`${TEST_DB}\`.course_sections SELECT * FROM \`${SOURCE_DB}\`.course_sections;
    INSERT INTO \`${TEST_DB}\`.lessons         SELECT * FROM \`${SOURCE_DB}\`.lessons;
    SET FOREIGN_KEY_CHECKS = 1;`);
  const [[course]] = await conn.query(
    `SELECT c.id, c.slug, (SELECT l.id FROM \`${TEST_DB}\`.lessons l WHERE l.course_id = c.id ORDER BY l.order_index LIMIT 1) AS lessonId
     FROM \`${TEST_DB}\`.courses c WHERE c.status = 'PUBLISHED'
     ORDER BY (SELECT COUNT(*) FROM \`${TEST_DB}\`.lessons l WHERE l.course_id = c.id) DESC LIMIT 1`,
  );
  const email = 'load.tester@test.local';
  const [u] = await conn.query(
    `INSERT INTO \`${TEST_DB}\`.users (email, password_hash, full_name, role, status) VALUES (?, ?, 'Load Tester', 'USER', 'ACTIVE')`,
    [email, await bcrypt.hash(PASSWORD, 12)],
  );
  await conn.query(`INSERT INTO \`${TEST_DB}\`.enrollments (user_id, course_id) VALUES (?, ?)`, [u.insertId, course.id]);
  const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${TEST_DB}\`.courses`);
  await conn.end();
  return { email, slug: course.slug, lessonId: course.lessonId, courseCount: n };
}

function startServer() {
  const child = spawn(process.execPath, ['--no-node-snapshot', 'index.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, DB_NAME: TEST_DB, PORT: String(PORT), NODE_ENV: 'production', DOTENV_CONFIG_QUIET: 'true',
      AUTH_LOGIN_RATE_LIMIT: '1000000', AUTH_REFRESH_RATE_LIMIT: '1000000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', (d) => { if (/error/i.test(d)) process.stderr.write(`[server] ${d}`); });
  return child;
}

async function waitHealthy() {
  for (let i = 0; i < 50; i += 1) {
    try { if ((await fetch(`${BASE}/health`)).ok) return; } catch { /* chưa lên */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Server không khởi động được');
}

const run = (opts) => autocannon({ url: `${BASE}${opts.path}`, duration: DURATION, ...opts });

(async () => {
  console.log(`=== Load test — DB ${TEST_DB}, ${DURATION}s / kịch bản, mức ${LEVELS.join(' / ')} kết nối ===`);
  const ctx = await prepareDb();
  const server = startServer();
  const results = [];
  try {
    await waitHealthy();
    const login = await (await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ctx.email, password: PASSWORD }),
    })).json();
    const auth = { Authorization: `Bearer ${login.accessToken}` };

    const scenarios = [
      { name: 'Trang chủ',             path: '/api/home' },
      { name: 'Danh sách khóa học',    path: '/api/courses' },
      { name: 'Chi tiết khóa học',     path: `/api/courses/${ctx.slug}` },
      { name: 'Vào bài học (đã mua)',  path: `/api/lessons/${ctx.lessonId}`, headers: auth },
      { name: 'Đăng nhập (bcrypt 12)', path: '/api/auth/login', method: 'POST', levels: [20],
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ctx.email, password: PASSWORD }) },
    ];

    // Đăng nhập (hash mật khẩu) có làm chậm cả server không? — đo trang chủ khi có 20 lượt đăng nhập song song
    const loginLoad = scenarios.find((s) => s.path === '/api/auth/login');
    const [homeUnderLogin] = await Promise.all([
      run({ path: '/api/home', connections: 50 }),
      run({ ...loginLoad, connections: 20 }),
    ]);
    const mixed = {
      scenario: 'Trang chủ khi có 20 lượt đăng nhập song song', path: '/api/home', connections: 50,
      rps: Math.round(homeUnderLogin.requests.average), total: homeUnderLogin.requests.total,
      p50: homeUnderLogin.latency.p50, p90: homeUnderLogin.latency.p90, p99: homeUnderLogin.latency.p99, max: homeUnderLogin.latency.max,
      errors: homeUnderLogin.errors + homeUnderLogin.timeouts, non2xx: homeUnderLogin.non2xx,
    };

    for (const s of scenarios) {
      for (const connections of s.levels ?? LEVELS) {
        const r = await run({ ...s, connections });
        const row = {
          scenario: s.name, path: s.path, connections,
          rps: Math.round(r.requests.average), total: r.requests.total,
          p50: r.latency.p50, p90: r.latency.p90, p99: r.latency.p99, max: r.latency.max,
          errors: r.errors + r.timeouts, non2xx: r.non2xx,
        };
        results.push(row);
        console.log(`${s.name.padEnd(24)} c=${String(connections).padEnd(4)} ${String(row.rps).padStart(6)} req/s  p50 ${row.p50} ms · p90 ${row.p90} ms · p99 ${row.p99} ms  lỗi ${row.errors} · non-2xx ${row.non2xx}`);
      }
    }
    results.push(mixed);
    console.log(`${mixed.scenario} → ${mixed.rps} req/s · p50 ${mixed.p50} ms · p99 ${mixed.p99} ms`);
  } finally {
    server.kill();
  }

  const md = [
    `# Kết quả kiểm thử tải — ${new Date().toLocaleString('vi-VN')}`,
    '',
    `Công cụ: autocannon · ${DURATION} s / kịch bản · server NODE_ENV=production, 1 tiến trình Node, pool MySQL 10 kết nối · hash mật khẩu: ${HASHER} · dữ liệu: ${ctx.courseCount} khóa học (sao từ DB dev) · máy chạy: ${process.platform} ${process.arch}, Node ${process.version}`,
    '',
    '| Kịch bản | Endpoint | Kết nối đồng thời | Req/s | p50 (ms) | p90 (ms) | p99 (ms) | Lỗi | Non-2xx |',
    '|---|---|---|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.scenario} | \`${r.path.replace(/\d+$/, ':id')}\` | ${r.connections} | ${r.rps} | ${r.p50} | ${r.p90} | ${r.p99} | ${r.errors} | ${r.non2xx} |`),
    '',
    'Ghi chú: đăng nhập chậm có chủ đích — bcrypt cost 12 (~250 ms CPU / lần) để chống dò mật khẩu offline; giới hạn tần suất đăng nhập được tắt riêng cho bài đo này.',
    '',
  ].join('\n');
  const dir = path.join(__dirname, '../tests/load/results');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(__dirname, '../tests/load/LATEST.md'), md);
  console.log(`\n${md}`);
})().catch((err) => { console.error(err); process.exit(1); });
