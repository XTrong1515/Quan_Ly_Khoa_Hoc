
CREATE TABLE IF NOT EXISTS users (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  avatar_url    VARCHAR(500),
  phone         VARCHAR(20),
  username      VARCHAR(50) NULL,
  bio           TEXT NULL,
  role          ENUM('USER', 'ADMIN') DEFAULT 'USER',
  status        ENUM('ACTIVE', 'LOCKED') DEFAULT 'ACTIVE',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  user_id    INT NOT NULL,
  token      VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  user_id    INT NOT NULL,
  token      VARCHAR(512) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token)
);

-- ============ COURSES ============
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon        VARCHAR(50),
  color       VARCHAR(50),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  category_id            INT NOT NULL,
  title                  VARCHAR(255) NOT NULL,
  slug                   VARCHAR(255) UNIQUE NOT NULL,
  short_description      VARCHAR(500),
  description            TEXT,
  thumbnail_url          VARCHAR(500),
  glyph                  VARCHAR(10),
  thumb                  VARCHAR(50),
  price                  DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_price         DECIMAL(12,2),
  level                  ENUM('BEGINNER','INTERMEDIATE','ADVANCED') DEFAULT 'BEGINNER',
  instructor_name        VARCHAR(100),
  what_you_learn         JSON,
  requirements           JSON,
  total_lessons          INT DEFAULT 0,
  total_duration_minutes INT DEFAULT 0,
  rating                 DECIMAL(3,2) DEFAULT 0,
  review_count           INT DEFAULT 0,
  student_count          INT DEFAULT 0,
  tag                    VARCHAR(50) NULL,
  status                 ENUM('DRAFT','PUBLISHED','ARCHIVED') DEFAULT 'DRAFT',
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_slug (slug),
  INDEX idx_status (status),
  FULLTEXT INDEX ft_search (title, short_description)
);

CREATE TABLE IF NOT EXISTS course_sections (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  course_id   INT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  order_index INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY uk_section (course_id, order_index),
  INDEX idx_course (course_id, order_index)
);

CREATE TABLE IF NOT EXISTS lessons (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  course_id        INT NOT NULL,
  section_id       INT,
  title            VARCHAR(255) NOT NULL,
  video_url        VARCHAR(500),
  content          TEXT,
  duration_minutes INT DEFAULT 0,
  order_index      INT NOT NULL,
  is_preview       BOOLEAN DEFAULT FALSE,
  attachment_url   VARCHAR(500),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id)  REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE SET NULL,
  UNIQUE KEY uk_lesson (course_id, order_index),
  INDEX idx_course (course_id, order_index)
);

-- ============ ENROLLMENTS & PROGRESS ============
CREATE TABLE IF NOT EXISTS enrollments (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  user_id          INT NOT NULL,
  course_id        INT NOT NULL,
  order_id         INT,
  enrolled_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress_percent DECIMAL(5,2) DEFAULT 0,
  completed_at     TIMESTAMP NULL,
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  UNIQUE KEY uk_user_course (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id                   INT PRIMARY KEY AUTO_INCREMENT,
  enrollment_id        INT NOT NULL,
  lesson_id            INT NOT NULL,
  is_completed         BOOLEAN DEFAULT FALSE,
  last_watched_seconds INT DEFAULT 0,
  completed_at         TIMESTAMP NULL,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id)     REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE KEY uk_enroll_lesson (enrollment_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS lesson_notes (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  user_id           INT NOT NULL,
  lesson_id         INT NOT NULL,
  content           TEXT NOT NULL,
  timestamp_seconds INT DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  INDEX idx_user_lesson (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS lesson_discussions (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  lesson_id  INT NOT NULL,
  user_id    INT NOT NULL,
  parent_id  INT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES lesson_discussions(id) ON DELETE CASCADE,
  INDEX idx_lesson (lesson_id),
  INDEX idx_parent (parent_id)
);

-- ============ ORDERS ============
CREATE TABLE IF NOT EXISTS orders (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  user_id        INT NOT NULL,
  order_code     VARCHAR(50) UNIQUE NOT NULL,
  total_amount   DECIMAL(12,2) NOT NULL,
  status         ENUM('PENDING','PAID','FAILED','CANCELLED') DEFAULT 'PENDING',
  payment_method VARCHAR(50) DEFAULT 'VNPAY',
  transaction_id VARCHAR(100),
  paid_at        TIMESTAMP NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_status (user_id, status),
  INDEX idx_order_code (order_code)
);

CREATE TABLE IF NOT EXISTS order_items (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  order_id     INT NOT NULL,
  course_id    INT NOT NULL,
  course_title VARCHAR(255) NOT NULL,
  price        DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- ============ REVIEWS ============
CREATE TABLE IF NOT EXISTS reviews (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  user_id    INT NOT NULL,
  course_id  INT NOT NULL,
  rating     TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  status     ENUM('VISIBLE','HIDDEN') DEFAULT 'VISIBLE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_course_review (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS site_reviews (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  user_id    INT NOT NULL,
  rating     TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  status     ENUM('VISIBLE','HIDDEN') DEFAULT 'VISIBLE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Seed data
-- ============================================================

INSERT IGNORE INTO categories (name, slug, icon, color) VALUES
  ('JavaScript Core', 'js-core',  '{}', '#F7DF1E'),
  ('Asynchronous',    'async',    '⟳',  '#34D399'),
  ('React',           'react',    'Rx', '#818CF8'),
  ('TypeScript',      'ts',       'TS', '#38BDF8'),
  ('Node.js',         'node',     'Nx', '#F43F5E'),
  ('Testing',         'testing',  '✓',  '#A78BFA');

INSERT IGNORE INTO courses
  (title, slug, short_description, description,
   glyph, thumb, price, original_price, level, category_id, instructor_name,
   total_duration_minutes, total_lessons, rating, review_count, student_count, tag, status)
VALUES
  (
    'JavaScript: The Hard Parts', 'javascript-the-hard-parts',
    'Mổ xẻ execution context, closures, prototype chain, event loop.',
    '<p>Khóa học đi sâu vào bản chất của JavaScript: cách V8 thực thi code, closure, prototype chain, class, async/await mechanics, event loop.</p><h3>Bạn sẽ học được gì</h3><ul><li>Execution context và call stack</li><li>Closure và lexical scope</li><li>Prototype chain và class</li><li>Event loop và async model</li></ul>',
    'JS', 'yellow', 599000, 899000, 'ADVANCED',
    (SELECT id FROM categories WHERE slug='js-core'),
    'Will Sentance', 1110, 64, 4.9, 847, 12438, 'Bestseller', 'PUBLISHED'
  ),
  (
    'React Performance Deep-dive', 'react-performance-deep-dive',
    'Tối ưu rendering, memo, virtual DOM, Concurrent Mode.',
    '<p>Hiểu sâu về reconciliation, fiber, memo hóa đúng chỗ, code splitting và Concurrent Mode trong React 18+.</p>',
    'Rx', 'indigo', 749000, 1199000, 'ADVANCED',
    (SELECT id FROM categories WHERE slug='react'),
    'Khang Phạm', 720, 48, 4.8, 523, 8142, 'Hot', 'PUBLISHED'
  ),
  (
    'Async Patterns & Event Loop', 'async-patterns-event-loop',
    'Promises, async/await, generators, observables từ gốc.',
    '<p>Xây dựng nền tảng async vững chắc: callback hell → Promises → async/await → generators. Hiểu event loop, microtask queue, macrotask.</p>',
    '⟳', 'green', 449000, 699000, 'INTERMEDIATE',
    (SELECT id FROM categories WHERE slug='async'),
    'Lina Trần', 570, 32, 4.9, 312, 5728, 'New', 'PUBLISHED'
  ),
  (
    'TypeScript for JS Devs', 'typescript-for-js-devs',
    'Type system, generics, decorators, utility types, strict mode.',
    '<p>Học TypeScript từ góc nhìn của JS developer: type inference, generics, mapped types, conditional types, module augmentation.</p>',
    'TS', 'sky', 549000, 899000, 'INTERMEDIATE',
    (SELECT id FROM categories WHERE slug='ts'),
    'Đặng Quang', 840, 52, 4.7, 619, 9341, NULL, 'PUBLISHED'
  ),
  (
    'Node.js Internals', 'nodejs-internals',
    'V8, libuv, event loop, streams, cluster, worker threads.',
    '<p>Đi sâu vào Node.js runtime: V8 engine, libuv, event loop phases, streams backpressure, child_process, cluster và worker_threads.</p>',
    'Nx', 'rose', 699000, 1099000, 'ADVANCED',
    (SELECT id FROM categories WHERE slug='node'),
    'Mike Hughes', 960, 58, 4.8, 287, 4204, NULL, 'PUBLISHED'
  ),
  (
    'Vanilla JS Patterns', 'vanilla-js-patterns',
    'Design patterns, module pattern, observer, factory, DI.',
    '<p>Học các design patterns qua lens của Vanilla JS: module, observer, factory, strategy, dependency injection — không framework.</p>',
    '{}', 'violet', 0, 0, 'BEGINNER',
    (SELECT id FROM categories WHERE slug='js-core'),
    'Hà Trang', 450, 26, 4.6, 1024, 22108, 'Free', 'PUBLISHED'
  );

-- Seed sections — JavaScript: The Hard Parts
INSERT IGNORE INTO course_sections (course_id, title, order_index) VALUES
  ((SELECT id FROM courses WHERE slug='javascript-the-hard-parts'), 'Phần 1: Execution Context', 1),
  ((SELECT id FROM courses WHERE slug='javascript-the-hard-parts'), 'Phần 2: Closures',          2),
  ((SELECT id FROM courses WHERE slug='javascript-the-hard-parts'), 'Phần 3: Prototype Chain',   3),
  ((SELECT id FROM courses WHERE slug='javascript-the-hard-parts'), 'Phần 4: Event Loop',        4);

-- Seed sections — Async Patterns & Event Loop
INSERT IGNORE INTO course_sections (course_id, title, order_index) VALUES
  ((SELECT id FROM courses WHERE slug='async-patterns-event-loop'), 'Phần 1: Callbacks',   1),
  ((SELECT id FROM courses WHERE slug='async-patterns-event-loop'), 'Phần 2: Promises',    2),
  ((SELECT id FROM courses WHERE slug='async-patterns-event-loop'), 'Phần 3: Async/Await', 3);

-- Seed lessons — JavaScript: The Hard Parts
INSERT IGNORE INTO lessons (course_id, section_id, title, order_index, duration_minutes, is_preview) VALUES
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 1: Execution Context'),
    'Giới thiệu khóa học', 1, 5, TRUE
  ),
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 1: Execution Context'),
    'Global Execution Context là gì?', 2, 12, TRUE
  ),
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 1: Execution Context'),
    'Call Stack và Scope Chain', 3, 18, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 1: Execution Context'),
    'Hoisting trong thực tế', 4, 14, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 2: Closures'),
    'Closure là gì?', 5, 20, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 2: Closures'),
    'Ứng dụng closure: counter, memoize', 6, 22, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 2: Closures'),
    'Module pattern với closure', 7, 16, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 3: Prototype Chain'),
    'Prototype là gì?', 8, 19, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 3: Prototype Chain'),
    'new keyword và constructor', 9, 21, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 3: Prototype Chain'),
    'Class syntax vs prototype', 10, 17, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 4: Event Loop'),
    'Event Loop cơ bản', 11, 25, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='javascript-the-hard-parts'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='javascript-the-hard-parts' AND cs.title='Phần 4: Event Loop'),
    'Microtask vs Macrotask', 12, 28, FALSE
  );

-- Seed lessons — Async Patterns & Event Loop
INSERT IGNORE INTO lessons (course_id, section_id, title, order_index, duration_minutes, is_preview) VALUES
  (
    (SELECT id FROM courses WHERE slug='async-patterns-event-loop'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='async-patterns-event-loop' AND cs.title='Phần 1: Callbacks'),
    'Callback hell và cách thoát', 1, 15, TRUE
  ),
  (
    (SELECT id FROM courses WHERE slug='async-patterns-event-loop'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='async-patterns-event-loop' AND cs.title='Phần 1: Callbacks'),
    'Error-first callbacks', 2, 12, TRUE
  ),
  (
    (SELECT id FROM courses WHERE slug='async-patterns-event-loop'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='async-patterns-event-loop' AND cs.title='Phần 2: Promises'),
    'Tạo Promise từ đầu', 3, 20, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='async-patterns-event-loop'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='async-patterns-event-loop' AND cs.title='Phần 2: Promises'),
    'Promise.all, race, allSettled', 4, 18, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='async-patterns-event-loop'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='async-patterns-event-loop' AND cs.title='Phần 3: Async/Await'),
    'async/await pattern', 5, 22, FALSE
  ),
  (
    (SELECT id FROM courses WHERE slug='async-patterns-event-loop'),
    (SELECT cs.id FROM course_sections cs JOIN courses c ON cs.course_id=c.id WHERE c.slug='async-patterns-event-loop' AND cs.title='Phần 3: Async/Await'),
    'Error handling với try/catch', 6, 16, FALSE
  );
