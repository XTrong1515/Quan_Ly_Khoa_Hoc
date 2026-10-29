import { useState, useRef, useEffect, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit2, Trash2, X, ChevronDown, ChevronUp,
  GripVertical, Download, Star, Check, Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import {
  CourseBadge, CurriculumPanel, CourseModal, inputCls,
  LEVELS, LEVEL_LABELS, STATUSES,
} from '@/components/course-editor.jsx';
import { api, apiMessage, downloadCsv } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const API = '/api/admin';
const STATUS_LABELS = {
  DRAFT: 'Nháp', PENDING_REVIEW: 'Chờ duyệt', PUBLISHED: 'Hoạt động', REJECTED: 'Bị từ chối', ARCHIVED: 'Lưu trữ',
};

function invalidateCourseQueries(qc) {
  for (const key of ['admin-courses', 'home', 'courses', 'course']) qc.invalidateQueries({ queryKey: [key] });
}

/* ── Queries ────────────────────────────────────────────────────── */
function useCourses(params) {
  return useQuery({
    queryKey: ['admin-courses', params],
    queryFn: () => api.get('/api/admin/courses', { params }).then(r => r.data),
    staleTime: 30_000,
  });
}
function useCategories() {
  return useQuery({
    queryKey: ['admin-categories-list'],
    queryFn: () => api.get('/api/admin/categories').then(r => r.data),
    staleTime: 300_000,
  });
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function AdminCoursesPage() {
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [level, setLevel]       = useState('');
  const [searchParams] = useSearchParams();
  const [status, setStatus]     = useState(() => searchParams.get('status') ?? '');
  const [sort, setSort]         = useState('manual');
  const [page, setPage]         = useState(1);
  const [modal, setModal]       = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dragSrcIdx = useRef(null);

  const params   = { search, category: catFilter, level, status, sort, page, limit: 15 };
  const { data, isLoading } = useCourses(params);
  const { data: catData }   = useCategories();
  const courses     = data?.courses ?? [];
  const totalPages  = data?.totalPages ?? 1;
  const total       = data?.total ?? 0;
  const pendingReview = data?.pendingReview ?? 0;
  const categories  = catData?.categories ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/courses/${id}`),
    onSuccess: () => {
      toast.success('Đã chuyển khóa học sang Lưu trữ');
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      qc.invalidateQueries({ queryKey: ['home'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['course'] });
    },
    onError: (err) => toast.error(apiMessage(err, 'Chưa lưu trữ được khóa học. Thử lại sau giây lát.')),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.put(`${API}/courses/${id}/approve`),
    onSuccess: () => { toast.success('Đã duyệt — khóa học đã xuất bản'); invalidateCourseQueries(qc); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa duyệt được khóa học. Thử lại sau giây lát.')),
  });

  const reorderMutation = useMutation({
    mutationFn: (items) => api.put('/api/admin/courses/reorder', items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-courses'] }),
    onError: (err) => toast.error(apiMessage(err, 'Chưa lưu được thứ tự khóa học. Tải lại trang để xem thứ tự hiện tại.')),
  });

  const handleCourseDrop = (dstIdx) => {
    setDragOverId(null);
    const srcIdx = dragSrcIdx.current;
    dragSrcIdx.current = null;
    if (srcIdx === null || srcIdx === dstIdx) return;
    const newOrder = [...courses];
    const [moved] = newOrder.splice(srcIdx, 1);
    newOrder.splice(dstIdx, 0, moved);
    const sortedOrders = [...courses].map(c => c.display_order ?? c.id).sort((a, b) => a - b);
    const updates = newOrder.map((c, i) => ({ id: c.id, display_order: sortedOrders[i] }));
    if (sort !== 'manual') setSort('manual');
    reorderMutation.mutate(updates);
  };

  return (
    <div className="p-5 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-1.5"><span className="text-accent">~/admin</span> <span className="text-ink-3">/ khóa-học</span></p>
          <h1 className="font-display font-bold text-[24px]">Quản lý khóa học</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCsv('/api/admin/courses/export', { search, status }, `courses_${Date.now()}.csv`)
              .then(() => toast.success('Đã xuất file CSV'))
              .catch(() => toast.error('Chưa xuất được file CSV. Thử lại sau giây lát.'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-[13px] text-ink-2 hover:bg-bg-2 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg text-[13px] font-semibold hover:opacity-90 transition-opacity">
            <Plus className="w-3.5 h-3.5" /> Tạo khóa mới
          </button>
        </div>
      </div>

      {/* Review tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-line">
        {[['', 'Tất cả'], ['PENDING_REVIEW', 'Chờ duyệt']].map(([value, label]) => (
          <button key={value || 'all'} onClick={() => { setStatus(value); setPage(1); }}
            className={cn(
              'px-3 py-2 -mb-px border-b-2 text-[13px] font-medium transition-colors flex items-center gap-2',
              status === value ? 'border-accent text-accent' : 'border-transparent text-ink-2 hover:text-ink',
            )}>
            {label}
            {value === 'PENDING_REVIEW' && pendingReview > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-js/15 text-js">{pendingReview}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo tên, instructor..."
            className="w-full pl-9 pr-3 py-2 text-[12px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
          />
        </div>
        {[
          { value: catFilter, set: v => { setCatFilter(v); setPage(1); },
            opts: [['', 'Mọi danh mục'], ...categories.map(c => [String(c.id), c.name])] },
          { value: level,     set: v => { setLevel(v); setPage(1); },
            opts: [['', 'Mọi cấp độ'], ...LEVELS.map(l => [l, LEVEL_LABELS[l]])] },
          { value: status,    set: v => { setStatus(v); setPage(1); },
            opts: [['', 'Mọi trạng thái'], ...STATUSES.map(s => [s, STATUS_LABELS[s]])] },
          { value: sort,      set: v => { setSort(v); setPage(1); },
            opts: [['manual', 'Thủ công'], ['newest', 'Mới nhất'], ['oldest', 'Cũ nhất'], ['students', 'Học viên']] },
        ].map(({ value, set, opts }, i) => (
          <select key={i} value={value} onChange={e => set(e.target.value)}
            className="px-3 py-2 text-[12px] bg-bg border border-line rounded-lg text-ink focus:outline-none focus:border-accent">
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        {total > 0 && (
          <span className="font-mono text-[11px] text-ink-3 ml-auto">
            {total.toLocaleString()} kết quả
          </span>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden mb-5">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-bg-2">
              <th className="px-4 py-2.5 w-10" />
              {['Khóa học', 'Danh mục', 'Giá', 'Học viên', 'Rating', 'Status', 'Cấp độ', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] text-ink-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center font-mono text-[12px] text-ink-3">Đang tải...</td></tr>
            )}
            {!isLoading && courses.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center font-mono text-[12px] text-ink-3">// Không có kết quả</td></tr>
            )}
            {courses.map((c, cIdx) => (
              <Fragment key={c.id}>
                <tr
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(c.id); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId(null); }}
                  onDrop={(e) => { e.preventDefault(); handleCourseDrop(cIdx); }}
                  onDragEnd={() => { setDragOverId(null); dragSrcIdx.current = null; }}
                  className={cn(
                    'transition-colors',
                    dragOverId === c.id ? 'bg-accent/10' : (expandedId === c.id ? 'bg-bg-2' : 'hover:bg-bg-2'),
                  )}
                >
                  {/* Drag handle — chỉ handle mới khởi động drag */}
                  <td className="px-4 py-3 w-10">
                    <span
                      draggable
                      onDragStart={(e) => {
                        dragSrcIdx.current = cIdx;
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(cIdx));
                        e.stopPropagation();
                      }}
                      className="inline-flex cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical className="w-4 h-4 text-ink-3" />
                    </span>
                  </td>

                  {/* Course thumb + title */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CourseBadge glyph={c.glyph} thumb={c.thumb} tag={c.tag} />
                      <div>
                        <p className="font-medium text-ink line-clamp-1 max-w-[200px]">{c.title}</p>
                        <p className="font-mono text-[10px] text-ink-3 mt-0.5">{c.instructor_name}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {c.category && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-bg-3 text-ink-3">{c.category}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px]">{formatPrice(c.price)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-3">
                    {c.student_count?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {Number(c.rating) > 0 ? (
                      <span className="flex items-center gap-1 font-mono text-[12px] text-ink-2">
                        <Star className="w-3.5 h-3.5 fill-js text-js" />
                        {Number(c.rating).toFixed(1)}
                      </span>
                    ) : <span className="text-ink-3">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusDropdown course={c} /></td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'font-mono text-[10px] px-2 py-0.5 rounded uppercase',
                      c.level === 'BEGINNER'     ? 'bg-success/10 text-success' :
                      c.level === 'INTERMEDIATE' ? 'bg-js/10 text-js' :
                                                   'bg-danger/10 text-danger',
                    )}>
                      {LEVEL_LABELS[c.level] ?? c.level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {c.status === 'PENDING_REVIEW' && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(c.id)}
                            disabled={approveMutation.isPending}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-success/15 text-success text-[11px] font-semibold hover:bg-success/25 transition-colors disabled:opacity-50"
                            title="Duyệt & xuất bản">
                            <Check className="w-3.5 h-3.5" /> Duyệt
                          </button>
                          <button
                            onClick={() => setRejecting(c)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-danger/10 text-danger text-[11px] font-semibold hover:bg-danger/20 transition-colors"
                            title="Từ chối">
                            <Ban className="w-3.5 h-3.5" /> Từ chối
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        className="p-1.5 rounded hover:bg-bg-3 text-ink-3 transition-colors"
                        title={expandedId === c.id ? "Ẩn danh sách bài học" : "Xem danh sách bài học"} aria-expanded={expandedId === c.id} aria-label={`Danh sách bài học của "${c.title}"`}>
                        {expandedId === c.id
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setModal({ mode: 'edit', data: c })}
                        className="p-1.5 rounded hover:bg-bg-3 text-ink-3 transition-colors"
                        title="Chỉnh sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Lưu trữ "${c.title}"?

Khóa học bị gỡ khỏi trang công khai và chuyển sang trạng thái Lưu trữ. Không áp dụng được với khóa đã có học viên.`)) deleteMutation.mutate(c.id); }}
                        className="p-1.5 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors"
                        title="Lưu trữ khóa học" aria-label={`Lưu trữ khóa học "${c.title}"`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                {expandedId === c.id && (
                  <tr key={`curriculum-${c.id}`}>
                    <td colSpan={9} className="bg-bg-2 px-6 pb-5 pt-0">
                      <CurriculumPanel apiBase={API} courseId={c.id} courseTitle={c.title} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      {/* Modal */}
      {modal && (
        <CourseModal
          apiBase={API}
          mode={modal.mode}
          initial={modal.data}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); invalidateCourseQueries(qc); }}
        />
      )}

      {rejecting && (
        <RejectModal
          course={rejecting}
          onClose={() => setRejecting(null)}
          onDone={() => { setRejecting(null); invalidateCourseQueries(qc); }}
        />
      )}
    </div>
  );
}

/* ── Inline status dropdown ─────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: 'Hoạt động', dot: 'bg-success' },
  { value: 'DRAFT',     label: 'Nháp',      dot: 'bg-ink-3'   },
  { value: 'ARCHIVED',  label: 'Lưu trữ',   dot: 'bg-ink-3'   },
];

function StatusDropdown({ course }) {
  const qc  = useQueryClient();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const mutation = useMutation({
    mutationFn: (status) => api.put(`/api/admin/courses/${course.id}`, { status }),
    onSuccess: (_, status) => {
      toast.success(`Đã chuyển sang "${STATUS_OPTIONS.find(o => o.value === status)?.label}"`);
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      qc.invalidateQueries({ queryKey: ['home'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['course'] });
      setOpen(false);
    },
    onError: (err) => toast.error(apiMessage(err, 'Chưa đổi được trạng thái khóa học. Thử lại sau giây lát.')),
  });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={mutation.isPending}
        className="flex items-center gap-1 hover:opacity-75 transition-opacity disabled:opacity-50">
        <StatusBadge status={course.status?.toLowerCase()} />
        <ChevronDown className={cn('w-3 h-3 text-ink-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-bg border border-line rounded-lg shadow-2xl py-1 min-w-[136px]">
          {STATUS_OPTIONS.map(opt => {
            const active = opt.value === course.status;
            return (
              <button
                key={opt.value}
                onClick={() => { if (!active) mutation.mutate(opt.value); }}
                disabled={active || mutation.isPending}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors text-left',
                  active ? 'cursor-default opacity-60' : 'hover:bg-bg-2',
                )}>
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', opt.dot)} />
                <span className="text-ink flex-1">{opt.label}</span>
                {active && <span className="text-accent text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


/* ── Từ chối khóa học (bắt buộc lý do) ─────────────────────────── */
function RejectModal({ course, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.put(`${API}/courses/${course.id}/reject`, { reason }),
    onSuccess: () => { toast.success('Đã từ chối và gửi lý do cho giảng viên'); onDone(); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa gửi được quyết định từ chối. Thử lại sau giây lát.')),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-bg border border-line rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">// Từ chối khóa học</p>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-2 text-ink-3"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[13px] text-ink">
            <span className="font-semibold">{course.title}</span>
            <span className="text-ink-3"> · {course.instructor_name ?? '—'}</span>
          </p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} maxLength={500} autoFocus
            placeholder="Lý do — giảng viên sẽ thấy nội dung này để chỉnh sửa và gửi lại"
            className={cn(inputCls(), 'resize-none')} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
            <Button size="sm" onClick={() => mutation.mutate()} disabled={!reason.trim() || mutation.isPending}>
              {mutation.isPending ? 'Đang gửi...' : 'Từ chối'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPage(p => p - 1)}>←</Button>
      <span className="font-mono text-[13px] text-ink-2">{page} / {totalPages}</span>
      <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => onPage(p => p + 1)}>→</Button>
    </div>
  );
}
