// Mock SDK Gemini ở tầng thấp nhất → test được cả logic chuyển model lẫn luồng SSE, không tốn quota thật
const mockStream = jest.fn();
const mockGenerate = jest.fn();
jest.mock('@google/genai', () => ({
  ...jest.requireActual('@google/genai'),
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContentStream: mockStream, generateContent: mockGenerate },
  })),
}));

process.env.GEMINI_API_KEY = 'test-key';
process.env.GEMINI_MODEL = 'model-a';
process.env.GEMINI_FALLBACK_MODELS = 'model-b';
process.env.LLM_BACKOFF_MS = '0';

const request = require('supertest');
const app = require('../src/app');
const llm = require('../src/services/llm');
const assistant = require('../src/services/ai/assistant-prompt');
const { shuffle, plainText, validator } = require('../src/services/ai/quiz-generator');
const {
  pool, resetDb, createUser, authHeader, createCourse, createLesson, enroll,
} = require('./helpers');

/** Async iterable giả lập stream của SDK. */
function fakeStream(pieces, { failAfter } = {}) {
  return (async function* gen() {
    for (const [i, text] of pieces.entries()) {
      if (failAfter === i) throw Object.assign(new Error('503 UNAVAILABLE'), { status: 503 });
      yield { text, usageMetadata: i === pieces.length - 1 ? { promptTokenCount: 100, candidatesTokenCount: 20 } : undefined };
    }
  }());
}
const overloaded = () => Object.assign(new Error('{"error":{"code":503,"status":"UNAVAILABLE","message":"high demand"}}'), { status: 503 });

/** Tách các event SSE từ body text. */
const parseSse = (text) => text.trim().split('\n\n').map((block) => {
  const event = block.match(/^event: (.+)$/m)?.[1];
  const data = block.match(/^data: (.+)$/m)?.[1];
  return { event, data: data ? JSON.parse(data) : null };
});

beforeAll(async () => { await resetDb(); assistant.resetCatalogCache(); });
afterAll(() => pool.end());
beforeEach(() => { mockStream.mockReset(); mockGenerate.mockReset(); llm.resetCooldowns(); });

describe('Lớp LLM — chịu lỗi nhà cung cấp', () => {
  it('stream từng đoạn và trả token đã dùng', async () => {
    mockStream.mockResolvedValue(fakeStream(['Xin ', 'chào']));
    const deltas = [];
    const r = await llm.streamChat({ system: 's', message: 'hi', onDelta: (t) => deltas.push(t) });
    expect(deltas).toEqual(['Xin ', 'chào']);
    expect(r).toMatchObject({ text: 'Xin chào', model: 'model-a', usage: { input: 100, output: 20 } });
  });

  it('model chính quá tải (503) → tự chuyển model dự phòng', async () => {
    mockStream.mockRejectedValueOnce(overloaded()).mockResolvedValueOnce(fakeStream(['ok']));
    const r = await llm.streamChat({ system: 's', message: 'hi' });
    expect(r.model).toBe('model-b');
    expect(mockStream.mock.calls.map((c) => c[0].model)).toEqual(['model-a', 'model-b']);
  });

  it('circuit breaker: model vừa quá tải bị bỏ qua ở request sau (không chờ lại)', async () => {
    mockStream.mockRejectedValueOnce(overloaded()).mockResolvedValue(fakeStream(['ok']));
    await llm.streamChat({ system: 's', message: '1' });
    mockStream.mockClear();
    mockStream.mockResolvedValue(fakeStream(['ok']));
    const r = await llm.streamChat({ system: 's', message: '2' });
    expect(r.model).toBe('model-b');
    expect(mockStream.mock.calls.map((c) => c[0].model)).toEqual(['model-b']);
  });

  it('lỗi mạng (fetch failed) → thử model khác', async () => {
    mockStream.mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(fakeStream(['ok']));
    const r = await llm.streamChat({ system: 's', message: 'hi' });
    expect(r.model).toBe('model-b');
  });

  it('lỗi giữa chừng khi đã gửi chữ cho người dùng → KHÔNG đổi model (tránh câu trả lời ghép)', async () => {
    mockStream.mockResolvedValueOnce(fakeStream(['nửa ', 'câu'], { failAfter: 1 }));
    await expect(llm.streamChat({ system: 's', message: 'hi' })).rejects.toMatchObject({ code: 'OVERLOADED' });
    expect(mockStream).toHaveBeenCalledTimes(1);
  });

  it('mọi model đều quá tải → OVERLOADED với thông báo thân thiện', async () => {
    mockStream.mockRejectedValue(overloaded());
    const err = await llm.streamChat({ system: 's', message: 'hi' }).catch((e) => e);
    expect(err.code).toBe('OVERLOADED');
    expect(err.message).not.toContain('{');
    expect(llm.httpStatusOf(err)).toBe(503);
  });

  it('lỗi không thể thử lại (400) → không đổi model', async () => {
    mockStream.mockRejectedValue(Object.assign(new Error('400 INVALID_ARGUMENT'), { status: 400 }));
    await expect(llm.streamChat({ system: 's', message: 'hi' })).rejects.toMatchObject({ code: 'PROVIDER' });
    expect(mockStream).toHaveBeenCalledTimes(1);
  });

  it('generateJson: JSON hỏng lần đầu → gọi lại; hỏng mãi → BAD_OUTPUT', async () => {
    const validate = (d) => (d.ok ? { ok: true, value: d } : { ok: false, error: 'sai' });
    mockGenerate.mockResolvedValueOnce({ text: '{hỏng' }).mockResolvedValueOnce({ text: '{"ok":true}' });
    await expect(llm.generateJson({ system: 's', prompt: 'p', schema: {}, validate })).resolves.toEqual({ ok: true });
    mockGenerate.mockResolvedValue({ text: '{"ok":false}' });
    await expect(llm.generateJson({ system: 's', prompt: 'p', schema: {}, validate })).rejects.toMatchObject({ code: 'BAD_OUTPUT' });
  });
});

describe('Prompt trợ lý — grounding & guardrails', () => {
  let published; let draft; let student;
  beforeAll(async () => {
    published = await createCourse({ status: 'PUBLISHED' });
    draft = await createCourse({ status: 'DRAFT' });
    student = await createUser();
    await enroll(student, published.id);
    assistant.resetCatalogCache();
  });

  it('catalog chỉ gồm khóa PUBLISHED; prompt có câu từ chối cố định và khóa học viên đã mua', async () => {
    const catalog = await assistant.loadCatalog({ fresh: true });
    const learner = await assistant.loadLearnerContext(student.id);
    const prompt = assistant.buildSystemPrompt({ catalog, learner });
    expect(prompt).toContain(published.slug);
    expect(prompt).not.toContain(draft.slug);
    expect(prompt).toContain(assistant.REFUSAL);
    expect(learner.enrolled.map((e) => e.slug)).toEqual([published.slug]);
  });

  it('chỉ giữ khóa học có thật — slug AI bịa ra bị loại', async () => {
    const catalog = await assistant.loadCatalog({ fresh: true });
    const text = `Học [[course:${published.slug}]] rồi [[course:khoa-hoc-bia]] và [[course:${draft.slug}]]`;
    const courses = assistant.resolveCourses(assistant.extractCourseSlugs(text), catalog);
    expect(courses.map((c) => c.slug)).toEqual([published.slug]);
  });
});

describe('POST /api/ai/chat — SSE', () => {
  let user; let other; let course;
  beforeAll(async () => {
    user = await createUser();
    other = await createUser();
    course = await createCourse({ status: 'PUBLISHED' });
    assistant.resetCatalogCache();
  });

  const chat = (u, body) => request(app).post('/api/ai/chat').set(authHeader(u)).send(body).buffer(true).parse((res, cb) => {
    let data = ''; res.on('data', (c) => { data += c; }); res.on('end', () => cb(null, data));
  });

  it('khách chưa đăng nhập → 401', async () => {
    expect((await request(app).post('/api/ai/chat').send({ message: 'hi' })).status).toBe(401);
  });

  it.each([['rỗng', ''], ['quá 1000 ký tự', 'x'.repeat(1001)]])('tin nhắn %s → 400', async (_l, message) => {
    expect((await request(app).post('/api/ai/chat').set(authHeader(user)).send({ message })).status).toBe(400);
  });

  it('chưa cấu hình API key → 503', async () => {
    const key = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const res = await request(app).post('/api/ai/chat').set(authHeader(user)).send({ message: 'hi' });
    process.env.GEMINI_API_KEY = key;
    expect(res.status).toBe(503);
  });

  let conversationId;
  it('stream meta → delta → done; done chỉ chứa khóa học có thật; lưu cả 2 tin nhắn', async () => {
    mockStream.mockResolvedValue(fakeStream(['Bạn nên học ', `[[course:${course.slug}]]`, ' và [[course:khong-ton-tai]].']));
    const res = await chat(user, { message: 'Nên học gì?' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');

    const events = parseSse(res.body);
    expect(events.map((e) => e.event)).toEqual(['meta', 'delta', 'delta', 'delta', 'done']);
    conversationId = events[0].data.conversationId;
    expect(events.at(-1).data.courses.map((c) => c.slug)).toEqual([course.slug]);

    const [rows] = await pool.query('SELECT role, tokens_in, tokens_out FROM ai_messages WHERE conversation_id = ? ORDER BY id', [conversationId]);
    expect(rows).toEqual([
      { role: 'user', tokens_in: null, tokens_out: null },
      { role: 'assistant', tokens_in: 100, tokens_out: 20 },
    ]);
  });

  it('hỏi tiếp trong cùng hội thoại → gửi kèm lịch sử cho AI', async () => {
    mockStream.mockResolvedValue(fakeStream(['ok']));
    await chat(user, { message: 'Còn gì nữa?', conversationId });
    const { contents } = mockStream.mock.calls[0][0];
    expect(contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(contents.at(-1).parts[0].text).toBe('Còn gì nữa?');
  });

  it('lịch sử hội thoại: chỉ chủ sở hữu xem / xóa được', async () => {
    const list = await request(app).get('/api/ai/conversations').set(authHeader(user));
    expect(list.body.conversations.map((c) => c.id)).toContain(conversationId);

    const detail = await request(app).get(`/api/ai/conversations/${conversationId}`).set(authHeader(user));
    expect(detail.body.messages).toHaveLength(4);
    expect(detail.body.messages[1].courses.map((c) => c.slug)).toEqual([course.slug]);

    expect((await request(app).get(`/api/ai/conversations/${conversationId}`).set(authHeader(other))).status).toBe(404);
    expect((await request(app).delete(`/api/ai/conversations/${conversationId}`).set(authHeader(other))).status).toBe(404);
    expect((await chat(other, { message: 'chen ngang', conversationId })).status).toBe(404);
    expect((await request(app).delete(`/api/ai/conversations/${conversationId}`).set(authHeader(user))).status).toBe(200);
  });

  it('AI lỗi → event error với thông báo thân thiện, vẫn kết thúc stream', async () => {
    mockStream.mockRejectedValue(overloaded());
    const res = await chat(user, { message: 'hi' });
    const events = parseSse(res.body);
    expect(events.map((e) => e.event)).toEqual(['meta', 'error']);
    expect(events[1].data.message).toMatch(/quá tải/);
  });
});

describe('AI sinh câu hỏi quiz cho giảng viên', () => {
  let teacher; let otherTeacher; let lesson;
  beforeAll(async () => {
    teacher = await createUser({ role: 'INSTRUCTOR' });
    otherTeacher = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse({ instructor: teacher });
    lesson = await createLesson(course.id);
  });

  const gen = (u, body) => request(app).post(`/api/instructor/lessons/${lesson.id}/ai/quiz`).set(authHeader(u)).send(body);
  const q = (question, correct, type = 'single') => ({
    question, type, explanation: 'vì…',
    options: ['A', 'B', 'C', 'D'].map((t, i) => ({ text: `${question}-${t}`, isCorrect: correct.includes(i) })),
  });

  it('giảng viên khác → 404; tham số sai → 400', async () => {
    expect((await gen(otherTeacher, { count: 3 })).status).toBe(404);
    expect((await gen(teacher, { count: 50 })).status).toBe(400);
    expect((await gen(teacher, { count: 3, difficulty: 'impossible' })).status).toBe(400);
  });

  it('loại câu sai luật (một đáp án nhưng 2 đáp án đúng), trả bản nháp — không lưu DB', async () => {
    mockGenerate.mockResolvedValue({ text: JSON.stringify({
      questions: [q('Câu 1 là gì?', [0]), q('Câu 2 là gì?', [2]), q('Câu 3 là gì?', [0, 1]), q('Câu 4 nhiều đáp án?', [1, 3], 'multiple')],
    }) });
    const res = await gen(teacher, { count: 4, difficulty: 'easy' });
    expect(res.status).toBe(200);
    expect(res.body.questions.map((x) => x.question)).toEqual(['Câu 1 là gì?', 'Câu 2 là gì?', 'Câu 4 nhiều đáp án?']);
    expect(res.body.rejected).toBe(1);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM quiz_questions');
    expect(n).toBe(0);
  });

  it('AI trả rác liên tục → 502', async () => {
    mockGenerate.mockResolvedValue({ text: '{"questions": []}' });
    expect((await gen(teacher, { count: 3 })).status).toBe(502);
  });

  it('prompt chỉ nhận nội dung bài học dạng text (bỏ thẻ HTML / script)', () => {
    expect(plainText('<p>Hoisting</p><script>alert(1)</script> <b>var</b>')).toBe('Hoisting var');
  });

  it('xáo trộn đáp án (LLM hay đặt đáp án đúng ở đầu)', () => {
    let seed = 0.1;
    const random = () => { seed = (seed * 9301 + 0.49297) % 1; return seed; };
    const out = shuffle([1, 2, 3, 4, 5, 6], random);
    expect(out).not.toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('validator giữ đúng số câu yêu cầu', () => {
    const r = validator(2)({ questions: [q('Câu một?', [0]), q('Câu hai?', [1]), q('Câu ba?', [2])] });
    expect(r.ok).toBe(true);
    expect(r.value.questions).toHaveLength(2);
  });
});
