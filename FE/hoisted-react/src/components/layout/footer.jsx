import { Logo } from '../logo.jsx';

export function Footer() {
  return (
    <footer className="border-t border-line py-7 px-8 flex items-center justify-between text-ink-3 text-xs">
      <Logo />
      <div className="flex gap-5 font-mono text-[11.5px] tracking-[0.04em]">
        <span>© 2026 Hoisted</span>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Github</a>
      </div>
    </footer>
  );
}
