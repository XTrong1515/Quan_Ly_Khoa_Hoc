import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download, Plus, Lock, Unlock, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ── Avatar helpers ─────────────────────────────────────────────── */
const AVATAR_COLORS = ['#6366F1','#10B981','#8B5CF6','#F59E0B','#06B6D4','#EF4444','#EC4899','#F7DF1E'];
function avatarColor(name) {
  const i = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();
}

/* ── Role badge ─────────────────────────────────────────────────── */
const ROLE_CFG = {
  ADMIN:      { label: 'Admin',      color: 'text-accent bg-accent/10' },
  INSTRUCTOR: { label: 'Instructor', color: 'text-[#8B5CF6] bg-[#8B5CF6]/10' },
  PRO:        { label: 'Pro',        color: 'text-success bg-success/10' },
  USER:       { label: 'Student',    color: 'text-ink-3 bg-bg-2' },
};
function RoleBadge({ role }) {
  const cfg = ROLE_CFG[role] ?? ROLE_CFG.USER;
  return (
    <span className={cn('inline-flex font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase', cfg.color)}>
      {cfg.label}
    </span>
  );
}

/* ── Queries ────────────────────────────────────────────────────── */
function useUsers(params) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => api.get('/api/admin/users', { params }).then(r => r.data),
    staleTime: 30_000,
  });
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [role,   setRole]   = useState('');
  const [status, setStatus] = useState('');
  const [sort,   setSort]   = useState('newest');
  const [page,   setPage]   = useState(1);
  const [selected, setSelected] = useState(new Set());

  const params = { search, role, status, sort, page, limit: 20 };
  const { data, isLoading } = useUsers(params);
  const users      = data?.users ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total      = data?.total ?? 0;
  const stats      = data?.stats ?? {};

  const statusMutation = useMutation({
    mutationFn: ({ id, status: s }) => api.put(`/api/admin/users/${id}/status`, { status: s }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setSelected(new Set());
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === users.length ? new Set() : new Set(users.map(u => u.id)));
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1">// Admin / Người dùng</p>
          <h1 className="font-display font-bold text-[24px]">Quản lý người dùng</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-[13px] text-ink-2 hover:bg-bg-2 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg text-[13px] font-semibold hover:opacity-90 transition-opacity">
            <Plus className="w-3.5 h-3.5" /> Mới người dùng
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng người dùng',    value: (stats.totalUsers   ?? 12_481).toLocaleString(), delta: '+218', positive: true  },
          { label: 'Học viên mới tháng', value: (stats.newThisMonth ?? 3_842).toLocaleString(),  delta: '+121', positive: true  },
          { label: 'Instructor',          value: (stats.instructors  ?? 18).toLocaleString(),     delta: '+2',   positive: true  },
          { label: 'Đã khóa',            value: (stats.locked       ?? 34).toLocaleString(),     delta: '+4',   positive: false },
        ].map(({ label, value, delta, positive }) => (
          <div key={label} className="card p-5">
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1.5">{label}</p>
            <p className="font-mono font-bold text-[22px] text-ink leading-none mb-1">{value}</p>
            <p className={cn('font-mono text-[11px]', positive ? 'text-success' : 'text-danger')}>
              {positive ? '▲' : '▼'} {delta}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm tên, email, ID..."
            className="w-full pl-9 pr-3 py-2 text-[12px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent" />
        </div>
        {[
          { value: role,   set: (v) => { setRole(v); setPage(1); },   opts: [['', 'Mọi vai trò'], ['USER','Student'], ['PRO','Pro'], ['INSTRUCTOR','Instructor'], ['ADMIN','Admin']] },
          { value: status, set: (v) => { setStatus(v); setPage(1); }, opts: [['', 'Mọi status'], ['ACTIVE','Hoạt động'], ['LOCKED','Khóa']] },
          { value: sort,   set: (v) => { setSort(v); setPage(1); },   opts: [['newest','Sắp xếp: mới nhất'], ['oldest','Cũ nhất'], ['name','Tên A-Z']] },
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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-bg-2 border border-line rounded-lg">
          <span className="font-mono text-[12px] text-ink-2">{selected.size} đã chọn</span>
          <div className="flex items-center gap-2 ml-auto">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-[12px] text-ink-2 hover:bg-bg-3 transition-colors">
              <Mail className="w-3.5 h-3.5" /> Gửi email
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-[12px] text-ink-2 hover:bg-bg-3 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" /> Đặt vai trò
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-[12px] hover:bg-danger/20 transition-colors">
              <Lock className="w-3.5 h-3.5" /> Khóa
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden mb-5">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-bg-2">
              <th className="px-4 py-2.5 w-8">
                <input type="checkbox"
                  checked={users.length > 0 && selected.size === users.length}
                  onChange={toggleAll}
                  className="accent-accent" />
              </th>
              {['Người dùng', 'Vai trò', 'Khóa học', 'Tổng chi', 'Tham gia', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] text-ink-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center font-mono text-[12px] text-ink-3">Đang tải...</td></tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center font-mono text-[12px] text-ink-3">// Không có kết quả</td></tr>
            )}
            {users.map(u => (
              <tr key={u.id}
                className={cn('hover:bg-bg-2 transition-colors', selected.has(u.id) && 'bg-accent/5')}>
                <td className="px-4 py-3 w-8">
                  <input type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleSelect(u.id)}
                    className="accent-accent" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full shrink-0 grid place-items-center font-mono font-bold text-[11px] text-bg"
                      style={{ background: avatarColor(u.full_name) }}>
                      {initials(u.full_name)}
                    </div>
                    <div>
                      <p className="font-medium text-ink leading-none mb-0.5">{u.full_name}</p>
                      <p className="font-mono text-[10px] text-ink-3">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{u.enrollments ?? 0}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-3">
                  {u.totalSpent ? `${(u.totalSpent / 1_000_000).toFixed(1)}M` : '—'}
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-3">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={u.status?.toLowerCase()} /></td>
                <td className="px-4 py-3">
                  {u.role !== 'ADMIN' && (
                    <button
                      onClick={() => statusMutation.mutate({ id: u.id, status: u.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' })}
                      disabled={statusMutation.isPending}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-colors',
                        u.status === 'ACTIVE'
                          ? 'bg-danger/10 text-danger hover:bg-danger/20'
                          : 'bg-success/10 text-success hover:bg-success/20',
                      )}>
                      {u.status === 'ACTIVE'
                        ? <><Lock className="w-3 h-3" /> Khóa</>
                        : <><Unlock className="w-3 h-3" /> Mở</>}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</Button>
          <span className="font-mono text-[13px] text-ink-2">{page} / {totalPages}</span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</Button>
        </div>
      )}
    </div>
  );
}
