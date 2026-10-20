import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit2, Trash2, ChevronDown, ChevronUp, Send, ExternalLink, AlertTriangle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { CourseBadge, CurriculumPanel, CourseModal, LEVEL_LABELS } from '@/components/course-editor.jsx';
import { api, apiMessage } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

const API = '/api/instructor';
const FILTERS = [
  ['', 'Tất cả'], ['DRAFT', 'Nháp'], ['PENDING_REVIEW', 'Chờ duyệt'],
  ['PUBLISHED', 'Đã xuất bản'], ['REJECTED', 'Bị từ chối'],
];
const EDITABLE = ['DRAFT', 'REJECTED', 'PUBLISHED'];
const SUBMITTABLE = ['DRAFT', 'REJECTED'];

function invalidate(qc) {
  for (const key of ['instructor-courses', 'instructor-dashboard', 'home', 'courses', 'course']) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

export default function InstructorCoursesPage() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState('');
  const [modal, setModal]           = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['instructor-courses', { search, status }],
    queryFn: () => api.get(`${API}/courses`, { params: { search, status } }).then(r => r.data),
    staleTime: 30_000,
  });
  const { data: catData } = useQuery({
    queryKey: ['instructor-categories'],
    queryFn: () => api.get(`${API}/categories`).then(r => r.data),
    staleTime: 300_000,
  });
  const courses    = data?.courses ?? [];
  const categories = catData?.categories ?? [];

  const submitMutation = useMutation({
    mutationFn: (id) => api.post(`${API}/courses/${id}/submit`),
    onSuccess: () => { toast.success('Đã gửi duyệt — quản trị viên sẽ xem xét sớm'); invalidate(qc); },
    onError: (err) => toast.error(apiMessage(err)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${API}/courses/${id}`),
    onSuccess: () => { toast.success('Đã xóa khóa học'); invalidate(qc); },
    onError: (err) => toast.error(apiMessage(err)),
  });

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-1.5"><span className="text-accent">~/instructor</span> <span className="text-ink-3">/ khóa-học</span></p>
          <h1 className="font-display font-bold text-[24px]">Khóa học của tôi</h1>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg text-[13px] font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-3.5 h-3.5" /> Tạo khóa mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên khóa học..."
            className="w-full pl-9 pr-3 py-2 text-[12px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(([value, label]) => (
            <button key={value || 'all'} onClick={() => setStatus(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                status === value ? 'bg-accent/10 text-accent' : 'text-ink-2 hover:bg-bg-2',
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="font-mono text-[12px] text-ink-3 py-8 text-center">Đang tải...</p>}
      {!isLoading && courses.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-ink-2 text-[14px] mb-3">
            {status || search ? 'Không có khóa học phù hợp.' : 'Bạn chưa có khóa học nào.'}
          </p>
          {!status && !search && (
            <button onClick={() => setModal({ mode: 'create' })} className="font-mono text-[12px] text-accent hover:underline">
              + Tạo khóa học đầu tiên
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {courses.map((c) => (
          <div key={c.id} className="card overflow-hidden">
            {c.status === 'REJECTED' && c.reject_reason && (
              <div className="flex items-start gap-2 px-4 py-2.5 bg-danger/10 border-b border-danger/20 text-[12.5px] text-danger">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p><span className="font-semibold">Bị từ chối:</span> {c.reject_reason} — chỉnh sửa rồi gửi duyệt lại.</p>
              </div>
            )}
            {c.status === 'PENDING_REVIEW' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-js/10 border-b border-js/20 text-[12px] text-js">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Đang chờ quản trị viên duyệt{c.submitted_at ? ` · gửi lúc ${new Date(c.submitted_at).toLocaleString('vi-VN')}` : ''}.
                Thông tin khóa học tạm khóa chỉnh sửa.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 px-4 py-3">
              <CourseBadge glyph={c.glyph} thumb={c.thumb} tag={c.tag} />
              <div className="flex-1 min-w-[180px]">
                <p className="font-medium text-ink line-clamp-1">{c.title}</p>
                <p className="font-mono text-[10.5px] text-ink-3 mt-0.5">
                  {c.category ?? '—'} · {LEVEL_LABELS[c.level] ?? c.level} · {c.total_lessons ?? 0} bài · {formatVND(c.price)}
                  {c.status === 'PUBLISHED' && ` · ${c.student_count ?? 0} học viên`}
                </p>
              </div>
              <StatusBadge status={c.status?.toLowerCase()} />

              <div className="flex items-center gap-1">
                {SUBMITTABLE.includes(c.status) && (
                  <button
                    onClick={() => submitMutation.mutate(c.id)}
                    disabled={submitMutation.isPending}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent text-bg text-[12px] font-semibold hover:opacity-90 disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" /> Gửi duyệt
                  </button>
                )}
                {c.status === 'PUBLISHED' && (
                  <Link to={`/courses/${c.slug}`} target="_blank"
                    className="p-1.5 rounded hover:bg-bg-3 text-ink-3 transition-colors" title="Xem trang khóa học">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
                <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  className="p-1.5 rounded hover:bg-bg-3 text-ink-3 transition-colors" title="Nội dung bài học">
                  {expandedId === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setModal({ mode: 'edit', data: c })}
                  disabled={!EDITABLE.includes(c.status)}
                  className="p-1.5 rounded hover:bg-bg-3 text-ink-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={EDITABLE.includes(c.status) ? 'Chỉnh sửa' : 'Không thể sửa lúc này'}>
                  <Edit2 className="w-4 h-4" />
                </button>
                {SUBMITTABLE.includes(c.status) && (
                  <button
                    onClick={() => { if (window.confirm(`Xóa "${c.title}"?`)) deleteMutation.mutate(c.id); }}
                    className="p-1.5 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors" title="Xóa">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {expandedId === c.id && (
              <div className="bg-bg-2 px-5 pb-5 pt-0 border-t border-line">
                <CurriculumPanel apiBase={API} courseId={c.id} courseTitle={c.title} />
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <CourseModal
          apiBase={API}
          variant="instructor"
          mode={modal.mode}
          initial={modal.data}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); invalidate(qc); }}
        />
      )}
    </div>
  );
}
