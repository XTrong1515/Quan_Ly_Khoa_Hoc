const pool = require('../config/db');
const llm = require('../services/llm');
const assistant = require('../services/ai/assistant-prompt');
const studio = require('../services/ai/instructor-prompt');
const { loadLessonContext } = require('../services/ai/lesson-context');
const { generateQuiz, DIFFICULTY } = require('../services/ai/quiz-generator');
const { writeLesson, LENGTHS } = require('../services/ai/lesson-writer');

const MAX_MESSAGE = 1000;  // ký tự / tin nhắn
const HISTORY_LIMIT = 10;  // số tin nhắn gần nhất gửi kèm cho AI

/*
 * Hai trợ lý dùng chung luồng chat / lịch sử, khác nhau ở ngữ cảnh đưa cho AI:
 *  - LEARNER    (/api/ai)            : danh mục khóa PUBLISHED + khóa học viên đã có → gợi ý [[course:slug]];
 *                                       hỏi từ trang học thì hội thoại gắn lesson_id → thêm nội dung bài vào prompt
 *  - INSTRUCTOR (/api/instructor/ai) : khóa học của chính giảng viên + quy trình duyệt / doanh thu
 * Hội thoại tách theo ai_conversations.kind: trợ lý này không đọc / ghi được hội thoại của trợ lý kia.
 */
const ASSISTANTS = {
  LEARNER: {
    tag: 'ai/chat',
    lessons: true,
    async prepare(userId, { lesson }) {
      const [catalog, learner] = await Promise.all([assistant.loadCatalog(), assistant.loadLearnerContext(userId)]);
      return {
        system: assistant.buildSystemPrompt({ catalog, learner, lesson }),
        courses: (text) => assistant.resolveCourses(assistant.extractCourseSlugs(text), catalog),
      };
    },
  },
  INSTRUCTOR: {
    tag: 'instructor/ai/chat',
    async prepare(userId) {
      const context = await studio.loadInstructorContext(userId);
      return { system: studio.buildInstructorPrompt(context), courses: () => [] };
    },
  },
};

/**
 * POST {base}/chat  { message, conversationId?, lessonId? }  → text/event-stream
 *   lessonId (chỉ trợ lý học viên, khi tạo hội thoại mới): phải có quyền xem bài, nếu không → 403
 *   event: meta  { conversationId }
 *   event: delta { text }            (nhiều lần)
 *   event: done  { messageId, courses }
 *   event: error { message }
 */
const chatHandler = (kind) => async function chat(req, res) {
  const cfg = ASSISTANTS[kind];
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ message: 'Tin nhắn trống' });
  if (message.length > MAX_MESSAGE) return res.status(400).json({ message: `Tin nhắn tối đa ${MAX_MESSAGE} ký tự` });
  if (!llm.isConfigured()) return res.status(503).json({ message: 'Trợ lý AI chưa được cấu hình' });

  const userId = req.user.id;
  let conversationId = req.body.conversationId ? parseInt(req.body.conversationId, 10) : null;

  let history = [];
  let lesson = null;
  try {
    if (conversationId) {
      const [[conv]] = await pool.query(
        'SELECT id, lesson_id FROM ai_conversations WHERE id = ? AND user_id = ? AND kind = ?', [conversationId, userId, kind],
      );
      if (!conv) return res.status(404).json({ message: 'Không tìm thấy hội thoại' });
      // Kiểm tra quyền lại mỗi lần: mất quyền xem bài (hoàn tiền, khóa bị gỡ) thì hỏi tiếp không còn ngữ cảnh bài
      if (cfg.lessons && conv.lesson_id) lesson = await loadLessonContext(req.user, conv.lesson_id);
      const [rows] = await pool.query(
        'SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?',
        [conversationId, HISTORY_LIMIT],
      );
      history = rows.reverse();
    } else {
      if (cfg.lessons && req.body.lessonId) {
        lesson = await loadLessonContext(req.user, req.body.lessonId);
        if (!lesson) return res.status(403).json({ message: 'Bạn chưa có quyền xem bài học này' });
      }
      const [r] = await pool.query(
        'INSERT INTO ai_conversations (user_id, title, kind, lesson_id) VALUES (?, ?, ?, ?)',
        [userId, message.slice(0, 120), kind, lesson?.id ?? null],
      );
      conversationId = r.insertId;
    }
    await pool.query('INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)', [conversationId, 'user', message]);
  } catch (err) {
    console.error(`[${cfg.tag}:prepare]`, err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }

  // ── Bắt đầu stream ──
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (event, data) => { if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
  // Client đóng tab / bấm dừng → hủy request tới AI (dùng res 'close': req 'close' bắn ngay khi đọc xong body)
  const abort = new AbortController();
  res.on('close', () => { if (!res.writableFinished) abort.abort(); });

  send('meta', { conversationId });

  let text = '';
  try {
    const ctx = await cfg.prepare(userId, { lesson });
    const result = await llm.streamChat({
      system: ctx.system,
      history,
      message,
      signal: abort.signal,
      onDelta: (piece) => { text += piece; send('delta', { text: piece }); },
    });
    text = result.text || text;

    const courses = ctx.courses(text);
    const [saved] = await pool.query(
      `INSERT INTO ai_messages (conversation_id, role, content, courses, tokens_in, tokens_out, latency_ms)
       VALUES (?, 'assistant', ?, ?, ?, ?, ?)`,
      [conversationId, text || '(trống)', JSON.stringify(courses), result.usage.input, result.usage.output, result.latencyMs],
    );
    await pool.query('UPDATE ai_conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);
    send('done', { messageId: saved.insertId, courses });
  } catch (err) {
    if (err.code !== 'ABORTED') console.error(`[${cfg.tag}]`, err.code ?? '', err.message);
    // Lưu phần đã nhận được để lịch sử không bị hụt câu trả lời
    if (text) {
      await pool.query('INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)', [conversationId, 'assistant', text])
        .catch(() => {});
    }
    send('error', { message: err instanceof llm.LlmError ? err.message : 'Trợ lý AI đang gặp sự cố' });
  } finally {
    res.end();
  }
};

/* GET {base}/conversations */
const listHandler = (kind) => async function listConversations(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.updated_at AS updatedAt, c.lesson_id AS lessonId, l.title AS lessonTitle, l.course_id AS lessonCourseId,
              (SELECT COUNT(*) FROM ai_messages m WHERE m.conversation_id = c.id) AS messageCount
       FROM ai_conversations c LEFT JOIN lessons l ON l.id = c.lesson_id
       WHERE c.user_id = ? AND c.kind = ? ORDER BY c.updated_at DESC, c.id DESC LIMIT 50`,
      [req.user.id, kind],
    );
    return res.json({ conversations: rows });
  } catch (err) {
    console.error('[ai/conversations]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

/* GET {base}/conversations/:id */
const getHandler = (kind) => async function getConversation(req, res) {
  const id = parseInt(req.params.id, 10);
  try {
    const [[conv]] = await pool.query(
      `SELECT c.id, c.title, c.lesson_id AS lessonId, l.title AS lessonTitle, l.course_id AS lessonCourseId
       FROM ai_conversations c LEFT JOIN lessons l ON l.id = c.lesson_id
       WHERE c.id = ? AND c.user_id = ? AND c.kind = ?`,
      [id, req.user.id, kind],
    );
    if (!conv) return res.status(404).json({ message: 'Không tìm thấy hội thoại' });
    const [messages] = await pool.query(
      'SELECT id, role, content, courses, feedback, created_at AS createdAt FROM ai_messages WHERE conversation_id = ? ORDER BY id ASC',
      [id],
    );
    return res.json({
      conversation: conv,
      messages: messages.map((m) => ({
        ...m, courses: typeof m.courses === 'string' ? JSON.parse(m.courses) : (m.courses ?? []),
      })),
    });
  } catch (err) {
    console.error('[ai/conversation]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

/* DELETE {base}/conversations/:id */
const deleteHandler = (kind) => async function deleteConversation(req, res) {
  try {
    const [r] = await pool.query(
      'DELETE FROM ai_conversations WHERE id = ? AND user_id = ? AND kind = ?', [parseInt(req.params.id, 10), req.user.id, kind],
    );
    if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy hội thoại' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[ai/conversation:delete]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

/* PATCH {base}/conversations/:id  { title } — đổi tên hội thoại (không đổi thứ tự trong danh sách) */
const renameHandler = (kind) => async function renameConversation(req, res) {
  const title = typeof req.body?.title === 'string' ? req.body.title.replace(/\s+/g, ' ').trim() : '';
  if (!title) return res.status(400).json({ message: 'Tên hội thoại không được để trống' });
  if (title.length > 120) return res.status(400).json({ message: 'Tên hội thoại tối đa 120 ký tự' });
  try {
    const [r] = await pool.query(
      'UPDATE ai_conversations SET title = ?, updated_at = updated_at WHERE id = ? AND user_id = ? AND kind = ?',
      [title, parseInt(req.params.id, 10), req.user.id, kind],
    );
    if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy hội thoại' });
    return res.json({ ok: true, title });
  } catch (err) {
    console.error('[ai/conversation:rename]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

/* PUT {base}/messages/:id/feedback  { value: 1 | -1 | null } — đánh giá câu trả lời của trợ lý */
const feedbackHandler = (kind) => async function messageFeedback(req, res) {
  const value = req.body?.value;
  if (![1, -1, null].includes(value)) return res.status(400).json({ message: 'Đánh giá không hợp lệ' });
  try {
    const [r] = await pool.query(
      `UPDATE ai_messages m JOIN ai_conversations c ON c.id = m.conversation_id
       SET m.feedback = ?
       WHERE m.id = ? AND m.role = 'assistant' AND c.user_id = ? AND c.kind = ?`,
      [value, parseInt(req.params.id, 10), req.user.id, kind],
    );
    if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy câu trả lời' });
    return res.json({ ok: true, feedback: value });
  } catch (err) {
    console.error('[ai/message:feedback]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

/* ══════════════════════ Trợ lý học viên (/api/ai) ══════════════════════ */
const chat = chatHandler('LEARNER');
const listConversations = listHandler('LEARNER');
const getConversation = getHandler('LEARNER');
const deleteConversation = deleteHandler('LEARNER');
const renameConversation = renameHandler('LEARNER');
const messageFeedback = feedbackHandler('LEARNER');

/* ══════════════════════ Trợ lý giảng viên — chat (/api/instructor/ai) ══════════════════════ */
const studioChat = chatHandler('INSTRUCTOR');
const studioListConversations = listHandler('INSTRUCTOR');
const studioGetConversation = getHandler('INSTRUCTOR');
const studioDeleteConversation = deleteHandler('INSTRUCTOR');
const studioRenameConversation = renameHandler('INSTRUCTOR');
const studioMessageFeedback = feedbackHandler('INSTRUCTOR');

/* ══════════════════════ Trợ lý giảng viên ══════════════════════ */

/* POST {apiBase}/lessons/:id/ai/quiz  { count, difficulty, focus } — đã qua requireOwnership('lesson') */
async function generateQuizDraft(req, res) {
  const count = Number(req.body?.count ?? 5);
  const difficulty = req.body?.difficulty ?? 'medium';
  const focus = typeof req.body?.focus === 'string' ? req.body.focus.trim() : '';
  if (!Number.isInteger(count) || count < 1 || count > 10) return res.status(400).json({ message: 'Số câu từ 1 đến 10' });
  if (!DIFFICULTY[difficulty]) return res.status(400).json({ message: 'Độ khó không hợp lệ' });
  if (!llm.isConfigured()) return res.status(503).json({ message: 'Trợ lý AI chưa được cấu hình' });

  try {
    const [[lesson]] = await pool.query(
      `SELECT l.title, l.content, c.title AS courseTitle
       FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?`,
      [parseInt(req.params.id, 10)],
    );
    const started = Date.now();
    const { questions, rejected } = await generateQuiz({
      courseTitle: lesson.courseTitle, lessonTitle: lesson.title, content: lesson.content, count, difficulty, focus,
    });
    return res.json({ questions, rejected, latencyMs: Date.now() - started });
  } catch (err) {
    if (err instanceof llm.LlmError) return res.status(llm.httpStatusOf(err)).json({ message: err.message });
    console.error('[ai/quiz]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* POST {apiBase}/lessons/:id/ai/content  { outline?, length?, rewrite? } — bản nháp Markdown, không lưu */
async function generateLessonContent(req, res) {
  const outline = typeof req.body?.outline === 'string' ? req.body.outline.trim() : '';
  const length = req.body?.length ?? 'medium';
  if (!LENGTHS[length]) return res.status(400).json({ message: 'Độ dài không hợp lệ' });
  if (outline.length > 2000) return res.status(400).json({ message: 'Dàn ý tối đa 2000 ký tự' });
  if (!llm.isConfigured()) return res.status(503).json({ message: 'Trợ lý AI chưa được cấu hình' });

  try {
    const [[lesson]] = await pool.query(
      `SELECT l.title, l.content, c.title AS courseTitle, cs.title AS sectionTitle
       FROM lessons l JOIN courses c ON c.id = l.course_id
       LEFT JOIN course_sections cs ON cs.id = l.section_id
       WHERE l.id = ?`,
      [parseInt(req.params.id, 10)],
    );
    const draft = await writeLesson({
      courseTitle: lesson.courseTitle, sectionTitle: lesson.sectionTitle, lessonTitle: lesson.title,
      outline, length, existing: req.body?.rewrite ? lesson.content : '',
    });
    return res.json(draft);
  } catch (err) {
    if (err instanceof llm.LlmError) return res.status(llm.httpStatusOf(err)).json({ message: err.message });
    console.error('[ai/lesson-content]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ══════════════════════ Khách hỏi thử (không đăng nhập) ══════════════════════ */

const GUEST_HISTORY = 6;          // số tin gần nhất trình duyệt được gửi kèm
const GUEST_HISTORY_CHARS = 4000; // tổng độ dài lịch sử gửi kèm

/** Lịch sử do trình duyệt gửi (không tin tưởng): chỉ giữ role hợp lệ, cắt số lượng và độ dài. */
function sanitizeGuestHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const items = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-GUEST_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE * 2) }));
  let total = 0;
  const kept = [];
  for (let i = items.length - 1; i >= 0; i -= 1) {
    total += items[i].content.length;
    if (total > GUEST_HISTORY_CHARS) break;
    kept.unshift(items[i]);
  }
  return kept;
}

/**
 * POST /api/ai/guest/chat  { message, history? }  → text/event-stream (delta* → done { courses } | error)
 * Không lưu DB, không có ngữ cảnh học viên; prompt và bộ lọc khóa học giống trợ lý học viên.
 */
async function guestChat(req, res) {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ message: 'Tin nhắn trống' });
  if (message.length > MAX_MESSAGE) return res.status(400).json({ message: `Tin nhắn tối đa ${MAX_MESSAGE} ký tự` });
  if (!llm.isConfigured()) return res.status(503).json({ message: 'Trợ lý AI chưa được cấu hình' });
  const history = sanitizeGuestHistory(req.body.history);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (event, data) => { if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
  const abort = new AbortController();
  res.on('close', () => { if (!res.writableFinished) abort.abort(); });

  let text = '';
  try {
    const catalog = await assistant.loadCatalog();
    const result = await llm.streamChat({
      system: assistant.buildSystemPrompt({ catalog, learner: { name: null, enrolled: [] } }),
      history,
      message,
      signal: abort.signal,
      onDelta: (piece) => { text += piece; send('delta', { text: piece }); },
    });
    text = result.text || text;
    send('done', { courses: assistant.resolveCourses(assistant.extractCourseSlugs(text), catalog) });
  } catch (err) {
    if (err.code !== 'ABORTED') console.error('[ai/guest-chat]', err.code ?? '', err.message);
    send('error', { message: err instanceof llm.LlmError ? err.message : 'Trợ lý AI đang gặp sự cố' });
  } finally {
    res.end();
  }
}

/* ══════════════════════ Thống kê cho admin ══════════════════════ */

const STATS_DAYS = 30;

/**
 * GET /api/admin/ai-stats — 30 ngày gần nhất: số câu hỏi theo trợ lý, đánh giá 👍/👎, thời gian trả lời,
 * 5 câu trả lời bị đánh giá chưa tốt gần nhất (để cải thiện prompt). Chỉ số liệu thật từ ai_messages.
 */
async function adminAiStats(req, res) {
  try {
    const since = `NOW() - INTERVAL ${STATS_DAYS} DAY`;
    const [[byKind], [[fb]], [lat], [disliked]] = await Promise.all([
      pool.query(
        `SELECT c.kind, c.lesson_id IS NOT NULL AS inLesson,
                COUNT(DISTINCT c.id) AS conversations,
                SUM(m.role = 'user') AS questions
         FROM ai_conversations c JOIN ai_messages m ON m.conversation_id = c.id
         WHERE m.created_at >= ${since}
         GROUP BY c.kind, inLesson`,
      ),
      pool.query(
        `SELECT COALESCE(SUM(feedback = 1), 0) AS up, COALESCE(SUM(feedback = -1), 0) AS down, COUNT(*) AS answers
         FROM ai_messages WHERE role = 'assistant' AND created_at >= ${since}`,
      ),
      pool.query(
        `SELECT latency_ms FROM ai_messages
         WHERE role = 'assistant' AND latency_ms IS NOT NULL AND created_at >= ${since}
         ORDER BY latency_ms LIMIT 10000`,
      ),
      pool.query(
        `SELECT a.id, a.created_at AS createdAt, c.kind, c.lesson_id IS NOT NULL AS inLesson,
                LEFT(a.content, 240) AS answer,
                (SELECT LEFT(q.content, 200) FROM ai_messages q
                 WHERE q.conversation_id = a.conversation_id AND q.id < a.id AND q.role = 'user'
                 ORDER BY q.id DESC LIMIT 1) AS question
         FROM ai_messages a JOIN ai_conversations c ON c.id = a.conversation_id
         WHERE a.role = 'assistant' AND a.feedback = -1
         ORDER BY a.id DESC LIMIT 5`,
      ),
    ]);

    const bucket = (kind, inLesson) => byKind.find((r) => r.kind === kind && Boolean(r.inLesson) === inLesson);
    const pack = (r) => ({ conversations: Number(r?.conversations ?? 0), questions: Number(r?.questions ?? 0) });
    const assistants = {
      learner: pack(bucket('LEARNER', false)),
      lesson: pack(bucket('LEARNER', true)),
      instructor: pack(bucket('INSTRUCTOR', false)),
    };
    const up = Number(fb.up); const down = Number(fb.down);
    const ms = lat.map((r) => r.latency_ms);

    return res.json({
      days: STATS_DAYS,
      questions: Object.values(assistants).reduce((s, a) => s + a.questions, 0),
      assistants,
      feedback: { up, down, rated: up + down, answers: Number(fb.answers), helpfulRate: up + down ? up / (up + down) : null },
      latencyMs: ms.length ? { median: ms[Math.floor(ms.length / 2)], p90: ms[Math.min(ms.length - 1, Math.floor(ms.length * 0.9))] } : null,
      disliked: disliked.map((d) => ({ ...d, inLesson: Boolean(d.inLesson) })),
    });
  } catch (err) {
    console.error('[admin/ai-stats]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = {
  chat, listConversations, getConversation, deleteConversation, renameConversation, messageFeedback,
  studioChat, studioListConversations, studioGetConversation, studioDeleteConversation,
  studioRenameConversation, studioMessageFeedback,
  generateQuizDraft, generateLessonContent, adminAiStats, guestChat, sanitizeGuestHistory,
};
