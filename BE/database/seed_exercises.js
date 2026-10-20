/**
 * Seed — 6 bài tập JS mẫu cho khóa học demo (dev). Mỗi bài được chấm thử bằng lời giải trước khi lưu.
 * Run: node --no-node-snapshot database/seed_exercises.js [courseSlug]
 * Mặc định chọn khóa PUBLISHED có nhiều bài học nhất; chỉ gắn vào bài học chưa có bài tập.
 */
require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');
const runner = require('../src/services/code-runner/isolated-vm-runner');

const EXERCISES = [
  {
    title: 'Tổng hai số', functionName: 'sum',
    descriptionMd: 'Viết hàm `sum(a, b)` trả về tổng của hai số `a` và `b`.',
    starterCode: 'function sum(a, b) {\n  // Viết code của bạn ở đây\n}\n',
    solutionCode: 'function sum(a, b) {\n  return a + b;\n}\n',
    tests: [[[1, 2], 3], [[-5, 5], 0], [[0.1, 0.2], 0.30000000000000004, true], [[1e9, 1e9], 2e9, true]],
  },
  {
    title: 'Đảo ngược chuỗi', functionName: 'reverseString',
    descriptionMd: 'Viết hàm `reverseString(str)` trả về chuỗi đảo ngược.\n\n```js\nreverseString("hoisted") // "detsioh"\n```',
    starterCode: 'function reverseString(str) {\n  \n}\n',
    solutionCode: 'function reverseString(str) {\n  return [...str].reverse().join("");\n}\n',
    tests: [[['hoisted'], 'detsioh'], [['a'], 'a'], [[''], '', true], [['racecar'], 'racecar', true]],
  },
  {
    title: 'Số lớn nhất trong mảng', functionName: 'findMax',
    descriptionMd: 'Viết hàm `findMax(arr)` trả về phần tử lớn nhất của mảng số.\n\n- Mảng rỗng → trả về `null`.\n- **Không** dùng `Math.max(...arr)` cho mảng rất lớn (tràn stack).',
    starterCode: 'function findMax(arr) {\n  \n}\n',
    solutionCode: 'function findMax(arr) {\n  if (arr.length === 0) return null;\n  return arr.reduce((m, x) => (x > m ? x : m), arr[0]);\n}\n',
    tests: [[[[3, 9, 2]], 9], [[[-4, -2, -9]], -2], [[[]], null, true], [[[7]], 7, true]],
  },
  {
    title: 'Kiểm tra palindrome', functionName: 'isPalindrome',
    descriptionMd: 'Viết hàm `isPalindrome(str)` trả về `true` nếu chuỗi đọc xuôi ngược như nhau.\n\nBỏ qua **chữ hoa/thường**, khoảng trắng và dấu câu.',
    starterCode: 'function isPalindrome(str) {\n  \n}\n',
    solutionCode: 'function isPalindrome(str) {\n  const s = str.toLowerCase().replace(/[^a-z0-9]/g, "");\n  return s === [...s].reverse().join("");\n}\n',
    tests: [[['Racecar'], true], [['hello'], false], [['A man, a plan, a canal: Panama'], true, true], [[''], true, true]],
  },
  {
    title: 'FizzBuzz', functionName: 'fizzBuzz',
    descriptionMd: 'Viết hàm `fizzBuzz(n)` trả về **mảng** từ 1 đến `n`, trong đó:\n\n- chia hết cho 3 → `"Fizz"`\n- chia hết cho 5 → `"Buzz"`\n- chia hết cho cả 3 và 5 → `"FizzBuzz"`\n- còn lại → chính số đó (kiểu number)',
    starterCode: 'function fizzBuzz(n) {\n  const result = [];\n  \n  return result;\n}\n',
    solutionCode: 'function fizzBuzz(n) {\n  const result = [];\n  for (let i = 1; i <= n; i++) {\n    result.push(i % 15 === 0 ? "FizzBuzz" : i % 3 === 0 ? "Fizz" : i % 5 === 0 ? "Buzz" : i);\n  }\n  return result;\n}\n',
    tests: [[[5], [1, 2, 'Fizz', 4, 'Buzz']], [[1], [1]], [[15], [1, 2, 'Fizz', 4, 'Buzz', 'Fizz', 7, 8, 'Fizz', 'Buzz', 11, 'Fizz', 13, 14, 'FizzBuzz'], true], [[0], [], true]],
  },
  {
    title: 'Nhóm theo thuộc tính', functionName: 'groupBy',
    descriptionMd: 'Viết hàm `groupBy(items, key)` nhóm mảng object theo giá trị của thuộc tính `key`.\n\n```js\ngroupBy([{ t: "a", v: 1 }, { t: "b", v: 2 }, { t: "a", v: 3 }], "t")\n// { a: [{ t: "a", v: 1 }, { t: "a", v: 3 }], b: [{ t: "b", v: 2 }] }\n```',
    starterCode: 'function groupBy(items, key) {\n  \n}\n',
    solutionCode: 'function groupBy(items, key) {\n  return items.reduce((acc, item) => {\n    (acc[item[key]] ??= []).push(item);\n    return acc;\n  }, {});\n}\n',
    tests: [
      [[[{ t: 'a', v: 1 }, { t: 'b', v: 2 }, { t: 'a', v: 3 }], 't'], { a: [{ t: 'a', v: 1 }, { t: 'a', v: 3 }], b: [{ t: 'b', v: 2 }] }],
      [[[], 't'], {}],
      [[[{ lang: 'js' }, { lang: 'ts' }, { lang: 'js' }], 'lang'], { js: [{ lang: 'js' }, { lang: 'js' }], ts: [{ lang: 'ts' }] }, true],
    ],
  },
];

async function pickCourse(slug) {
  const [rows] = await pool.query(
    `SELECT c.id, c.title FROM courses c
     WHERE c.status = 'PUBLISHED' ${slug ? 'AND c.slug = ?' : ''}
     ORDER BY (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) DESC LIMIT 1`,
    slug ? [slug] : [],
  );
  return rows[0];
}

async function run() {
  const course = await pickCourse(process.argv[2]);
  if (!course) throw new Error('Không tìm thấy khóa học PUBLISHED');
  const [lessons] = await pool.query(
    `SELECT l.id, l.title FROM lessons l
     LEFT JOIN coding_exercises e ON e.lesson_id = l.id
     WHERE l.course_id = ? AND e.id IS NULL
     ORDER BY l.order_index ASC LIMIT ?`,
    [course.id, EXERCISES.length],
  );
  console.log(`Khóa học: ${course.title} (#${course.id}) — ${lessons.length} bài học chưa có bài tập\n`);

  for (const [i, lesson] of lessons.entries()) {
    const ex = EXERCISES[i];
    const tests = ex.tests.map(([input, expected, hidden]) => ({ input, expected, hidden: !!hidden }));
    const check = await runner.runTests({ code: ex.solutionCode, functionName: ex.functionName, tests, timeLimitMs: 1000 });
    if (check.status !== 'ACCEPTED') {
      console.log(`  ✘ ${ex.title}: lời giải không qua test (${check.status}) — bỏ qua`);
      continue;
    }
    const [result] = await pool.query(
      `INSERT INTO coding_exercises (lesson_id, title, description_md, starter_code, solution_code, function_name, time_limit_ms)
       VALUES (?, ?, ?, ?, ?, ?, 1000)`,
      [lesson.id, ex.title, ex.descriptionMd, ex.starterCode, ex.solutionCode, ex.functionName],
    );
    await pool.query(
      'INSERT INTO exercise_test_cases (exercise_id, input_json, expected_json, is_hidden, order_index) VALUES ?',
      [tests.map((t, idx) => [result.insertId, JSON.stringify(t.input), JSON.stringify(t.expected), t.hidden, idx])],
    );
    console.log(`  ✔ ${ex.title.padEnd(26)} → bài "${lesson.title}" (${tests.length} test, ${tests.filter((t) => t.hidden).length} ẩn, chấm lời giải ${check.timeMs} ms)`);
  }
}

run()
  .catch((err) => { console.error('Seed failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
