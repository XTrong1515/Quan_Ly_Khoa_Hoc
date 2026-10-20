/**
 * CodeRunner — chọn bộ chấm theo cấu hình:
 *   CODE_RUNNER=isolated-vm (mặc định) — sandbox V8 chạy ngay trong BE
 *   CODE_RUNNER=judge0 + JUDGE0_URL    — dịch vụ chấm từ xa
 * Cả hai cùng interface: runTests({ code, functionName, tests, timeLimitMs }) → { status, passed, total, timeMs, results }.
 */
function getRunner() {
  if (process.env.CODE_RUNNER === 'judge0' && process.env.JUDGE0_URL) return require('./judge0-runner');
  return require('./isolated-vm-runner');
}

module.exports = { getRunner };
