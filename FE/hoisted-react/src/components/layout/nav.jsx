import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, Bell, ShoppingCart, Moon, Sun, LogOut, BookOpen, Settings, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Logo } from '../logo.jsx';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/courses',  label: 'Khóa học'    },
  { to: '/paths',    label: 'Lộ trình'    },
  { to: '/blog',     label: 'Blog'        },
  { to: '/business', label: 'Doanh nghiệp' },
];

export function Nav() {
  const items = useCart((s) => s.items);
  const { user, role, logout } = useAuth();
  const { mode, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const avatarLabel = user?.name?.[0]?.toUpperCase() ?? '?';

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
          <div className="relative" ref={menuRef}>
            {/* Avatar trigger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1 focus:outline-none"
              title={user?.name}
            >
              <div
                className="w-8 h-8 rounded-full grid place-items-center font-mono font-bold text-xs text-[#0B0F19] shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}
              >
                {avatarLabel}
              </div>
              <ChevronDown className={cn(
                'w-3.5 h-3.5 text-ink-3 transition-transform duration-200',
                menuOpen && 'rotate-180',
              )} />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-xl border border-line bg-bg-1 shadow-xl py-1.5 z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-line">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full grid place-items-center font-mono font-bold text-xs text-[#0B0F19] shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}
                    >
                      {avatarLabel}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink truncate leading-tight">{user?.name}</p>
                      <p className="text-[11px] text-ink-3 truncate font-mono">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <MenuItem to="/me" icon={BookOpen} onClick={() => setMenuOpen(false)}>
                    Học của tôi
                  </MenuItem>
                  <MenuItem to="/me/profile" icon={Settings} onClick={() => setMenuOpen(false)}>
                    Cài đặt tài khoản
                  </MenuItem>
                  {role === 'admin' && (
                    <MenuItem to="/admin" onClick={() => setMenuOpen(false)} accent>
                      ⚙ Admin
                    </MenuItem>
                  )}
                </div>

                {/* Logout */}
                <div className="border-t border-line pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-danger hover:bg-bg-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function MenuItem({ to, icon: Icon, onClick, accent, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors hover:bg-bg-2',
        accent ? 'text-accent' : 'text-ink-2 hover:text-ink',
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </Link>
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
