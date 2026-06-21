-- ============================================================
-- Seed: 2 khóa học đầy đủ
--   1. React Hooks Thực Chiến
--   2. Testing với Jest & Vitest
-- Chạy: mysql -u root -p course_mng < BE/database/seed_full_courses.sql
-- ============================================================

-- ============================================================
-- KHÓA HỌC 1: React Hooks Thực Chiến
-- ============================================================

INSERT IGNORE INTO courses
  (title, slug, short_description, description,
   glyph, thumb, price, original_price, level, category_id, instructor_name,
   what_you_learn, requirements,
   total_duration_minutes, total_lessons, rating, review_count, student_count, tag, status)
VALUES (
  'React Hooks Thực Chiến',
  'react-hooks-thuc-chien',
  'Nắm vững useState, useEffect, useRef, useContext, useMemo, useCallback và custom hooks qua các mini-project thực tế.',
  '<p>Khóa học này đưa bạn qua từng hook của React một cách hệ thống. Thay vì chỉ học lý thuyết, bạn sẽ xây dựng các mini-project để hiểu rõ khi nào dùng hook nào.</p><h3>Nội dung nổi bật</h3><ul><li><strong>useState &amp; useEffect</strong>: Quản lý state và side effects đúng cách, tránh stale closure</li><li><strong>useRef &amp; useContext</strong>: DOM access và global state không cần Redux</li><li><strong>useMemo &amp; useCallback</strong>: Tối ưu performance, tránh re-render thừa</li><li><strong>Custom Hooks</strong>: Tách logic thành hooks tái sử dụng (useFetch, useLocalStorage, useDebounce)</li></ul><p>Kết thúc khóa học bạn sẽ tự tin áp dụng hooks trong mọi dự án React thực tế.</p>',
  'Rx', 'indigo', 499000, 799000, 'INTERMEDIATE',
  (SELECT id FROM categories WHERE slug = 'react'),
  'Khang Phạm',
  JSON_ARRAY(
    'Hiểu cơ chế hoạt động của từng React Hook',
    'Tránh các lỗi phổ biến với useEffect và dependency array',
    'Tối ưu performance với useMemo và useCallback đúng chỗ',
    'Xây dựng custom hooks tái sử dụng (useFetch, useDebounce, useLocalStorage)',
    'Quản lý global state với useContext + useReducer',
    'Viết code React sạch, dễ test và maintain'
  ),
  JSON_ARRAY(
    'Biết JavaScript ES6+ (arrow function, destructuring, spread/rest, modules)',
    'Đã học qua React cơ bản: JSX, props, component, state cơ bản',
    'Không cần biết Redux, TypeScript hay class components'
  ),
  480, 10, 4.8, 312, 5640, 'Hot', 'PUBLISHED'
);

-- Sections
INSERT IGNORE INTO course_sections (course_id, title, order_index) VALUES
  ((SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'), 'Phần 1: State & Side Effects',        1),
  ((SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'), 'Phần 2: Refs, Context & Reducer',    2),
  ((SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'), 'Phần 3: Performance & Custom Hooks', 3);

-- ── Lessons: Phần 1 ──────────────────────────────────────────

INSERT IGNORE INTO lessons
  (course_id, section_id, title, video_url, content, duration_minutes, order_index, is_preview)
VALUES
(
  (SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='react-hooks-thuc-chien' AND cs.title='Phần 1: State & Side Effects'),
  'Giới thiệu & Tổng quan React Hooks',
  'https://www.youtube.com/embed/cF2lQ_gZeA8',
  '<h2>Tại sao có React Hooks?</h2><p>Trước React 16.8, để có state bạn phải dùng class component. Hooks ra đời để giải quyết 3 vấn đề lớn:</p><ol><li><strong>Khó tái sử dụng stateful logic</strong> giữa các component (HOC và render props quá phức tạp)</li><li><strong>Component phức tạp</strong> khó hiểu — lifecycle methods trộn lẫn logic không liên quan</li><li><strong>Class confusing</strong> — <code>this</code> binding gây nhiều lỗi tinh vi</li></ol><h3>Quy tắc vàng của Hooks</h3><ul><li>Chỉ gọi hook ở <strong>top level</strong> — không trong loop, if/else, hay nested function</li><li>Chỉ gọi hook trong <strong>function component</strong> hoặc custom hook khác</li></ul><pre><code>// ✅ Đúng\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return &lt;button onClick={() =&gt; setCount(c =&gt; c+1)}&gt;{count}&lt;/button&gt;;\n}\n\n// ❌ Sai — hook trong điều kiện\nif (condition) {\n  const [x, setX] = useState(0); // React sẽ báo lỗi!\n}</code></pre>',
  12, 1, TRUE
),
(
  (SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='react-hooks-thuc-chien' AND cs.title='Phần 1: State & Side Effects'),
  'useState: từ cơ bản đến functional update & lazy init',
  'https://www.youtube.com/embed/O6P86uwfdR0',
  '<h2>useState sâu hơn bạn nghĩ</h2><h3>1. Functional update — tránh stale state</h3><pre><code>// ❌ Có thể bị stale nếu gọi nhiều lần liên tiếp\nsetCount(count + 1);\n\n// ✅ Luôn lấy giá trị mới nhất\nsetCount(prev =&gt; prev + 1);</code></pre><h3>2. Lazy initialization — cho giá trị ban đầu nặng</h3><pre><code>// ❌ heavyCompute() chạy mỗi lần re-render\nconst [s, setS] = useState(heavyCompute());\n\n// ✅ Chỉ chạy đúng 1 lần khi mount\nconst [s, setS] = useState(() =&gt; heavyCompute());</code></pre><h3>3. Object state — nhớ spread</h3><pre><code>const [user, setUser] = useState({ name: \'\', age: 0 });\n\n// ✅ Cập nhật 1 field, giữ nguyên phần còn lại\nsetUser(prev =&gt; ({ ...prev, name: \'Alice\' }));</code></pre><h3>4. Batching — React 18</h3><p>React 18 tự động batch nhiều setState trong cùng event handler và setTimeout — chỉ re-render 1 lần. Không cần làm gì thêm.</p>',
  20, 2, TRUE
),
(
  (SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='react-hooks-thuc-chien' AND cs.title='Phần 1: State & Side Effects'),
  'useEffect: dependency array, cleanup & data fetching',
  'https://www.youtube.com/embed/0ZJgIjIuY7U',
  '<h2>useEffect — 3 chế độ</h2><pre><code>// Chạy sau MỖI render\nuseEffect(() =&gt; { ... });\n\n// Chỉ chạy khi mount\nuseEffect(() =&gt; { ... }, []);\n\n// Chạy khi dependency thay đổi\nuseEffect(() =&gt; { ... }, [userId]);</code></pre><h3>Cleanup — tránh memory leak</h3><pre><code>useEffect(() =&gt; {\n  const timer = setInterval(() =&gt; tick(), 1000);\n  return () =&gt; clearInterval(timer); // chạy khi unmount hoặc trước lần effect kế\n}, []);</code></pre><h3>Fetch data pattern an toàn</h3><pre><code>useEffect(() =&gt; {\n  let cancelled = false;\n\n  async function load() {\n    const data = await api.getUser(userId);\n    if (!cancelled) setUser(data);\n  }\n  load();\n\n  return () =&gt; { cancelled = true; };\n}, [userId]);</code></pre><h3>Lỗi phổ biến</h3><ul><li>Thiếu dependency → stale closure (dùng ESLint rule <code>exhaustive-deps</code>)</li><li>Thêm object/array vào deps → vòng lặp vô tận (dùng useMemo hoặc tách ra ngoài)</li><li>Bỏ cleanup → memory leak khi component unmount</li></ul>',
  25, 3, FALSE
),
(
  (SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='react-hooks-thuc-chien' AND cs.title='Phần 1: State & Side Effects'),
  'Quiz: useState & useEffect',
  NULL, NULL, 0, 4, FALSE
);

-- ── Lessons: Phần 2 ──────────────────────────────────────────

INSERT IGNORE INTO lessons
  (course_id, section_id, title, video_url, content, duration_minutes, order_index, is_preview)
VALUES
(
  (SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='react-hooks-thuc-chien' AND cs.title='Phần 2: Refs, Context & Reducer'),
  'useRef: DOM access & lưu giá trị không re-render',
  'https://www.youtube.com/embed/t2ypzz6gJm0',
  '<h2>useRef có 2 công dụng chính</h2><h3>1. Truy cập DOM element</h3><pre><code>function AutoFocusInput() {\n  const inputRef = useRef(null);\n  useEffect(() =&gt; { inputRef.current.focus(); }, []);\n  return &lt;input ref={inputRef} /&gt;;\n}</code></pre><h3>2. Lưu giá trị qua renders (không gây re-render)</h3><pre><code>function Stopwatch() {\n  const [time, setTime] = useState(0);\n  const intervalRef = useRef(null);\n\n  const start = () =&gt; {\n    intervalRef.current = setInterval(() =&gt; setTime(t =&gt; t+1), 100);\n  };\n  const stop = () =&gt; clearInterval(intervalRef.current);\n\n  return (&lt;div&gt;{time/10}s &lt;button onClick={start}&gt;Start&lt;/button&gt; &lt;button onClick={stop}&gt;Stop&lt;/button&gt;&lt;/div&gt;);\n}</code></pre><p><strong>Khác với state:</strong> Thay đổi <code>ref.current</code> không trigger re-render. Dùng ref khi bạn cần nhớ giá trị nhưng không muốn React vẽ lại UI.</p><h3>forwardRef — expose ref lên parent</h3><pre><code>const Input = forwardRef((props, ref) =&gt; &lt;input ref={ref} {...props} /&gt;);\n\n// Parent\nconst ref = useRef();\n&lt;Input ref={ref} /&gt;\nref.current.focus();</code></pre>',
  18, 5, FALSE
),
(
  (SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='react-hooks-thuc-chien' AND cs.title='Phần 2: Refs, Context & Reducer'),
  'useContext: Global state không cần Redux',
  'https://www.youtube.com/embed/5LrDIWkK_Bc',
  '<h2>useContext — chia sẻ state xuyên component tree</h2><h3>Tạo và dùng Context</h3><pre><code>// 1. Tạo context với default value\nconst ThemeCtx = createContext(\'light\');\n\n// 2. Provider wrap app\nfunction App() {\n  const [theme, setTheme] = useState(\'light\');\n  return (\n    &lt;ThemeCtx.Provider value={{ theme, setTheme }}&gt;\n      &lt;Layout /&gt;\n    &lt;/ThemeCtx.Provider&gt;\n  );\n}\n\n// 3. Consume ở bất kỳ đâu — không cần prop drilling\nfunction ToggleBtn() {\n  const { theme, setTheme } = useContext(ThemeCtx);\n  return (\n    &lt;button onClick={() =&gt; setTheme(t =&gt; t===\'dark\'?\'light\':\'dark\')} &gt;\n      {theme === \'dark\' ? \'🌙\' : \'☀️\'}\n    &lt;/button&gt;\n  );\n}</code></pre><h3>Best practice: custom hook bọc context</h3><pre><code>function useTheme() {\n  const ctx = useContext(ThemeCtx);\n  if (!ctx) throw new Error(\'useTheme must be inside ThemeProvider\');\n  return ctx;\n}</code></pre><h3>Khi nào dùng Context vs Zustand?</h3><ul><li><strong>Context</strong>: Theme, locale, auth — ít thay đổi, component tree không quá lớn</li><li><strong>Zustand/Jotai</strong>: State thay đổi thường xuyên, nhiều component subscribe — tránh cascade re-render</li></ul>',
  22, 6, FALSE
),
(
  (SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='react-hooks-thuc-chien' AND cs.title='Phần 2: Refs, Context & Reducer'),
  'useReducer: State phức tạp & pattern kết hợp Context',
  'https://www.youtube.com/embed/kK_Wqx3RnHk',
  '<h2>useReducer — quản lý state phức tạp</h2><p>Khi state có nhiều field liên quan hoặc update logic phức tạp, useReducer rõ ràng hơn nhiều useState.</p><pre><code>const initialState = { items: [], loading: false, error: null };\n\nfunction cartReducer(state, action) {\n  switch (action.type) {\n    case \'ADD_ITEM\':\n      return { ...state, items: [...state.items, action.payload] };\n    case \'REMOVE_ITEM\':\n      return { ...state, items: state.items.filter(i =&gt; i.id !== action.payload) };\n    case \'SET_LOADING\':\n      return { ...state, loading: action.payload };\n    case \'SET_ERROR\':\n      return { ...state, error: action.payload, loading: false };\n    case \'CLEAR\':\n      return initialState;\n    default:\n      throw new Error(`Unknown action: ${action.type}`);\n  }\n}\n\nfunction Cart() {\n  const [state, dispatch] = useReducer(cartReducer, initialState);\n  // dispatch({ type: \'ADD_ITEM\', payload: { id: 1, name: \'JS Course\' } })\n}</code></pre><h3>Pattern: useReducer + Context = mini Redux</h3><pre><code>const CartCtx = createContext(null);\n\nexport function CartProvider({ children }) {\n  const [state, dispatch] = useReducer(cartReducer, initialState);\n  return &lt;CartCtx.Provider value={{ state, dispatch }}&gt;{children}&lt;/CartCtx.Provider&gt;;\n}\n\nexport const useCart = () =&gt; useContext(CartCtx);</code></pre>',
  20, 7, FALSE
);

-- ── Lessons: Phần 3 ──────────────────────────────────────────

INSERT IGNORE INTO lessons
  (course_id, section_id, title, video_url, content, duration_minutes, order_index, is_preview)
VALUES
(
  (SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='react-hooks-thuc-chien' AND cs.title='Phần 3: Performance & Custom Hooks'),
  'useMemo & useCallback: Tối ưu render đúng chỗ',
  'https://www.youtube.com/embed/_AyFP5s69N4',
  '<h2>useMemo — cache kết quả tính toán</h2><pre><code>// ❌ Tính toán lại mỗi render dù items không đổi\nconst sorted = items.sort((a,b) =&gt; b.price - a.price);\n\n// ✅ Chỉ sort lại khi items thay đổi\nconst sorted = useMemo(\n  () =&gt; [...items].sort((a,b) =&gt; b.price - a.price),\n  [items]\n);</code></pre><h2>useCallback — cache reference của function</h2><pre><code>// ❌ handleClick là function mới mỗi render → child luôn re-render dù React.memo\nconst handleClick = () =&gt; onSelect(item.id);\n\n// ✅ Giữ nguyên reference khi deps không đổi\nconst handleClick = useCallback(\n  () =&gt; onSelect(item.id),\n  [item.id, onSelect] // onSelect cũng nên wrapped bằng useCallback ở parent\n);</code></pre><h3>Khi nào KHÔNG nên dùng</h3><p>useMemo/useCallback có overhead của chính nó (thêm memory, thêm so sánh deps). Chỉ dùng khi:</p><ul><li>Tính toán thực sự nặng (sort/filter mảng &gt; 1000 phần tử)</li><li>Truyền function vào component dùng <code>React.memo</code></li><li>Function/object là dependency của useEffect</li></ul><blockquote><strong>Tip:</strong> Profile trước bằng React DevTools → Profiler, rồi mới tối ưu. Đừng premature optimize.</blockquote>',
  28, 8, FALSE
),
(
  (SELECT id FROM courses WHERE slug='react-hooks-thuc-chien'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='react-hooks-thuc-chien' AND cs.title='Phần 3: Performance & Custom Hooks'),
  'Custom Hooks: useFetch, useDebounce, useLocalStorage',
  'https://www.youtube.com/embed/6ThXsUwLWvc',
  '<h2>Custom Hooks — superpower của React</h2><p>Custom hook là function bắt đầu bằng <code>use</code>, gọi các hooks khác bên trong. Cho phép tách logic khỏi UI.</p><h3>useLocalStorage</h3><pre><code>function useLocalStorage(key, initial) {\n  const [value, setValue] = useState(() =&gt; {\n    try { return JSON.parse(localStorage.getItem(key)) ?? initial; }\n    catch { return initial; }\n  });\n\n  const set = useCallback(val =&gt; {\n    setValue(val);\n    localStorage.setItem(key, JSON.stringify(val));\n  }, [key]);\n\n  return [value, set];\n}\n\nconst [theme, setTheme] = useLocalStorage(\'theme\', \'light\');</code></pre><h3>useDebounce</h3><pre><code>function useDebounce(value, delay = 300) {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() =&gt; {\n    const t = setTimeout(() =&gt; setDebounced(value), delay);\n    return () =&gt; clearTimeout(t);\n  }, [value, delay]);\n  return debounced;\n}\n\nconst query = useDebounce(searchText, 400);\nuseEffect(() =&gt; { fetchResults(query); }, [query]);</code></pre><h3>useFetch</h3><pre><code>function useFetch(url) {\n  const [state, setState] = useState({ data: null, loading: true, error: null });\n\n  useEffect(() =&gt; {\n    if (!url) return;\n    let alive = true;\n    setState({ data: null, loading: true, error: null });\n\n    fetch(url)\n      .then(r =&gt; r.json())\n      .then(data =&gt; alive && setState({ data, loading: false, error: null }))\n      .catch(error =&gt; alive && setState({ data: null, loading: false, error }));\n\n    return () =&gt; { alive = false; };\n  }, [url]);\n\n  return state;\n}\n\nconst { data, loading, error } = useFetch(`/api/courses/${id}`);</code></pre>',
  35, 9, FALSE
);

-- ── Quiz 1: useState & useEffect ─────────────────────────────

INSERT IGNORE INTO quizzes (lesson_id, title, pass_score)
SELECT l.id, 'Kiểm tra useState & useEffect', 70
FROM lessons l JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect';

-- Q1
INSERT INTO quiz_questions (quiz_id, question, type, position)
SELECT q.id,
  'Đoạn code sau có vấn đề gì?\n\nfunction App() {\n  if (show) {\n    const [x, setX] = useState(0);\n  }\n}',
  'single', 1
FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect';

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Vi phạm Rules of Hooks — hook không được gọi trong điều kiện', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 1;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'useState không được dùng trong function component', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 1;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Không có vấn đề gì, code này hoàn toàn hợp lệ', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 1;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Thiếu import React', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 1;

-- Q2
INSERT INTO quiz_questions (quiz_id, question, type, position)
SELECT q.id,
  'Cách nào sau đây là ĐÚNG để tránh stale state khi gọi setState nhiều lần liên tiếp?',
  'single', 2
FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect';

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'setCount(count + 1)', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 2;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'setCount(prev => prev + 1)', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 2;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'count = count + 1', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 2;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Cả 3 cách đều cho kết quả như nhau', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 2;

-- Q3
INSERT INTO quiz_questions (quiz_id, question, type, position)
SELECT q.id,
  'useEffect cleanup function chạy vào lúc nào? (chọn tất cả đúng)',
  'multiple', 3
FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect';

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Khi component unmount', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 3;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Trước khi effect chạy lại (khi dependency thay đổi)', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 3;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Ngay sau khi effect chạy xong', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 3;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Khi parent component re-render', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 3;

-- Q4
INSERT INTO quiz_questions (quiz_id, question, type, position)
SELECT q.id,
  'Lazy initialization trong useState (truyền function thay vì giá trị) có lợi ích gì?',
  'single', 4
FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect';

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Giúp code đẹp hơn, không có lợi ích về performance', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 4;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Hàm khởi tạo chỉ chạy 1 lần khi mount, tránh tính toán nặng mỗi lần re-render', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 4;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Cho phép setState bất đồng bộ', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 4;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Bắt buộc phải dùng nếu initial value là số', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 4;

-- Q5
INSERT INTO quiz_questions (quiz_id, question, type, position)
SELECT q.id,
  'useEffect(() => { ... }, []) — array rỗng có nghĩa là gì?',
  'single', 5
FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect';

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Effect chạy sau mỗi lần render', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 5;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Effect không bao giờ chạy', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 5;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Effect chỉ chạy 1 lần sau khi component mount', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 5;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Effect chạy khi component unmount', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'react-hooks-thuc-chien' AND l.title = 'Quiz: useState & useEffect' AND q.position = 5;


-- ============================================================
-- KHÓA HỌC 2: Testing với Jest & Vitest
-- ============================================================

INSERT IGNORE INTO courses
  (title, slug, short_description, description,
   glyph, thumb, price, original_price, level, category_id, instructor_name,
   what_you_learn, requirements,
   total_duration_minutes, total_lessons, rating, review_count, student_count, tag, status)
VALUES (
  'Testing với Jest & Vitest',
  'testing-jest-vitest',
  'Viết unit test, integration test và test React component từ số 0 — Jest, Vitest, React Testing Library.',
  '<p>Một trong những kỹ năng bị bỏ quên nhất của dev Việt Nam. Khóa học này dạy bạn testing từ tư duy đến thực hành, áp dụng vào cả Vanilla JS lẫn React.</p><h3>Bạn sẽ học</h3><ul><li><strong>Jest cơ bản</strong>: test runner, matchers, mock, spy</li><li><strong>Vitest</strong>: lựa chọn nhanh hơn cho Vite project</li><li><strong>React Testing Library</strong>: test component theo behavior, không phải implementation</li><li><strong>Async testing</strong>: test Promises, fetch, setTimeout</li><li><strong>Coverage & CI</strong>: đo coverage và chạy test trên GitHub Actions</li></ul><p>Sau khóa học bạn sẽ có thói quen viết test tự nhiên như viết code.</p>',
  '✓', 'violet', 549000, 849000, 'INTERMEDIATE',
  (SELECT id FROM categories WHERE slug = 'testing'),
  'Phương Nguyễn',
  JSON_ARRAY(
    'Viết unit test và integration test tự tin',
    'Mock modules, API calls, timers trong test',
    'Test React component với React Testing Library',
    'Đo và cải thiện code coverage',
    'Tích hợp test vào CI/CD pipeline',
    'Hiểu triết lý "test behavior, not implementation"'
  ),
  JSON_ARRAY(
    'Biết JavaScript ES6+ cơ bản',
    'Đã viết React cơ bản (có hoặc không có hooks đều được)',
    'Không cần biết testing hay TDD từ trước'
  ),
  420, 10, 4.9, 198, 3820, 'New', 'PUBLISHED'
);

-- Sections
INSERT IGNORE INTO course_sections (course_id, title, order_index) VALUES
  ((SELECT id FROM courses WHERE slug='testing-jest-vitest'), 'Phần 1: Jest & Unit Testing',          1),
  ((SELECT id FROM courses WHERE slug='testing-jest-vitest'), 'Phần 2: Mocking & Async',              2),
  ((SELECT id FROM courses WHERE slug='testing-jest-vitest'), 'Phần 3: React Testing Library & CI',  3);

-- ── Lessons: Phần 1 ──────────────────────────────────────────

INSERT IGNORE INTO lessons
  (course_id, section_id, title, video_url, content, duration_minutes, order_index, is_preview)
VALUES
(
  (SELECT id FROM courses WHERE slug='testing-jest-vitest'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='testing-jest-vitest' AND cs.title='Phần 1: Jest & Unit Testing'),
  'Tại sao phải test? Tư duy testing',
  'https://www.youtube.com/embed/7r4xVDI2vho',
  '<h2>Testing không phải optional</h2><p>Dev hay nói: "Tôi không có thời gian để test." Thực ra: "Tôi không có thời gian để <em>không</em> test." Một bug lọt ra production tốn gấp 10 lần chi phí fix sớm.</p><h3>3 loại test chính</h3><ul><li><strong>Unit test</strong>: test 1 function/module cô lập. Nhanh, nhiều</li><li><strong>Integration test</strong>: test nhiều module phối hợp. Trung bình</li><li><strong>E2E test</strong>: test từ browser như người dùng thật (Playwright, Cypress). Chậm, ít</li></ul><h3>Testing pyramid</h3><pre><code>          /E2E\\          ← ít, chậm, đắt\n        /------\\\n       /  Integ  \\       ← trung bình\n      /------------\\\n     /   Unit Tests  \\   ← nhiều, nhanh, rẻ\n    /------------------\\</code></pre><h3>Test gì?</h3><ul><li>Business logic thuần (pure functions)</li><li>Edge cases và error paths</li><li>Behavior của component (không phải DOM structure)</li><li>Không cần test: getters/setters đơn giản, third-party library</li></ul>',
  15, 1, TRUE
),
(
  (SELECT id FROM courses WHERE slug='testing-jest-vitest'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='testing-jest-vitest' AND cs.title='Phần 1: Jest & Unit Testing'),
  'Setup Jest & Vitest, viết test đầu tiên',
  'https://www.youtube.com/embed/FgnxcUQ5vho',
  '<h2>Cài đặt</h2><h3>Vitest (cho Vite project — khuyến nghị)</h3><pre><code>npm install -D vitest\n# vite.config.js\nexport default defineConfig({\n  test: { environment: \'jsdom\', globals: true }\n});\n# package.json\n"scripts": { "test": "vitest", "coverage": "vitest run --coverage" }</code></pre><h3>Jest (cho non-Vite)</h3><pre><code>npm install -D jest @babel/core babel-jest @babel/preset-env\n# jest.config.js\nmodule.exports = { testEnvironment: \'node\' };</code></pre><h3>Viết test đầu tiên</h3><pre><code>// math.js\nexport function add(a, b) { return a + b; }\nexport function divide(a, b) {\n  if (b === 0) throw new Error(\'Division by zero\');\n  return a / b;\n}\n\n// math.test.js\nimport { add, divide } from \'./math\';\n\ndescribe(\'math utils\', () =&gt; {\n  test(\'add returns sum\', () =&gt; {\n    expect(add(2, 3)).toBe(5);\n    expect(add(-1, 1)).toBe(0);\n  });\n\n  test(\'divide throws on zero\', () =&gt; {\n    expect(() =&gt; divide(5, 0)).toThrow(\'Division by zero\');\n  });\n\n  test(\'divide returns correct result\', () =&gt; {\n    expect(divide(10, 2)).toBe(5);\n  });\n});</code></pre>',
  22, 2, TRUE
),
(
  (SELECT id FROM courses WHERE slug='testing-jest-vitest'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='testing-jest-vitest' AND cs.title='Phần 1: Jest & Unit Testing'),
  'Matchers: toBe, toEqual, toContain, toThrow và hơn thế',
  'https://www.youtube.com/embed/IADavEdth-8',
  '<h2>Các matchers quan trọng nhất</h2><pre><code>// Equality\nexpect(1 + 1).toBe(2);                   // strict equal (===)\nexpect({ a: 1 }).toEqual({ a: 1 });      // deep equal (dùng cho object/array)\nexpect({ a: 1 }).not.toBe({ a: 1 });     // not — reference khác nhau\n\n// Truthiness\nexpect(null).toBeNull();\nexpect(undefined).toBeUndefined();\nexpect(0).toBeFalsy();\nexpect(\'hello\').toBeTruthy();\n\n// Numbers\nexpect(3.14159).toBeCloseTo(3.14, 2);   // floating point\nexpect(5).toBeGreaterThan(3);\nexpect(2).toBeLessThanOrEqual(2);\n\n// Strings & Arrays\nexpect(\'hello world\').toContain(\'world\');\nexpect(\'hello\').toMatch(/^hel/);\nexpect([1,2,3]).toContain(2);\nexpect([1,2,3]).toHaveLength(3);\n\n// Objects\nexpect({ a:1, b:2 }).toHaveProperty(\'a\', 1);\nexpect({ a:1, b:2 }).toMatchObject({ a:1 }); // subset match\n\n// Error\nexpect(() =&gt; JSON.parse(\'bad\')).toThrow(SyntaxError);</code></pre>',
  18, 3, FALSE
),
(
  (SELECT id FROM courses WHERE slug='testing-jest-vitest'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='testing-jest-vitest' AND cs.title='Phần 1: Jest & Unit Testing'),
  'Quiz: Jest Cơ Bản',
  NULL, NULL, 0, 4, FALSE
);

-- ── Lessons: Phần 2 ──────────────────────────────────────────

INSERT IGNORE INTO lessons
  (course_id, section_id, title, video_url, content, duration_minutes, order_index, is_preview)
VALUES
(
  (SELECT id FROM courses WHERE slug='testing-jest-vitest'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='testing-jest-vitest' AND cs.title='Phần 2: Mocking & Async'),
  'Mock & Spy: Cô lập dependency trong test',
  'https://www.youtube.com/embed/3PjdxjWK0T0',
  '<h2>Mock — thay thế module thật bằng version giả</h2><h3>Mock function</h3><pre><code>const mockFn = vi.fn(); // hoặc jest.fn()\nmockFn(42);\nexpect(mockFn).toHaveBeenCalledWith(42);\nexpect(mockFn).toHaveBeenCalledTimes(1);\n\n// Mock return value\nmockFn.mockReturnValue(\'hello\');\nmockFn.mockResolvedValue({ data: [] }); // async</code></pre><h3>Mock module</h3><pre><code>// emailService.js — sẽ không gửi mail thật trong test\nvi.mock(\'./emailService\', () =&gt; ({\n  sendEmail: vi.fn().mockResolvedValue({ success: true })\n}));\n\n// Trong test\nimport { sendEmail } from \'./emailService\';\nexpect(sendEmail).toHaveBeenCalledWith({ to: \'a@b.com\', subject: \'...\' });</code></pre><h3>Spy — bọc function thật, không thay</h3><pre><code>const spy = vi.spyOn(console, \'error\').mockImplementation(() =&gt; {});\nmyFunction(); // gọi code có console.error bên trong\nexpect(spy).toHaveBeenCalled();\nspy.mockRestore(); // khôi phục console.error thật</code></pre><h3>beforeEach & afterEach</h3><pre><code>beforeEach(() =&gt; { vi.clearAllMocks(); });\nafterAll(() =&gt; { vi.restoreAllMocks(); });</code></pre>',
  24, 5, FALSE
),
(
  (SELECT id FROM courses WHERE slug='testing-jest-vitest'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='testing-jest-vitest' AND cs.title='Phần 2: Mocking & Async'),
  'Async Testing: Promise, fetch, setTimeout',
  'https://www.youtube.com/embed/LBU4M_DqLAQ',
  '<h2>Test async code</h2><h3>async/await trong test</h3><pre><code>test(\'fetches user\', async () =&gt; {\n  const user = await getUser(1);\n  expect(user.name).toBe(\'Alice\');\n});</code></pre><h3>Mock fetch</h3><pre><code>vi.stubGlobal(\'fetch\', vi.fn().mockResolvedValue({\n  ok: true,\n  json: () =&gt; Promise.resolve({ id: 1, name: \'Alice\' })\n}));\n\ntest(\'getUser calls fetch\', async () =&gt; {\n  const user = await getUser(1);\n  expect(fetch).toHaveBeenCalledWith(\'/api/users/1\');\n  expect(user.name).toBe(\'Alice\');\n});</code></pre><h3>Fake timers — test setTimeout mà không chờ thật</h3><pre><code>beforeEach(() =&gt; { vi.useFakeTimers(); });\nafterEach(() =&gt; { vi.useRealTimers(); });\n\ntest(\'debounce delays execution\', () =&gt; {\n  const fn = vi.fn();\n  const debounced = debounce(fn, 300);\n\n  debounced();\n  expect(fn).not.toHaveBeenCalled();\n\n  vi.advanceTimersByTime(300);\n  expect(fn).toHaveBeenCalledTimes(1);\n});</code></pre><h3>waitFor — chờ async side effect</h3><pre><code>// Với React Testing Library\nawait waitFor(() =&gt; {\n  expect(screen.getByText(\'Loaded\')).toBeInTheDocument();\n});</code></pre>',
  26, 6, FALSE
),
(
  (SELECT id FROM courses WHERE slug='testing-jest-vitest'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='testing-jest-vitest' AND cs.title='Phần 2: Mocking & Async'),
  'Test coverage: đo và cải thiện',
  'https://www.youtube.com/embed/ajiAl5UNzBU',
  '<h2>Coverage — đo mức độ code được test</h2><h3>Chạy coverage</h3><pre><code># Vitest\nnpx vitest run --coverage\n\n# Jest\nnpx jest --coverage</code></pre><h3>4 loại coverage</h3><table><tr><th>Loại</th><th>Ý nghĩa</th></tr><tr><td>Statements</td><td>% dòng code được chạy qua</td></tr><tr><td>Branches</td><td>% nhánh if/else được cover</td></tr><tr><td>Functions</td><td>% function được gọi</td></tr><tr><td>Lines</td><td>% dòng (gần giống statements)</td></tr></table><h3>Đặt ngưỡng coverage</h3><pre><code>// vite.config.js\ntest: {\n  coverage: {\n    provider: \'v8\',\n    thresholds: {\n      statements: 80,\n      branches: 75,\n      functions: 80,\n      lines: 80\n    }\n  }\n}</code></pre><h3>100% coverage ≠ không có bug</h3><p>Coverage chỉ cho biết code <em>được thực thi</em>, không đảm bảo test kiểm tra đúng behavior. Nhắm 80% là thực tế, tập trung vào business logic quan trọng.</p>',
  20, 7, FALSE
);

-- ── Lessons: Phần 3 ──────────────────────────────────────────

INSERT IGNORE INTO lessons
  (course_id, section_id, title, video_url, content, duration_minutes, order_index, is_preview)
VALUES
(
  (SELECT id FROM courses WHERE slug='testing-jest-vitest'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='testing-jest-vitest' AND cs.title='Phần 3: React Testing Library & CI'),
  'React Testing Library: Test component đúng cách',
  'https://www.youtube.com/embed/ZmVBCpefQe8',
  '<h2>React Testing Library — philosophy</h2><blockquote>"The more your tests resemble the way your software is used, the more confidence they can give you." — Kent C. Dodds</blockquote><h3>Cài đặt</h3><pre><code>npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event</code></pre><h3>Render và query</h3><pre><code>import { render, screen } from \'@testing-library/react\';\nimport userEvent from \'@testing-library/user-event\';\n\ntest(\'counter increments on click\', async () =&gt; {\n  const user = userEvent.setup();\n  render(&lt;Counter /&gt;);\n\n  // Query by role — như user thực sự nhìn\n  expect(screen.getByRole(\'heading\', { name: /count: 0/i })).toBeInTheDocument();\n\n  await user.click(screen.getByRole(\'button\', { name: /increment/i }));\n\n  expect(screen.getByRole(\'heading\', { name: /count: 1/i })).toBeInTheDocument();\n});</code></pre><h3>Query priority (dùng theo thứ tự này)</h3><ol><li><code>getByRole</code> — accessible role (button, heading, textbox...)</li><li><code>getByLabelText</code> — form label</li><li><code>getByPlaceholderText</code></li><li><code>getByText</code></li><li><code>getByTestId</code> — last resort, dùng data-testid</li></ol><h3>Test form submit</h3><pre><code>test(\'form calls onSubmit with values\', async () =&gt; {\n  const onSubmit = vi.fn();\n  const user = userEvent.setup();\n  render(&lt;LoginForm onSubmit={onSubmit} /&gt;);\n\n  await user.type(screen.getByLabelText(/email/i), \'test@example.com\');\n  await user.type(screen.getByLabelText(/password/i), \'secret123\');\n  await user.click(screen.getByRole(\'button\', { name: /login/i }));\n\n  expect(onSubmit).toHaveBeenCalledWith({ email: \'test@example.com\', password: \'secret123\' });\n});</code></pre>',
  30, 8, FALSE
),
(
  (SELECT id FROM courses WHERE slug='testing-jest-vitest'),
  (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id
   WHERE c.slug='testing-jest-vitest' AND cs.title='Phần 3: React Testing Library & CI'),
  'Test async component & CI với GitHub Actions',
  'https://www.youtube.com/embed/r9HCFScGRs0',
  '<h2>Test component có async data fetch</h2><pre><code>// UserProfile.jsx — fetch data trong useEffect\nfunction UserProfile({ userId }) {\n  const [user, setUser] = useState(null);\n  useEffect(() =&gt; { fetchUser(userId).then(setUser); }, [userId]);\n  if (!user) return &lt;p&gt;Loading...&lt;/p&gt;;\n  return &lt;h1&gt;{user.name}&lt;/h1&gt;;\n}\n\n// UserProfile.test.jsx\nvi.mock(\'./api\', () =&gt; ({\n  fetchUser: vi.fn().mockResolvedValue({ name: \'Alice\' })\n}));\n\ntest(\'shows user name after load\', async () =&gt; {\n  render(&lt;UserProfile userId={1} /&gt;);\n  expect(screen.getByText(/loading/i)).toBeInTheDocument();\n\n  await screen.findByRole(\'heading\', { name: \'Alice\' }); // waitFor built-in\n  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();\n});</code></pre><h2>CI với GitHub Actions</h2><pre><code># .github/workflows/test.yml\nname: Tests\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: \'20\' }\n      - run: npm ci\n      - run: npm test -- --coverage\n      - name: Upload coverage\n        uses: codecov/codecov-action@v4</code></pre><h3>Best practices tổng kết</h3><ul><li>Mỗi test chỉ assert 1 behavior</li><li>Test tên = "it should..." đọc như tài liệu</li><li>Dùng <code>beforeEach</code> setup, <code>afterEach</code> cleanup</li><li>Không test implementation detail (state, method name nội bộ)</li><li>Fake dữ liệu với <code>factory function</code>, không hardcode</li></ul>',
  28, 9, FALSE
);

-- ── Quiz 2: Jest Cơ Bản ──────────────────────────────────────

INSERT IGNORE INTO quizzes (lesson_id, title, pass_score)
SELECT l.id, 'Kiểm tra Jest Cơ Bản', 70
FROM lessons l JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản';

-- Q1
INSERT INTO quiz_questions (quiz_id, question, type, position)
SELECT q.id,
  'Matcher nào dùng để so sánh 2 object có cùng giá trị (deep equal)?',
  'single', 1
FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản';

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'toBe', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 1;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'toEqual', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 1;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'toMatch', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 1;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'toStrictEqual chỉ, không thể dùng toEqual', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 1;

-- Q2
INSERT INTO quiz_questions (quiz_id, question, type, position)
SELECT q.id,
  'Cách đúng để test một function throw error trong Jest/Vitest là gì?',
  'single', 2
FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản';

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'expect(myFn()).toThrow()', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 2;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'expect(() => myFn()).toThrow()', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 2;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'try { myFn() } catch(e) { expect(e).toBeDefined() }', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 2;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'expect(myFn).toThrow() — không cần gọi fn', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 2;

-- Q3
INSERT INTO quiz_questions (quiz_id, question, type, position)
SELECT q.id,
  'Lợi ích nào SAU ĐÂY KHÔNG phải lý do dùng fake timers (vi.useFakeTimers)?',
  'single', 3
FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản';

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Test chạy nhanh hơn, không phải chờ timeout thật', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 3;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Kiểm soát hoàn toàn thời gian trong test (advance timers)', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 3;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Tự động mock fetch và network request', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 3;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Test debounce và throttle mà không cần setTimeout thật', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 3;

-- Q4
INSERT INTO quiz_questions (quiz_id, question, type, position)
SELECT q.id,
  'Trong React Testing Library, query nào nên được ưu tiên dùng nhất?',
  'single', 4
FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản';

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'getByTestId — vì luôn unique', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 4;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'getByClassName — vì nhanh và dễ', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 4;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'getByRole — gần nhất với cách user tương tác, tốt cho accessibility', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 4;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'querySelector — vì linh hoạt nhất', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 4;

-- Q5
INSERT INTO quiz_questions (quiz_id, question, type, position)
SELECT q.id,
  'Phát biểu nào SAU ĐÂY đúng về code coverage?',
  'multiple', 5
FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản';

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, '100% coverage không đảm bảo code không có bug', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 5;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Branch coverage quan trọng hơn line coverage vì nó đo các nhánh if/else', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 5;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Mục tiêu hợp lý cho hầu hết dự án là 80% coverage trên business logic', TRUE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 5;

INSERT INTO quiz_options (question_id, option_text, is_correct)
SELECT q.id, 'Coverage cao chứng tỏ test viết đúng behavior', FALSE
FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id
JOIN lessons l ON qz.lesson_id = l.id JOIN courses c ON l.course_id = c.id
WHERE c.slug = 'testing-jest-vitest' AND l.title = 'Quiz: Jest Cơ Bản' AND q.position = 5;
