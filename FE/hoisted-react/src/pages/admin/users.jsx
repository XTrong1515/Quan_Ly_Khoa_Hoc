import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Download, Plus, Lock, Unlock, ShieldCheck,
  ChevronDown, ChevronUp, BookOpen, X, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { api, apiMessage } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ── Avatar helpers ─────────────────────────────────────────────── */
const COLORS = ['#6366F1','#10B981','#8B5CF6','#F59E0B','#06B6D4','#EF4444','#EC4899','#F7DF1E'];
const avatarColor = (name) => COLORS[[...(name||'')].reduce((a,c) => a+c.charCodeAt(0),0) % COLORS.length];
const initials    = (name) => (name||'?').split(' ').map(w=>w[0]).join('').slice(-2).toUpperCase();

/* ── Role badge ─────────────────────────────────────────────────── */
const ROLE_CFG = {
  ADMIN: { label: 'Admin',   color: 'text-accent bg-accent/10' },
  USER:  { label: 'Student', color: 'text-ink-3 bg-bg-2'       },
};
function RoleBadge({ role }) {
  const cfg = ROLE_CFG[role] ?? ROLE_CFG.USER;
  return <span className={cn('inline-flex font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase', cfg.color)}>{cfg.label}</span>;
}

/* ── Queries ────────────────────────────────────────────────────── */
function useUsers(params) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => api.get('/api/admin/users', { params }).then(r => r.data),
    staleTime: 30_000,
  });
}
function useUserEnrollments(userId) {
  return useQuery({
    queryKey: ['admin-user-enrollments', userId],
    queryFn: () => api.get(`/api/admin/users/${userId}/enrollments`).then(r => r.data),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search,     setSearch]     = useState('');
  const [role,       setRole]       = useState('');
  const [status,     setStatus]     = useState('');
  const [sort,       setSort]       = useState('newest');
  const [page,       setPage]       = useState(1);
  const [selected,   setSelected]   = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const params = { search, role, status, sort, page, limit: 20 };
  const { data, isLoading } = useUsers(params);
  const users      = data?.users      ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total      = data?.total      ?? 0;
  const stats      = data?.stats      ?? {};

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setSelected(new Set()); };

  /* ── Mutations ── */
  const statusMutation = useMutation({
    mutationFn: ({ id, status: s }) => api.put(`/api/admin/users/${id}/status`, { status: s }),
    onSuccess: () => { toast.success('Đã cập nhật trạng thái'); invalidate(); },
    onError:   (err) => toast.error(apiMessage(err)),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role: r }) => api.put(`/api/admin/users/${id}/role`, { role: r }),
    onSuccess: () => { toast.success('Đã cập nhật vai trò'); invalidate(); },
    onError:   (err) => toast.error(apiMessage(err)),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, action }) => api.post('/api/admin/users/bulk', { ids: [...ids], action }),
    onSuccess: (d) => { toast.success(`Đã cập nhật ${d.data.affected} người dùng`); invalidate(); },
    onError:   (err) => toast.error(apiMessage(err)),
  });

  /* ── Selection ── */
  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelected(prev => prev.size === users.length ? new Set() : new Set(users.map(u => u.id)));

  /* ── Export ── */
  const handleExport = async () => {
    try {
      const res = await api.get('/api/admin/users/export', {
        params: { search, role, status },
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url; link.download = `users_${Date.now()}.csv`; link.click();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file CSV');
    } catch {
      toast.error('Xuất thất bại');
    }
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
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-[13px] text-ink-2 hover:bg-bg-2 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-ink text-[13px] font-semibold hover:opacity-90 transition-opacity">
            <Plus className="w-3.5 h-3.5" /> Mới người dùng
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng người dùng',    value: stats.totalUsers,    delta: null,    positive: true  },
          { label: 'Học viên mới tháng', value: stats.newThisMonth,  delta: null,    positive: true  },
          { label: 'Admin',              value: stats.admins,        delta: null,    positive: true  },
          { label: 'Đã khóa',            value: stats.locked,        delta: null,    positive: false },
        ].map(({ label, value, positive }) => (
          <div key={label} className="card p-5">
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1.5">{label}</p>
            <p className="font-mono font-bold text-[22px] text-ink leading-none mb-1">
              {value != null ? Number(value).toLocaleString() : '—'}
            </p>
            <div className={cn('w-1.5 h-1.5 rounded-full', positive ? 'bg-success' : 'bg-danger')} />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm tên, email..."
            className="w-full pl-9 pr-3 py-2 text-[12px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent" />
        </div>
        {[
          { value: role,   set: v => { setRole(v); setPage(1); },   opts: [['','Mọi vai trò'],['USER','Student'],['ADMIN','Admin']] },
          { value: status, set: v => { setStatus(v); setPage(1); }, opts: [['','Mọi status'],['ACTIVE','Hoạt động'],['LOCKED','Khóa']] },
          { value: sort,   set: v => { setSort(v); setPage(1); },   opts: [['newest','Mới nhất'],['oldest','Cũ nhất'],['name','Tên A-Z'],['spent','Chi nhiều nhất']] },
        ].map(({ value, set, opts }, i) => (
          <select key={i} value={value} onChange={e => set(e.target.value)}
            className="px-3 py-2 text-[12px] bg-bg border border-line rounded-lg text-ink focus:outline-none focus:border-accent">
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        {total > 0 && <span className="font-mono text-[11px] text-ink-3 ml-auto">{total.toLocaleString()} kết quả</span>}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-bg-2 border border-line rounded-lg">
          <span className="font-mono text-[12px] text-ink-2">{selected.size} đã chọn</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              disabled={bulkMutation.isPending}
              onClick={() => bulkMutation.mutate({ ids: selected, action: 'UNLOCK' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-[12px] text-ink-2 hover:bg-bg-3 transition-colors disabled:opacity-50">
              <Unlock className="w-3.5 h-3.5" /> Mở khóa
            </button>
            <button
              disabled={bulkMutation.isPending}
              onClick={() => bulkMutation.mutate({ ids: selected, action: 'LOCK' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-[12px] hover:bg-danger/20 transition-colors disabled:opacity-50">
              <Lock className="w-3.5 h-3.5" /> Khóa
            </button>
            <button onClick={() => setSelected(new Set())}
              className="w-7 h-7 rounded grid place-items-center text-ink-3 hover:text-ink hover:bg-bg-3 transition-colors">
              <X className="w-3.5 h-3.5" />
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
                  onChange={toggleAll} className="accent-accent" />
              </th>
              {['Người dùng','Vai trò','Khóa học','Tổng chi','Tham gia','Status',''].map(h => (
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
              <Fragment key={u.id}>
                <UserRow
                  user={u}
                  selected={selected.has(u.id)}
                  expanded={expandedId === u.id}
                  onSelect={() => toggleSelect(u.id)}
                  onToggleExpand={() => setExpandedId(expandedId === u.id ? null : u.id)}
                  onToggleStatus={() => statusMutation.mutate({ id: u.id, status: u.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' })}
                  onChangeRole={(r) => roleMutation.mutate({ id: u.id, role: r })}
                  isUpdating={statusMutation.isPending || roleMutation.isPending}
                />
                {expandedId === u.id && (
                  <tr className="bg-bg-2">
                    <td colSpan={8} className="px-4 py-3">
                      <UserEnrollmentsPanel userId={u.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p-1)}>←</Button>
          <span className="font-mono text-[13px] text-ink-2">{page} / {totalPages}</span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p+1)}>→</Button>
        </div>
      )}

      {/* Create user modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); invalidate(); }}
        />
      )}
    </div>
  );
}

/* ── User row ───────────────────────────────────────────────────── */
function UserRow({ user: u, selected, expanded, onSelect, onToggleExpand, onToggleStatus, onChangeRole, isUpdating }) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  return (
    <tr className={cn('hover:bg-bg-2 transition-colors', selected && 'bg-accent/5')}>
      <td className="px-4 py-3 w-8">
        <input type="checkbox" checked={selected} onChange={onSelect} className="accent-accent" />
      </td>

      {/* User */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          {u.avatar_url ? (
            <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full shrink-0 grid place-items-center font-mono font-bold text-[11px] text-bg"
              style={{ background: avatarColor(u.full_name) }}>
              {initials(u.full_name)}
            </div>
          )}
          <div>
            <p className="font-medium text-ink leading-none mb-0.5">{u.full_name}</p>
            <p className="font-mono text-[10px] text-ink-3">{u.email}</p>
          </div>
        </div>
      </td>

      {/* Role — click to change */}
      <td className="px-4 py-3">
        {u.role === 'ADMIN' ? (
          <RoleBadge role={u.role} />
        ) : (
          <div className="relative inline-block">
            <button
              onClick={() => setShowRoleMenu(v => !v)}
              disabled={isUpdating}
              className="flex items-center gap-1 group"
              title="Nhấn để đổi vai trò">
              <RoleBadge role={u.role} />
              <ChevronDown className="w-3 h-3 text-ink-3 group-hover:text-ink transition-colors" />
            </button>
            {showRoleMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowRoleMenu(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 bg-bg border border-line rounded-lg shadow-lg overflow-hidden min-w-[130px]">
                  {[['USER','Student'],['ADMIN','Admin']].map(([r, label]) => (
                    <button key={r}
                      onClick={() => { onChangeRole(r); setShowRoleMenu(false); }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-[12px] hover:bg-bg-2 transition-colors',
                        u.role === r ? 'text-accent font-semibold' : 'text-ink-2',
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </td>

      {/* Enrollments expand */}
      <td className="px-4 py-3">
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1 font-mono text-[12px] text-ink-3 hover:text-accent transition-colors">
          {u.enrollments ?? 0}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </td>

      {/* Total spent */}
      <td className="px-4 py-3 font-mono text-[12px] text-ink-3">
        {u.totalSpent > 0 ? formatVND(u.totalSpent) : '—'}
      </td>

      {/* Join date */}
      <td className="px-4 py-3 font-mono text-[11px] text-ink-3">
        {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : '—'}
      </td>

      {/* Status badge */}
      <td className="px-4 py-3"><StatusBadge status={u.status?.toLowerCase()} /></td>

      {/* Actions */}
      <td className="px-4 py-3">
        {u.role !== 'ADMIN' && (
          <button
            onClick={onToggleStatus}
            disabled={isUpdating}
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
  );
}

/* ── Create user modal ──────────────────────────────────────────── */
function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm]         = useState({ full_name: '', email: '', password: '', role: 'USER' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]     = useState({});

  const mutation = useMutation({
    mutationFn: () => api.post('/api/admin/users', form),
    onSuccess: () => { toast.success('Đã tạo người dùng mới'); onCreated(); },
    onError:   (err) => toast.error(apiMessage(err, 'Tạo thất bại')),
  });

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Bắt buộc';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ';
    if (form.password.length < 6) e.password = 'Tối thiểu 6 ký tự';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => { e.preventDefault(); if (validate()) mutation.mutate(); };
  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: '' })); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,15,25,0.7)' }}>
      <div className="w-full max-w-md bg-bg rounded-xl border border-line shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display font-semibold text-[16px]">Tạo người dùng mới</h2>
          <button onClick={onClose} className="w-7 h-7 rounded grid place-items-center text-ink-3 hover:text-ink hover:bg-bg-2 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Full name */}
          <div>
            <label className="font-mono text-[11px] text-ink-3 uppercase tracking-wide block mb-1.5">Họ tên</label>
            <input value={form.full_name} onChange={set('full_name')}
              placeholder="Nguyễn Văn A"
              className={cn('input w-full', errors.full_name && 'border-danger')} />
            {errors.full_name && <p className="font-mono text-[11px] text-danger mt-1">{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="font-mono text-[11px] text-ink-3 uppercase tracking-wide block mb-1.5">Email</label>
            <input value={form.email} onChange={set('email')} type="email"
              placeholder="user@example.com"
              className={cn('input w-full', errors.email && 'border-danger')} />
            {errors.email && <p className="font-mono text-[11px] text-danger mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="font-mono text-[11px] text-ink-3 uppercase tracking-wide block mb-1.5">Mật khẩu</label>
            <div className="relative">
              <input value={form.password} onChange={set('password')}
                type={showPass ? 'text' : 'password'}
                placeholder="Tối thiểu 6 ký tự"
                className={cn('input w-full pr-10', errors.password && 'border-danger')} />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="font-mono text-[11px] text-danger mt-1">{errors.password}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="font-mono text-[11px] text-ink-3 uppercase tracking-wide block mb-1.5">Vai trò</label>
            <select value={form.role} onChange={set('role')} className="input w-full">
              <option value="USER">Student</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1 justify-center" onClick={onClose}>Hủy</Button>
            <Button type="submit" className="flex-1 justify-center" disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang tạo…' : 'Tạo người dùng'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Enrollment detail panel ────────────────────────────────────── */
function UserEnrollmentsPanel({ userId }) {
  const { data, isLoading } = useUserEnrollments(userId);
  const enrollments = data?.enrollments ?? [];

  if (isLoading) return <p className="font-mono text-[12px] text-ink-3 py-2">Đang tải...</p>;
  if (!enrollments.length) return <p className="font-mono text-[12px] text-ink-3 py-2">// Chưa đăng ký khóa học nào</p>;

  return (
    <div className="space-y-2">
      {enrollments.map(e => (
        <div key={e.id} className="flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-line">
          <BookOpen className="w-3.5 h-3.5 text-ink-3 shrink-0" />
          <span className="flex-1 text-[13px] text-ink truncate">{e.courseTitle}</span>
          <div className="flex items-center gap-1.5 w-32 shrink-0">
            <div className="flex-1 h-1.5 rounded-full bg-bg-3 overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${Math.min(100, e.progress_percent ?? 0)}%` }} />
            </div>
            <span className="font-mono text-[10.5px] text-ink-3 w-9 text-right">
              {Number(e.progress_percent ?? 0).toFixed(0)}%
            </span>
          </div>
          <span className="font-mono text-[10.5px] text-ink-3 shrink-0 w-24 text-right">
            {new Date(e.enrolled_at).toLocaleDateString('vi-VN')}
          </span>
        </div>
      ))}
    </div>
  );
}
