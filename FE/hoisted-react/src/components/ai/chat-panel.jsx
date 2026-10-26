import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, Square, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { streamSSE } from '@/lib/stream';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';
import { THUMB_COLORS } from '@/components/course-editor.jsx';

export const SUGGESTIONS = [
  'Mình mới học lập trình, nên bắt đầu từ khóa nào?',
  'Lộ trình trở thành React developer?',
  'Giải thích closure trong JavaScript',
  'Khóa nào dạy async/await và Promise?',
];

const TOKEN_RE = /\[\[course:([a-z0-9-]+)\]\]/g;

/** Mã [[course:slug]]: khóa có thật → link; đang stream / slug bịa → bỏ. */
function renderTokens(text, courses, streaming) {
  const valid = new Set((courses ?? []).map((c) => c.slug));
  return text
    .replace(TOKEN_RE, (_m, slug) => (!streaming && valid.has(slug) ? ` [↗](/courses/${slug})` : ''))
    .replace(/\[\[course:[a-z0-9-]*$/, ''); // mã đang stream dở
}

const MD_CLS = 'text-[13.5px] leading-[1.65] text-ink [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_code]:font-mono [&_code]:text-[12px] [&_code]:bg-bg-2 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-bg-2 [&_pre]:p-2.5 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0';

const markdownComponents = {
  a: ({ href, children }) => (href?.startsWith('/')
    ? <Link to={href} className="text-accent font-semibold no-underline hover:underline">{children}</Link>
    : <a href={href} target="_blank" rel="noreferrer" className="text-accent underline">{children}</a>),
};

function CourseChip({ course }) {
  return (
    <Link to={`/courses/${course.slug}`}
      className="flex items-center gap-2.5 p-2 rounded-lg border border-line bg-bg hover:border-accent/50 transition-colors">
      <span className="w-9 h-9 rounded-md grid place-items-center font-mono font-bold text-[11px] text-bg shrink-0"
        style={{ background: THUMB_COLORS[course.thumb] ?? THUMB_COLORS.yellow }}>
        {course.glyph || 'JS'}
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-ink truncate">{course.title}</span>
        <span className="block font-mono text-[10.5px] text-ink-3">
          {course.price > 0 ? formatVND(course.price) : 'Miễn phí'}{course.rating ? ` · ★ ${course.rating}` : ''}
        </span>
      </span>
    </Link>
  );
}

function Message({ m }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md bg-accent text-bg text-[13.5px] whitespace-pre-wrap">{m.content}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <span className="w-7 h-7 rounded-full bg-accent/15 text-accent grid place-items-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        {m.content ? (
          <div className={MD_CLS}>
            <ReactMarkdown components={markdownComponents}>{renderTokens(m.content, m.courses, m.streaming)}</ReactMarkdown>
          </div>
        ) : m.streaming && (
          <span className="inline-flex gap-1 py-2" aria-label="Đang trả lời">
            {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-ink-3 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />)}
          </span>
        )}
        {m.error && <p className="mt-1 text-[12.5px] text-danger">{m.error}</p>}
        {m.courses?.length > 0 && !m.streaming && (
          <div className="mt-2 grid gap-1.5">{m.courses.map((c) => <CourseChip key={c.slug} course={c} />)}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Khung chat với trợ lý — dùng cho widget nổi và trang /assistant.
 * conversationId = null → hội thoại mới; onConversationChange(id) khi server tạo hội thoại.
 */
export function ChatPanel({ conversationId, onConversationChange, className }) {
  const qc = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);
  const listRef = useRef(null);
  const ownConversation = useRef(null); // id do chính panel này vừa tạo → không tải lại giữa chừng

  const { data } = useQuery({
    queryKey: ['ai-conversation', conversationId],
    queryFn: () => api.get(`/api/ai/conversations/${conversationId}`).then((r) => r.data),
    enabled: !!conversationId && ownConversation.current !== conversationId,
  });

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    if (data?.messages && ownConversation.current !== conversationId) setMessages(data.messages);
  }, [conversationId, data]);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages]);

  const patchLast = (fn) => setMessages((ms) => [...ms.slice(0, -1), fn(ms[ms.length - 1])]);

  const send = async (text) => {
    const message = text.trim();
    if (!message || streaming) return;
    setInput('');
    setMessages((ms) => [...ms, { role: 'user', content: message }, { role: 'assistant', content: '', streaming: true }]);
    setStreaming(true);
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      await streamSSE('/api/ai/chat', { message, conversationId }, {
        signal: ctl.signal,
        onEvent: (event, payload) => {
          if (event === 'meta' && payload.conversationId !== conversationId) {
            ownConversation.current = payload.conversationId;
            onConversationChange?.(payload.conversationId);
          }
          if (event === 'delta') patchLast((m) => ({ ...m, content: m.content + payload.text }));
          if (event === 'done') patchLast((m) => ({ ...m, streaming: false, courses: payload.courses }));
          if (event === 'error') patchLast((m) => ({ ...m, streaming: false, error: payload.message }));
        },
      });
    } catch (err) {
      if (err.name !== 'AbortError') patchLast((m) => ({ ...m, streaming: false, error: err.message }));
    } finally {
      patchLast((m) => ({ ...m, streaming: false }));
      setStreaming(false);
      abortRef.current = null;
      qc.invalidateQueries({ queryKey: ['ai-conversations'] });
    }
  };

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center pt-6">
            <span className="inline-grid place-items-center w-11 h-11 rounded-full bg-accent/15 text-accent mb-3"><Sparkles className="w-5 h-5" /></span>
            <p className="font-display font-semibold text-[15px] text-ink mb-1">Trợ lý học tập Hoisted</p>
            <p className="text-[12.5px] text-ink-3 mb-4 px-4">Hỏi về lộ trình, khóa học phù hợp hoặc kiến thức JavaScript.</p>
            <div className="grid gap-2 px-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-[12.5px] px-3 py-2 rounded-lg border border-line text-ink-2 hover:border-accent/50 hover:text-ink transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => <Message key={m.id ?? `local-${i}`} m={m} />)}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-xl border border-line bg-bg px-3 py-2 focus-within:border-accent">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            placeholder="Hỏi trợ lý… (Enter để gửi)"
            className="flex-1 resize-none bg-transparent text-[13.5px] text-ink placeholder:text-ink-3 focus:outline-none max-h-32"
          />
          {streaming ? (
            <button type="button" onClick={() => abortRef.current?.abort()} title="Dừng"
              className="w-8 h-8 rounded-lg bg-bg-3 text-ink grid place-items-center shrink-0"><Square className="w-3.5 h-3.5" /></button>
          ) : (
            <button type="submit" disabled={!input.trim()} title="Gửi"
              className="w-8 h-8 rounded-lg bg-accent text-bg grid place-items-center shrink-0 disabled:opacity-40"><ArrowUp className="w-4 h-4" /></button>
          )}
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-ink-3 text-center">AI có thể sai — hãy kiểm tra lại thông tin quan trọng.</p>
      </form>
    </div>
  );
}
