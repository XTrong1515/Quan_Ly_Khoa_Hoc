import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, X, Maximize2, Plus } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { ASSISTANTS } from './assistants.js';
// Widget nằm trên mọi trang → chỉ tải khung chat khi người dùng mở
const ChatPanel = lazy(() => import('./chat-panel.jsx').then((m) => ({ default: m.ChatPanel })));

const iconBtn = 'w-8 h-8 rounded-sm border-2 border-transparent grid place-items-center text-pop-ink hover:border-[rgb(var(--pop-ink))] hover:bg-white/40 transition-colors';

/**
 * Nút trợ lý AI nổi góc phải. Học viên: trên các trang công khai; giảng viên: trong Instructor studio.
 * Ẩn trên chính trang toàn màn hình của trợ lý đó. Trên điện thoại khung chat phủ toàn màn hình.
 */
export function ChatWidget({ assistant: signedIn = ASSISTANTS.learner }) {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [panelKey, setPanelKey] = useState(0);
  const fabRef = useRef(null);

  const close = () => { setOpen(false); requestAnimationFrame(() => fabRef.current?.focus()); };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      setOpen(false);
      requestAnimationFrame(() => fabRef.current?.focus());
    };
    document.addEventListener('keydown', onKey);
    // Điện thoại: khung chat phủ kín màn hình → khóa cuộn trang phía sau
    const phone = window.matchMedia('(max-width: 639px)').matches;
    if (phone) document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      if (phone) document.documentElement.style.overflow = '';
    };
  }, [open]);

  const guest = role === 'guest';
  // Khách: hỏi thử ngay trong widget (không lưu lịch sử), không có trang toàn màn hình
  const assistant = guest && signedIn.id === 'learner' ? ASSISTANTS.guest : signedIn;
  if (!guest && pathname.startsWith(assistant.page)) return null;

  return (
    <>
      {open && (
        <section aria-label={assistant.name}
          className="animate-chat-in fixed z-50 inset-0 sm:inset-auto sm:bottom-[88px] sm:right-5 sm:w-[400px] sm:h-[min(620px,calc(100dvh-7.5rem))] flex flex-col bg-bg sm:rounded sm:border-2 border-edge shadow-2xl overflow-hidden">
          <header className="flex items-center gap-2.5 h-14 pl-4 pr-2 border-b-2 border-edge bg-pop text-pop-ink shrink-0">
            <span className="w-7 h-7 rounded-sm border-2 border-edge bg-white text-navy grid place-items-center" aria-hidden="true">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <h2 className="flex-1 min-w-0 truncate font-display font-bold text-[14.5px] text-pop-ink">{assistant.name}</h2>
            <button type="button" onClick={() => { setConversationId(null); setPanelKey((k) => k + 1); }}
              title="Hội thoại mới" aria-label="Bắt đầu hội thoại mới" className={iconBtn}>
              <Plus className="w-4 h-4" />
            </button>
            {!guest && (
              <>
                <Link to={conversationId ? `${assistant.page}?c=${conversationId}` : assistant.page} onClick={() => setOpen(false)}
                  title="Mở toàn màn hình" aria-label="Mở trợ lý toàn màn hình" className={iconBtn}>
                  <Maximize2 className="w-4 h-4" />
                </Link>
              </>
            )}
            <button type="button" onClick={close} title="Đóng" aria-label={`Đóng ${assistant.name.toLowerCase()}`} className={iconBtn}>
              <X className="w-[18px] h-[18px]" />
            </button>
          </header>

          {guest && (
            <p className="px-4 py-2 border-b border-line bg-bg-1 text-[12px] text-ink-3">
              Dùng thử · không lưu lịch sử.{' '}
              <Link to="/login" onClick={() => setOpen(false)} className="font-semibold text-accent hover:underline underline-offset-2">Đăng nhập</Link>
              {' '}để lưu và được gợi ý theo khóa đã học.
            </p>
          )}
          <Suspense fallback={<div className="flex-1" />}>
            <ChatPanel key={`${assistant.id}-${panelKey}`} assistant={assistant} conversationId={guest ? null : conversationId}
              onConversationChange={(id) => { setConversationId(id); if (!id) setPanelKey((k) => k + 1); }}
              autoFocus className="flex-1" />
          </Suspense>
        </section>
      )}

      <button
        ref={fabRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? `Đóng ${assistant.name.toLowerCase()}` : 'Mở trợ lý AI'}
        aria-expanded={open}
        className={`${open ? 'hidden sm:grid' : 'grid'} fixed z-50 bottom-5 right-5 w-[52px] h-[52px] rounded-sm border-2 border-edge bg-pop text-pop-ink press shadow-md place-items-center`}>
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>
    </>
  );
}
