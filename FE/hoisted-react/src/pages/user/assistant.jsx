import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Seo } from '@/components/seo.jsx';
import { ChatPanel } from '@/components/ai/chat-panel.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Trang trợ lý AI toàn màn hình — danh sách hội thoại + khung chat. */
export default function AssistantPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const conversationId = params.get('c') ? Number(params.get('c')) : null;
  const select = (id) => setParams(id ? { c: String(id) } : {}, { replace: true });
  // Chỉ remount khung chat khi người dùng tự đổi hội thoại — không remount khi server vừa tạo
  // hội thoại mới giữa lúc đang stream (sẽ cắt ngang câu trả lời)
  const [panelKey, setPanelKey] = useState(0);
  const open = (id) => { select(id); setPanelKey((k) => k + 1); };

  const { data } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => api.get('/api/ai/conversations').then((r) => r.data),
  });
  const conversations = data?.conversations ?? [];

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/api/ai/conversations/${id}`),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ['ai-conversations'] });
      if (id === conversationId) open(null);
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  return (
    <>
      <Seo title="Trợ lý AI — Hoisted" description="Hỏi trợ lý AI về lộ trình học và khóa học JavaScript phù hợp." />
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid md:grid-cols-[260px_1fr] gap-4 h-[calc(100dvh-180px)] min-h-[480px]">
          <aside className="hidden md:flex flex-col card overflow-hidden">
            <button onClick={() => open(null)}
              className="m-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-ink text-[13px] font-semibold">
              <Plus className="w-4 h-4" /> Cuộc trò chuyện mới
            </button>
            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
              {conversations.length === 0 && <p className="px-2 py-3 font-mono text-[11px] text-ink-3">// Chưa có hội thoại</p>}
              {conversations.map((c) => (
                <div key={c.id}
                  className={cn('group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-[13px]',
                    c.id === conversationId ? 'bg-accent/10 text-accent' : 'text-ink-2 hover:bg-bg-2')}
                  onClick={() => open(c.id)}>
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 truncate">{c.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (window.confirm('Xóa hội thoại này?')) remove.mutate(c.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-3 hover:text-danger" title="Xóa">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </aside>

          <section className="card overflow-hidden flex flex-col">
            <ChatPanel key={panelKey} conversationId={conversationId} onConversationChange={select} className="flex-1" />
          </section>
        </div>
      </div>
    </>
  );
}
