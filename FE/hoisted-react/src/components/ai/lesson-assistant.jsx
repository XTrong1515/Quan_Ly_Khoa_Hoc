import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X, Maximize2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ASSISTANTS } from './assistants.js';

// Trang học đã nặng (video, CodeMirror) → chỉ tải khung chat khi mở
const ChatPanel = lazy(() => import('./chat-panel.jsx').then((m) => ({ default: m.ChatPanel })));

const iconBtn = 'w-8 h-8 rounded-lg grid place-items-center text-ink-3 hover:text-ink hover:bg-bg-2 transition-colors';

/**
 * Nút "Hỏi AI" trên thanh trên của trang học + ngăn chat bên phải (toàn màn hình trên điện thoại).
 * Hội thoại mới gửi kèm lessonId → BE kiểm tra quyền xem bài rồi đưa nội dung bài vào prompt
 * và gắn bài vào hội thoại (hỏi tiếp ở /assistant vẫn giữ ngữ cảnh). Đổi bài → bắt đầu hội thoại mới.
 */
export function LessonAssistant({ lessonId, lessonTitle }) {
  const assistant = ASSISTANTS.lesson;
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [panelKey, setPanelKey] = useState(0);
  const btnRef = useRef(null);

  // Sang bài khác: hội thoại cũ thuộc bài cũ
  useEffect(() => { setConversationId(null); setPanelKey((k) => k + 1); }, [lessonId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      setOpen(false);
      requestAnimationFrame(() => btnRef.current?.focus());
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => { setOpen(false); requestAnimationFrame(() => btnRef.current?.focus()); };

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open}
        aria-label={open ? 'Đóng trợ lý AI của bài học' : 'Hỏi AI về bài này'} title="Hỏi AI về bài này"
        className={cn('h-8 px-2 md:px-2.5 rounded border inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors ml-1',
          open ? 'border-accent/50 text-accent bg-accent/10' : 'border-line text-ink-2 hover:text-ink hover:bg-bg-2')}>
        <Sparkles className="w-4 h-4" />
        <span className="hidden md:inline">Hỏi AI</span>
      </button>

      {open && (
        <section aria-label={assistant.name}
          className="animate-chat-in fixed z-50 inset-0 lg:inset-auto lg:top-[50px] lg:right-0 lg:bottom-0 lg:w-[420px] flex flex-col bg-bg lg:border-l border-line shadow-2xl shadow-black/40">
          <header className="flex items-center gap-2.5 h-14 pl-4 pr-2 border-b border-line bg-bg-1 shrink-0">
            <span className="w-7 h-7 rounded-lg border border-line bg-bg text-accent grid place-items-center shrink-0" aria-hidden="true">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-semibold text-[14px] leading-tight text-ink">{assistant.name}</h2>
              {lessonTitle && <p className="text-[11.5px] text-ink-3 truncate">{lessonTitle}</p>}
            </div>
            <button type="button" onClick={() => { setConversationId(null); setPanelKey((k) => k + 1); }}
              title="Hội thoại mới" aria-label="Bắt đầu hội thoại mới" className={iconBtn}>
              <Plus className="w-4 h-4" />
            </button>
            {conversationId && (
              <Link to={`${assistant.page}?c=${conversationId}`} title="Mở toàn màn hình" aria-label="Mở hội thoại ở trang trợ lý"
                className={iconBtn}>
                <Maximize2 className="w-4 h-4" />
              </Link>
            )}
            <button type="button" onClick={close} title="Đóng" aria-label="Đóng trợ lý AI của bài học" className={iconBtn}>
              <X className="w-[18px] h-[18px]" />
            </button>
          </header>
          <Suspense fallback={<div className="flex-1" />}>
            <ChatPanel key={`${lessonId}-${panelKey}`} assistant={assistant} lessonId={lessonId} conversationId={conversationId}
              onConversationChange={(id) => { setConversationId(id); if (!id) setPanelKey((k) => k + 1); }}
              autoFocus className="flex-1" />
          </Suspense>
        </section>
      )}
    </>
  );
}
