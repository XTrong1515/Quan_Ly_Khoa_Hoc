import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Send, Check, Trash2, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { api, apiMessage } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

const inputCls = 'w-full px-3 py-2 text-[13px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

function invalidate(qc) {
  qc.invalidateQueries({ queryKey: ['admin-payout-summary'] });
  qc.invalidateQueries({ queryKey: ['admin-payouts'] });
}

/** Đối soát & chi trả doanh thu giảng viên (mô hình marketplace). */
export default function AdminPayoutsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(null);
  const [paying, setPaying] = useState(null);
  const [rating, setRating] = useState(null);

  const { data: summary } = useQuery({
    queryKey: ['admin-payout-summary'],
    queryFn: () => api.get('/api/admin/payouts/summary').then((r) => r.data),
  });
  const { data: list } = useQuery({
    queryKey: ['admin-payouts', status],
    queryFn: () => api.get('/api/admin/payouts', { params: status ? { status } : {} }).then((r) => r.data.payouts),
  });

  const cancel = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/payouts/${id}`),
    onSuccess: () => { toast.success('Đã hủy khoản chi trả'); invalidate(qc); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa hủy được khoản chi trả. Thử lại sau giây lát.')),
  });

  const t = summary?.totals;
  const cards = [
    ['Doanh thu khóa của giảng viên', t?.gross],
    ['Phần nền tảng (hoa hồng)', t?.platformShare],
    ['Phải trả giảng viên', t?.earned],
    ['Đã chi trả', t?.paidOut],
    ['Còn nợ (chưa chi)', t ? t.balance + t.pending : undefined],
  ];

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="eyebrow mb-1.5"><span className="text-accent">~/admin</span> <span className="text-ink-3">/ chi-trả</span></p>
        <h1 className="font-display font-bold text-[24px]">Đối soát & chi trả giảng viên</h1>
        <p className="text-[13px] text-ink-3 mt-1">Hoa hồng mặc định {summary?.defaultCommission ?? '—'}% · số liệu chốt theo từng đơn tại thời điểm thanh toán.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {cards.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em] mb-2">{label}</p>
            <p className="font-mono font-bold text-[18px] text-ink tabular-nums">{value === undefined ? '…' : formatVND(value)}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto mb-6">
        <table className="w-full text-[13px] min-w-[860px]">
          <thead>
            <tr className="border-b border-line bg-bg-2">
              {['Giảng viên', 'Hoa hồng', 'Thu nhập', 'Đã trả', 'Đang chờ', 'Số dư', 'Tài khoản', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] text-ink-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(summary?.instructors ?? []).map((i) => (
              <tr key={i.id} className="hover:bg-bg-2">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{i.name}</p>
                  <p className="font-mono text-[10.5px] text-ink-3">{i.email}</p>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setRating(i)} title="Đổi tỷ lệ riêng"
                    className={cn('flex items-center gap-1 font-mono text-[12px] hover:text-accent', i.customRate ? 'text-accent' : 'text-ink-2')}>
                    {i.commissionRate}% <Percent className="w-3 h-3 opacity-50" />
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-[12px]">{formatVND(i.earned)}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{formatVND(i.paidOut)}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-js">{i.pending ? formatVND(i.pending) : '—'}</td>
                <td className="px-4 py-3 font-mono text-[12.5px] font-semibold text-ink">{formatVND(i.balance)}</td>
                <td className="px-4 py-3 text-[11.5px] text-ink-3 max-w-[200px] truncate" title={i.bank ?? ''}>
                  {i.bank ?? <span className="text-danger">Chưa có</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" disabled={i.balance <= 0 || !i.bank} onClick={() => setCreating(i)}
                    title={!i.bank ? 'Giảng viên chưa nhập tài khoản ngân hàng' : ''}>
                    <Send className="w-3.5 h-3.5" /> Tạo chi trả
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1 mb-3">
        {[['', 'Tất cả'], ['PENDING', 'Đang chờ'], ['PAID', 'Đã trả']].map(([v, l]) => (
          <button key={v || 'all'} onClick={() => setStatus(v)}
            className={cn('px-3 py-1.5 rounded-lg text-[12px] font-medium', status === v ? 'bg-accent/10 text-accent' : 'text-ink-2 hover:bg-bg-2')}>
            {l}
          </button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-[13px] min-w-[760px]">
          <thead>
            <tr className="border-b border-line bg-bg-2">
              {['Ngày tạo', 'Giảng viên', 'Số tiền', 'Tài khoản', 'Ghi chú', 'Trạng thái', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] text-ink-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(list ?? []).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center font-mono text-[12px] text-ink-3">// Chưa có khoản chi trả</td></tr>
            )}
            {(list ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-2">{fmtDate(p.createdAt)}</td>
                <td className="px-4 py-3 text-ink">{p.instructorName}</td>
                <td className="px-4 py-3 font-mono text-[12.5px] font-semibold">{formatVND(p.amount)}</td>
                <td className="px-4 py-3 text-[11.5px] text-ink-3 max-w-[220px] truncate" title={p.bank}>{p.bank}</td>
                <td className="px-4 py-3 text-[12px] text-ink-3 max-w-[160px] truncate">{p.note ?? '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status === 'PAID' ? 'paid' : 'pending'} />
                  {p.bankRef && <p className="font-mono text-[10px] text-ink-3 mt-0.5">{p.bankRef} · {fmtDate(p.paidAt)}</p>}
                </td>
                <td className="px-4 py-3">
                  {p.status === 'PENDING' && (
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" onClick={() => setPaying(p)}><Check className="w-3.5 h-3.5" /> Đã chuyển</Button>
                      <button onClick={() => { if (window.confirm('Hủy khoản chi trả này? Số tiền quay lại số dư chờ chi trả của giảng viên.')) cancel.mutate(p.id); }}
                        className="p-1.5 rounded text-ink-3 hover:text-danger hover:bg-danger/10" title="Hủy"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && <CreatePayoutModal instructor={creating} onClose={() => setCreating(null)} onDone={() => { setCreating(null); invalidate(qc); }} />}
      {paying && <MarkPaidModal payout={paying} onClose={() => setPaying(null)} onDone={() => { setPaying(null); invalidate(qc); }} />}
      {rating && <CommissionModal instructor={rating} defaultRate={summary?.defaultCommission} onClose={() => setRating(null)} onDone={() => { setRating(null); invalidate(qc); }} />}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-bg border border-line rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">{title}</p>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-2 text-ink-3"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function CreatePayoutModal({ instructor, onClose, onDone }) {
  const [amount, setAmount] = useState(instructor.balance);
  const [note, setNote] = useState('');
  const m = useMutation({
    mutationFn: () => api.post('/api/admin/payouts', { instructorId: instructor.id, amount: Number(amount), note }),
    onSuccess: () => { toast.success('Đã tạo khoản chi trả — chuyển khoản xong thì bấm "Đã chuyển"'); onDone(); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa tạo được khoản chi trả. Thử lại sau giây lát.')),
  });
  return (
    <Modal title="// Tạo khoản chi trả" onClose={onClose}>
      <p className="text-[13px] text-ink"><b>{instructor.name}</b> · số dư <b>{formatVND(instructor.balance)}</b></p>
      <p className="text-[12px] text-ink-3">{instructor.bank}</p>
      <input type="number" min="1" max={instructor.balance} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (vd: Doanh thu tháng 10/2026)" maxLength={500} className={inputCls} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
        <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending || !(Number(amount) > 0)}>Tạo</Button>
      </div>
    </Modal>
  );
}

function MarkPaidModal({ payout, onClose, onDone }) {
  const [bankRef, setBankRef] = useState('');
  const m = useMutation({
    mutationFn: () => api.put(`/api/admin/payouts/${payout.id}/paid`, { bankRef }),
    onSuccess: () => { toast.success('Đã ghi nhận chi trả và thông báo cho giảng viên'); onDone(); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa ghi nhận được chi trả. Thử lại sau giây lát.')),
  });
  return (
    <Modal title="// Xác nhận đã chuyển khoản" onClose={onClose}>
      <p className="text-[13px] text-ink"><b>{formatVND(payout.amount)}</b> → {payout.instructorName}</p>
      <p className="text-[12px] text-ink-3">{payout.bank}</p>
      <input value={bankRef} onChange={(e) => setBankRef(e.target.value)} placeholder="Mã giao dịch ngân hàng (vd: FT26300123456)" maxLength={100} className={inputCls} autoFocus />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
        <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending || !bankRef.trim()}>Xác nhận</Button>
      </div>
    </Modal>
  );
}

function CommissionModal({ instructor, defaultRate, onClose, onDone }) {
  const [rate, setRate] = useState(instructor.customRate ? String(instructor.commissionRate) : '');
  const m = useMutation({
    mutationFn: () => api.put(`/api/admin/users/${instructor.id}/commission`, { rate: rate === '' ? null : Number(rate) }),
    onSuccess: () => { toast.success('Đã cập nhật — chỉ áp dụng cho đơn bán từ bây giờ'); onDone(); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa lưu được tỷ lệ hoa hồng. Thử lại sau giây lát.')),
  });
  return (
    <Modal title="// Tỷ lệ hoa hồng riêng" onClose={onClose}>
      <p className="text-[13px] text-ink"><b>{instructor.name}</b></p>
      <input type="number" min="0" max="100" step="0.5" value={rate} onChange={(e) => setRate(e.target.value)}
        placeholder={`Để trống = mặc định ${defaultRate}%`} className={inputCls} />
      <p className="text-[11.5px] text-ink-3">% nền tảng giữ lại. Đơn đã bán giữ nguyên tỷ lệ cũ.</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
        <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending}>Lưu</Button>
      </div>
    </Modal>
  );
}
