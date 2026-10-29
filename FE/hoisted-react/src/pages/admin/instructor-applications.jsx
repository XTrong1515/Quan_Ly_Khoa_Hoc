import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Ban, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const TABS = [['PENDING', 'Chờ duyệt'], ['APPROVED', 'Đã duyệt'], ['REJECTED', 'Từ chối'], ['', 'Tất cả']];
const BADGE = { PENDING: 'pending_review', APPROVED: 'active', REJECTED: 'rejected' };

/** Duyệt đơn đăng ký làm giảng viên. */
export default function AdminInstructorApplicationsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [rejecting, setRejecting] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-applications', status],
    queryFn: () => api.get('/api/admin/instructor-applications', { params: status ? { status } : {} }).then((r) => r.data),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-applications'] });

  const approve = useMutation({
    mutationFn: (id) => api.put(`/api/admin/instructor-applications/${id}/approve`),
    onSuccess: () => { toast.success('Đã duyệt — tài khoản đã được cấp quyền giảng viên'); refresh(); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa duyệt được đơn. Thử lại sau giây lát.')),
  });

  return (
    <div className="p-5 sm:p-8">
      <p className="eyebrow mb-1.5"><span className="text-accent">~/admin</span> <span className="text-ink-3">/ đơn-giảng-viên</span></p>
      <h1 className="font-display font-bold text-[24px] mb-5">Đơn đăng ký giảng viên</h1>

      <div className="flex items-center gap-1 mb-4 border-b border-line">
        {TABS.map(([v, l]) => (
          <button key={v || 'all'} onClick={() => setStatus(v)}
            className={cn('px-3 py-2 -mb-px border-b-2 text-[13px] font-medium flex items-center gap-2',
              status === v ? 'border-accent text-accent' : 'border-transparent text-ink-2 hover:text-ink')}>
            {l}
            {v === 'PENDING' && data?.pending > 0 && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-js/15 text-js">{data.pending}</span>}
          </button>
        ))}
      </div>

      {isLoading && <p className="font-mono text-[12px] text-ink-3">Đang tải…</p>}
      {!isLoading && (data?.applications ?? []).length === 0 && <p className="font-mono text-[12px] text-ink-3 py-6">// Không có đơn nào</p>}

      <div className="space-y-3">
        {(data?.applications ?? []).map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-[220px]">
                <p className="font-display font-semibold text-[15px] text-ink">{a.name}</p>
                <p className="font-mono text-[11px] text-ink-3">{a.email} · gửi {new Date(a.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <StatusBadge status={BADGE[a.status]} />
            </div>
            <p className="mt-3 text-[13.5px] text-ink font-medium">{a.headline}</p>
            <p className="text-[12.5px] text-accent mt-0.5">{a.expertise}</p>
            <p className="mt-2 text-[13px] text-ink-2 whitespace-pre-line leading-relaxed">{a.bio}</p>
            {a.courseIdea && <p className="mt-2 text-[12.5px] text-ink-3"><b className="text-ink-2">Ý tưởng khóa học:</b> {a.courseIdea}</p>}
            {a.portfolioUrl && (
              <a href={a.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow"
                className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> {a.portfolioUrl}
              </a>
            )}
            {a.adminNote && <p className="mt-2 text-[12.5px] text-danger">Lý do từ chối: {a.adminNote}</p>}
            {a.status === 'PENDING' && (
              <div className="flex justify-end gap-2 mt-4">
                <Button size="sm" variant="ghost" onClick={() => setRejecting(a)}><Ban className="w-3.5 h-3.5" /> Từ chối</Button>
                <Button size="sm" onClick={() => approve.mutate(a.id)} disabled={approve.isPending}><Check className="w-3.5 h-3.5" /> Duyệt</Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {rejecting && <RejectModal application={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); refresh(); }} />}
    </div>
  );
}

function RejectModal({ application, onClose, onDone }) {
  const [note, setNote] = useState('');
  const m = useMutation({
    mutationFn: () => api.put(`/api/admin/instructor-applications/${application.id}/reject`, { note }),
    onSuccess: () => { toast.success('Đã từ chối và gửi lý do'); onDone(); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa gửi được quyết định từ chối. Thử lại sau giây lát.')),
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-bg border border-line rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">// Từ chối đơn của {application.name}</p>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-2 text-ink-3"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={500} autoFocus
            placeholder="Lý do — người nộp sẽ thấy để bổ sung và gửi lại"
            className="w-full px-3 py-2 text-[13px] bg-bg border border-line rounded-lg text-ink focus:outline-none focus:border-accent resize-none" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
            <Button size="sm" onClick={() => m.mutate()} disabled={!note.trim() || m.isPending}>Từ chối</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
