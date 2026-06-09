import { cn } from '@/lib/utils';

const MAP = {
  paid:      { color: 'text-success bg-success/15',  label: 'Đã thanh toán' },
  pending:   { color: 'text-js bg-js/15',            label: 'Đang chờ' },
  failed:    { color: 'text-danger bg-danger/15',    label: 'Thất bại' },
  cancelled: { color: 'text-ink-3 bg-bg-2',          label: 'Đã hủy' },
  refund:    { color: 'text-ink-3 bg-bg-2',          label: 'Hoàn tiền' },
  active:    { color: 'text-success bg-success/15',  label: 'Hoạt động' },
  locked:    { color: 'text-danger bg-danger/15',    label: 'Khóa' },
  published: { color: 'text-success bg-success/15',  label: 'Hoạt động' },
  draft:     { color: 'text-ink-3 bg-bg-2',          label: 'Nháp' },
  archived:  { color: 'text-ink-3 bg-bg-3',          label: 'Lưu trữ' },
  visible:   { color: 'text-success bg-success/15',  label: 'Hiển thị' },
  hidden:    { color: 'text-ink-3 bg-bg-2',          label: 'Đã ẩn' },
  review:    { color: 'text-js bg-js/15',            label: 'Đang duyệt' },
};

export function StatusBadge({ status, className }) {
  const key = (status ?? '').toLowerCase();
  const cfg = MAP[key] || { color: 'text-ink-3 bg-bg-2', label: status ?? '—' };
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
      cfg.color, className,
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      {cfg.label}
    </span>
  );
}
