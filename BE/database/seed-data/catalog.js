/**
 * Nội dung 10 khóa học demo cho seed_catalog.js.
 *
 * Mỗi bài học: title, intro, points (3 ý chính), code (tùy chọn, mảng dòng) → sinh cả nội dung đọc lẫn video slide.
 * quiz: { passScore, questions: [{ q, type?, options: [[text, đúng?]] }] }
 * exercise: { title, functionName, descriptionMd, starter, solution, tests: [[input[], expected, hidden?]] }
 * Lời giải của mọi bài tập được chấm thử trước khi ghi vào DB.
 */
const lines = (...rows) => rows.join('\n');

module.exports = [
  /* ════════════════════════════════ 1 ════════════════════════════════ */
  {
    title: 'JavaScript nền tảng: biến, hàm và scope',
    slug: 'javascript-nen-tang',
    short: 'Bắt đầu JavaScript đúng cách: biến, kiểu dữ liệu, hàm và scope, kèm bài tập chấm tự động.',
    level: 'BEGINNER', category: 'js-core', instructor: 'will.sentance@hoisted.dev',
    price: 0, originalPrice: null, glyph: 'JS', thumb: 'yellow',
    learn: ['Khai báo biến với let / const và hiểu vì sao tránh var', 'Nắm 7 kiểu nguyên thủy và cách typeof hoạt động', 'Viết hàm, arrow function, tham số mặc định', 'Hiểu scope, hoisting và vùng TDZ'],
    requirements: ['Biết dùng trình duyệt và trình soạn thảo code', 'Không cần kinh nghiệm lập trình trước'],
    sections: [
      {
        title: 'Phần 1: Biến và kiểu dữ liệu',
        lessons: [
          {
            title: 'Giới thiệu khóa học', preview: true,
            intro: 'Khóa học dành cho người mới: đi từ biến, kiểu dữ liệu đến hàm và scope — mỗi phần đều có bài tập để tự kiểm tra.',
            points: ['Mỗi bài có video, phần đọc, quiz hoặc bài tập code', 'Bài tập được chấm tự động bằng test ngay trên trình duyệt', 'Làm đạt quiz / bài tập thì bài học mới tính hoàn thành'],
          },
          {
            title: 'let, const và var',
            intro: 'Ba cách khai báo biến khác nhau ở phạm vi (scope) và khả năng gán lại.',
            points: ['const: không gán lại được, nhưng vẫn sửa được thuộc tính của object', 'let: gán lại được, phạm vi theo khối { }', 'var: phạm vi theo hàm và bị hoist — nên tránh dùng'],
            code: lines(
              "const user = { name: 'An' };",
              "user.name = 'Bình';     // được: sửa thuộc tính",
              '// user = {};          // TypeError',
              '',
              'if (true) {',
              '  let x = 1;',
              '  var y = 2;',
              '}',
              'console.log(typeof x);  // "undefined"',
              'console.log(y);         // 2',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'Đoạn code nào gây lỗi TypeError?', options: [['const a = 1; a = 2;', true], ['let a = 1; a = 2;', false], ['const o = {}; o.x = 1;', false], ['var a = 1; var a = 2;', false]] },
                { q: 'Biến khai báo bằng cách nào có phạm vi theo khối { }?', type: 'multiple', options: [['let', true], ['const', true], ['var', false]] },
                { q: 'typeof null trả về gì?', options: [['"object"', true], ['"null"', false], ['"undefined"', false], ['"number"', false]] },
              ],
            },
          },
          {
            title: 'Kiểu dữ liệu và typeof',
            intro: 'JavaScript có 7 kiểu nguyên thủy; mọi thứ còn lại là object.',
            points: ['Kiểu nguyên thủy: string, number, bigint, boolean, undefined, symbol, null', 'Mảng và hàm cũng là object', 'Chuỗi có thể duyệt từng ký tự bằng for...of'],
            code: lines(
              "typeof 'hi'        // 'string'",
              'typeof 42          // \'number\'',
              'typeof []          // \'object\'',
              'typeof (() => {})  // \'function\'',
              '',
              "for (const ch of 'abc') console.log(ch);",
            ),
            exercise: {
              title: 'Đếm nguyên âm', functionName: 'countVowels',
              descriptionMd: 'Viết hàm `countVowels(str)` trả về số nguyên âm (`a e i o u`) trong chuỗi, **không phân biệt hoa thường**.\n\n```js\ncountVowels("hoisted")   // 3\ncountVowels("JavaScript") // 3\n```',
              starter: 'function countVowels(str) {\n  // Viết code của bạn ở đây\n}\n',
              solution: 'function countVowels(str) {\n  let count = 0;\n  for (const ch of str.toLowerCase()) {\n    if ("aeiou".includes(ch)) count++;\n  }\n  return count;\n}\n',
              tests: [[['hoisted'], 3], [['JavaScript'], 3], [[''], 0, true], [['AEIOU xyz'], 5, true]],
            },
          },
        ],
      },
      {
        title: 'Phần 2: Hàm và scope',
        lessons: [
          {
            title: 'Khai báo hàm và arrow function',
            intro: 'Có nhiều cách viết hàm; chúng khác nhau ở hoisting và cách xử lý this.',
            points: ['Function declaration được hoist cả phần thân', 'Arrow function ngắn gọn và không có this riêng', 'Tham số mặc định: function f(a = 1) { }'],
            code: lines(
              'greet();                  // chạy được nhờ hoisting',
              'function greet() { return "hi"; }',
              '',
              'const add = (a, b = 2) => a + b;',
              'add(1);                   // 3',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'Gọi hàm ở dòng TRƯỚC khai báo — cách khai báo nào vẫn chạy được?', options: [['function f() {}', true], ['const f = () => {}', false], ['let f = function () {}', false]] },
                { q: 'Arrow function KHÔNG có những gì?', type: 'multiple', options: [['this riêng', true], ['arguments riêng', true], ['Tham số mặc định', false], ['Giá trị trả về', false]] },
                { q: 'const add = (a, b = 2) => a + b; add(1) trả về?', options: [['3', true], ['NaN', false], ['undefined', false], ['1', false]] },
              ],
            },
          },
          {
            title: 'Scope và hoisting',
            intro: 'Scope quyết định biến nào nhìn thấy được ở đâu; hoisting giải thích vì sao một số biến dùng được trước dòng khai báo.',
            points: ['Hàm bên trong đọc được biến của hàm bên ngoài (lexical scope)', 'let / const bị hoist nhưng nằm trong TDZ đến dòng khai báo', 'Truy cập biến trong TDZ → ReferenceError'],
            code: lines(
              'console.log(a);  // undefined (var được hoist)',
              'var a = 1;',
              '',
              'console.log(b);  // ReferenceError (TDZ)',
              'let b = 2;',
            ),
            exercise: {
              title: 'Viết hoa chữ cái đầu', functionName: 'capitalizeWords',
              descriptionMd: 'Viết hàm `capitalizeWords(str)` viết hoa chữ cái đầu của **mỗi từ** (các từ cách nhau bởi một dấu cách).\n\n```js\ncapitalizeWords("hoc javascript tu dau") // "Hoc Javascript Tu Dau"\n```',
              starter: 'function capitalizeWords(str) {\n  \n}\n',
              solution: 'function capitalizeWords(str) {\n  return str\n    .split(" ")\n    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))\n    .join(" ");\n}\n',
              tests: [[['hello world'], 'Hello World'], [['javascript'], 'Javascript'], [[''], '', true], [['a b c'], 'A B C', true]],
            },
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════ 2 ════════════════════════════════ */
  {
    title: 'Closure và Execution Context',
    slug: 'closure-va-execution-context',
    short: 'Hiểu cách JavaScript chạy một hàm: execution context, call stack, scope chain và closure.',
    level: 'INTERMEDIATE', category: 'js-core', instructor: 'will.sentance@hoisted.dev',
    price: 399000, originalPrice: 599000, glyph: '()', thumb: 'indigo',
    learn: ['Giải thích execution context và call stack', 'Đọc được scope chain của một đoạn code', 'Dùng closure để giữ trạng thái riêng tư', 'Tăng tốc hàm đệ quy bằng memoization'],
    requirements: ['Đã biết biến, hàm và scope cơ bản'],
    sections: [
      {
        title: 'Phần 1: Execution context',
        lessons: [
          {
            title: 'Execution context là gì?', preview: true,
            intro: 'Mỗi lần gọi hàm, JavaScript tạo một "môi trường chạy" riêng cho lần gọi đó.',
            points: ['Mỗi lần gọi hàm tạo một execution context mới', 'Context gồm biến cục bộ, tham chiếu scope ngoài và this', 'Call stack theo dõi context nào đang chạy'],
            code: lines(
              'function a() { b(); }',
              'function b() { console.trace(); }',
              'a();',
              '// stack: b ← a ← (global)',
            ),
          },
          {
            title: 'Call stack',
            intro: 'Call stack là ngăn xếp các lần gọi hàm đang chờ hoàn thành.',
            points: ['Gọi hàm → đẩy context lên stack; return → lấy ra', 'Đệ quy không có điểm dừng → "Maximum call stack size exceeded"', 'Stack trace trong lỗi chính là ảnh chụp call stack'],
            code: lines(
              'function countdown(n) {',
              '  if (n === 0) return;   // điểm dừng',
              '  countdown(n - 1);',
              '}',
              'countdown(3);',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'Khi một hàm return, execution context của nó…', options: [['bị lấy ra khỏi call stack', true], ['nằm lại trên stack đến khi tải lại trang', false], ['được chuyển sang hàng đợi microtask', false]] },
                { q: 'Lỗi "Maximum call stack size exceeded" thường do đâu?', options: [['Đệ quy không có điểm dừng', true], ['Vòng lặp while (true)', false], ['Promise bị reject', false], ['Dùng biến chưa khai báo', false]] },
                { q: 'Execution context của một hàm chứa những gì?', type: 'multiple', options: [['Biến cục bộ', true], ['Tham chiếu tới scope bên ngoài', true], ['Giá trị this', true], ['Mã nguồn của mọi hàm khác', false]] },
              ],
            },
          },
          {
            title: 'Lexical environment và scope chain',
            intro: 'Scope chain được quyết định bởi VỊ TRÍ viết hàm trong code, không phải nơi gọi hàm.',
            points: ['Tìm biến: scope hiện tại → scope ngoài → … → global', 'Scope chain cố định khi viết code (lexical)', 'Hàm nhớ scope nơi nó được tạo ra'],
            code: lines(
              'let x = 1;',
              'function f() { console.log(x); }',
              'function g() { let x = 2; f(); }',
              'g();   // 1 — f nhìn scope nơi f được viết',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'Scope chain của một hàm được xác định khi nào?', options: [['Khi viết code (vị trí khai báo hàm)', true], ['Khi gọi hàm', false], ['Khi hàm return', false]] },
                { q: 'let x = 1; function f(){ console.log(x) } function g(){ let x = 2; f() } g(); — in ra gì?', options: [['1', true], ['2', false], ['undefined', false], ['ReferenceError', false]] },
                { q: 'Trường hợp nào tạo ra closure?', type: 'multiple', options: [['Hàm trả về một hàm dùng biến của nó', true], ['Callback của setTimeout đọc biến bên ngoài', true], ['Hàm chỉ dùng tham số của chính nó', false]] },
              ],
            },
          },
        ],
      },
      {
        title: 'Phần 2: Closure trong thực tế',
        lessons: [
          {
            title: 'Closure: hàm nhớ scope',
            intro: 'Closure cho phép một hàm tiếp tục đọc / ghi biến của hàm ngoài kể cả khi hàm ngoài đã return.',
            points: ['Closure = hàm + scope nơi nó được tạo', 'Biến trong closure là "riêng tư": bên ngoài không đụng tới được', 'Mỗi lần gọi hàm ngoài tạo một closure độc lập'],
            code: lines(
              'function createCounter(start) {',
              '  let count = start;',
              '  return { inc: () => ++count, get: () => count };',
              '}',
              'const c = createCounter(0);',
              'c.inc(); c.inc();',
              'c.get();   // 2',
            ),
            exercise: {
              title: 'Bộ đếm dùng closure', functionName: 'runCounter',
              descriptionMd: 'Hoàn thiện `createCounter(start)`: trả về object `{ inc, dec, get }` dùng chung một biến đếm nhờ closure.\n\nHàm `runCounter(start, ops)` đã viết sẵn để chấm bài: chạy lần lượt các thao tác và trả về mảng giá trị của mỗi lần `get`.\n\n```js\nrunCounter(5, ["dec", "get", "inc", "inc", "get"]) // [4, 6]\n```',
              starter: 'function createCounter(start) {\n  // Trả về { inc, dec, get } dùng chung biến đếm\n}\n\n// Hàm dùng để chấm bài — không cần sửa\nfunction runCounter(start, ops) {\n  const counter = createCounter(start);\n  const out = [];\n  for (const op of ops) {\n    if (op === "get") out.push(counter.get());\n    else counter[op]();\n  }\n  return out;\n}\n',
              solution: 'function createCounter(start) {\n  let count = start;\n  return {\n    inc: () => { count++; },\n    dec: () => { count--; },\n    get: () => count,\n  };\n}\n\nfunction runCounter(start, ops) {\n  const counter = createCounter(start);\n  const out = [];\n  for (const op of ops) {\n    if (op === "get") out.push(counter.get());\n    else counter[op]();\n  }\n  return out;\n}\n',
              tests: [[[0, ['inc', 'inc', 'get']], [2]], [[5, ['dec', 'get', 'inc', 'inc', 'get']], [4, 6]], [[10, ['get']], [10], true], [[0, ['inc', 'dec', 'dec', 'get']], [-1], true]],
            },
          },
          {
            title: 'Memoization với closure',
            intro: 'Lưu kết quả đã tính vào một object nằm trong closure để không phải tính lại.',
            points: ['Cache nằm trong closure, không lộ ra ngoài', 'Gọi lại với cùng tham số → trả kết quả ngay', 'Biến fib(n) đệ quy từ O(2^n) thành O(n)'],
            code: lines(
              'function memo(fn) {',
              '  const cache = {};',
              '  return (n) => (n in cache ? cache[n] : (cache[n] = fn(n)));',
              '}',
            ),
            exercise: {
              title: 'Fibonacci nhanh', functionName: 'fib',
              descriptionMd: 'Viết `fib(n)` trả về số Fibonacci thứ `n` (`fib(0) = 0`, `fib(1) = 1`).\n\nTest ẩn có `n = 70` với giới hạn **1 giây** — đệ quy thường sẽ không kịp, hãy dùng memoization hoặc vòng lặp.',
              starter: 'function fib(n) {\n  \n}\n',
              solution: 'const fib = (() => {\n  const cache = { 0: 0, 1: 1 };\n  const f = (n) => (n in cache ? cache[n] : (cache[n] = f(n - 1) + f(n - 2)));\n  return f;\n})();\n',
              tests: [[[10], 55], [[1], 1], [[0], 0, true], [[70], 190392490709135, true]],
            },
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════ 3 ════════════════════════════════ */
  {
    title: 'Prototype, this và class',
    slug: 'prototype-this-va-class',
    short: 'Nắm chắc this, prototype chain và class — phần làm khó nhiều người nhất khi phỏng vấn JavaScript.',
    level: 'ADVANCED', category: 'js-core', instructor: 'khang.pham@hoisted.dev',
    price: 449000, originalPrice: null, glyph: 'OOP', thumb: 'violet',
    learn: ['Xác định giá trị this theo 4 quy tắc', 'Dùng call, apply, bind đúng chỗ', 'Đi theo prototype chain của một giá trị', 'Hiểu class và extends hoạt động trên prototype'],
    requirements: ['Đã nắm execution context và closure'],
    sections: [
      {
        title: 'Phần 1: this',
        lessons: [
          {
            title: 'Giới thiệu khóa học', preview: true,
            intro: 'this, prototype và class là ba mảnh ghép của lập trình hướng đối tượng trong JavaScript.',
            points: ['this phụ thuộc CÁCH GỌI hàm, không phải nơi khai báo', 'Prototype là cơ chế kế thừa thật sự của JS', 'class chỉ là cú pháp gọn hơn trên prototype'],
          },
          {
            title: '4 quy tắc xác định this',
            intro: 'Nhìn vào cách một hàm được gọi là biết this của nó.',
            points: ['Gọi kèm object obj.f() → this là obj', 'Gọi trơn f() → this là undefined (strict mode)', 'call / apply / bind đặt this tùy ý; new tạo object mới làm this'],
            code: lines(
              "'use strict';",
              'const o = { n: 1, f() { return this.n; } };',
              'o.f();          // 1',
              'const g = o.f;',
              'g();            // TypeError: this là undefined',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: "'use strict'; const o = { n: 1, f() { return this.n } }; const g = o.f; g(); — kết quả?", options: [['Lỗi TypeError', true], ['1', false], ['undefined', false], ['null', false]] },
                { q: 'Arrow function lấy this từ đâu?', options: [['Từ scope bao quanh nơi nó được tạo', true], ['Từ object gọi nó', false], ['Luôn là globalThis', false]] },
                { q: 'Cách nào đặt được this cho một hàm thường?', type: 'multiple', options: [['call', true], ['apply', true], ['bind', true], ['Gán hàm vào một biến khác', false]] },
              ],
            },
          },
          {
            title: 'call, apply và bind',
            intro: 'Ba phương thức giúp chủ động chọn this cho một hàm.',
            points: ['call(thisArg, a, b): gọi ngay, tham số rời', 'apply(thisArg, [a, b]): gọi ngay, tham số là mảng', 'bind(thisArg): trả về hàm mới với this cố định'],
            code: lines(
              'function hi(greet) { return greet + ", " + this.name; }',
              "const user = { name: 'An' };",
              "hi.call(user, 'Chào');      // 'Chào, An'",
              "hi.apply(user, ['Hello']);  // 'Hello, An'",
              'const bound = hi.bind(user);',
            ),
          },
        ],
      },
      {
        title: 'Phần 2: Prototype và class',
        lessons: [
          {
            title: 'Prototype chain',
            intro: 'Khi không tìm thấy thuộc tính trên object, JS tìm tiếp lên prototype của nó, rồi prototype của prototype…',
            points: ['Object.getPrototypeOf(x) trả về prototype của x', 'Chuỗi kết thúc ở Object.prototype rồi null', 'Giá trị nguyên thủy được "bọc" tạm khi truy cập phương thức'],
            code: lines(
              'const arr = [1, 2];',
              'Object.getPrototypeOf(arr) === Array.prototype;            // true',
              'Object.getPrototypeOf(Array.prototype) === Object.prototype; // true',
            ),
            exercise: {
              title: 'Đi theo prototype chain', functionName: 'getTypeChain',
              descriptionMd: 'Viết `getTypeChain(value)` trả về mảng **tên constructor** dọc theo prototype chain của `value`.\n\n- `null` / `undefined` → `[]`\n- Giá trị nguyên thủy được bọc thành object trước (gợi ý: `Object(value)`)\n\n```js\ngetTypeChain([1, 2]) // ["Array", "Object"]\ngetTypeChain(5)      // ["Number", "Object"]\n```',
              starter: 'function getTypeChain(value) {\n  \n}\n',
              solution: 'function getTypeChain(value) {\n  if (value === null || value === undefined) return [];\n  const chain = [];\n  let proto = Object.getPrototypeOf(Object(value));\n  while (proto) {\n    chain.push(proto.constructor.name);\n    proto = Object.getPrototypeOf(proto);\n  }\n  return chain;\n}\n',
              tests: [[[[1, 2]], ['Array', 'Object']], [[5], ['Number', 'Object']], [[{}], ['Object']], [['hi'], ['String', 'Object'], true], [[true], ['Boolean', 'Object'], true], [[null], [], true]],
            },
          },
          {
            title: 'class và extends',
            intro: 'class viết gọn hơn nhưng bên dưới vẫn là prototype.',
            points: ['Phương thức của class nằm trên prototype', 'extends nối prototype của lớp con vào lớp cha', 'Lớp con phải gọi super() trước khi dùng this'],
            code: lines(
              'class Animal { speak() { return "..."; } }',
              'class Dog extends Animal { speak() { return "Gâu"; } }',
              'Object.getPrototypeOf(Dog.prototype) === Animal.prototype; // true',
              'typeof Dog;   // "function"',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'class Dog extends Animal {} — Object.getPrototypeOf(Dog.prototype) là gì?', options: [['Animal.prototype', true], ['Dog', false], ['Object.prototype', false], ['null', false]] },
                { q: 'Trong constructor lớp con, dùng this TRƯỚC khi gọi super() thì sao?', options: [['ReferenceError', true], ['this là undefined', false], ['Chạy bình thường', false]] },
                { q: 'Những phát biểu nào đúng về class trong JavaScript?', type: 'multiple', options: [['typeof một class là "function"', true], ['Phương thức nằm trên prototype', true], ['class được hoist giống function declaration', false], ['class dùng cơ chế kế thừa khác prototype', false]] },
              ],
            },
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════ 4 ════════════════════════════════ */
  {
    title: 'Mảng và object: map, filter, reduce',
    slug: 'mang-va-object-map-filter-reduce',
    short: 'Xử lý dữ liệu gọn gàng với map, filter, reduce, destructuring và spread — kèm các bẫy hay gặp.',
    level: 'BEGINNER', category: 'js-core', instructor: 'ha.trang@hoisted.dev',
    price: 199000, originalPrice: 299000, glyph: '[ ]', thumb: 'green',
    learn: ['Biến đổi mảng bằng map và filter', 'Gom dữ liệu bằng reduce', 'Destructuring và spread không làm hỏng dữ liệu gốc', 'Tránh bẫy sort mặc định so sánh chuỗi'],
    requirements: ['Đã biết biến, hàm và vòng lặp'],
    sections: [
      {
        title: 'Phần 1: Biến đổi mảng',
        lessons: [
          {
            title: 'Giới thiệu khóa học', preview: true,
            intro: 'Phần lớn code xử lý dữ liệu hằng ngày là biến đổi mảng và object.',
            points: ['map / filter / reduce thay cho vòng lặp thủ công', 'Không sửa dữ liệu gốc → ít bug hơn', 'Mỗi phần đều có bài tập dữ liệu thật'],
          },
          {
            title: 'map và filter',
            intro: 'map biến đổi từng phần tử, filter giữ lại phần tử thỏa điều kiện — cả hai trả về mảng MỚI.',
            points: ['map: mảng mới cùng độ dài', 'filter: mảng mới chỉ chứa phần tử thỏa điều kiện', 'Không làm thay đổi mảng gốc'],
            code: lines(
              'const prices = [100, 250, 80];',
              'prices.map((p) => p * 2);       // [200, 500, 160]',
              'prices.filter((p) => p > 90);   // [100, 250]',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: '[1, 2, 3].map(x => x * 2) trả về?', options: [['[2, 4, 6]', true], ['[1, 2, 3]', false], ['12', false], ['undefined', false]] },
                { q: 'filter trả về gì?', options: [['Mảng mới chứa phần tử thỏa điều kiện', true], ['Phần tử đầu tiên thỏa điều kiện', false], ['true / false', false]] },
                { q: 'Phương thức nào KHÔNG sửa mảng gốc?', type: 'multiple', options: [['map', true], ['filter', true], ['slice', true], ['sort', false], ['push', false]] },
              ],
            },
          },
          {
            title: 'reduce: gom dữ liệu',
            intro: 'reduce đi qua mảng và tích lũy kết quả vào một giá trị duy nhất — số, object hay mảng đều được.',
            points: ['reduce((acc, item) => …, giáTrịBanĐầu)', 'Luôn truyền giá trị ban đầu để tránh lỗi mảng rỗng', 'Dùng để tính tổng, đếm, nhóm dữ liệu'],
            code: lines(
              'const cart = [{ price: 100 }, { price: 50 }];',
              'cart.reduce((sum, item) => sum + item.price, 0);  // 150',
            ),
            exercise: {
              title: 'Tổng tiền theo danh mục', functionName: 'totalByCategory',
              descriptionMd: 'Viết `totalByCategory(items)` nhận mảng `{ category, price }` và trả về object tổng tiền của từng danh mục.\n\n```js\ntotalByCategory([\n  { category: "js", price: 100 },\n  { category: "css", price: 50 },\n  { category: "js", price: 20 },\n]) // { js: 120, css: 50 }\n```',
              starter: 'function totalByCategory(items) {\n  \n}\n',
              solution: 'function totalByCategory(items) {\n  return items.reduce((acc, { category, price }) => {\n    acc[category] = (acc[category] ?? 0) + price;\n    return acc;\n  }, {});\n}\n',
              tests: [
                [[[{ category: 'js', price: 100 }, { category: 'css', price: 50 }, { category: 'js', price: 20 }]], { js: 120, css: 50 }],
                [[[]], {}],
                [[[{ category: 'a', price: 1 }, { category: 'a', price: 2 }, { category: 'a', price: 3 }]], { a: 6 }, true],
              ],
            },
          },
        ],
      },
      {
        title: 'Phần 2: Object và các bẫy thường gặp',
        lessons: [
          {
            title: 'Destructuring và spread',
            intro: 'Lấy nhanh giá trị ra khỏi object / mảng và tạo bản sao mà không sửa dữ liệu gốc.',
            points: ['const { a, ...rest } = obj — lấy a, phần còn lại vào rest', 'Bỏ qua phần tử mảng: const [x, , y] = arr', 'Spread {...obj} là sao chép NÔNG'],
            code: lines(
              'const { a, ...rest } = { a: 1, b: 2, c: 3 };',
              '// a = 1, rest = { b: 2, c: 3 }',
              'const copy = { ...rest, c: 30 };   // { b: 2, c: 30 }',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'const { a, ...rest } = { a: 1, b: 2, c: 3 } — rest là gì?', options: [['{ b: 2, c: 3 }', true], ['{ a: 1, b: 2, c: 3 }', false], ['[2, 3]', false]] },
                { q: 'const [x, , y] = [1, 2, 3] — y bằng bao nhiêu?', options: [['3', true], ['2', false], ['undefined', false]] },
                { q: 'Spread {...obj} sao chép object như thế nào?', options: [['Sao chép nông: object lồng bên trong vẫn dùng chung', true], ['Sao chép sâu toàn bộ', false], ['Không sao chép, chỉ tham chiếu', false]] },
              ],
            },
          },
          {
            title: 'Set, sort và bẫy so sánh',
            intro: 'sort() mặc định so sánh như CHUỖI, nên [10, 2, 1].sort() cho ra [1, 10, 2].',
            points: ['new Set(arr) loại phần tử trùng', 'sort((a, b) => a - b) để sắp xếp số tăng dần', 'sort() sửa mảng gốc — sao chép trước nếu cần'],
            code: lines(
              '[10, 2, 1].sort();                 // [1, 10, 2]  ✗',
              '[10, 2, 1].sort((a, b) => a - b);  // [1, 2, 10]  ✓',
              '[...new Set([1, 1, 2])];           // [1, 2]',
            ),
            exercise: {
              title: 'Loại trùng và sắp xếp', functionName: 'uniqueSorted',
              descriptionMd: 'Viết `uniqueSorted(nums)` trả về mảng mới **không trùng** và **tăng dần theo giá trị số**.\n\nCẩn thận: `sort()` mặc định so sánh như chuỗi.\n\n```js\nuniqueSorted([10, 2, 2, 1]) // [1, 2, 10]\n```',
              starter: 'function uniqueSorted(nums) {\n  \n}\n',
              solution: 'function uniqueSorted(nums) {\n  return [...new Set(nums)].sort((a, b) => a - b);\n}\n',
              tests: [[[[10, 2, 2, 1]], [1, 2, 10]], [[[3, 3, 3]], [3]], [[[]], [], true], [[[100, -5, 25, -5, 9]], [-5, 9, 25, 100], true]],
            },
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════ 5 ════════════════════════════════ */
  {
    title: 'Bất đồng bộ: Callback, Promise, async/await',
    slug: 'bat-dong-bo-callback-promise-async-await',
    short: 'Từ callback đến Promise và async/await: viết code bất đồng bộ dễ đọc và xử lý lỗi đúng cách.',
    level: 'INTERMEDIATE', category: 'async', instructor: 'lina.tran@hoisted.dev',
    price: 499000, originalPrice: 699000, glyph: 'async', thumb: 'green',
    learn: ['Hiểu vì sao callback lồng nhau khó bảo trì', 'Dùng Promise: then, catch, finally', 'Viết async/await và bắt lỗi bằng try/catch', 'Dự đoán thứ tự chạy của code bất đồng bộ'],
    requirements: ['Đã nắm hàm và closure'],
    sections: [
      {
        title: 'Phần 1: Từ callback đến Promise',
        lessons: [
          {
            title: 'Giới thiệu khóa học', preview: true,
            intro: 'Gọi API, đọc file, hẹn giờ — gần như mọi ứng dụng web đều có code bất đồng bộ.',
            points: ['JavaScript chạy một luồng, không chờ tác vụ chậm', 'Callback → Promise → async/await là ba thế hệ cách viết', 'Hiểu thứ tự chạy để tránh bug khó tìm'],
          },
          {
            title: 'Callback và callback hell',
            intro: 'Callback là hàm truyền vào để gọi lại khi tác vụ xong; lồng nhiều tầng thì code thành "kim tự tháp".',
            points: ['Callback lồng nhau → khó đọc, khó xử lý lỗi', 'Mỗi tầng phải tự kiểm tra lỗi riêng', 'Promise sinh ra để làm phẳng chuỗi tác vụ'],
            code: lines(
              'getUser(id, (err, user) => {',
              '  getOrders(user, (err, orders) => {',
              '    getItems(orders, (err, items) => {',
              '      // ... càng lúc càng lồng sâu',
              '    });',
              '  });',
              '});',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: '"Callback hell" là gì?', options: [['Nhiều callback lồng nhau khiến code khó đọc và khó xử lý lỗi', true], ['Callback chạy quá chậm', false], ['Lỗi cú pháp khi khai báo callback', false]] },
                { q: 'Promise giải quyết những vấn đề nào của callback?', type: 'multiple', options: [['Nối chuỗi .then thay vì lồng nhau', true], ['Gom xử lý lỗi vào một .catch', true], ['Làm code chạy nhanh hơn', false], ['Biến code bất đồng bộ thành đồng bộ', false]] },
                { q: 'Một Promise có những trạng thái nào?', options: [['pending, fulfilled, rejected', true], ['start, running, done', false], ['true, false', false]] },
              ],
            },
          },
          {
            title: 'Promise: then, catch, finally',
            intro: 'Promise đại diện cho một giá trị sẽ có trong tương lai.',
            points: ['.then nhận kết quả, có thể trả về Promise mới để nối chuỗi', '.catch bắt lỗi của mọi bước phía trước', '.finally chạy dù thành công hay thất bại'],
            code: lines(
              'fetchUser(1)',
              '  .then((user) => fetchOrders(user.id))',
              '  .then((orders) => render(orders))',
              '  .catch((err) => showError(err))',
              '  .finally(() => hideSpinner());',
            ),
          },
        ],
      },
      {
        title: 'Phần 2: async/await và thứ tự chạy',
        lessons: [
          {
            title: 'Thứ tự chạy: đồng bộ, microtask, macrotask',
            intro: 'Code đồng bộ chạy trước, rồi đến callback của Promise (microtask), sau cùng mới đến setTimeout (macrotask).',
            points: ['Code đồng bộ luôn chạy hết trước', 'Promise.then và phần sau await là microtask', 'setTimeout(…, 0) là macrotask, chạy sau mọi microtask'],
            code: lines(
              "console.log('A');",
              "setTimeout(() => console.log('B'), 0);",
              "Promise.resolve().then(() => console.log('C'));",
              "console.log('D');",
              '// A D C B',
            ),
            exercise: {
              title: 'Dự đoán thứ tự in', functionName: 'logOrder',
              descriptionMd: 'Hàm `logOrder(caseId)` trả về **mảng thứ tự in ra** của đoạn code tương ứng.\n\n**Case 1**\n```js\nconsole.log("A");\nsetTimeout(() => console.log("B"), 0);\nPromise.resolve().then(() => console.log("C"));\nconsole.log("D");\n```\n\n**Case 2**\n```js\nasync function f() {\n  console.log("1");\n  await null;\n  console.log("2");\n}\nconsole.log("0");\nf();\nconsole.log("3");\n```',
              starter: 'function logOrder(caseId) {\n  if (caseId === 1) return [];\n  if (caseId === 2) return [];\n}\n',
              solution: 'function logOrder(caseId) {\n  if (caseId === 1) return ["A", "D", "C", "B"];\n  if (caseId === 2) return ["0", "1", "3", "2"];\n}\n',
              tests: [[[1], ['A', 'D', 'C', 'B']], [[2], ['0', '1', '3', '2'], true]],
            },
          },
          {
            title: 'async/await và xử lý lỗi',
            intro: 'async/await giúp code bất đồng bộ đọc như code tuần tự; lỗi được bắt bằng try/catch quen thuộc.',
            points: ['await chỉ dùng trong async function hoặc top-level module', 'Bắt lỗi bằng try / catch', 'Chạy song song: await Promise.all([...])'],
            code: lines(
              'async function load() {',
              '  try {',
              '    const [user, posts] = await Promise.all([getUser(), getPosts()]);',
              '    return { user, posts };',
              '  } catch (err) {',
              '    console.error(err);',
              '  }',
              '}',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'await dùng được ở đâu?', options: [['Trong async function (hoặc top-level của ES module)', true], ['Ở bất kỳ hàm nào', false], ['Chỉ trong .then', false]] },
                { q: 'Bắt lỗi của một lệnh await bằng cách nào?', options: [['Bọc trong try / catch', true], ['Dùng if (err)', false], ['Lỗi await không bắt được', false]] },
                { q: 'Cách nào chạy hai tác vụ a() và b() SONG SONG?', type: 'multiple', options: [['await Promise.all([a(), b()])', true], ['await Promise.allSettled([a(), b()])', true], ['await a(); await b();', false], ['a().then(b)', false]] },
              ],
            },
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════ 6 ════════════════════════════════ */
  {
    title: 'Event Loop chi tiết',
    slug: 'event-loop-chi-tiet',
    short: 'Đi sâu vào event loop: call stack, hàng đợi microtask / macrotask, render và cách tránh chặn main thread.',
    level: 'ADVANCED', category: 'async', instructor: 'dang.quang@hoisted.dev',
    price: 549000, originalPrice: null, glyph: 'loop', thumb: 'rose',
    learn: ['Vẽ được mô hình call stack + hàng đợi', 'Phân biệt microtask và macrotask', 'Biết khi nào trình duyệt render', 'Tránh code chặn main thread'],
    requirements: ['Đã dùng Promise và async/await'],
    sections: [
      {
        title: 'Phần 1: Mô hình event loop',
        lessons: [
          {
            title: 'Giới thiệu khóa học', preview: true,
            intro: 'Event loop là lý do JavaScript một luồng vẫn xử lý được hàng nghìn tác vụ cùng lúc.',
            points: ['Một call stack, nhiều hàng đợi', 'Trình duyệt / Node cung cấp API chạy nền', 'Event loop quyết định việc gì chạy tiếp theo'],
          },
          {
            title: 'Call stack, Web APIs và hàng đợi',
            intro: 'Tác vụ chậm (timer, mạng) được giao cho Web APIs; khi xong, callback xếp vào hàng đợi chờ stack rỗng.',
            points: ['setTimeout giao cho Web APIs đếm giờ, không chặn stack', 'Xong việc → callback vào hàng đợi', 'Stack rỗng → event loop đưa task tiếp theo lên'],
            code: lines(
              "setTimeout(() => console.log('timer'), 0);",
              "console.log('sync');",
              '// sync → timer',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'setTimeout(fn, 0) chạy fn khi nào?', options: [['Khi call stack rỗng và đã chạy hết microtask', true], ['Ngay lập tức', false], ['Sau đúng 0 mili giây, kể cả khi stack đang bận', false]] },
                { q: 'Callback nào được xếp vào hàng đợi MICROTASK?', type: 'multiple', options: [['Promise.then', true], ['queueMicrotask', true], ['setTimeout', false], ['setInterval', false]] },
                { q: 'Event loop lấy task tiếp theo khi nào?', options: [['Khi call stack rỗng', true], ['Mỗi 16 ms một lần', false], ['Khi có click chuột', false]] },
              ],
            },
          },
          {
            title: 'Microtask và macrotask',
            intro: 'Sau mỗi macrotask, event loop chạy HẾT microtask (kể cả microtask mới sinh ra) rồi mới lấy macrotask kế tiếp.',
            points: ['Microtask: Promise.then, queueMicrotask, phần sau await', 'Macrotask: setTimeout, setInterval, sự kiện I/O', 'Microtask sinh trong macrotask chạy ngay sau macrotask đó'],
            code: lines(
              "setTimeout(() => console.log('T'));",
              "queueMicrotask(() => console.log('M'));",
              "Promise.resolve().then(() => console.log('P'));",
              "console.log('S');",
              '// S M P T',
            ),
            exercise: {
              title: 'Thứ tự trong event loop', functionName: 'eventLoopOrder',
              descriptionMd: 'Hàm `eventLoopOrder(caseId)` trả về **mảng thứ tự in ra** của đoạn code tương ứng (`log` là `console.log`).\n\n**Case 1**\n```js\nsetTimeout(() => log("T"));\nqueueMicrotask(() => log("M"));\nPromise.resolve().then(() => log("P"));\nlog("S");\n```\n\n**Case 2**\n```js\nPromise.resolve().then(() => {\n  log("A");\n  setTimeout(() => log("B"));\n});\nsetTimeout(() => {\n  log("C");\n  Promise.resolve().then(() => log("D"));\n});\nlog("E");\n```',
              starter: 'function eventLoopOrder(caseId) {\n  if (caseId === 1) return [];\n  if (caseId === 2) return [];\n}\n',
              solution: 'function eventLoopOrder(caseId) {\n  if (caseId === 1) return ["S", "M", "P", "T"];\n  if (caseId === 2) return ["E", "A", "C", "D", "B"];\n}\n',
              tests: [[[1], ['S', 'M', 'P', 'T']], [[2], ['E', 'A', 'C', 'D', 'B'], true]],
            },
          },
        ],
      },
      {
        title: 'Phần 2: Render và hiệu năng',
        lessons: [
          {
            title: 'requestAnimationFrame và render',
            intro: 'Trình duyệt chỉ vẽ lại màn hình giữa các task — task dài làm khung hình bị trễ.',
            points: ['Render xảy ra khi stack rỗng, sau microtask', 'requestAnimationFrame chạy ngay trước lần vẽ kế tiếp', 'Dùng rAF cho animation thay vì setTimeout'],
            code: lines(
              'function tick() {',
              '  box.style.transform = `translateX(${x++}px)`;',
              '  requestAnimationFrame(tick);',
              '}',
              'requestAnimationFrame(tick);',
            ),
          },
          {
            title: 'Chặn event loop và cách tránh',
            intro: 'Một vòng lặp nặng trên main thread làm trang đứng hình: không click, không cuộn, không vẽ.',
            points: ['Chia nhỏ công việc lớn thành nhiều đợt', 'Đưa tính toán nặng sang Web Worker', 'Microtask tự sinh mãi cũng chặn render như vòng lặp vô hạn'],
            code: lines(
              'function processChunk(items, i = 0) {',
              '  const end = Math.min(i + 500, items.length);',
              '  for (; i < end; i++) handle(items[i]);',
              '  if (i < items.length) setTimeout(() => processChunk(items, i));',
              '}',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'Vòng lặp nặng chạy 3 giây trên main thread gây ra gì?', options: [['Trang đứng hình, không phản hồi click', true], ['Trình duyệt tự chuyển sang luồng khác', false], ['Không ảnh hưởng gì', false]] },
                { q: 'Cách nào giúp tránh chặn main thread?', type: 'multiple', options: [['Chia nhỏ công việc thành nhiều đợt', true], ['Đưa tính toán nặng sang Web Worker', true], ['Bọc vòng lặp nặng trong một Promise', false], ['Đặt cả khối lớn vào một setTimeout(…, 0)', false]] },
                { q: 'Microtask liên tục tự thêm microtask mới thì sao?', options: [['Chặn render và timer vì hàng đợi microtask không bao giờ rỗng', true], ['Trình duyệt tự bỏ qua sau 100 lần', false], ['Chúng được chuyển sang macrotask', false]] },
              ],
            },
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════ 7 ════════════════════════════════ */
  {
    title: 'React căn bản: component, props và state',
    slug: 'react-can-ban-component-props-state',
    short: 'Xây giao diện bằng React: component, JSX, props, state và quản lý state phức tạp với reducer.',
    level: 'BEGINNER', category: 'react', instructor: 'mike.hughes@hoisted.dev',
    price: 399000, originalPrice: 499000, glyph: 'Rx', thumb: 'sky',
    learn: ['Chia giao diện thành component', 'Truyền dữ liệu bằng props', 'Quản lý state với useState đúng cách', 'Viết reducer thuần cho state phức tạp'],
    requirements: ['Nắm vững JavaScript ES6: arrow function, destructuring, map / filter'],
    sections: [
      {
        title: 'Phần 1: Component và props',
        lessons: [
          {
            title: 'Giới thiệu khóa học', preview: true,
            intro: 'React mô tả giao diện như một hàm của dữ liệu: dữ liệu đổi thì giao diện đổi theo.',
            points: ['UI = f(state)', 'Component là hàm trả về giao diện', 'Học qua ví dụ nhỏ, làm bài tập reducer'],
          },
          {
            title: 'Component và JSX',
            intro: 'JSX trông như HTML nhưng thực chất được biên dịch thành lời gọi hàm tạo React element.',
            points: ['Component là hàm, tên viết hoa', 'JSX → lời gọi hàm tạo React element', 'Trả về một phần tử gốc (hoặc Fragment <>…</>)'],
            code: lines(
              'function Hello({ name }) {',
              '  return <h1>Xin chào, {name}</h1>;',
              '}',
              '',
              '<Hello name="An" />',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'JSX được biên dịch thành gì?', options: [['Lời gọi hàm tạo React element', true], ['Chuỗi HTML', false], ['Template của trình duyệt', false]] },
                { q: 'Một component phải trả về gì?', options: [['Một phần tử gốc (hoặc Fragment, hoặc null)', true], ['Nhiều phần tử rời nhau không bọc', false], ['Luôn là một <div>', false]] },
                { q: 'Những phát biểu nào đúng về props?', type: 'multiple', options: [['Truyền dữ liệu từ cha xuống con', true], ['Chỉ đọc trong component con', true], ['Con sửa props để báo cho cha', false]] },
              ],
            },
          },
          {
            title: 'Props và danh sách',
            intro: 'Render danh sách bằng map và luôn gắn key ổn định cho từng phần tử.',
            points: ['props là object chỉ đọc', 'Render danh sách: items.map(item => <Item … />)', 'key phải ổn định, không dùng index nếu danh sách thay đổi'],
            code: lines(
              'function TodoList({ todos }) {',
              '  return (',
              '    <ul>',
              '      {todos.map((t) => <li key={t.id}>{t.text}</li>)}',
              '    </ul>',
              '  );',
              '}',
            ),
          },
        ],
      },
      {
        title: 'Phần 2: State',
        lessons: [
          {
            title: 'State và useState',
            intro: 'State là dữ liệu thay đổi theo thời gian; đổi state đúng cách thì React render lại.',
            points: ['Không sửa state trực tiếp — luôn tạo giá trị mới', 'Cập nhật dựa trên giá trị cũ: setCount(c => c + 1)', 'Các lần set trong cùng một sự kiện được gộp lại'],
            code: lines(
              'const [items, setItems] = useState([]);',
              'setItems([...items, newItem]);          // ✓',
              '// items.push(newItem); setItems(items) // ✗',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'Vì sao không nên làm items.push(x); setItems(items)?', options: [['Tham chiếu không đổi nên React không thấy thay đổi để render lại', true], ['push chậm hơn spread', false], ['Mảng trong state là chỉ đọc nên push báo lỗi', false]] },
                { q: 'Trong một sự kiện, gọi setCount(count + 1) hai lần liên tiếp thì count tăng bao nhiêu?', options: [['1', true], ['2', false], ['0', false]] },
                { q: 'Cách cập nhật mảng trong state nào là đúng?', type: 'multiple', options: [['setItems([...items, x])', true], ['setItems(items.filter((i) => i.id !== id))', true], ['items.push(x); setItems(items)', false]] },
              ],
            },
          },
          {
            title: 'useReducer cho state phức tạp',
            intro: 'Reducer là hàm thuần: nhận state cũ + action, trả về state MỚI — dễ test, dễ đọc.',
            points: ['reducer(state, action) → state mới', 'Không sửa state cũ, không gọi API trong reducer', 'Action không hợp lệ → trả lại nguyên state'],
            code: lines(
              'function reducer(state, action) {',
              '  switch (action.type) {',
              "    case 'add': return [...state, action.item];",
              '    default: return state;',
              '  }',
              '}',
            ),
            exercise: {
              title: 'Reducer cho danh sách việc cần làm', functionName: 'todoReducer',
              descriptionMd: 'Viết `todoReducer(state, action)` — `state` là mảng `{ id, text, done }`. Hỗ trợ:\n\n- `{ type: "add", id, text }` → thêm việc mới (`done: false`) vào cuối\n- `{ type: "toggle", id }` → đảo `done` của việc có `id` đó\n- `{ type: "remove", id }` → xóa việc có `id` đó\n- action khác → trả về nguyên `state`\n\nKhông được sửa `state` cũ.',
              starter: 'function todoReducer(state, action) {\n  switch (action.type) {\n    default:\n      return state;\n  }\n}\n',
              solution: 'function todoReducer(state, action) {\n  switch (action.type) {\n    case "add":\n      return [...state, { id: action.id, text: action.text, done: false }];\n    case "toggle":\n      return state.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t));\n    case "remove":\n      return state.filter((t) => t.id !== action.id);\n    default:\n      return state;\n  }\n}\n',
              tests: [
                [[[], { type: 'add', id: 1, text: 'Học React' }], [{ id: 1, text: 'Học React', done: false }]],
                [[[{ id: 1, text: 'a', done: false }], { type: 'toggle', id: 1 }], [{ id: 1, text: 'a', done: true }]],
                [[[{ id: 1, text: 'a', done: false }, { id: 2, text: 'b', done: false }], { type: 'remove', id: 1 }], [{ id: 2, text: 'b', done: false }], true],
                [[[{ id: 1, text: 'a', done: true }], { type: 'unknown' }], [{ id: 1, text: 'a', done: true }], true],
              ],
            },
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════ 8 ════════════════════════════════ */
  {
    title: 'TypeScript cho dev JavaScript',
    slug: 'typescript-cho-dev-javascript',
    short: 'Thêm kiểu cho JavaScript: kiểu cơ bản, interface, union, narrowing và generics — bắt lỗi trước khi chạy.',
    level: 'INTERMEDIATE', category: 'ts', instructor: 'huynh@hoisted.dev',
    price: 449000, originalPrice: null, glyph: 'TS', thumb: 'sky',
    learn: ['Khai báo kiểu và tận dụng type inference', 'Mô tả dữ liệu bằng interface / type', 'Thu hẹp kiểu union an toàn', 'Viết hàm generic tái sử dụng'],
    requirements: ['Thành thạo JavaScript ES6'],
    sections: [
      {
        title: 'Phần 1: Kiểu dữ liệu',
        lessons: [
          {
            title: 'Giới thiệu khóa học', preview: true,
            intro: 'TypeScript là JavaScript có thêm kiểu: lỗi sai kiểu được báo ngay trong editor, trước khi chạy.',
            points: ['TS biên dịch ra JavaScript thường', 'Kiểu chỉ tồn tại lúc biên dịch', 'Dữ liệu từ bên ngoài vẫn cần kiểm tra lúc chạy'],
          },
          {
            title: 'Kiểu cơ bản và type inference',
            intro: 'Phần lớn thời gian bạn không cần ghi kiểu: TypeScript tự suy ra từ giá trị ban đầu.',
            points: ['let x = 5 → x có kiểu number', 'any tắt kiểm tra kiểu — hạn chế dùng', 'unknown an toàn hơn any: phải kiểm tra trước khi dùng'],
            code: lines(
              'let count = 5;        // number',
              "count = 'a';          // ✗ Type 'string' is not assignable to type 'number'",
              '',
              'function len(s: string): number {',
              '  return s.length;',
              '}',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: "let x = 5; x = 'a'; — TypeScript báo gì?", options: [["Lỗi: Type 'string' is not assignable to type 'number'", true], ['Không lỗi, x thành string', false], ['Lỗi khi chạy trên trình duyệt', false]] },
                { q: 'Kiểu any làm gì?', options: [['Tắt kiểm tra kiểu cho giá trị đó', true], ['Bắt buộc giá trị là object', false], ['Giống hệt unknown', false]] },
                { q: 'Kiểu nào là kiểu nguyên thủy trong TypeScript?', type: 'multiple', options: [['string', true], ['number', true], ['boolean', true], ['Array<number>', false]] },
              ],
            },
          },
          {
            title: 'interface và type',
            intro: 'Mô tả hình dạng của object để mọi nơi dùng đều được kiểm tra.',
            points: ['interface: mô tả object, có thể mở rộng bằng extends', 'type: đặt tên cho mọi kiểu, kể cả union', 'Thuộc tính tùy chọn: email?: string'],
            code: lines(
              'interface User {',
              '  name: string;',
              '  age: number;',
              '  email?: string;',
              '}',
              "type Status = 'draft' | 'published';",
            ),
          },
        ],
      },
      {
        title: 'Phần 2: Union, narrowing và generics',
        lessons: [
          {
            title: 'Union và narrowing',
            intro: 'Kiểu chỉ có lúc biên dịch — dữ liệu từ API hay form vẫn phải kiểm tra lúc chạy bằng type guard.',
            points: ['Union: string | number', 'Thu hẹp bằng typeof, in, instanceof', 'Type guard: function isUser(x): x is User'],
            code: lines(
              'function isUser(x: unknown): x is User {',
              "  return typeof x === 'object' && x !== null",
              "    && typeof (x as User).name === 'string';",
              '}',
            ),
            exercise: {
              title: 'Type guard kiểm tra dữ liệu lúc chạy', functionName: 'isValidUser',
              descriptionMd: 'Bài tập chạy bằng JavaScript thuần (giống code TypeScript sau khi biên dịch). Viết `isValidUser(value)` trả về `true` khi:\n\n- `value` là object (không phải `null`, không phải mảng)\n- `name` là chuỗi **không rỗng**\n- `age` là số **nguyên ≥ 0**\n- `email` nếu có thì là chuỗi chứa `@`',
              starter: 'function isValidUser(value) {\n  \n}\n',
              solution: 'function isValidUser(value) {\n  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;\n  if (typeof value.name !== "string" || value.name.length === 0) return false;\n  if (!Number.isInteger(value.age) || value.age < 0) return false;\n  if (value.email !== undefined && (typeof value.email !== "string" || !value.email.includes("@"))) return false;\n  return true;\n}\n',
              tests: [
                [[{ name: 'An', age: 20 }], true],
                [[{ name: '', age: 20 }], false],
                [[{ name: 'An', age: 20, email: 'an@hoisted.dev' }], true],
                [[{ name: 'An', age: -1 }], false, true],
                [[{ name: 'An', age: 1.5 }], false, true],
                [[{ name: 'An', age: 3, email: 'khong-hop-le' }], false, true],
                [[null], false, true],
                [[[{ name: 'An', age: 1 }]], false, true],
              ],
            },
          },
          {
            title: 'Generics',
            intro: 'Generic cho phép một hàm làm việc với nhiều kiểu mà vẫn giữ được thông tin kiểu.',
            points: ['function first<T>(arr: T[]): T', 'TypeScript tự suy ra T từ tham số', 'Ràng buộc: <T extends { id: number }>'],
            code: lines(
              'function first<T>(arr: T[]): T | undefined {',
              '  return arr[0];',
              '}',
              'const n = first([1, 2]);      // number | undefined',
              "const s = first(['a', 'b']);  // string | undefined",
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'function first<T>(arr: T[]): T — gọi first([1, 2]) thì T là gì?', options: [['number', true], ['any', false], ['unknown', false], ['T', false]] },
                { q: 'unknown khác any ở chỗ nào?', options: [['Phải thu hẹp kiểu trước khi dùng', true], ['unknown nhanh hơn khi chạy', false], ['Không khác nhau', false]] },
                { q: 'Cách nào thu hẹp được kiểu của một union?', type: 'multiple', options: [['typeof', true], ['toán tử in', true], ['instanceof', true], ['Ép kiểu bằng as mà không kiểm tra', false]] },
              ],
            },
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════ 9 ════════════════════════════════ */
  {
    title: 'Node.js: module, file system và HTTP',
    slug: 'nodejs-module-file-system-http',
    short: 'Viết JavaScript phía server với Node.js: module, đọc ghi file, HTTP server và middleware.',
    level: 'INTERMEDIATE', category: 'node', instructor: 'khang.pham@hoisted.dev',
    price: 499000, originalPrice: null, glyph: 'node', thumb: 'green',
    learn: ['Phân biệt CommonJS và ES Modules', 'Đọc ghi file bất đồng bộ với fs/promises', 'Tạo HTTP server và đọc query string', 'Hiểu middleware và xử lý lỗi kiểu Express'],
    requirements: ['Nắm Promise và async/await'],
    sections: [
      {
        title: 'Phần 1: Module và file system',
        lessons: [
          {
            title: 'Giới thiệu khóa học', preview: true,
            intro: 'Node.js đưa JavaScript ra khỏi trình duyệt: đọc file, mở cổng mạng, chạy server.',
            points: ['Cùng ngôn ngữ cho cả frontend và backend', 'Event loop giúp xử lý nhiều kết nối cùng lúc', 'Hệ sinh thái npm rất lớn'],
          },
          {
            title: 'CommonJS và ES Modules',
            intro: 'Node hỗ trợ hai hệ module: CommonJS (require) và ES Modules (import).',
            points: ['CommonJS: require / module.exports', 'ES Modules: import / export, bật bằng "type": "module" hoặc đuôi .mjs', 'Module chỉ chạy một lần, các lần require sau dùng bản cache'],
            code: lines(
              '// CommonJS',
              "const fs = require('fs');",
              'module.exports = { sum };',
              '',
              '// ES Modules',
              "import fs from 'node:fs';",
              'export function sum(a, b) { return a + b; }',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'Trong CommonJS, xuất giá trị ra khỏi module bằng gì?', options: [['module.exports', true], ['export default', false], ['window.exports', false]] },
                { q: 'Cách nào bật ES Modules trong Node?', type: 'multiple', options: [['"type": "module" trong package.json', true], ['Đặt đuôi file .mjs', true], ['Dùng require() với đuôi .esm', false]] },
                { q: 'require() cùng một module lần thứ hai thì sao?', options: [['Trả về bản đã cache, không chạy lại', true], ['Chạy lại toàn bộ module', false], ['Báo lỗi trùng module', false]] },
              ],
            },
          },
          {
            title: 'fs: đọc và ghi file',
            intro: 'Dùng phiên bản Promise của fs để không chặn event loop khi làm việc với file.',
            points: ["import { readFile, writeFile } from 'node:fs/promises'", 'Luôn chỉ rõ encoding khi đọc file văn bản', 'Tránh readFileSync trong server đang phục vụ request'],
            code: lines(
              "import { readFile, writeFile } from 'node:fs/promises';",
              '',
              "const text = await readFile('notes.txt', 'utf8');",
              "await writeFile('copy.txt', text);",
            ),
          },
        ],
      },
      {
        title: 'Phần 2: HTTP',
        lessons: [
          {
            title: 'HTTP server và query string',
            intro: 'Mỗi request đến server có URL; phần sau dấu ? là query string chứa tham số.',
            points: ['http.createServer((req, res) => …) tạo server', 'req.url chứa đường dẫn và query string', 'Giá trị trong query được mã hóa: %XX và dấu + là khoảng trắng'],
            code: lines(
              "import http from 'node:http';",
              'http.createServer((req, res) => {',
              '  res.end(`Bạn vừa gọi ${req.url}`);',
              '}).listen(3000);',
            ),
            exercise: {
              title: 'Phân tích query string', functionName: 'parseQuery',
              descriptionMd: 'Viết `parseQuery(url)` trả về object tham số trong query string.\n\n- Giải mã `%XX` và đổi `+` thành khoảng trắng\n- Khóa không có `=` → giá trị `""`\n- Khóa lặp lại → mảng các giá trị theo thứ tự\n- Không có `?` → `{}`\n\n```js\nparseQuery("/search?q=js&page=2") // { q: "js", page: "2" }\n```\n\nLưu ý: môi trường chấm không có `URLSearchParams`, hãy tự tách chuỗi.',
              starter: 'function parseQuery(url) {\n  \n}\n',
              solution: 'function parseQuery(url) {\n  const i = url.indexOf("?");\n  if (i === -1) return {};\n  const decode = (s) => decodeURIComponent(s.replace(/\\+/g, " "));\n  const result = {};\n  for (const part of url.slice(i + 1).split("&")) {\n    if (!part) continue;\n    const [rawKey, ...rest] = part.split("=");\n    const key = decode(rawKey);\n    const value = decode(rest.join("="));\n    if (key in result) result[key] = [].concat(result[key], value);\n    else result[key] = value;\n  }\n  return result;\n}\n',
              tests: [
                [['/search?q=js&page=2'], { q: 'js', page: '2' }],
                [['/a?name=H%E1%BB%8Dc+JS'], { name: 'Học JS' }],
                [['/x'], {}, true],
                [['/t?tag=a&tag=b&debug'], { tag: ['a', 'b'], debug: '' }, true],
              ],
            },
          },
          {
            title: 'Middleware và xử lý lỗi',
            intro: 'Middleware là các hàm xếp thành chuỗi xử lý request; mỗi hàm làm một việc rồi chuyển tiếp.',
            points: ['(req, res, next): làm xong thì gọi next() hoặc trả response', 'Middleware lỗi có 4 tham số: (err, req, res, next)', 'Quên next() và không trả response → request bị treo'],
            code: lines(
              'app.use((req, res, next) => {',
              '  console.log(req.method, req.url);',
              '  next();',
              '});',
              'app.use((err, req, res, next) => {',
              "  res.status(500).json({ message: 'Lỗi máy chủ' });",
              '});',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'Middleware quên gọi next() và không gửi response thì sao?', options: [['Request bị treo đến khi timeout', true], ['Express tự gọi next()', false], ['Trả về 404', false]] },
                { q: 'Middleware xử lý lỗi trong Express có mấy tham số?', options: [['4: (err, req, res, next)', true], ['3: (req, res, next)', false], ['2: (err, res)', false]] },
                { q: 'Việc nào phù hợp để làm trong middleware?', type: 'multiple', options: [['Xác thực token', true], ['Ghi log request', true], ['Đọc JSON body', true], ['Ghi mật khẩu người dùng vào log', false]] },
              ],
            },
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════ 10 ════════════════════════════════ */
  {
    title: 'Unit test JavaScript với Jest',
    slug: 'unit-test-javascript-voi-jest',
    short: 'Viết test tự động cho JavaScript với Jest: matcher, mock, test bất đồng bộ — và tự viết một hàm so sánh sâu.',
    level: 'BEGINNER', category: 'testing', instructor: 'phuong.nguyen@hoisted.dev',
    price: 0, originalPrice: null, glyph: 'test', thumb: 'violet',
    learn: ['Viết test theo cấu trúc Arrange – Act – Assert', 'Chọn đúng matcher: toBe hay toEqual', 'Mock hàm phụ thuộc', 'Test code bất đồng bộ không bị "pass giả"'],
    requirements: ['Đã biết JavaScript cơ bản'],
    sections: [
      {
        title: 'Phần 1: Test đầu tiên',
        lessons: [
          {
            title: 'Giới thiệu khóa học', preview: true,
            intro: 'Test tự động giúp sửa code mà không sợ làm hỏng chỗ khác.',
            points: ['Test là code kiểm tra code', 'Chạy lại hàng trăm test trong vài giây', 'Chính các bài tập trên Hoisted cũng được chấm bằng test'],
          },
          {
            title: 'Viết test đầu tiên',
            intro: 'Một test tốt có ba bước: chuẩn bị, hành động, kiểm tra.',
            points: ['Arrange: chuẩn bị dữ liệu', 'Act: gọi hàm cần test', 'Assert: kiểm tra kết quả bằng expect'],
            code: lines(
              "test('sum cộng hai số', () => {",
              '  const a = 1, b = 2;        // Arrange',
              '  const result = sum(a, b);  // Act',
              '  expect(result).toBe(3);    // Assert',
              '});',
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'toBe so sánh theo cách nào?', options: [['Object.is (gần giống ===)', true], ['So sánh sâu từng thuộc tính', false], ['So sánh sau khi JSON.stringify', false]] },
                { q: 'expect({ a: 1 }).toBe({ a: 1 }) — kết quả?', options: [['Fail vì là hai object khác tham chiếu', true], ['Pass', false], ['Lỗi cú pháp', false]] },
                { q: 'Ba bước của cấu trúc AAA là gì?', type: 'multiple', options: [['Arrange: chuẩn bị dữ liệu', true], ['Act: gọi hàm cần test', true], ['Assert: kiểm tra kết quả', true], ['Avoid: bỏ qua lỗi', false]] },
              ],
            },
          },
          {
            title: 'Matcher: toBe và toEqual',
            intro: 'toEqual so sánh "sâu": hai object khác tham chiếu nhưng cùng nội dung vẫn bằng nhau.',
            points: ['toBe: cùng giá trị nguyên thủy hoặc cùng tham chiếu', 'toEqual: so sánh đệ quy từng thuộc tính', 'Thứ tự thuộc tính object không quan trọng, thứ tự mảng thì có'],
            code: lines(
              'expect({ a: 1 }).toEqual({ a: 1 });   // pass',
              'expect([1, 2]).toEqual([2, 1]);       // fail',
            ),
            exercise: {
              title: 'Tự viết so sánh sâu', functionName: 'deepEqual',
              descriptionMd: 'Viết `deepEqual(a, b)` giống tinh thần `toEqual` của Jest:\n\n- Giá trị nguyên thủy: so sánh bằng `===`\n- Mảng: cùng độ dài và từng phần tử bằng nhau (theo thứ tự)\n- Object: cùng tập khóa (thứ tự khóa không quan trọng), giá trị từng khóa bằng nhau\n- Mảng và object thường **không** bằng nhau; `null` chỉ bằng `null`',
              starter: 'function deepEqual(a, b) {\n  \n}\n',
              solution: 'function deepEqual(a, b) {\n  if (a === b) return true;\n  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;\n  if (Array.isArray(a) !== Array.isArray(b)) return false;\n  const ka = Object.keys(a);\n  const kb = Object.keys(b);\n  if (ka.length !== kb.length) return false;\n  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));\n}\n',
              tests: [
                [[1, 1], true],
                [[{ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 }], true],
                [[[1, 2], [2, 1]], false],
                [[{ a: { b: 1 } }, { a: { b: 2 } }], false, true],
                [[[], {}], false, true],
                [[null, {}], false, true],
                [['1', 1], false, true],
              ],
            },
          },
        ],
      },
      {
        title: 'Phần 2: Mock và bất đồng bộ',
        lessons: [
          {
            title: 'Mock và spy',
            intro: 'Mock thay hàm phụ thuộc (gọi API, gửi email) bằng hàm giả để test chạy nhanh và ổn định.',
            points: ['jest.fn() tạo hàm giả ghi lại các lần gọi', 'mockResolvedValue giả lập Promise thành công', 'expect(fn).toHaveBeenCalledWith(...) kiểm tra tham số'],
            code: lines(
              'const sendEmail = jest.fn().mockResolvedValue(true);',
              "await register('an@hoisted.dev', sendEmail);",
              "expect(sendEmail).toHaveBeenCalledWith('an@hoisted.dev');",
            ),
          },
          {
            title: 'Test code bất đồng bộ',
            intro: 'Test bất đồng bộ phải chờ kết quả; quên await thì test kết thúc trước khi kiểm tra xong.',
            points: ['Khai báo test async và await kết quả', 'Quên return / await → test có thể "pass giả"', 'await expect(p).rejects.toThrow() cho Promise bị reject'],
            code: lines(
              "test('lấy user', async () => {",
              '  const user = await getUser(1);',
              "  expect(user.name).toBe('An');",
              '});',
              "await expect(getUser(-1)).rejects.toThrow('Not found');",
            ),
            quiz: {
              passScore: 70,
              questions: [
                { q: 'Cách đúng để test một async function trong Jest?', options: [['Khai báo test async và await kết quả', true], ['Gọi hàm rồi expect ngay, không chờ', false], ['Dùng setTimeout chờ 1 giây', false]] },
                { q: 'Quên return / await promise trong test thì sao?', options: [['Test có thể pass dù code lỗi', true], ['Jest tự chờ promise', false], ['Test luôn fail', false]] },
                { q: 'Matcher nào dùng cho Promise?', type: 'multiple', options: [['.resolves', true], ['.rejects', true], ['.toThrowAsync', false]] },
              ],
            },
          },
        ],
      },
    ],
  },
];
