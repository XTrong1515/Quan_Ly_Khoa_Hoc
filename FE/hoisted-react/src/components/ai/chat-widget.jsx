import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, X, Maximize2, Plus } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { ASSISTANTS } from './assistants.js';
// Widget nằm trên mọi trang → chỉ tải khung chat khi người dùng mở
const ChatPanel = lazy(() => import('./chat-panel.jsx').then((m) => ({ default: m.ChatPanel })));

const iconBtn = 'w-8 h-8 rounded-lg grid place-items-center text-ink-3 hover:text-ink hover:bg-bg-2 transition-colors';

/**
 * Nút trợ lý AI nổi góc phải. Học viên: trên các trang công khai; giảng viên: trong Instructor studio.
 * Ẩn trên chính trang toàn màn hình của trợ lý đó. Trên điện thoại khung chat phủ toàn màn hình.
 */
export function ChatWidget({ assistant = ASSISTANTS.learner }) {
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

  if (pathname.startsWith(assistant.page)) return null;
  const guest = role === 'guest';

  return (
    <>
      {open && (
        <section aria-label={assistant.name}
          className="animate-chat-in fixed z-50 inset-0 sm:inset-auto sm:bottom-[88px] sm:right-5 sm:w-[400px] sm:h-[min(620px,calc(100dvh-7.5rem))] flex flex-col bg-bg sm:rounded-2xl sm:border border-line shadow-2xl shadow-black/40 overflow-hidden">
          <header className="flex items-center gap-2.5 h-14 pl-4 pr-2 border-b border-line bg-bg-1 shrink-0">
            <span className="w-7 h-7 rounded-lg border border-line bg-bg text-accent grid place-items-center" aria-hidden="true">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <h2 className="flex-1 min-w-0 truncate font-display font-semibold text-[14.5px] text-ink">{assistant.name}</h2>
            {!guest && (
              <>
                <button type="button" onClick={() => { setConversationId(null); setPanelKey((k) => k + 1); }}
                  title="Hội thoại mới" aria-label="Bắt đầu hội thoại mới" className={iconBtn}>
                  <Plus className="w-4 h-4" />
                </button>
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

          {guest ? (
            <div className="flex-1 flex flex-col justify-center px-6 py-8">
              <h3 className="font-display font-semibold text-[17px] text-ink">Hỏi trợ lý học tập Hoisted</h3>
              <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-2">
                Đăng nhập để được gợi ý khóa học và lộ trình theo đúng trình độ của bạn. Lịch sử trò chuyện được lưu trong tài khoản.
              </p>
              <div className="mt-5 flex gap-2">
                <Link to="/login" onClick={() => setOpen(false)}
                  className="inline-flex items-center h-[38px] px-4 rounded-lg bg-accent text-accent-ink text-[13.5px] font-semibold hover:brightness-95">
                  Đăng nhập
                </Link>
                <Link to="/register" onClick={() => setOpen(false)}
                  className="inline-flex items-center h-[38px] px-4 rounded-lg border border-line text-ink text-[13.5px] font-semibold hover:bg-bg-2">
                  Tạo tài khoản
                </Link>
              </div>
            </div>
          ) : (
            <Suspense fallback={<div className="flex-1" />}>
              <ChatPanel key={panelKey} assistant={assistant} conversationId={conversationId}
                onConversationChange={(id) => { setConversationId(id); if (!id) setPanelKey((k) => k + 1); }}
                autoFocus className="flex-1" />
            </Suspense>
          )}
        </section>
      )}

      <button
        ref={fabRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? `Đóng ${assistant.name.toLowerCase()}` : 'Mở trợ lý AI'}
        aria-expanded={open}
        className={`${open ? 'hidden sm:grid' : 'grid'} fixed z-50 bottom-5 right-5 w-[52px] h-[52px] rounded-full bg-accent text-accent-ink shadow-lg shadow-black/30 place-items-center transition hover:brightness-95 active:scale-95`}>
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>
    </>
  );
}
