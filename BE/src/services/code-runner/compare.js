/**
 * So sánh kết quả chấm — dùng chung cho mọi runner.
 * Kết quả thực thi được truyền ra ngoài dưới dạng chuỗi JSON ("__undefined__" cho undefined).
 */
const UNDEFINED = '__undefined__';

const FUNCTION_NAME_RE = /^[A-Za-z_$][\w$]{0,99}$/;

function parseActual(raw) {
  if (raw === UNDEFINED || raw === undefined) return undefined;
  return JSON.parse(raw);
}

/** So sánh sâu, không phụ thuộc thứ tự key của object; mảng so theo thứ tự. */
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  const ka = Object.keys(a); const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}

/** Hiển thị giá trị cho người học (undefined không có trong JSON). */
const display = (v) => (v === undefined ? 'undefined' : JSON.stringify(v));

/** Tổng hợp trạng thái bài nộp từ kết quả từng test. */
function summarize(results, timeMs) {
  const passed = results.filter((r) => r.passed).length;
  const firstFail = results.find((r) => !r.passed);
  return {
    status: firstFail ? firstFail.status : 'ACCEPTED',
    passed,
    total: results.length,
    timeMs,
    results,
  };
}

module.exports = { UNDEFINED, FUNCTION_NAME_RE, parseActual, deepEqual, display, summarize };
