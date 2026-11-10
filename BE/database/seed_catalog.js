/**
 * Seed — thay TOÀN BỘ dữ liệu khóa học bằng 10 khóa demo có video, quiz và bài tập code (chỉ dev).
 *
 *   node --no-node-snapshot database/seed_catalog.js            # chỉ in ra sẽ xóa gì, không đổi dữ liệu
 *   node --no-node-snapshot database/seed_catalog.js --reset    # xóa và tạo lại
 *   ... --reset --no-video                                       # bỏ qua bước sinh video (nhanh, để thử)
 *
 * Xóa: khóa học, bài học, quiz, bài tập, lượt làm bài, đăng ký học, đơn hàng, đánh giá, wishlist,
 *      thảo luận, chi trả giảng viên, thông báo, file trên storage (courses/…).
 * Giữ: tài khoản người dùng, danh mục, đơn đăng ký giảng viên, hội thoại AI.
 *
 * Trình tự an toàn: (1) chấm thử lời giải mọi bài tập + kiểm tra quiz — sai là dừng, chưa xóa gì;
 * (2) xóa + tạo dữ liệu trong 1 transaction; (3) sinh video slide bằng ffmpeg, upload lên storage
 * và mã hóa HLS bằng đúng pipeline của hệ thống (services/video/hls.js).
 * Video là slide tóm tắt không có giọng đọc — dùng để thử luồng phát video, không phải bài giảng thật.
 * Nên chạy `npm run db:backup` trước.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const pool = require('../src/config/db');
const storage = require('../src/utils/storage');
const hls = require('../src/services/video/hls');
const runner = require('../src/services/code-runner/isolated-vm-runner');
const { markOrderPaid } = require('../src/services/orders');
const CATALOG = require('./seed-data/catalog');

const args = new Set(process.argv.slice(2));
const RESET = args.has('--reset');
const WITH_VIDEO = !args.has('--no-video');
const DEMO_STUDENT = 'demo.hocvien@hoisted.dev';
// Học viên demo được mua sẵn các khóa này (theo slug); các khóa còn lại để tự thử luồng mua
const DEMO_PURCHASES = ['closure-va-execution-context', 'bat-dong-bo-callback-promise-async-await'];

/* ══════════════════════ 1. Kiểm tra trước khi xóa ══════════════════════ */

async function validate() {
  const problems = [];
  const [instructors] = await pool.query("SELECT id, email, full_name FROM users WHERE role = 'INSTRUCTOR'");
  const [categories] = await pool.query('SELECT id, slug FROM categories');
  const byEmail = new Map(instructors.map((u) => [u.email, u]));
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  let exercises = 0;

  for (const course of CATALOG) {
    if (!byEmail.has(course.instructor)) problems.push(`${course.slug}: không có giảng viên ${course.instructor}`);
    if (!bySlug.has(course.category)) problems.push(`${course.slug}: không có danh mục ${course.category}`);
    for (const lesson of course.sections.flatMap((s) => s.lessons)) {
      for (const q of lesson.quiz?.questions ?? []) {
        const correct = q.options.filter(([, ok]) => ok).length;
        if (correct === 0 || ((q.type ?? 'single') === 'single' && correct !== 1)) {
          problems.push(`${course.slug} / ${lesson.title}: câu "${q.q}" sai số đáp án đúng`);
        }
      }
      if (lesson.exercise) {
        const ex = lesson.exercise;
        const tests = ex.tests.map(([input, expected, hidden]) => ({ input, expected, hidden: !!hidden }));
        if (!tests.some((t) => !t.hidden)) problems.push(`${ex.title}: cần ít nhất 1 test công khai`);
        const run = await runner.runTests({ code: ex.solution, functionName: ex.functionName, tests, timeLimitMs: 1000 });
        if (run.status !== 'ACCEPTED') problems.push(`${ex.title}: lời giải mẫu không qua test (${run.status} ${run.error ?? ''})`);
        exercises += 1;
      }
    }
  }
  if (problems.length) throw new Error(`Dữ liệu seed chưa hợp lệ, chưa xóa gì:\n  - ${problems.join('\n  - ')}`);
  console.log(`✔ Kiểm tra xong: ${CATALOG.length} khóa, ${exercises} bài tập — mọi lời giải mẫu đều qua test`);
  return { byEmail, bySlug };
}

/* ══════════════════════ 2. Xóa và tạo dữ liệu ══════════════════════ */

// Thứ tự xóa theo khóa ngoại (các bảng còn lại được xóa dây chuyền khi xóa courses / lessons)
const WIPE = [
  'quiz_attempts', 'code_submissions', 'lesson_progress', 'enrollments',
  'order_items', 'orders', 'instructor_payouts', 'reviews', 'wishlists', 'courses', 'notifications',
];

async function describeWipe() {
  const rows = [];
  for (const table of [...WIPE, 'lessons', 'quizzes', 'coding_exercises']) {
    const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
    rows.push(`${table}: ${n}`);
  }
  return rows.join(' · ');
}

function lessonMarkdown(lesson) {
  const parts = [lesson.intro, '', '### Ý chính', ...lesson.points.map((p) => `- ${p}`)];
  if (lesson.code) parts.push('', '```js', lesson.code, '```');
  return parts.join('\n');
}

function courseDescription(course) {
  const lessons = course.sections.flatMap((s) => s.lessons);
  const quizzes = lessons.filter((l) => l.quiz).length;
  const exercises = lessons.filter((l) => l.exercise).length;
  return [
    course.short,
    '',
    '### Khóa học có gì',
    `- ${lessons.length} bài học, mỗi bài có video và phần đọc tóm tắt`,
    `- ${quizzes} quiz kiểm tra nhanh, đạt mới tính hoàn thành bài`,
    `- ${exercises} bài tập code chấm tự động bằng test (có test ẩn)`,
    '',
    '_Video trong khóa là slide tóm tắt không có giọng đọc, dùng để thử nghiệm hệ thống._',
  ].join('\n');
}

async function rebuild({ byEmail, bySlug }) {
  const conn = await pool.getConnection();
  const created = []; // { courseId, title, lessons: [{ id, no, lesson }] }
  try {
    await conn.beginTransaction();
    for (const table of WIPE) await conn.query(`DELETE FROM \`${table}\``);

    for (const [index, course] of CATALOG.entries()) {
      const teacher = byEmail.get(course.instructor);
      const [c] = await conn.query(
        `INSERT INTO courses (title, slug, short_description, description, price, original_price, level, category_id,
           instructor_name, instructor_id, glyph, thumb, what_you_learn, requirements, status,
           submitted_at, reviewed_at, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', NOW(), NOW(), ?)`,
        [course.title, course.slug, course.short, courseDescription(course), course.price, course.originalPrice,
          course.level, bySlug.get(course.category).id, teacher.full_name, teacher.id, course.glyph, course.thumb,
          JSON.stringify(course.learn), JSON.stringify(course.requirements), index + 1],
      );
      const entry = { courseId: c.insertId, title: course.title, lessons: [] };
      let order = 0;

      for (const [si, section] of course.sections.entries()) {
        const [s] = await conn.query('INSERT INTO course_sections (course_id, title, order_index) VALUES (?, ?, ?)', [c.insertId, section.title, si + 1]);
        for (const lesson of section.lessons) {
          order += 1;
          const [l] = await conn.query(
            `INSERT INTO lessons (course_id, section_id, title, content, duration_minutes, order_index, is_preview)
             VALUES (?, ?, ?, ?, 1, ?, ?)`,
            [c.insertId, s.insertId, lesson.title, lessonMarkdown(lesson), order, lesson.preview ? 1 : 0],
          );
          entry.lessons.push({ id: l.insertId, no: order, lesson });

          if (lesson.quiz) {
            const [q] = await conn.query('INSERT INTO quizzes (lesson_id, title, pass_score) VALUES (?, ?, ?)', [l.insertId, `Quiz: ${lesson.title}`, lesson.quiz.passScore]);
            for (const [qi, question] of lesson.quiz.questions.entries()) {
              const [qq] = await conn.query(
                'INSERT INTO quiz_questions (quiz_id, question, type, position) VALUES (?, ?, ?, ?)',
                [q.insertId, question.q, question.type ?? 'single', qi],
              );
              await conn.query('INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES ?',
                [question.options.map(([text, ok]) => [qq.insertId, text, ok ? 1 : 0])]);
            }
          }

          if (lesson.exercise) {
            const ex = lesson.exercise;
            const [e] = await conn.query(
              `INSERT INTO coding_exercises (lesson_id, title, description_md, starter_code, solution_code, function_name, time_limit_ms)
               VALUES (?, ?, ?, ?, ?, ?, 1000)`,
              [l.insertId, ex.title, ex.descriptionMd, ex.starter, ex.solution, ex.functionName],
            );
            await conn.query('INSERT INTO exercise_test_cases (exercise_id, input_json, expected_json, is_hidden, order_index) VALUES ?',
              [ex.tests.map(([input, expected, hidden], ti) => [e.insertId, JSON.stringify(input), JSON.stringify(expected), hidden ? 1 : 0, ti])]);
          }
        }
      }
      await conn.query(
        `UPDATE courses SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = ?),
           total_duration_minutes = (SELECT COALESCE(SUM(duration_minutes), 0) FROM lessons WHERE course_id = ?)
         WHERE id = ?`,
        [c.insertId, c.insertId, c.insertId],
      );
      created.push(entry);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return created;
}

/** Học viên demo: mua sẵn vài khóa qua đúng luồng thanh toán, đăng ký các khóa miễn phí. */
async function enrollDemoStudent(created) {
  const [[student]] = await pool.query('SELECT id FROM users WHERE email = ?', [DEMO_STUDENT]);
  if (!student) return 'không có tài khoản demo.hocvien — bỏ qua';
  const [courses] = await pool.query('SELECT id, slug, title, price FROM courses WHERE id IN (?)', [created.map((c) => c.courseId)]);
  const paid = courses.filter((c) => DEMO_PURCHASES.includes(c.slug));
  if (paid.length) {
    const total = paid.reduce((s, c) => s + Number(c.price), 0);
    const [o] = await pool.query(
      "INSERT INTO orders (user_id, order_code, total_amount, status, payment_method, expires_at) VALUES (?, ?, ?, 'PENDING', 'VNPAY', DATE_ADD(NOW(), INTERVAL 1 DAY))",
      [student.id, `SEED-${Date.now()}`, total],
    );
    await pool.query('INSERT INTO order_items (order_id, course_id, course_title, price) VALUES ?', [paid.map((c) => [o.insertId, c.id, c.title, c.price])]);
    await markOrderPaid(o.insertId, { transactionId: `SEED-TX-${o.insertId}` });
  }
  const free = courses.filter((c) => Number(c.price) === 0);
  for (const c of free) {
    const [r] = await pool.query('INSERT IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)', [student.id, c.id]);
    if (r.affectedRows) await pool.query('UPDATE courses SET student_count = student_count + 1 WHERE id = ?', [c.id]);
  }
  return `đã mua ${paid.map((c) => c.title).join(', ')}; đăng ký ${free.length} khóa miễn phí`;
}

/* ══════════════════════ 3. Video slide + HLS ══════════════════════ */

const FONT_CANDIDATES = {
  sans: ['C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf'],
  bold: ['C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'],
  mono: ['C:/Windows/Fonts/consola.ttf', 'C:/Windows/Fonts/cour.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/System/Library/Fonts/Supplemental/Courier New.ttf'],
};

function findFonts() {
  const fonts = {};
  for (const [kind, list] of Object.entries(FONT_CANDIDATES)) {
    const override = process.env[`SEED_FONT_${kind.toUpperCase()}`];
    fonts[kind] = [override, ...list].find((f) => f && fs.existsSync(f));
    if (!fonts[kind]) throw new Error(`Không tìm thấy font ${kind} có hỗ trợ tiếng Việt — đặt biến SEED_FONT_${kind.toUpperCase()}`);
  }
  return fonts;
}

/** Ngắt dòng theo số ký tự; dòng tiếp theo thụt vào bằng `indent`. */
function wrap(text, width, indent = '') {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > width) { out.push(line); line = indent + word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}

function runFfmpeg(argv, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.env.FFMPEG_PATH || require('ffmpeg-static'), argv, { cwd, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr.trim().split('\n').slice(-2).join(' ')))));
  });
}

/** Một video slide ~20–30 s: tiêu đề → ý chính → ví dụ code → bước tiếp theo. Trả về đường dẫn MP4. */
async function renderLessonVideo(dir, fonts, { courseTitle, no, lesson }) {
  for (const [kind, file] of Object.entries(fonts)) fs.copyFileSync(file, path.join(dir, `${kind}.ttf`));
  const write = (name, text) => fs.writeFileSync(path.join(dir, name), text);

  const next = lesson.quiz ? `Làm quiz của bài này, đạt ${lesson.quiz.passScore}% để mở bài tiếp theo.`
    : lesson.exercise ? 'Mở tab "Bài tập": viết code, chạy thử rồi nộp để được chấm.'
      : 'Đọc phần "Tổng quan" bên dưới video để xem lại ý chính.';
  const codeLines = (lesson.code ?? '').split('\n').slice(0, 10).map((l) => (l.length > 72 ? `${l.slice(0, 71)}…` : l));

  write('brand.txt', 'Hoisted()');
  write('course.txt', courseTitle);
  write('foot.txt', `Video slide thử nghiệm · Bài ${no}`);
  write('label.txt', `BÀI ${String(no).padStart(2, '0')}`);
  write('title.txt', wrap(lesson.title, 34).join('\n'));
  write('h-points.txt', 'Ý chính');
  write('points.txt', lesson.points.flatMap((p) => wrap(`•  ${p}`, 56, '    ')).join('\n'));
  write('h-code.txt', 'Ví dụ');
  write('code.txt', codeLines.join('\n'));
  write('h-next.txt', 'Tiếp theo');
  write('next.txt', wrap(next, 56).join('\n'));

  const slides = [['title', 5], ['points', 9], ...(lesson.code ? [['code', 11]] : []), ['next', 5]];
  let t = 0;
  const window = {};
  for (const [name, seconds] of slides) { window[name] = `between(t,${t},${t + seconds})`; t += seconds; }

  const text = (file, font, size, color, x, y, extra = '') =>
    `drawtext=fontfile=${font}.ttf:textfile=${file}:expansion=none:fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}${extra}`;
  const on = (name) => `:enable='${window[name]}'`;
  const filters = [
    'drawbox=x=0:y=0:w=iw:h=6:color=0xF7DF1E:t=fill',
    text('course.txt', 'sans', 22, '0x8B92AF', 80, 40),
    text('brand.txt', 'mono', 24, '0xF7DF1E', 80, 'h-70'),
    text('foot.txt', 'sans', 20, '0x8B92AF', 'w-tw-80', 'h-66'),
    text('label.txt', 'mono', 26, '0xF7DF1E', 80, 250, on('title')),
    text('title.txt', 'bold', 54, '0xF4F5F9', 80, 300, `:line_spacing=14${on('title')}`),
    text('h-points.txt', 'bold', 40, '0xF7DF1E', 80, 140, on('points')),
    text('points.txt', 'sans', 34, '0xF4F5F9', 80, 225, `:line_spacing=24${on('points')}`),
    ...(lesson.code ? [
      text('h-code.txt', 'bold', 40, '0xF7DF1E', 80, 140, on('code')),
      `drawbox=x=80:y=210:w=1120:h=430:color=0x161C2F:t=fill${on('code')}`,
      text('code.txt', 'mono', 26, '0xE6E9F2', 110, 240, `:line_spacing=12${on('code')}`),
    ] : []),
    text('h-next.txt', 'bold', 40, '0xF7DF1E', 80, 140, on('next')),
    text('next.txt', 'sans', 34, '0xF4F5F9', 80, 225, `:line_spacing=20${on('next')}`),
  ].join(',');

  await runFfmpeg([
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `color=c=0x0B0F19:s=1280x720:r=25:d=${t}`,
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-t', String(t), '-vf', filters,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-g', '50',
    '-c:a', 'aac', '-b:a', '48k', '-shortest', '-movflags', '+faststart', 'lesson.mp4',
  ], dir);
  return path.join(dir, 'lesson.mp4');
}

async function attachVideos(created) {
  const fonts = findFonts();
  let ready = 0; let failed = 0; let done = 0;
  const total = created.reduce((n, c) => n + c.lessons.length, 0);
  const log = console.log;
  for (const course of created) {
    for (const { id, no, lesson } of course.lessons) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hoisted-seed-'));
      try {
        const file = await renderLessonVideo(dir, fonts, { courseTitle: course.title, no, lesson });
        const key = `${storage.lessonPrefix(course.courseId, id, 'video')}${crypto.randomUUID()}.mp4`;
        await storage.putObject(key, fs.readFileSync(file), 'video/mp4');
        await pool.query("UPDATE lessons SET video_key = ?, hls_status = 'PROCESSING' WHERE id = ?", [key, id]);
        console.log = () => {}; // processLesson log từng video — gom lại thành dòng tiến độ bên dưới
        await hls.processLesson(id);
        console.log = log;
        const [[row]] = await pool.query('SELECT hls_status FROM lessons WHERE id = ?', [id]);
        if (row.hls_status === 'READY') ready += 1; else failed += 1;
      } catch (err) {
        console.log = log;
        failed += 1;
        console.error(`  ✘ video bài #${id} "${lesson.title}": ${err.message}`);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      done += 1;
      process.stdout.write(`\r  video ${done}/${total} (HLS sẵn sàng ${ready}${failed ? `, lỗi ${failed}` : ''})   `);
    }
  }
  process.stdout.write('\n');
  return { ready, failed, total };
}

/* ══════════════════════ Chạy ══════════════════════ */

async function run() {
  if (process.env.NODE_ENV === 'production') throw new Error('Không chạy seed_catalog trên production');
  if (WITH_VIDEO && !storage.isConfigured()) throw new Error('Chưa cấu hình object storage (S3_*) — chạy `npm run storage` hoặc thêm --no-video');

  console.log(`Sẽ xóa: ${await describeWipe()}`);
  const refs = await validate();
  if (!RESET) {
    console.log('\nChưa thay đổi gì. Chạy lại với --reset để xóa dữ liệu khóa học cũ và tạo 10 khóa mới.');
    return;
  }

  const created = await rebuild(refs);
  console.log(`✔ Đã xóa dữ liệu cũ và tạo ${created.length} khóa, ${created.reduce((n, c) => n + c.lessons.length, 0)} bài học`);
  if (WITH_VIDEO) await storage.deletePrefix('courses/'); // file video / PDF / HLS của khóa cũ
  console.log(`✔ Học viên demo: ${await enrollDemoStudent(created)}`);

  if (WITH_VIDEO) {
    console.log('… Sinh video slide, upload lên storage và mã hóa HLS');
    const v = await attachVideos(created);
    console.log(`✔ Video: ${v.ready}/${v.total} bài đã mã hóa HLS${v.failed ? ` — ${v.failed} bài lỗi (xem log ở trên)` : ''}`);
  }
}

run()
  .catch((err) => { console.error(`\nSeed failed: ${err.message}`); process.exitCode = 1; })
  .finally(() => pool.end());
