import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit2, Trash2, ChevronDown, ChevronUp, Send, ExternalLink, AlertTriangle, Clock, Archive, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { ConfirmDialog } from '@/components/ui/confirm-dialog.jsx';
import { CourseBadge, CurriculumPanel, CourseModal, LEVEL_LABELS } from '@/components/course-editor.jsx';
import { api, apiMessage } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const API = '/api/instructor';
const FILTERS = [
  ['', 'Tất cả'], ['DRAFT', 'Nháp'], ['PENDING_REVIEW', 'Chờ duyệt'],
  ['PUBLISHED', 'Đã xuất bản'], ['REJECTED', 'Bị từ chối'], ['ARCHIVED', 'Lưu trữ'],
];
const EDITABLE = ['DRAFT', 'REJECTED', 'PUBLISHED'];
const SUBMITTABLE = ['DRAFT', 'REJECTED'];
// Xóa: chưa từng bán thì xóa thật, đã bán thì server chuyển Lưu trữ / giữ nguyên
const DELETABLE = ['DRAFT', 'REJECTED', 'ARCHIVED'];

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
  const [confirm, setConfirm]       = useState(null); // { kind: 'delete' | 'archive' | 'withdraw', course }

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
    onSuccess: () => { toast.success('Đã gửi duyệt. Bạn sẽ nhận thông báo khi có kết quả.'); invalidate(qc); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa gửi duyệt được khóa học. Thử lại sau giây lát.')),
  });
  const withdrawMutation = useMutation({
    mutationFn: (id) => api.post(`${API}/courses/${id}/withdraw`),
    onSuccess: () => { setConfirm(null); toast.success('Đã rút yêu cầu duyệt. Khóa học trở về Nháp để bạn chỉnh sửa.'); invalidate(qc); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa rút được yêu cầu duyệt. Thử lại sau giây lát.')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${API}/courses/${id}`).then((r) => r.data),
    onSuccess: (res) => {
      setConfirm(null);
      toast.success(res.deleted
        ? 'Đã xóa khóa học'
        : 'Khóa học đã có đơn hàng / học viên nên được chuyển sang Lưu trữ thay vì xóa');
      invalidate(qc);
    },
    onError: (err) => { setConfirm(null); toast.error(apiMessage(err, 'Chưa xóa được khóa học. Thử lại sau giây lát.')); },
  });
  const archiveMutation = useMutation({
    mutationFn: (id) => api.post(`${API}/courses/${id}/archive`),
    onSuccess: () => { setConfirm(null); toast.success('Đã ngừng bán. Học viên đã mua vẫn học tiếp.'); invalidate(qc); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa ngừng bán được khóa học. Thử lại sau giây lát.')),
  });
  const restoreMutation = useMutation({
    mutationFn: (id) => api.post(`${API}/courses/${id}/restore`),
    onSuccess: () => { toast.success('Đã khôi phục về Nháp. Gửi duyệt khi muốn bán lại.'); invalidate(qc); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa khôi phục được khóa học. Thử lại sau giây lát.')),
  });

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-1.5"><span className="text-accent">~/instructor</span> <span className="text-ink-3">/ khóa-học</span></p>
          <h1 className="display text-[32px]">Khóa học của tôi</h1>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-accent text-accent-ink press border-2 border-edge text-[13px] font-semibold">
          <Plus className="w-3.5 h-3.5" /> Tạo khóa mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên khóa học..."
            className="w-full pl-9 pr-3 py-2 text-[12px] bg-bg-3 border-2 border-edge rounded-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(([value, label]) => (
            <button key={value || 'all'} onClick={() => setStatus(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                status === value ? 'bg-accent text-accent-ink ring-2 ring-inset ring-edge' : 'text-ink-2 hover:bg-bg-2',
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
              <div className="flex items-start gap-2 px-4 py-2.5 bg-danger border-b-2 border-edge text-[12.5px] font-medium text-danger-ink">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p><span className="font-semibold">Bị từ chối:</span> {c.reject_reason} — chỉnh sửa rồi gửi duyệt lại.</p>
              </div>
            )}
            {c.status === 'PENDING_REVIEW' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-pop border-b-2 border-edge text-[12px] font-medium text-pop-ink">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Đang chờ quản trị viên duyệt{c.submitted_at ? ` · gửi lúc ${new Date(c.submitted_at).toLocaleString('vi-VN')}` : ''}.
                Nội dung khóa học tạm khóa chỉnh sửa — rút yêu cầu duyệt nếu cần sửa.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 px-4 py-3">
              <CourseBadge glyph={c.glyph} thumb={c.thumb} tag={c.tag} />
              <div className="flex-1 min-w-[180px]">
                <p className="font-medium text-ink line-clamp-1">{c.title}</p>
                <p className="font-mono text-[11px] text-ink-3 mt-0.5">
                  {c.category ?? '—'} · {LEVEL_LABELS[c.level] ?? c.level} · {c.total_lessons ?? 0} bài · {formatPrice(c.price)}
                  {c.status === 'PUBLISHED' && ` · ${c.student_count ?? 0} học viên`}
                </p>
              </div>
              <StatusBadge status={c.status?.toLowerCase()} />

              <div className="flex items-center gap-1">
                {SUBMITTABLE.includes(c.status) && (
                  <button
                    onClick={() => submitMutation.mutate(c.id)}
                    disabled={submitMutation.isPending}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-accent text-accent-ink press border-2 border-edge text-[12px] font-semibold disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" /> Gửi duyệt
                  </button>
                )}
                {c.status === 'PENDING_REVIEW' && (
                  <button
                    onClick={() => setConfirm({ kind: 'withdraw', course: c })}
                    disabled={withdrawMutation.isPending}
                    className="px-2.5 py-1.5 rounded-lg border-2 border-edge text-[12px] text-ink-2 hover:bg-bg-3 disabled:opacity-50">
                    Rút yêu cầu duyệt
                  </button>
                )}
                {c.status === 'ARCHIVED' && (
                  <button
                    onClick={() => restoreMutation.mutate(c.id)}
                    disabled={restoreMutation.isPending}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-bg-1 text-ink press border-2 border-edge text-[12px] font-semibold disabled:opacity-50">
                    <RotateCcw className="w-3.5 h-3.5" /> Khôi phục
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
                {c.status === 'PUBLISHED' && (
                  <button
                    onClick={() => setConfirm({ kind: 'archive', course: c })}
                    className="p-1.5 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors"
                    title="Ngừng bán" aria-label={`Ngừng bán khóa học "${c.title}"`}>
                    <Archive className="w-4 h-4" />
                  </button>
                )}
                {DELETABLE.includes(c.status) && (
                  <button
                    onClick={() => setConfirm({ kind: 'delete', course: c })}
                    className="p-1.5 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors"
                    title="Xóa khóa học" aria-label={`Xóa khóa học "${c.title}"`}>
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

      {confirm?.kind === 'delete' && (
        <ConfirmDialog
          title="Xóa khóa học?"
          confirmLabel="Xóa"
          destructive
          pending={deleteMutation.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() => deleteMutation.mutate(confirm.course.id)}>
          <p>
            <b className="text-ink">"{confirm.course.title}"</b> cùng toàn bộ bài học, video, tài liệu, quiz và bài tập
            sẽ bị xóa vĩnh viễn.
          </p>
          <p className="mt-2">
            {confirm.course.student_count > 0
              ? `Khóa đã có ${confirm.course.student_count} học viên nên sẽ được giữ ở trạng thái Lưu trữ thay vì xóa.`
              : 'Nếu khóa từng có đơn hàng, hệ thống giữ lại ở trạng thái Lưu trữ để đối soát doanh thu.'}
          </p>
        </ConfirmDialog>
      )}

      {confirm?.kind === 'archive' && (
        <ConfirmDialog
          title="Ngừng bán khóa học?"
          confirmLabel="Ngừng bán"
          destructive
          pending={archiveMutation.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() => archiveMutation.mutate(confirm.course.id)}>
          <p>
            <b className="text-ink">"{confirm.course.title}"</b> rời trang công khai và không ai mua được nữa.
            {confirm.course.student_count > 0 && <> {confirm.course.student_count} học viên đã mua <b className="text-ink">vẫn học tiếp</b>.</>}
          </p>
          <p className="mt-2">Quản trị viên sẽ được thông báo. Muốn bán lại: bấm Khôi phục rồi gửi duyệt.</p>
        </ConfirmDialog>
      )}

      {confirm?.kind === 'withdraw' && (
        <ConfirmDialog
          title="Rút yêu cầu duyệt?"
          confirmLabel="Rút yêu cầu"
          pending={withdrawMutation.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() => withdrawMutation.mutate(confirm.course.id)}>
          <p>
            <b className="text-ink">"{confirm.course.title}"</b> trở về Nháp; bạn cần gửi duyệt lại sau khi sửa.
          </p>
        </ConfirmDialog>
      )}

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
