import { Link } from 'react-router-dom';

/** onDark: logo nằm trên nền luôn tối (panel đăng nhập) — không đổi màu theo giao diện sáng / tối. */
export function Logo({ size = 17, onDark = false }) {
  const accent = onDark ? 'text-[#F7DF1E]' : 'text-accent';
  return (
    <Link to="/"
      className={`inline-flex items-center gap-2 font-mono font-semibold ${onDark ? 'text-[#F4F5F9] hover:text-[#F4F5F9]' : 'text-ink hover:text-ink'}`}
      style={{ fontSize: size }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={accent}>
        <path d="M12 19V6M12 6l-5 5M12 6l5 5" />
      </svg>
      <span>Hoisted<b className={`${accent} font-bold`}>()</b></span>
    </Link>
  );
}
