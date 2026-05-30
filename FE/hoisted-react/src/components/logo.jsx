import { Link } from 'react-router-dom';

export function Logo({ size = 17 }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2 font-mono font-semibold text-ink hover:text-ink"
      style={{ fontSize: size }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        <path d="M12 19V6M12 6l-5 5M12 6l5 5" />
      </svg>
      <span>Hoisted<b className="text-accent font-bold">()</b></span>
    </Link>
  );
}
