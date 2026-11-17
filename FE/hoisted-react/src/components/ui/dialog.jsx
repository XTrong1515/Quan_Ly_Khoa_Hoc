import { useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const supportsClosedBy = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

const outside = (e, el) => {
  const r = el.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
};

/**
 * Modal dùng <dialog> gốc, mở bằng showModal() khi mount. Trình duyệt lo giữ focus trong
 * hộp thoại, khóa (inert) trang phía sau, Esc / cử chỉ "back", top layer và trả focus về
 * nút đã mở nó — không tự viết focus trap, role="dialog" hay aria-modal.
 *
 * Cha điều khiển bằng cách mount / unmount; mọi kiểu đóng (Esc, bấm ra ngoài) đều gọi onClose().
 *
 * - dismiss: 'any' (Esc + bấm ra ngoài) | 'closerequest' (chỉ Esc) | 'none' (chỉ nút đóng)
 * - onCancel(e): chặn Esc / bấm ra ngoài khi cần (form chưa lưu) bằng e.preventDefault().
 *   Giữ guard ở đây chứ không chỉ dựa vào closedby="none": Safari chưa hỗ trợ closedby.
 * - Đặt tên: aria-labelledby trỏ vào tiêu đề, hoặc aria-label khi không có tiêu đề hiển thị.
 */
/**
 * onCancel cho form soạn thảo: Esc (Safari — nơi closedby="none" chưa có tác dụng) chỉ đóng
 * khi không có thay đổi, hoặc khi người dùng xác nhận bỏ.
 */
export const confirmDiscard = (dirty) => (e) => {
  if (dirty && !window.confirm('Đóng mà không lưu? Các thay đổi chưa lưu sẽ mất.')) e.preventDefault();
};

export function Dialog({ onClose, dismiss = 'any', onCancel, className, children, ...rest }) {
  const ref = useRef(null);
  const mounted = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pressedOutside = useRef(false);

  useLayoutEffect(() => {
    const d = ref.current;
    mounted.current = true;
    if (!d.open) d.showModal();
    return () => {
      mounted.current = false;
      // Đóng khi phần tử còn trong DOM để trình duyệt trả focus về nút đã mở hộp thoại.
      if (d.open) d.close();
    };
  }, []);

  const handleClose = () => {
    // Bỏ qua sự kiện close do chính cleanup ở trên (unmount, hoặc StrictMode mount → unmount → mount).
    if (!mounted.current || ref.current?.open) return;
    onCloseRef.current?.();
  };

  // closedby="any" chưa có trên Safari → tự xử lý bấm ra ngoài. So tọa độ con trỏ chứ không so
  // e.target: padding của <dialog> cũng là target của chính nó. Phải nhấn và thả đều ở ngoài,
  // để thao tác bôi đen chữ kết thúc trên backdrop không đóng hộp thoại.
  const lightDismissFallback = dismiss === 'any' && !supportsClosedBy ? {
    onPointerDown: (e) => { pressedOutside.current = outside(e, ref.current); },
    onPointerUp: (e) => {
      if (!pressedOutside.current || !outside(e, ref.current)) return;
      // Như closedby="any": phát cancel trước để onCancel (form chưa lưu) còn chặn được.
      const cancel = new Event('cancel', { cancelable: true });
      if (ref.current.dispatchEvent(cancel)) ref.current.close();
    },
  } : {};

  return (
    <dialog
      ref={ref}
      closedby={dismiss}
      onClose={handleClose}
      onCancel={onCancel}
      className={cn(
        'w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto p-0',
        'bg-bg text-ink border border-line rounded-xl shadow-2xl',
        className,
      )}
      {...lightDismissFallback}
      {...rest}
    >
      {children}
    </dialog>
  );
}
