/**
 * Lớp trừu tượng LLM — controller chỉ gọi streamChat / generateJson, không biết nhà cung cấp.
 * Hiện dùng Google Gemini (@google/genai). Đổi sang OpenAI chỉ cần viết lại phần gọi API trong file này.
 *
 * Chịu lỗi:
 * - Chuỗi model GEMINI_MODEL → GEMINI_FALLBACK_MODELS: model quá tải (503/429/500) thì thử lại có giãn cách
 *   rồi chuyển model kế tiếp — chỉ khi CHƯA gửi chữ nào cho người dùng.
 * - Giới hạn chờ chữ đầu tiên (LLM_FIRST_TOKEN_TIMEOUT_MS) cho mỗi lần thử + giới hạn tổng (LLM_TIMEOUT_MS).
 * - Hủy khi client ngắt kết nối (signal). Lỗi trả về dạng LlmError có code để controller chọn HTTP status.
 */
const { GoogleGenAI } = require('@google/genai');

const TOTAL_TIMEOUT_MS       = Number(process.env.LLM_TIMEOUT_MS) || 60_000;
const FIRST_TOKEN_TIMEOUT_MS = Number(process.env.LLM_FIRST_TOKEN_TIMEOUT_MS) || 15_000;
// Model báo quá tải thì thử lại ngay hiếm khi được → mặc định chuyển luôn sang model kế tiếp
const ATTEMPTS_PER_MODEL     = Number(process.env.LLM_ATTEMPTS_PER_MODEL) || 1;
const BACKOFF_MS             = Number(process.env.LLM_BACKOFF_MS ?? 800);

class LlmError extends Error {
  /** code: NOT_CONFIGURED | TIMEOUT | ABORTED | RATE_LIMITED | OVERLOADED | NETWORK | BAD_OUTPUT | PROVIDER */
  constructor(code, message, { retryable = false } = {}) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

let client;
function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new LlmError('NOT_CONFIGURED', 'Chưa cấu hình GEMINI_API_KEY');
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

/** Danh sách model theo thứ tự ưu tiên (không trùng). */
function modelChain() {
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-flash-lite-latest,gemini-2.5-flash')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set([process.env.GEMINI_MODEL || 'gemini-flash-latest', ...fallbacks])];
}

/*
 * Circuit breaker: model vừa lỗi quá tải / hết quota / treo → tạm bỏ qua LLM_COOLDOWN_MS
 * để các request sau không phải chờ timeout của model đang chết.
 */
const COOLDOWN_MS = Number(process.env.LLM_COOLDOWN_MS) || 60_000;
const cooldownUntil = new Map();
function availableModels() {
  const chain = modelChain();
  const ready = chain.filter((m) => (cooldownUntil.get(m) ?? 0) <= Date.now());
  return ready.length ? ready : chain; // tất cả đang nghỉ → vẫn thử cả chuỗi
}
const resetCooldowns = () => cooldownUntil.clear();

const sleep = (ms, signal) => new Promise((resolve) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
});

/** Chuẩn hóa lỗi SDK → LlmError (đánh dấu lỗi nào nên thử lại / đổi model). */
function classify(err, { attemptTimedOut, totalSignal, userSignal }) {
  if (err instanceof LlmError) return err;
  if (userSignal?.aborted) return new LlmError('ABORTED', 'Đã hủy');
  if (totalSignal.aborted) return new LlmError('TIMEOUT', 'AI phản hồi quá lâu, vui lòng thử lại');
  if (attemptTimedOut) return new LlmError('TIMEOUT', 'AI phản hồi quá lâu', { retryable: true });
  const text = `${err?.status ?? ''} ${err?.message ?? ''}`;
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(text)) {
    return new LlmError('RATE_LIMITED', 'Trợ lý AI đang hết lượt miễn phí, vui lòng thử lại sau ít phút', { retryable: true });
  }
  if (/503|UNAVAILABLE|overloaded|high demand|500|INTERNAL/i.test(text)) {
    return new LlmError('OVERLOADED', 'Dịch vụ AI đang quá tải, vui lòng thử lại sau ít phút', { retryable: true });
  }
  if (/fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network/i.test(`${text} ${err?.cause?.code ?? ''}`)) {
    return new LlmError('NETWORK', 'Không kết nối được dịch vụ AI', { retryable: true });
  }
  console.error('[llm] provider error:', err?.status ?? '', String(err?.message ?? err).slice(0, 300));
  return new LlmError('PROVIDER', 'Dịch vụ AI gặp lỗi, vui lòng thử lại');
}

/**
 * Chạy fn(model, attemptSignal, markProgress) qua chuỗi model / lần thử.
 * markProgress() báo đã có dữ liệu gửi cho người dùng → từ đó lỗi không được thử lại nữa.
 */
async function withFallback(fn, userSignal) {
  const totalSignal = AbortSignal.timeout(TOTAL_TIMEOUT_MS);
  let lastError;
  for (const model of availableModels()) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt += 1) {
      const attemptCtl = new AbortController();
      let attemptTimedOut = false;
      const firstTokenTimer = setTimeout(() => { attemptTimedOut = true; attemptCtl.abort(); }, FIRST_TOKEN_TIMEOUT_MS);
      let progressed = false;
      const markProgress = () => { if (!progressed) { progressed = true; clearTimeout(firstTokenTimer); } };
      const signal = AbortSignal.any([attemptCtl.signal, totalSignal, ...(userSignal ? [userSignal] : [])]);
      try {
        const result = await fn(model, signal, markProgress);
        cooldownUntil.delete(model);
        return { ...result, model };
      } catch (err) {
        lastError = classify(err, { attemptTimedOut, totalSignal, userSignal });
        if (lastError.retryable) cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
        if (progressed || !lastError.retryable) throw lastError;
        if (attempt < ATTEMPTS_PER_MODEL - 1) await sleep(BACKOFF_MS * (attempt + 1), userSignal);
      } finally {
        clearTimeout(firstTokenTimer);
      }
      if (userSignal?.aborted) throw new LlmError('ABORTED', 'Đã hủy');
    }
  }
  throw lastError ?? new LlmError('PROVIDER', 'Dịch vụ AI gặp lỗi');
}

/** history: [{ role: 'user' | 'assistant', content }] → định dạng contents của Gemini */
const toContents = (history, message) => [
  ...history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
  { role: 'user', parts: [{ text: message }] },
];

/**
 * Chat có streaming. Gọi onDelta(text) cho từng đoạn; trả { text, usage, latencyMs, model }.
 */
async function streamChat({ system, history = [], message, onDelta, signal, temperature = 0.4, maxOutputTokens = 1024 }) {
  const ai = getClient();
  const started = Date.now();
  return withFallback(async (model, attemptSignal, markProgress) => {
    let text = '';
    let usage = null;
    const stream = await ai.models.generateContentStream({
      model,
      contents: toContents(history, message),
      config: { systemInstruction: system, temperature, maxOutputTokens, abortSignal: attemptSignal },
    });
    for await (const chunk of stream) {
      const piece = chunk.text ?? '';
      if (piece) { markProgress(); text += piece; onDelta?.(piece); }
      if (chunk.usageMetadata) usage = chunk.usageMetadata;
    }
    return {
      text,
      latencyMs: Date.now() - started,
      usage: { input: usage?.promptTokenCount ?? null, output: usage?.candidatesTokenCount ?? null },
    };
  }, signal);
}

/**
 * Sinh JSON theo schema (structured output) rồi kiểm tra bằng validate(data) → { ok, value, error }.
 * Sai định dạng → gọi lại tối đa `retries` lần; vẫn sai → LlmError BAD_OUTPUT.
 */
async function generateJson({ system, prompt, schema, validate, signal, temperature = 0.3, retries = 1 }) {
  const ai = getClient();
  let lastError = 'Không đọc được kết quả';
  for (let round = 0; round <= retries; round += 1) {
    const { text: raw } = await withFallback(async (model, attemptSignal, markProgress) => {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: system, temperature, abortSignal: attemptSignal,
          responseMimeType: 'application/json', responseSchema: schema,
        },
      });
      markProgress();
      return { text: res.text };
    }, signal);
    try {
      const result = validate(JSON.parse(raw));
      if (result.ok) return result.value;
      lastError = result.error;
    } catch {
      lastError = 'AI trả về JSON không hợp lệ';
    }
  }
  throw new LlmError('BAD_OUTPUT', lastError);
}

/** HTTP status tương ứng với LlmError (dùng chung cho các controller). */
const httpStatusOf = (err) => ({
  NOT_CONFIGURED: 503, OVERLOADED: 503, NETWORK: 503, TIMEOUT: 504, RATE_LIMITED: 429, BAD_OUTPUT: 502, ABORTED: 499,
}[err.code] ?? 502);

module.exports = { LlmError, isConfigured, streamChat, generateJson, httpStatusOf, modelChain, resetCooldowns };
