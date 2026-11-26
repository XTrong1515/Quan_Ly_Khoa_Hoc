import { cn } from '@/lib/utils';

const MAP = {
  paid:      { color: 'text-success-ink bg-success',  label: 'Đã thanh toán' },
  // Khối màu đặc kiểu tag pixel; trạng thái chờ dùng vàng pop (chữ navy, đọc được ở cả hai giao diện)
  pending:   { color: 'text-pop-ink bg-pop',    label: 'Đang chờ' },
  failed:    { color: 'text-danger-ink bg-danger',    label: 'Thất bại' },
  cancelled: { color: 'text-ink-2 bg-bg-2',          label: 'Đã hủy' },
  refund:    { color: 'text-ink-2 bg-bg-2',          label: 'Hoàn tiền' },
  active:    { color: 'text-success-ink bg-success',  label: 'Hoạt động' },
  locked:    { color: 'text-danger-ink bg-danger',    label: 'Khóa' },
  published: { color: 'text-success-ink bg-success',  label: 'Đã xuất bản' },
  draft:     { color: 'text-ink-2 bg-bg-2',          label: 'Nháp' },
  archived:  { color: 'text-ink-2 bg-bg-2',          label: 'Lưu trữ' },
  visible:   { color: 'text-success-ink bg-success',  label: 'Hiển thị' },
  hidden:    { color: 'text-ink-2 bg-bg-2',          label: 'Đã ẩn' },
  review:    { color: 'text-pop-ink bg-pop',    label: 'Đang duyệt' },
  pending_review: { color: 'text-pop-ink bg-pop', label: 'Chờ duyệt' },
  rejected:  { color: 'text-danger-ink bg-danger',    label: 'Bị từ chối' },
};

export function StatusBadge({ status, className }) {
  const key = (status ?? '').toLowerCase();
  const cfg = MAP[key] || { color: 'text-ink-2 bg-bg-2', label: status ?? '—' };
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-sm border-2 border-edge whitespace-nowrap',
      cfg.color, className,
    )}>
      {cfg.label}
    </span>
  );
}
