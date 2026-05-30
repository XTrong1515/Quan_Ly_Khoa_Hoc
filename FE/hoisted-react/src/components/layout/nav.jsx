import { Link, NavLink } from 'react-router-dom';
import { Search, Bell, ShoppingCart, Moon, Sun } from 'lucide-react';
import { Logo } from '../logo.jsx';
import { Button } from '../ui/button.jsx';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';

const LINKS = [
  { to: '/courses',  label: 'Khóa học'    },
  { to: '/paths',    label: 'Lộ trình'    },
  { to: '/blog',     label: 'Blog'        },
  { to: '/business', label: 'Doanh nghiệp' },
];

export function Nav() {
  const items = useCart((s) => s.items);
  const { user, role } = useAuth();
  const { mode, toggle } = useTheme();

  return (
    <nav className="flex items-center gap-7 h-16 px-8 border-b border-line bg-bg/70 backdrop-blur sticky top-0 z-10">
      <Logo />
      <div className="flex gap-5">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) =>
              `text-[13.5px] font-medium ${isActive ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}>
            {l.label}
          </NavLink>
        ))}
      </div>

      <div className="flex-1 max-w-sm ml-auto relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-3" />
        <input className="input pl-10" placeholder="Tìm khóa học, JS, React, async…" />
        <span className="absolute right-2 top-2 font-mono text-[11px] text-ink-3 border border-line rounded px-1.5 py-0.5">⌘K</span>
      </div>

      <div className="flex items-center gap-1.5">
        <IconBtn onClick={toggle} title="Toggle theme">
          {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </IconBtn>
        <IconBtn title="Notifications"><Bell className="w-4 h-4" /></IconBtn>

        <Link to="/cart" className="relative">
          <IconBtn title="Cart"><ShoppingCart className="w-4 h-4" /></IconBtn>
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-ink font-mono font-bold text-[9.5px] grid place-items-center border-2 border-bg">
              {items.length}
            </span>
          )}
        </Link>

        {role === 'guest' ? (
          <>
            <Link to="/login" className="h-[30px] px-3 inline-flex items-center text-[12.5px] font-semibold rounded-md border border-line text-ink hover:bg-bg-2">
              Đăng nhập
            </Link>
            <Link to="/register" className="h-[30px] px-3 inline-flex items-center text-[12.5px] font-semibold rounded-md bg-accent text-accent-ink hover:brightness-95">
              Đăng ký
            </Link>
          </>
        ) : (
          <Link to="/me" className="w-8 h-8 rounded-full grid place-items-center font-mono font-bold text-xs text-[#0B0F19]"
            style={{ background: 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}>
            {user?.avatar || 'KP'}
          </Link>
        )}
      </div>
    </nav>
  );
}

function IconBtn({ children, ...props }) {
  return (
    <button className="w-[34px] h-[34px] rounded-lg border border-line text-ink-2 hover:text-ink hover:bg-bg-2 grid place-items-center transition"
      {...props}>
      {children}
    </button>
  );
}
