import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, X, Maximize2, Plus } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { ChatPanel } from './chat-panel.jsx';

/** Nút trợ lý AI nổi góc phải — có trên các trang công khai (trừ trang /assistant). */
export function ChatWidget() {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [panelKey, setPanelKey] = useState(0);

  if (pathname.startsWith('/assistant')) return null;

  return (
    <>
      {open && (
        <div className="fixed z-50 bottom-20 right-4 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100dvh-7rem))] flex flex-col rounded-2xl border border-line bg-bg-1 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
            <Sparkles className="w-4 h-4 text-accent" />
            <p className="font-display font-semibold text-[14px] text-ink flex-1">Trợ lý AI</p>
            {role !== 'guest' && (
              <>
                <button onClick={() => { setConversationId(null); setPanelKey((k) => k + 1); }} title="Cuộc trò chuyện mới"
                  className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-bg-2"><Plus className="w-4 h-4" /></button>
                <Link to={conversationId ? `/assistant?c=${conversationId}` : '/assistant'} onClick={() => setOpen(false)} title="Mở toàn màn hình"
                  className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-bg-2"><Maximize2 className="w-4 h-4" /></Link>
              </>
            )}
            <button onClick={() => setOpen(false)} title="Đóng" className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-bg-2"><X className="w-4 h-4" /></button>
          </div>

          {role === 'guest' ? (
            <div className="flex-1 grid place-items-center p-6 text-center">
              <div>
                <p className="text-[13.5px] text-ink-2 mb-4">Đăng nhập để trò chuyện với trợ lý — gợi ý khóa học và lộ trình theo đúng trình độ của bạn.</p>
                <Link to="/login" onClick={() => setOpen(false)}
                  className="inline-flex px-4 py-2 rounded-lg bg-accent text-accent-ink text-[13px] font-semibold">Đăng nhập</Link>
              </div>
            </div>
          ) : (
            <ChatPanel key={panelKey} conversationId={conversationId} onConversationChange={setConversationId} className="flex-1" />
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'}
        className="fixed z-50 bottom-4 right-4 w-[52px] h-[52px] rounded-full bg-accent text-bg shadow-xl grid place-items-center hover:scale-105 transition-transform">
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>
    </>
  );
}
