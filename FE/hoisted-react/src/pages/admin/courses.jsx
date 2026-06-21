import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, Edit2, Trash2, X, ChevronDown, ChevronUp,
  GripVertical, Download, Star, ImageIcon, Link2, Upload, ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { api, apiMessage, downloadCsv } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ── Config ─────────────────────────────────────────────────────── */
const THUMB_COLORS = {
  yellow: '#F7DF1E', indigo: '#6366F1', rose: '#F43F5E',
  green:  '#10B981', violet: '#8B5CF6', sky:  '#06B6D4',
};
const LEVELS       = ['BEGINNER','INTERMEDIATE','ADVANCED'];
const STATUSES     = ['DRAFT','PUBLISHED','ARCHIVED'];
const LEVEL_LABELS = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' };

const courseSchema = z.object({
  title:            z.string().min(3, 'Tối thiểu 3 ký tự'),
  slug:             z.string().min(3).regex(/^[a-z0-9-]+$/, 'Chỉ chữ thường, số, dấu gạch ngang'),
  shortDescription: z.string().optional(),
  price:            z.coerce.number().min(0),
  originalPrice:    z.coerce.number().min(0).optional(),
  level:            z.enum(['BEGINNER','INTERMEDIATE','ADVANCED']),
  categoryId:       z.coerce.number().min(1, 'Chọn danh mục'),
  instructorName:   z.string().optional(),
  glyph:            z.string().optional(),
  thumb:            z.string().optional(),
  tag:              z.string().optional(),
  status:           z.enum(['DRAFT','PUBLISHED','ARCHIVED']),
  thumbnailUrl:     z.string().optional(),
});

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
  const [status, setStatus]     = useState('');
  const [sort, setSort]         = useState('manual');
  const [page, setPage]         = useState(1);
  const [modal, setModal]       = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dragSrcIdx = useRef(null);

  const params   = { search, category: catFilter, level, status, sort, page, limit: 15 };
  const { data, isLoading } = useCourses(params);
  const { data: catData }   = useCategories();
  const courses     = data?.courses ?? [];
  const totalPages  = data?.totalPages ?? 1;
  const total       = data?.total ?? 0;
  const categories  = catData?.categories ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/courses/${id}`),
    onSuccess: () => {
      toast.success('Đã xóa khóa học');
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      qc.invalidateQueries({ queryKey: ['home'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['course'] });
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const reorderMutation = useMutation({
    mutationFn: (items) => api.put('/api/admin/courses/reorder', items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-courses'] }),
    onError: (err) => toast.error(apiMessage(err, 'Không thể sắp xếp khóa học')),
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
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1">// Admin / Khóa học</p>
          <h1 className="font-display font-bold text-[24px]">Quản lý khóa học</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCsv('/api/admin/courses/export', { search, status }, `courses_${Date.now()}.csv`)
              .then(() => toast.success('Đã xuất file CSV'))
              .catch(() => toast.error('Xuất thất bại'))}
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
            opts: [['', 'Mọi trạng thái'], ...STATUSES.map(s => [s, s])] },
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
              <>
                <tr
                  key={c.id}
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
                  <td className="px-4 py-3 font-mono text-[12px]">{formatVND(c.price)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-3">
                    {c.student_count?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.rating ? (
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
                      <button
                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        className="p-1.5 rounded hover:bg-bg-3 text-ink-3 transition-colors"
                        title="Curriculum">
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
                        onClick={() => { if (window.confirm(`Xóa "${c.title}"?`)) deleteMutation.mutate(c.id); }}
                        className="p-1.5 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors"
                        title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                {expandedId === c.id && (
                  <tr key={`curriculum-${c.id}`}>
                    <td colSpan={9} className="bg-bg-2 px-6 pb-5 pt-0">
                      <CurriculumPanel courseId={c.id} courseTitle={c.title} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      {/* Modal */}
      {modal && (
        <CourseModal
          mode={modal.mode}
          initial={modal.data}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            qc.invalidateQueries({ queryKey: ['admin-courses'] });
            qc.invalidateQueries({ queryKey: ['home'] });
            qc.invalidateQueries({ queryKey: ['courses'] });
            qc.invalidateQueries({ queryKey: ['course'] });
          }}
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
    onError: (err) => toast.error(apiMessage(err)),
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

/* ── Course thumb badge ─────────────────────────────────────────── */
function CourseBadge({ glyph, thumb, tag }) {
  const bg = THUMB_COLORS[thumb] ?? THUMB_COLORS.yellow;
  return (
    <div className="relative shrink-0">
      <div className="w-12 h-12 rounded-lg grid place-items-center font-mono font-bold text-[14px] text-bg select-none"
        style={{ background: bg }}>
        {glyph || 'JS'}
      </div>
      {tag && (
        <span className="absolute -top-1.5 -right-1.5 font-mono text-[8px] font-bold px-1 py-0.5 rounded bg-danger text-white uppercase">
          {tag}
        </span>
      )}
    </div>
  );
}

/* ── Curriculum panel ───────────────────────────────────────────── */
function CurriculumPanel({ courseId, courseTitle }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen]       = useState(false);
  const [editLesson, setEditLesson] = useState(null);
  const [quizLesson, setQuizLesson] = useState(null);
  const [dragOver, setDragOver]     = useState(null);
  const dragSrc = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-lessons', courseId],
    queryFn: () => api.get(`/api/admin/courses/${courseId}/lessons`).then(r => r.data),
    staleTime: 30_000,
  });
  const lessons  = data?.lessons  ?? [];
  const sections = data?.sections ?? [];

  const grouped = sections.length
    ? sections.map(s => ({ ...s, items: lessons.filter(l => l.section_id === s.id) }))
    : [{ id: null, title: null, items: lessons }];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/lessons/${id}`),
    onSuccess: () => { toast.success('Đã xóa bài học'); qc.invalidateQueries({ queryKey: ['admin-lessons', courseId] }); },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const reorderMutation = useMutation({
    mutationFn: (items) => api.put('/api/admin/lessons/reorder', items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-lessons', courseId] }),
    onError: (err) => toast.error(apiMessage(err, 'Không thể sắp xếp bài học')),
  });

  const moveLesson = (lesson, dir) => {
    const idx = lessons.findIndex(l => l.id === lesson.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= lessons.length) return;
    reorderMutation.mutate([
      { id: lesson.id,           order_index: lessons[swapIdx].order_index },
      { id: lessons[swapIdx].id, order_index: lesson.order_index },
    ]);
  };

  const handleDrop = (sectionItems, srcIdx, dstIdx) => {
    setDragOver(null);
    dragSrc.current = null;
    if (srcIdx === dstIdx) return;
    const newOrder = [...sectionItems];
    const [moved] = newOrder.splice(srcIdx, 1);
    newOrder.splice(dstIdx, 0, moved);
    const sortedIndices = [...sectionItems].map(l => l.order_index).sort((a, b) => a - b);
    const updates = newOrder.map((l, i) => ({ id: l.id, order_index: sortedIndices[i] }));
    reorderMutation.mutate(updates);
  };

  return (
    <div className="mt-4">
      {/* Curriculum header */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">
          // Curriculum · {courseTitle}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddOpen(v => !v)}
            className="flex items-center gap-1.5 font-mono text-[11px] text-accent hover:underline">
            <Plus className="w-3 h-3" /> Bài học
          </button>
        </div>
      </div>

      {/* Add lesson form */}
      {addOpen && (
        <LessonForm
          courseId={courseId} sections={sections}
          onCancel={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['admin-lessons', courseId] }); }}
        />
      )}

      {/* Edit lesson form */}
      {editLesson && (
        <LessonForm
          courseId={courseId} sections={sections} initial={editLesson}
          onCancel={() => setEditLesson(null)}
          onSaved={() => { setEditLesson(null); qc.invalidateQueries({ queryKey: ['admin-lessons', courseId] }); }}
        />
      )}

      {isLoading && <p className="font-mono text-[12px] text-ink-3 py-2">Đang tải...</p>}

      {/* Sections */}
      <div className="border border-line rounded-lg overflow-hidden bg-bg">
        {grouped.map((section, si) => (
          <div key={section.id ?? 'root'}>
            {section.title && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-2 border-b border-line">
                <GripVertical className="w-3.5 h-3.5 text-ink-3" />
                <span className="font-mono text-[12px] font-semibold text-ink">{section.title}</span>
                <span className="font-mono text-[10px] text-ink-3 ml-auto">{section.items.length} bài</span>
              </div>
            )}
            {section.items.map((l, idx) => (
              <div key={l.id}
                draggable
                onDragStart={() => { dragSrc.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(section.items, dragSrc.current, idx)}
                onDragEnd={() => { setDragOver(null); dragSrc.current = null; }}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 border-b border-line last:border-0 transition-colors group',
                  dragOver === idx ? 'bg-accent/10 border-accent/30' : 'hover:bg-bg-2',
                )}>
                <GripVertical className="w-3.5 h-3.5 text-ink-3 cursor-grab active:cursor-grabbing shrink-0" />
                <span className="font-mono text-[10px] text-ink-3 w-5 shrink-0">
                  {String(l.order_index).padStart(2, '0')}
                </span>
                <span className={cn('flex-1 text-[13px] truncate', l.is_preview ? 'text-accent' : 'text-ink')}>
                  {l.title}
                </span>
                {l.is_preview && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent uppercase shrink-0">
                    Preview
                  </span>
                )}
                <span className="font-mono text-[10px] text-ink-3 shrink-0">{l.duration_minutes}m</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveLesson(l, -1)} disabled={idx === 0}
                    className="p-1 rounded hover:bg-bg-3 text-ink-3 disabled:opacity-30 transition-colors">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveLesson(l, 1)} disabled={idx === section.items.length - 1}
                    className="p-1 rounded hover:bg-bg-3 text-ink-3 disabled:opacity-30 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditLesson(l)}
                    className="p-1 rounded hover:bg-bg-3 text-ink-3 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setQuizLesson(l)} title="Quản lý Quiz"
                    className="p-1 rounded hover:bg-bg-3 text-ink-3 hover:text-accent transition-colors">
                    <ListChecks className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Xóa "${l.title}"?`)) deleteMutation.mutate(l.id); }}
                    className="p-1 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {section.items.length === 0 && (
              <p className="px-4 py-3 font-mono text-[11px] text-ink-3">// Chưa có bài học trong section này</p>
            )}
          </div>
        ))}

        {!isLoading && lessons.length === 0 && !grouped[0]?.title && (
          <p className="px-4 py-4 font-mono text-[12px] text-ink-3">// Chưa có bài học</p>
        )}
      </div>

      {quizLesson && (
        <QuizEditorModal
          lesson={quizLesson}
          onClose={() => setQuizLesson(null)}
        />
      )}
    </div>
  );
}

/* ── Lesson inline form ─────────────────────────────────────────── */
function LessonForm({ courseId, sections, initial, onCancel, onSaved }) {
  const [title,     setTitle]     = useState(initial?.title          ?? '');
  const [videoUrl,  setVideoUrl]  = useState(initial?.video_url      ?? '');
  const [duration,  setDuration]  = useState(initial?.duration_minutes ?? 0);
  const [sectionId, setSectionId] = useState(initial?.section_id     ?? '');
  const [isPreview, setIsPreview] = useState(!!initial?.is_preview);
  const [saving,    setSaving]    = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error('Tên bài học là bắt buộc'); return; }
    setSaving(true);
    try {
      const payload = { title, videoUrl, durationMinutes: +duration, sectionId: sectionId || null, isPreview };
      if (initial) {
        await api.put(`/api/admin/lessons/${initial.id}`, payload);
        toast.success('Đã cập nhật bài học');
      } else {
        await api.post(`/api/admin/courses/${courseId}/lessons`, payload);
        toast.success('Đã thêm bài học');
      }
      onSaved();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-wrap gap-3 items-end mb-3 px-4 py-3 bg-bg-2 border border-line rounded-lg">
      <div className="flex-1 min-w-[180px]">
        <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Tên bài học *</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          className={inputCls()} placeholder="Tên bài học" />
      </div>
      <div className="w-[220px]">
        <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Video URL</label>
        <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
          className={inputCls()} placeholder="https://youtu.be/..." />
      </div>
      <div className="w-[70px]">
        <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Phút</label>
        <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
          className={inputCls()} />
      </div>
      {sections.length > 0 && (
        <div className="w-[140px]">
          <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Section</label>
          <select value={sectionId} onChange={e => setSectionId(e.target.value)} className={inputCls()}>
            <option value="">-- Không --</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
      )}
      <label className="flex items-center gap-1.5 text-[12px] text-ink-2 cursor-pointer mb-0.5">
        <input type="checkbox" checked={isPreview} onChange={e => setIsPreview(e.target.checked)}
          className="accent-accent" /> Preview
      </label>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? '...' : 'Lưu'}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Hủy</Button>
      </div>
    </div>
  );
}

/* ── Course form modal ──────────────────────────────────────────── */
const THUMB_MODES = [
  { key: 'default', label: 'Mặc định', icon: ImageIcon },
  { key: 'url',     label: 'Link URL',  icon: Link2    },
  { key: 'upload',  label: 'Tải lên',  icon: Upload   },
];

function CourseModal({ mode, initial, categories, onClose, onSaved }) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: mode === 'edit' && initial ? {
      title: initial.title, slug: initial.slug,
      shortDescription: initial.short_description ?? '',
      price: initial.price, originalPrice: initial.original_price ?? 0,
      level: initial.level, categoryId: initial.categoryId ?? initial.category_id,
      instructorName: initial.instructor_name ?? '',
      glyph: initial.glyph ?? '', thumb: initial.thumb ?? 'yellow',
      tag: initial.tag ?? '', status: initial.status,
      thumbnailUrl: initial.thumbnail_url ?? '',
    } : { level: 'BEGINNER', status: 'DRAFT', thumb: 'yellow', price: 0, thumbnailUrl: '' },
  });

  // Determine initial thumb mode when editing
  const initMode = mode === 'edit' && initial?.thumbnail_url
    ? (initial.thumbnail_url.startsWith('blob:') ? 'upload' : 'url')
    : 'default';
  const [thumbMode,    setThumbMode]    = useState(initMode);
  const [uploadPreview, setUploadPreview] = useState(initial?.thumbnail_url ?? null);
  const [uploading,    setUploading]    = useState(false);
  const fileInputRef = useRef(null);

  const autoSlug = (t) =>
    t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');

  const handleThumbModeChange = (next) => {
    setThumbMode(next);
    if (next === 'default') {
      setValue('thumbnailUrl', '');
      setUploadPreview(null);
    }
    if (next === 'url') {
      setUploadPreview(null);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    const localUrl = URL.createObjectURL(file);
    setUploadPreview(localUrl);
    setValue('thumbnailUrl', ''); // clear until upload completes

    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data } = await api.post('/api/admin/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValue('thumbnailUrl', data.url);
      setUploadPreview(data.url);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      toast.error(apiMessage(err, 'Upload thất bại'));
      setUploadPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values) => {
    if (thumbMode === 'upload' && uploading) {
      toast.error('Vui lòng chờ ảnh upload xong');
      return;
    }
    // Clear thumbnailUrl when using default glyph/color mode
    const payload = {
      ...values,
      thumbnailUrl: thumbMode === 'default' ? null : (values.thumbnailUrl || null),
    };
    try {
      if (mode === 'create') {
        await api.post('/api/admin/courses', payload);
        toast.success('Đã tạo khóa học');
      } else {
        await api.put(`/api/admin/courses/${initial.id}`, payload);
        toast.success('Đã cập nhật khóa học');
      }
      onSaved();
    } catch (err) {
      toast.error(apiMessage(err));
    }
  };

  const thumbVal     = watch('thumb') ?? 'yellow';
  const glyphVal     = watch('glyph') ?? '';
  const thumbUrlVal  = watch('thumbnailUrl') ?? '';
  const previewImg   = thumbMode === 'upload' ? uploadPreview : (thumbMode === 'url' ? thumbUrlVal : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,15,25,0.8)' }}>
      <div className="w-full max-w-[660px] bg-bg border border-line rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line sticky top-0 bg-bg z-10">
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">
            {mode === 'create' ? '// Tạo khóa học mới' : '// Chỉnh sửa khóa học'}
          </p>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-2 text-ink-3 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5">
          {/* ── Thumbnail section ── */}
          <div className="mb-6 p-4 bg-bg-2 rounded-xl">
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-3">Thumbnail</p>

            {/* Mode tabs */}
            <div className="flex gap-1 mb-4">
              {THUMB_MODES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key} type="button"
                  onClick={() => handleThumbModeChange(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                    thumbMode === key
                      ? 'bg-accent text-bg'
                      : 'bg-bg border border-line text-ink-2 hover:bg-bg-3',
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Preview + controls */}
            <div className="flex items-start gap-4">
              {/* Preview box */}
              <div className="shrink-0 w-[120px]">
                {previewImg ? (
                  <div className="aspect-video rounded-lg overflow-hidden bg-bg-3 border border-line">
                    <img src={previewImg} className="w-full h-full object-cover" alt="preview" />
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg grid place-items-center font-mono font-bold text-[18px] text-bg"
                    style={{ background: THUMB_COLORS[thumbVal] ?? THUMB_COLORS.yellow }}>
                    {glyphVal || 'JS'}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex-1">
                {thumbMode === 'default' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Glyph (vd: JS, Rx, TS)">
                      <input {...register('glyph')} className={inputCls()} placeholder="JS" />
                    </Field>
                    <Field label="Màu nền">
                      <select {...register('thumb')} className={inputCls()}>
                        {Object.keys(THUMB_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                  </div>
                )}

                {thumbMode === 'url' && (
                  <Field label="Đường dẫn ảnh (https://...)">
                    <input
                      {...register('thumbnailUrl')}
                      className={inputCls()}
                      placeholder="https://example.com/image.jpg"
                    />
                  </Field>
                )}

                {thumbMode === 'upload' && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-[13px] font-medium transition-colors',
                        uploading
                          ? 'border-line text-ink-3 cursor-wait'
                          : 'border-accent text-accent hover:bg-accent/10',
                      )}>
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Đang upload...' : uploadPreview ? 'Chọn ảnh khác' : 'Chọn ảnh từ thiết bị'}
                    </button>
                    <p className="font-mono text-[10px] text-ink-3 mt-2">JPG, PNG, WebP — tối đa 5 MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên khóa học *" error={errors.title?.message} className="col-span-2">
              <input {...register('title', {
                onChange: e => { if (mode === 'create') setValue('slug', autoSlug(e.target.value)); }
              })} className={inputCls(errors.title)} placeholder="JavaScript: The Hard Parts" />
            </Field>

            <Field label="Slug *" error={errors.slug?.message}>
              <input {...register('slug')} className={inputCls(errors.slug)} placeholder="javascript-the-hard-parts" />
            </Field>

            <Field label="Tag">
              <input {...register('tag')} className={inputCls()} placeholder="Bestseller, Hot, Free..." />
            </Field>

            <Field label="Giá (VND) *" error={errors.price?.message}>
              <input type="number" {...register('price')} className={inputCls(errors.price)} />
            </Field>

            <Field label="Giá gốc (VND)">
              <input type="number" {...register('originalPrice')} className={inputCls()} />
            </Field>

            <Field label="Danh mục *" error={errors.categoryId?.message}>
              <select {...register('categoryId')} className={inputCls(errors.categoryId)}>
                <option value="">-- Chọn danh mục --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>

            <Field label="Cấp độ *" error={errors.level?.message}>
              <select {...register('level')} className={inputCls(errors.level)}>
                {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
              </select>
            </Field>

            <Field label="Giảng viên">
              <input {...register('instructorName')} className={inputCls()} placeholder="Tên giảng viên" />
            </Field>

            <Field label="Trạng thái *" error={errors.status?.message}>
              <select {...register('status')} className={inputCls(errors.status)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="Mô tả ngắn" className="col-span-2">
              <textarea {...register('shortDescription')} rows={2} className={cn(inputCls(), 'resize-none')}
                placeholder="Mô tả ngắn về khóa học..." />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-line">
            <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting ? 'Đang lưu...' : mode === 'create' ? 'Tạo khóa học' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */
const inputCls = (err) => cn(
  'w-full px-3 py-2 text-[13px] bg-bg border rounded-lg text-ink placeholder:text-ink-3 focus:outline-none transition-colors',
  err ? 'border-danger focus:border-danger' : 'border-line focus:border-accent',
);

function Field({ label, error, children, className }) {
  return (
    <div className={className}>
      <label className="block font-mono text-[10px] text-ink-3 mb-1.5 uppercase tracking-widest">{label}</label>
      {children}
      {error && <p className="mt-1 font-mono text-[11px] text-danger">{error}</p>}
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

/* ── Quiz Editor Modal ──────────────────────────────────────────── */
const EMPTY_QUESTION = () => ({
  question: '', type: 'single',
  options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
});

function QuizEditorModal({ lesson, onClose }) {
  const qc = useQueryClient();
  const queryKey = ['admin-quiz', lesson.id];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get(`/api/admin/lessons/${lesson.id}/quiz`).then(r => r.data),
  });

  const quiz = data?.quiz ?? null;

  // Settings form state
  const [title,     setTitle]     = useState('');
  const [passScore, setPassScore] = useState(70);
  const [savingSettings, setSavingSettings] = useState(false);

  // Question form state — null means closed
  const [qForm, setQForm] = useState(null);

  useEffect(() => {
    if (quiz) { setTitle(quiz.title ?? ''); setPassScore(quiz.passScore ?? 70); }
  }, [quiz]);

  const refresh = () => qc.invalidateQueries({ queryKey });

  /* Create quiz */
  const handleCreate = async () => {
    setSavingSettings(true);
    try {
      await api.post(`/api/admin/lessons/${lesson.id}/quiz`, { title, passScore });
      toast.success('Đã tạo quiz');
      refresh();
    } catch (err) { toast.error(apiMessage(err)); }
    finally { setSavingSettings(false); }
  };

  /* Update quiz settings */
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.put(`/api/admin/quizzes/${quiz.id}`, { title, passScore });
      toast.success('Đã lưu cài đặt');
      refresh();
    } catch (err) { toast.error(apiMessage(err)); }
    finally { setSavingSettings(false); }
  };

  /* Delete quiz */
  const handleDeleteQuiz = async () => {
    if (!window.confirm('Xóa toàn bộ quiz này?')) return;
    try {
      await api.delete(`/api/admin/quizzes/${quiz.id}`);
      toast.success('Đã xóa quiz');
      refresh();
    } catch (err) { toast.error(apiMessage(err)); }
  };

  /* Save question (add or update) */
  const handleSaveQuestion = async () => {
    const { id, question, type, options } = qForm;
    if (!question.trim()) { toast.error('Nhập câu hỏi'); return; }
    if (options.length < 2) { toast.error('Ít nhất 2 đáp án'); return; }
    if (!options.some(o => o.isCorrect)) { toast.error('Chọn ít nhất 1 đáp án đúng'); return; }
    if (options.some(o => !o.text.trim())) { toast.error('Đáp án không được để trống'); return; }
    try {
      if (id) {
        await api.put(`/api/admin/quiz-questions/${id}`, { question, type, options });
        toast.success('Đã cập nhật câu hỏi');
      } else {
        await api.post(`/api/admin/quizzes/${quiz.id}/questions`, { question, type, options });
        toast.success('Đã thêm câu hỏi');
      }
      setQForm(null);
      refresh();
    } catch (err) { toast.error(apiMessage(err)); }
  };

  /* Delete question */
  const handleDeleteQuestion = async (qId, qText) => {
    if (!window.confirm(`Xóa câu hỏi "${qText}"?`)) return;
    try {
      await api.delete(`/api/admin/quiz-questions/${qId}`);
      toast.success('Đã xóa câu hỏi');
      refresh();
    } catch (err) { toast.error(apiMessage(err)); }
  };

  /* Option helpers */
  const setOptionText = (i, v) =>
    setQForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? { ...o, text: v } : o) }));

  const setOptionCorrect = (i) =>
    setQForm(f => ({
      ...f,
      options: f.options.map((o, idx) =>
        f.type === 'single'
          ? { ...o, isCorrect: idx === i }
          : idx === i ? { ...o, isCorrect: !o.isCorrect } : o,
      ),
    }));

  const addOption = () =>
    setQForm(f => ({ ...f, options: [...f.options, { text: '', isCorrect: false }] }));

  const removeOption = (i) =>
    setQForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-bg border border-line rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line shrink-0">
          <div>
            <p className="font-mono text-[9px] text-ink-3 uppercase tracking-widest mb-0.5">Quiz</p>
            <p className="font-semibold text-[14px] text-ink truncate max-w-[480px]">{lesson.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-2 text-ink-3 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {isLoading && <p className="font-mono text-[12px] text-ink-3">Đang tải...</p>}

          {!isLoading && !quiz && (
            /* ── Create quiz ── */
            <div className="space-y-3">
              <p className="font-mono text-[11px] text-ink-3">// Bài học này chưa có quiz</p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Tiêu đề (tuỳ chọn)</label>
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="VD: Kiểm tra cuối bài" className={inputCls()} />
                </div>
                <div className="w-28">
                  <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Điểm đạt %</label>
                  <input type="number" min="1" max="100" value={passScore}
                    onChange={e => setPassScore(+e.target.value)} className={inputCls()} />
                </div>
                <Button size="sm" onClick={handleCreate} disabled={savingSettings}>Tạo quiz</Button>
              </div>
            </div>
          )}

          {!isLoading && quiz && (
            <>
              {/* ── Settings ── */}
              <div className="flex gap-3 items-end p-3 bg-bg-2 rounded-lg border border-line">
                <div className="flex-1">
                  <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Tiêu đề</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls()} />
                </div>
                <div className="w-24">
                  <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Điểm đạt %</label>
                  <input type="number" min="1" max="100" value={passScore}
                    onChange={e => setPassScore(+e.target.value)} className={inputCls()} />
                </div>
                <Button size="sm" onClick={handleSaveSettings} disabled={savingSettings}>Lưu</Button>
                <button onClick={handleDeleteQuiz}
                  className="p-1.5 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors" title="Xóa quiz">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* ── Questions list ── */}
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">
                  // {quiz.questions.length} câu hỏi
                </p>

                {quiz.questions.map((q, qi) => (
                  <div key={q.id} className="border border-line rounded-lg p-3 bg-bg">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium text-ink flex-1">
                        <span className="font-mono text-ink-3 mr-1.5">{qi + 1}.</span>
                        {q.question}
                      </p>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => setQForm({ id: q.id, question: q.question, type: q.type, options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })) })}
                          className="p-1 rounded hover:bg-bg-2 text-ink-3 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteQuestion(q.id, q.question)}
                          className="p-1 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {q.options.map(o => (
                        <div key={o.id} className={cn(
                          'flex items-center gap-2 text-[12px] px-2 py-1 rounded',
                          o.isCorrect ? 'text-success bg-success/10' : 'text-ink-3',
                        )}>
                          <span>{o.isCorrect ? '✓' : '○'}</span>
                          <span>{o.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* ── Add question button ── */}
                {!qForm && (
                  <button
                    onClick={() => setQForm(EMPTY_QUESTION())}
                    className="w-full py-2.5 border border-dashed border-line rounded-lg font-mono text-[11px] text-ink-3 hover:border-accent hover:text-accent transition-colors">
                    + Thêm câu hỏi
                  </button>
                )}
              </div>

              {/* ── Question form ── */}
              {qForm && (
                <div className="border border-accent/40 rounded-lg p-4 space-y-3 bg-bg">
                  <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">
                    // {qForm.id ? 'Sửa câu hỏi' : 'Câu hỏi mới'}
                  </p>

                  <textarea value={qForm.question} onChange={e => setQForm(f => ({ ...f, question: e.target.value }))}
                    rows={2} placeholder="Nhập câu hỏi..."
                    className={cn(inputCls(), 'resize-none w-full')} />

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[9px] text-ink-3 uppercase tracking-widest">Loại:</span>
                    {['single', 'multiple'].map(t => (
                      <label key={t} className="flex items-center gap-1.5 text-[12px] text-ink-2 cursor-pointer">
                        <input type="radio" name="qtype" checked={qForm.type === t}
                          onChange={() => setQForm(f => ({ ...f, type: t, options: f.options.map(o => ({ ...o, isCorrect: false })) }))}
                          className="accent-accent" />
                        {t === 'single' ? 'Một đáp án' : 'Nhiều đáp án'}
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {qForm.options.map((o, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type={qForm.type === 'single' ? 'radio' : 'checkbox'}
                          checked={o.isCorrect}
                          onChange={() => setOptionCorrect(i)}
                          className="accent-accent shrink-0"
                        />
                        <input value={o.text} onChange={e => setOptionText(i, e.target.value)}
                          placeholder={`Đáp án ${i + 1}`}
                          className={cn(inputCls(), 'flex-1')} />
                        {qForm.options.length > 2 && (
                          <button onClick={() => removeOption(i)}
                            className="p-1 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {qForm.options.length < 6 && (
                      <button onClick={addOption}
                        className="font-mono text-[11px] text-ink-3 hover:text-accent transition-colors">
                        + Thêm đáp án
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSaveQuestion}>Lưu câu hỏi</Button>
                    <Button size="sm" variant="ghost" onClick={() => setQForm(null)}>Hủy</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
