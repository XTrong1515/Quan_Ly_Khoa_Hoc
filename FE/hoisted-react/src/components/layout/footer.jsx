import { Link } from 'react-router-dom';
import { Logo } from '../logo.jsx';

export function Footer() {
  return (
    <footer className="border-t border-line py-7 px-8 flex items-center justify-between text-ink-3 text-xs">
      <Logo />
      {/* Chỉ link tới trang có thật — Privacy / Terms / Github trước đây là href="#" */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11.5px] tracking-[0.04em]">
        <span>© 2026 Hoisted</span>
        <Link to="/courses" className="hover:text-accent">Khóa học</Link>
        <Link to="/become-instructor" className="hover:text-accent">Trở thành giảng viên</Link>
      </div>
    </footer>
  );
}
