import { useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/*
 * Scroll-reveal wrapper — motion disabled via CSS under prefers-reduced-motion.
 * Nội dung đã nằm trong màn hình lúc mount thì hiện ngay (trước lần vẽ đầu, không hiệu ứng):
 * không phụ thuộc IntersectionObserver — observer có thể trễ (tab nền, máy chậm) khiến
 * phần đầu trang (và LCP) bị ẩn. Chỉ phần bên dưới mới trượt vào khi cuộn tới.
 */
export function Reveal({ children, className, delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('is-visible', 'reveal-instant');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={cn('reveal', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
