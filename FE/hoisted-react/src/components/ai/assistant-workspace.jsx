import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, History, X, RotateCcw, Search, Pencil, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { ChatPanel } from '@/components/ai/chat-panel.jsx';
import { Dialog } from '@/components/ui/dialog.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const DAY = 86_400_000;

/** So khớp không phân biệt hoa thường / dấu tiếng Việt: "closure" khớp "Closure", "hoc" khớp "học". */
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Nhóm hội thoại theo thời gian cập nhật: Hôm nay / Hôm qua / 7 ngày qua / Cũ hơn. */
function groupByDate(conversations) {
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  const groups = [['Hôm nay', []], ['Hôm qua', []], ['7 ngày qua', []], ['Cũ hơn', []]];
  for (const c of conversations) {
    const at = new Date(c.updatedAt).getTime();
    const idx = at >= t0 ? 0 : at >= t0 - DAY ? 1 : at >= t0 - 7 * DAY ? 2 : 3;
    groups[idx][1].push(c);
  }
  return groups.filter(([, items]) => items.length);
}

function ConversationList({ query, activeId, onOpen, onDelete, deletingId, search = '' }) {
  if (query.isPending) {
    return (
      <div className="px-3 space-y-2" role="status" aria-label="Đang tải lịch sử">
        {[70, 85, 60, 78].map((w) => <div key={w} className="h-8 rounded-lg bg-bg-2 animate-pulse motion-reduce:animate-none" style={{ width: `${w}%` }} />)}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="px-4 py-3">
        <p className="text-[12.5px] text-ink-2">Chưa tải được lịch sử.</p>
        <button type="button" onClick={() => query.refetch()}
          className="mt-2 inline-flex items-center gap-1.5 h-[30px] px-3 rounded-md border border-line text-[12.5px] font-semibold text-ink hover:bg-bg-2">
          <RotateCcw className="w-3.5 h-3.5" /> Tải lại
        </button>
      </div>
    );
  }
  const all = query.data?.conversations ?? [];
  if (!all.length) {
    return <p className="px-4 py-2 text-[12.5px] leading-relaxed text-ink-3">Chưa có hội thoại nào. Câu hỏi đầu tiên sẽ tự lưu ở đây.</p>;
  }
  const q = fold(search.trim());
  const conversations = q ? all.filter((c) => fold(c.title).includes(q) || fold(c.lessonTitle).includes(q)) : all;
  if (!conversations.length) {
    return <p className="px-4 py-2 text-[12.5px] leading-relaxed text-ink-3">Không có hội thoại nào khớp “{search.trim()}”.</p>;
  }
  return (
    <nav aria-label="Lịch sử hội thoại" className="px-2 space-y-4">
      {groupByDate(conversations).map(([label, items]) => (
        <div key={label}>
          <p className="px-2.5 mb-1 font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3">{label}</p>
          <ul className="space-y-px">
            {items.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id} className={cn('group relative flex items-center rounded-lg transition-colors',
                  active ? 'bg-accent/10' : 'hover:bg-bg-2')}>
                  <button type="button" onClick={() => onOpen(c.id)} aria-current={active ? 'page' : undefined}
                    className={cn('flex-1 min-w-0 text-left pl-2.5 pr-9 py-2 rounded-lg text-[13px]',
                      active ? 'text-ink font-medium' : 'text-ink-2 group-hover:text-ink')}>
                    <span className="block truncate">{c.title}</span>
                    {c.lessonTitle && (
                      <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-3 font-normal">
                        <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span className="truncate"><span className="sr-only">Hỏi về bài </span>{c.lessonTitle}</span>
                      </span>
                    )}
                  </button>
                  <button type="button" onClick={() => onDelete(c)} disabled={deletingId === c.id}
                    aria-label={`Xóa hội thoại ${c.title ?? ''}`.trim()}
                    className="absolute right-1 w-7 h-7 rounded-md grid place-items-center text-ink-3 hover:text-danger hover:bg-bg-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Trang trợ lý toàn màn hình: lịch sử hội thoại (sidebar từ md, ngăn kéo trên điện thoại) + khung chat.
 * Hội thoại đang mở nằm trên URL (?c=id) để tải lại / chia sẻ giữa widget và trang này.
 */
export function AssistantWorkspace({ assistant, className }) {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const conversationId = params.get('c') ? Number(params.get('c')) : null;
  const select = (id) => setParams(id ? { c: String(id) } : {}, { replace: true });
  // Chỉ remount khung chat khi người dùng tự đổi hội thoại — không remount khi server vừa tạo
  // hội thoại mới giữa lúc đang stream (sẽ cắt ngang câu trả lời)
  const [panelKey, setPanelKey] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState(null); // tên đang sửa của hội thoại hiện tại
  const renameRef = useRef(null);
  const open = (id) => { select(id); setPanelKey((k) => k + 1); setDrawer(false); setRenaming(null); };
  const isRenaming = renaming !== null;
  useEffect(() => { if (isRenaming) renameRef.current?.select(); }, [isRenaming]);

  const list = useQuery({
    queryKey: ['ai-conversations', assistant.id],
    queryFn: () => api.get(`${assistant.api}/conversations`).then((r) => r.data),
  });
  const current = list.data?.conversations?.find((c) => c.id === conversationId);

  const remove = useMutation({
    mutationFn: (id) => api.delete(`${assistant.api}/conversations/${id}`),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ['ai-conversations', assistant.id] });
      qc.removeQueries({ queryKey: ['ai-conversation', assistant.id, id] });
      if (id === conversationId) open(null);
      toast.success('Đã xóa hội thoại');
    },
    onError: (err) => toast.error(apiMessage(err, 'Chưa xóa được hội thoại. Thử lại sau giây lát.')),
  });
  const rename = useMutation({
    mutationFn: ({ id, title }) => api.patch(`${assistant.api}/conversations/${id}`, { title }),
    onSuccess: () => { setRenaming(null); qc.invalidateQueries({ queryKey: ['ai-conversations', assistant.id] }); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa đổi được tên hội thoại. Thử lại sau giây lát.')),
  });
  const submitRename = () => {
    const title = renaming?.trim();
    if (!title || title === current?.title) { setRenaming(null); return; }
    rename.mutate({ id: conversationId, title });
  };
  const confirmDelete = (c) => {
    if (window.confirm(`Xóa hội thoại "${c.title}"? Toàn bộ tin nhắn trong đó sẽ mất.`)) remove.mutate(c.id);
  };

  const listProps = {
    query: list, activeId: conversationId, onOpen: open, onDelete: confirmDelete,
    deletingId: remove.isPending ? remove.variables : null, search,
  };
  const searchBox = (list.data?.conversations?.length ?? 0) > 3 && (
    <div className="relative mt-2">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3 pointer-events-none" aria-hidden="true" />
      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Tìm hội thoại"
        placeholder="Tìm hội thoại…"
        className="w-full h-[34px] pl-8 pr-2.5 rounded-lg border border-line bg-bg-3 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-accent/60" />
    </div>
  );
  const newButton = (
    <button type="button" onClick={() => open(null)}
      className="w-full inline-flex items-center justify-center gap-1.5 h-[38px] px-3 rounded-lg border border-line text-[13px] font-semibold text-ink hover:bg-bg-2 transition-colors">
      <Plus className="w-4 h-4" /> Hội thoại mới
    </button>
  );

  return (
    <div className={cn('grid md:grid-cols-[264px_1fr] min-h-0', className)}>
      <aside className="hidden md:flex flex-col min-h-0 border-r border-line bg-bg-1">
        <div className="px-4 pt-5 pb-4">
          <h1 className="font-display font-semibold text-[17px] text-ink">{assistant.name}</h1>
          <div className="mt-3">{newButton}</div>
          {searchBox}
        </div>
        <div className="flex-1 overflow-y-auto pb-4">
          <ConversationList {...listProps} />
        </div>
      </aside>

      <section className="flex flex-col min-h-0 min-w-0 bg-bg" aria-label={assistant.name}>
        <header className="flex items-center gap-2 h-12 px-3 sm:px-5 border-b border-line shrink-0">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Mở lịch sử hội thoại"
            className="md:hidden w-9 h-9 rounded-lg border border-line text-ink-2 grid place-items-center hover:bg-bg-2">
            <History className="w-4 h-4" />
          </button>
          {renaming !== null ? (
            <form className="flex-1 min-w-0" onSubmit={(e) => { e.preventDefault(); submitRename(); }}>
              <input ref={renameRef} value={renaming} onChange={(e) => setRenaming(e.target.value.slice(0, 120))}
                onBlur={submitRename} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setRenaming(null); } }}
                aria-label="Tên hội thoại" disabled={rename.isPending}
                className="w-full h-8 px-2.5 rounded-md border border-accent/60 bg-bg-3 text-[13.5px] font-medium text-ink outline-none" />
            </form>
          ) : (
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <p className="min-w-0 truncate text-[13.5px] font-medium text-ink">
                <span className="md:hidden sr-only">{assistant.name}: </span>
                {current?.title ?? (conversationId ? '' : 'Hội thoại mới')}
              </p>
              {current?.lessonId && current.lessonCourseId && (
                <Link to={`/learn/${current.lessonCourseId}/${current.lessonId}`} title={`Mở bài: ${current.lessonTitle}`}
                  className="hidden sm:inline-flex items-center gap-1 h-6 px-2 rounded-full border border-line text-[11.5px] text-ink-2 hover:text-ink hover:border-accent/40 max-w-[220px] shrink-0">
                  <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{current.lessonTitle}</span>
                </Link>
              )}
            </div>
          )}
          {conversationId && current && renaming === null && (
            <>
              <button type="button" onClick={() => setRenaming(current.title)} aria-label="Đổi tên hội thoại" title="Đổi tên"
                className="w-9 h-9 rounded-lg grid place-items-center text-ink-3 hover:text-ink hover:bg-bg-2">
                <Pencil className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => confirmDelete(current)} aria-label="Xóa hội thoại này" title="Xóa"
                className="w-9 h-9 rounded-lg grid place-items-center text-ink-3 hover:text-danger hover:bg-bg-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button type="button" onClick={() => open(null)} aria-label="Bắt đầu hội thoại mới"
            className="md:hidden w-9 h-9 rounded-lg border border-line text-ink-2 grid place-items-center hover:bg-bg-2">
            <Plus className="w-4 h-4" />
          </button>
        </header>
        <ChatPanel key={`${assistant.id}-${panelKey}`} assistant={assistant} conversationId={conversationId}
          onConversationChange={(id) => (id ? select(id) : open(null))} autoFocus wide className="flex-1" />
      </section>

      {drawer && (
        <Dialog onClose={() => setDrawer(false)} aria-label="Lịch sử hội thoại"
          className="m-0 h-dvh max-h-none w-[288px] max-w-[85vw] rounded-none border-0 border-r flex flex-col">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3">
            <h2 className="flex-1 font-display font-semibold text-[16px] text-ink">{assistant.name}</h2>
            <button type="button" onClick={() => setDrawer(false)} aria-label="Đóng lịch sử"
              className="w-9 h-9 rounded-lg border border-line text-ink-2 grid place-items-center hover:bg-bg-2">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-4 pb-4">{newButton}{searchBox}</div>
          <div className="flex-1 overflow-y-auto pb-6"><ConversationList {...listProps} /></div>
        </Dialog>
      )}
    </div>
  );
}
