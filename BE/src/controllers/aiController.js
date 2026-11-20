const pool = require('../config/db');
const llm = require('../services/llm');
const assistant = require('../services/ai/assistant-prompt');
const studio = require('../services/ai/instructor-prompt');
const { generateQuiz, DIFFICULTY } = require('../services/ai/quiz-generator');
const { writeLesson, LENGTHS } = require('../services/ai/lesson-writer');

const MAX_MESSAGE = 1000;  // ký tự / tin nhắn
const HISTORY_LIMIT = 10;  // số tin nhắn gần nhất gửi kèm cho AI

/*
 * Hai trợ lý dùng chung luồng chat / lịch sử, khác nhau ở ngữ cảnh đưa cho AI:
 *  - LEARNER    (/api/ai)            : danh mục khóa PUBLISHED + khóa học viên đã có → gợi ý [[course:slug]]
 *  - INSTRUCTOR (/api/instructor/ai) : khóa học của chính giảng viên + quy trình duyệt / doanh thu
 * Hội thoại tách theo ai_conversations.kind: trợ lý này không đọc / ghi được hội thoại của trợ lý kia.
 */
const ASSISTANTS = {
  LEARNER: {
    tag: 'ai/chat',
    async prepare(userId) {
      const [catalog, learner] = await Promise.all([assistant.loadCatalog(), assistant.loadLearnerContext(userId)]);
      return {
        system: assistant.buildSystemPrompt({ catalog, learner }),
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
 * POST {base}/chat  { message, conversationId? }  → text/event-stream
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
  try {
    if (conversationId) {
      const [[conv]] = await pool.query(
        'SELECT id FROM ai_conversations WHERE id = ? AND user_id = ? AND kind = ?', [conversationId, userId, kind],
      );
      if (!conv) return res.status(404).json({ message: 'Không tìm thấy hội thoại' });
      const [rows] = await pool.query(
        'SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?',
        [conversationId, HISTORY_LIMIT],
      );
      history = rows.reverse();
    } else {
      const [r] = await pool.query(
        'INSERT INTO ai_conversations (user_id, title, kind) VALUES (?, ?, ?)', [userId, message.slice(0, 120), kind],
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
    const ctx = await cfg.prepare(userId);
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
      `SELECT c.id, c.title, c.updated_at AS updatedAt,
              (SELECT COUNT(*) FROM ai_messages m WHERE m.conversation_id = c.id) AS messageCount
       FROM ai_conversations c WHERE c.user_id = ? AND c.kind = ? ORDER BY c.updated_at DESC, c.id DESC LIMIT 50`,
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
      'SELECT id, title FROM ai_conversations WHERE id = ? AND user_id = ? AND kind = ?', [id, req.user.id, kind],
    );
    if (!conv) return res.status(404).json({ message: 'Không tìm thấy hội thoại' });
    const [messages] = await pool.query(
      'SELECT id, role, content, courses, created_at AS createdAt FROM ai_messages WHERE conversation_id = ? ORDER BY id ASC',
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

/* ══════════════════════ Trợ lý học viên (/api/ai) ══════════════════════ */
const chat = chatHandler('LEARNER');
const listConversations = listHandler('LEARNER');
const getConversation = getHandler('LEARNER');
const deleteConversation = deleteHandler('LEARNER');

/* ══════════════════════ Trợ lý giảng viên — chat (/api/instructor/ai) ══════════════════════ */
const studioChat = chatHandler('INSTRUCTOR');
const studioListConversations = listHandler('INSTRUCTOR');
const studioGetConversation = getHandler('INSTRUCTOR');
const studioDeleteConversation = deleteHandler('INSTRUCTOR');

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

module.exports = {
  chat, listConversations, getConversation, deleteConversation,
  studioChat, studioListConversations, studioGetConversation, studioDeleteConversation,
  generateQuizDraft, generateLessonContent,
};
