import { api, BASE_URL } from '@/lib/api';

/*
 * POST + đọc Server-Sent Events bằng fetch (EventSource không gửi được POST / header Authorization).
 * Không đụng tới interceptor của lib/api.js: khi gặp 401, gọi 1 request qua `api` để interceptor
 * tự refresh token (và ghi token mới vào localStorage), rồi gửi lại stream.
 */
function currentToken() {
  try {
    return JSON.parse(localStorage.getItem('hoisted.auth') ?? '{}')?.state?.token ?? null;
  } catch {
    return null;
  }
}

const post = (path, body, signal) => fetch(`${BASE_URL}${path}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    ...(currentToken() ? { Authorization: `Bearer ${currentToken()}` } : {}),
  },
  body: JSON.stringify(body),
  signal,
});

/**
 * @param {string} path
 * @param {object} body
 * @param {{ onEvent: (event: string, data: any) => void, signal?: AbortSignal }} opts
 * Lỗi HTTP trước khi stream bắt đầu → throw Error(message từ server).
 */
export async function streamSSE(path, body, { onEvent, signal }) {
  let res = await post(path, body, signal);
  if (res.status === 401) {
    await api.get('/api/auth/me').catch(() => {}); // interceptor refresh token nếu có thể
    res = await post(path, body, signal);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data.message ?? `Lỗi ${res.status}`), { status: res.status });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const event = block.match(/^event: (.+)$/m)?.[1] ?? 'message';
      const raw = block.match(/^data: (.+)$/m)?.[1];
      if (raw) onEvent(event, JSON.parse(raw));
    }
  }
}
