import { Link } from 'react-router-dom';

/**
 * Logo pixel: ô vàng viền navy + bóng cứng, chữ Handjet.
 * onDark: logo nằm trên nền luôn tối (panel đăng nhập, sidebar console) — không đổi màu theo giao diện sáng / tối.
 */
export function Logo({ size = 17, onDark = false, to = '/', sub }) {
  return (
    <Link to={to}
      className={`inline-flex items-center gap-2.5 ${onDark ? 'text-white hover:text-white' : 'text-ink hover:text-ink'}`}>
      <span className={`grid place-items-center w-8 h-8 shrink-0 rounded-sm border-2 bg-pop text-navy
        ${onDark ? 'border-black shadow-[2px_2px_0_0_#000]' : 'border-edge shadow-sm'}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
          <path d="M12 20V8M6 12l6-6 6 6" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block font-pixel font-semibold tracking-[0.03em]" style={{ fontSize: Math.round(size * 1.45) }}>
          Hoisted<span className={`font-mono text-[0.72em] tracking-[-0.06em] ${onDark ? 'text-pop' : 'text-accent'}`}>()</span>
        </span>
        {sub && (
          <span className={`block mt-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] ${onDark ? 'text-pop' : 'text-ink-3'}`}>
            {sub}
          </span>
        )}
      </span>
    </Link>
  );
}
