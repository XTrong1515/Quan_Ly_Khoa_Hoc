import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { Dialog } from '@/components/ui/dialog.jsx';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { api, apiMessage, downloadCsv } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ── Avatar helpers ─────────────────────────────────────────────── */
// Màu sáng phẳng — chữ navy trên mọi ô đạt ≥ 4.5:1
const AVATAR_COLORS = ['#FFCF33','#29B6F6','#1DB06B','#8FB3FF','#FF8FB1','#FF9F43','#B9A6FF','#7FE0C2'];
function avatarColor(name) {
  const i = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();
}

/* ── Queries ────────────────────────────────────────────────────── */
function useOrders(params) {
  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => api.get('/api/admin/orders', { params }).then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

/* ── Tab config ─────────────────────────────────────────────────── */
const STATUS_TABS = [
  { value: '',           label: 'Tất cả' },
  { value: 'PAID',       label: 'Đã thanh toán' },
  { value: 'PENDING',    label: 'Đang chờ' },
  { value: 'FAILED',     label: 'Thất bại' },
  { value: 'CANCELLED',  label: 'Đã hủy' },
];

/* ── Page ───────────────────────────────────────────────────────── */
export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [activeTab, setActiveTab]   = useState('');
  const [page, setPage]             = useState(1);
  const [detailOrder, setDetailOrder] = useState(null);

  const params = { search, status: activeTab, page, limit: 15 };
  const { data, isLoading, isError, refetch } = useOrders(params);
  const stats      = data?.todayStats;
  const orders     = data?.orders ?? [];
  const totalPages = data?.totalPages ?? 1;
  const counts     = data?.counts ?? {};

  const confirmMutation = useMutation({
    mutationFn: (id) => api.put(`/api/admin/orders/${id}/confirm`),
    onSuccess: () => { toast.success('Đã xác nhận đơn hàng'); qc.invalidateQueries({ queryKey: ['admin-orders'] }); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa xác nhận được đơn hàng. Thử lại sau giây lát.')),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.put(`/api/admin/orders/${id}/cancel`),
    onSuccess: () => { toast.success('Đã hủy đơn hàng'); qc.invalidateQueries({ queryKey: ['admin-orders'] }); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa hủy được đơn hàng. Thử lại sau giây lát.')),
  });

  return (
    <div className="p-5 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-1.5"><span className="text-accent">~/admin</span> <span className="text-ink-3">/ đơn-hàng</span></p>
          <h1 className="display text-[32px]">Quản lý đơn hàng</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-3">
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
            cập nhật real-time · cách 30s
          </div>
          <button
            onClick={() => downloadCsv('/api/admin/orders/export', { search, status: activeTab }, `orders_${Date.now()}.csv`)
              .then(() => toast.success('Đã xuất file CSV'))
              .catch(() => toast.error('Chưa xuất được file CSV. Thử lại sau giây lát.'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-edge text-[13px] text-ink-2 hover:bg-bg-2 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Đơn hôm nay',       value: stats ? stats.todayOrders : '—',                  dot: false },
          { label: 'Đang chờ TT',       value: stats ? stats.pendingCount : '—',                 dot: true  },
          { label: 'Doanh thu hôm nay', value: stats ? formatVND(stats.todayRevenue) : '—',      dot: false },
          { label: 'Tỉ lệ failed',      value: stats ? `${stats.failRate}%` : '—',               dot: false },
        ].map(({ label, value, dot }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="font-mono text-[11px] text-ink-3 uppercase tracking-widest">{label}</p>
              {dot && <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
            </div>
            <p className="font-mono font-extrabold tracking-tight text-[24px] text-ink leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3 sm:gap-4">
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_TABS.map(({ value, label }) => {
            const cnt = value === '' ? counts.total : counts[value];
            return (
              <button key={value}
                onClick={() => { setActiveTab(value); setPage(1); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[12px] transition-colors border whitespace-nowrap',
                  activeTab === value
                    ? 'bg-accent text-accent-ink ring-2 ring-inset ring-edge'
                    : 'text-ink-3 border-transparent hover:bg-bg-2 hover:text-ink',
                )}>
                {label}
                {cnt != null && (
                  <span className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded-sm',
                    activeTab === value ? 'bg-bg-1 text-ink font-bold' : 'bg-bg-3 text-ink-2',
                  )}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-56 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo mã đơn / email..."
            className="w-full pl-9 pr-3 py-2 text-[12px] bg-bg-3 border-2 border-edge rounded-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto mb-5">
        <table className="w-full min-w-[1040px] text-[13px]">
          <thead>
            <tr className="border-b border-line bg-bg-2">
              {['Mã đơn', 'Khách hàng', 'Items', 'Tổng', 'Phương thức', 'Thời gian', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left font-mono text-[11px] text-ink-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center font-mono text-[12px] text-ink-3">Đang tải...</td></tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-ink-2">
                  Không tải được danh sách đơn hàng.
                  <Button size="sm" variant="ghost" className="ml-3" onClick={() => refetch()}>Thử lại</Button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && orders.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center font-mono text-[12px] text-ink-3">// Không có đơn hàng</td></tr>
            )}
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-bg-2 transition-colors">
                <td className="px-4 py-3 font-mono text-[12px] text-accent">{o.order_code}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-sm border-2 border-edge shrink-0 grid place-items-center font-mono font-bold text-[11px] text-navy"
                      style={{ background: avatarColor(o.userName) }}>
                      {initials(o.userName)}
                    </div>
                    <div>
                      <p className="text-ink font-medium leading-none mb-0.5">{o.userName}</p>
                      <p className="font-mono text-[11px] text-ink-3">{o.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-3 whitespace-nowrap">{o.itemCount} khóa</td>
                <td className="px-4 py-3 font-mono font-semibold text-[12px]">{formatVND(o.total_amount)}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-2">{o.payment_method}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-3 whitespace-nowrap">
                  {new Date(o.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status?.toLowerCase()} />
                  {o.status === 'PENDING' && o.expires_at && (
                    <p className="font-mono text-[11px] text-ink-3 mt-1">
                      Hết hạn: {new Date(o.expires_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    {o.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => confirmMutation.mutate(o.id)}
                          disabled={confirmMutation.isPending}
                          className="px-2.5 py-1 rounded-lg bg-success/10 text-success text-[11px] font-mono font-medium hover:bg-success/20 transition-colors whitespace-nowrap">
                          Xác nhận
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`Hủy đơn ${o.order_code}?

Học viên không thanh toán đơn này được nữa và phải đặt đơn mới.`)) cancelMutation.mutate(o.id); }}
                          className="px-2.5 py-1 rounded-lg bg-danger/10 text-danger text-[11px] font-mono font-medium hover:bg-danger/20 transition-colors">
                          Hủy
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setDetailOrder(o.id)}
                      className="px-2.5 py-1 rounded-lg border-2 border-edge text-[11px] font-mono text-ink-2 hover:bg-bg-2 transition-colors whitespace-nowrap">
                      Chi tiết →
                    </button>
                  </div>
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

      {detailOrder && <OrderDetailModal orderId={detailOrder} onClose={() => setDetailOrder(null)} />}
    </div>
  );
}

/* ── Order detail modal ─────────────────────────────────────────── */
function OrderDetailModal({ orderId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: () => api.get(`/api/admin/orders/${orderId}`).then(r => r.data),
    staleTime: 0,
  });

  return (
    <Dialog onClose={onClose} aria-labelledby="order-detail-title" className="max-w-[520px]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <h2 id="order-detail-title" className="font-mono text-[11px] text-ink-3 uppercase tracking-widest">// Chi tiết đơn hàng</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 rounded hover:bg-bg-2 text-ink-3 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          {isLoading && <p className="font-mono text-[13px] text-ink-3 py-4 text-center">Đang tải...</p>}
          {data && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-5 text-[13px]">
                {[
                  ['Mã đơn', <span key="c" className="font-mono text-accent">{data.order.order_code}</span>],
                  ['Trạng thái', <StatusBadge key="s" status={data.order.status?.toLowerCase()} />],
                  ['Khách hàng', data.order.userName],
                  ['Email', <span key="e" className="font-mono text-[11px] text-ink-3">{data.order.email}</span>],
                  ['Phương thức', data.order.payment_method],
                  ['Tổng tiền', <span key="p" className="font-mono font-semibold">{formatVND(data.order.total_amount)}</span>],
                  ['Ngày tạo', new Date(data.order.created_at).toLocaleString('vi-VN')],
                  data.order.status === 'PENDING' && data.order.expires_at &&
                    ['Hết hạn thanh toán', <span key="x" className="font-mono text-warn">{new Date(data.order.expires_at).toLocaleString('vi-VN')}</span>],
                  data.order.paid_at && ['Thanh toán lúc', new Date(data.order.paid_at).toLocaleString('vi-VN')],
                ].filter(Boolean).map(([label, value]) => (
                  <div key={label}>
                    <p className="font-mono text-[11px] text-ink-3 uppercase tracking-wide mb-1">{label}</p>
                    <div className="text-ink">{value}</div>
                  </div>
                ))}
              </div>
              <p className="font-mono text-[11px] text-ink-3 uppercase tracking-wide mb-2">Sản phẩm</p>
              <div className="border-2 border-edge rounded-lg divide-y divide-line">
                {data.items?.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                    <span className="text-ink">{item.course_title}</span>
                    <span className="font-mono font-semibold">{formatVND(item.price)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
    </Dialog>
  );
}
