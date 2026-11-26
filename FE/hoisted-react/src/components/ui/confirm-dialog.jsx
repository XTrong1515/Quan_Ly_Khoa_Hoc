import { useId } from 'react';
import { Dialog } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';

/**
 * Hộp xác nhận thay cho window.confirm — cùng giao diện Hoisted, giữ focus trong hộp (Dialog dùng <dialog> gốc).
 * Focus mặc định ở nút Hủy (autoFocus) để Enter vô tình không xóa mất dữ liệu.
 * destructive: nút xác nhận màu Fail Rose (trạng thái "mất dữ liệu", không phải trang trí).
 */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onClose, pending = false, destructive = false }) {
  const titleId = useId();
  return (
    <Dialog onClose={onClose} aria-labelledby={titleId} className="max-w-[400px] p-5">
      <h2 id={titleId} className="font-display font-bold text-[24px] leading-none text-ink">{title}</h2>
      <div className="mt-2 text-[13.5px] leading-[1.6] text-ink-2">{children}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={pending} autoFocus>Hủy</Button>
        <Button onClick={onConfirm} disabled={pending}
          className={cn(destructive && 'bg-danger text-white', pending && 'opacity-70')}>
          {pending ? 'Đang xử lý…' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
