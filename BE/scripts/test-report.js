/**
 * Sinh bảng test case cho báo cáo từ kết quả Jest. Run: npm run test:report
 * → tests/report/TEST-CASES.md (bảng Mã TC · Phân hệ · Nhóm · Kịch bản · Kết quả) + jest-results.json
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tests/report');
const JSON_FILE = path.join(OUT_DIR, 'jest-results.json');

const MODULES = {
  'auth.test.js':          { code: 'AUTH', name: 'Xác thực' },
  'authorization.test.js': { code: 'ROLE', name: 'Phân quyền' },
  'instructor.test.js':    { code: 'INS',  name: 'Giảng viên & duyệt khóa học' },
  'media.test.js':         { code: 'MED',  name: 'Video & tài liệu (object storage)' },
  'exercise.test.js':      { code: 'EXE',  name: 'Bài tập lập trình & sandbox' },
  'ai.test.js':            { code: 'AI',   name: 'Trợ lý AI' },
  'revenue.test.js':       { code: 'PAY',  name: 'Thanh toán & doanh thu giảng viên' },
  'security.test.js':      { code: 'SEC',  name: 'Bảo mật' },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const jest = spawnSync(process.execPath, [
  '--no-node-snapshot', path.join(ROOT, 'node_modules/jest/bin/jest.js'),
  '--runInBand', '--json', `--outputFile=${JSON_FILE}`,
], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });

const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
const esc = (s) => String(s).replace(/\|/g, '\\|');
const rows = [];
const perModule = new Map();

for (const file of [...data.testResults].sort((a, b) => a.name.localeCompare(b.name))) {
  const base = path.basename(file.name);
  const mod = MODULES[base] ?? { code: base.replace('.test.js', '').toUpperCase(), name: base };
  const stat = perModule.get(mod.name) ?? { code: mod.code, total: 0, passed: 0 };
  file.assertionResults.forEach((t, i) => {
    const passed = t.status === 'passed';
    stat.total += 1; if (passed) stat.passed += 1;
    rows.push(`| ${mod.code}-${String(i + 1).padStart(2, '0')} | ${mod.name} | ${esc(t.ancestorTitles.join(' › ') || '—')} | ${esc(t.title)} | ${passed ? '✅ Đạt' : '❌ Không đạt'} | ${t.duration ?? 0} |`);
  });
  perModule.set(mod.name, stat);
}

const md = [
  `# Bảng test case tự động — ${new Date().toLocaleString('vi-VN')}`,
  '',
  `Jest + Supertest trên DB riêng \`<DB_NAME>_test\` · ${data.numTotalTests} test · **${data.numPassedTests} đạt** · ${data.numFailedTests} không đạt · ${data.numTotalTestSuites} bộ test.`,
  'Dịch vụ ngoài được giả lập (Gemini SDK, HEAD/DELETE object storage, fetch Judge0, gửi email); sandbox isolated-vm và MySQL chạy thật.',
  '',
  '## Tổng hợp theo phân hệ',
  '',
  '| Mã | Phân hệ | Số test | Đạt |',
  '|---|---|---|---|',
  ...[...perModule.entries()].map(([name, s]) => `| ${s.code} | ${name} | ${s.total} | ${s.passed} |`),
  '',
  '## Chi tiết',
  '',
  '| Mã TC | Phân hệ | Nhóm | Kịch bản & kết quả mong đợi | Kết quả | Thời gian (ms) |',
  '|---|---|---|---|---|---|',
  ...rows,
  '',
].join('\n');

fs.writeFileSync(path.join(OUT_DIR, 'TEST-CASES.md'), md);
console.log(`Đã ghi tests/report/TEST-CASES.md — ${data.numPassedTests}/${data.numTotalTests} đạt`);
process.exit(jest.status ?? 1);
