import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Tag, Users,
  ShoppingCart, Star, LogOut, ArrowLeft, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/auth';

const NAV_GROUPS = [
  {
    label: 'Vận hành',
    items: [
      { to: '/admin',        label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { to: '/admin/orders', label: 'Đơn hàng',  icon: ShoppingCart },
    ],
  },
  {
    label: 'Nội dung',
    items: [
      { to: '/admin/courses',    label: 'Khóa học', icon: BookOpen },
      { to: '/admin/categories', label: 'Danh mục', icon: Tag },
      { to: '/admin/reviews',    label: 'Đánh giá', icon: Star },
    ],
  },
  {
    label: 'Người dùng',
    items: [
      { to: '/admin/users', label: 'Học viên', icon: Users },
    ],
  },
];

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();
}

function Sidebar({ pathname, user, logout, onNavigate }) {
  return (
    <div className="flex flex-col h-full bg-bg-1">
      {/* Brand */}
      <Link to="/admin" onClick={onNavigate} className="flex items-center gap-3 px-5 h-16 border-b border-line">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-indigo grid place-items-center font-mono font-bold text-[13px] text-[#0B0F19] shadow-[0_4px_14px_rgb(var(--accent)/0.3)]">
          {'{}'}
        </div>
        <div className="leading-tight">
          <p className="font-mono font-extrabold text-[15px] text-ink tracking-tight">
            Hoisted<span className="text-accent">()</span>
          </p>
          <p className="font-mono text-[9.5px] text-ink-3 uppercase tracking-[0.14em]">Admin console</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-6" aria-label="Điều hướng admin">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.14em] px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, exact }) => {
                const active = exact ? pathname === to : pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                      active
                        ? 'bg-accent/10 text-accent'
                        : 'text-ink-2 hover:bg-bg-2 hover:text-ink',
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-accent" aria-hidden="true" />
                    )}
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-line pt-3">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
          <div className="p-[2px] rounded-full bg-gradient-to-br from-accent to-indigo shrink-0">
            <div className="w-8 h-8 rounded-full bg-bg-1 grid place-items-center font-mono font-bold text-[11px] text-ink select-none">
              {getInitials(user?.name ?? user?.email ?? 'A')}
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-[12.5px] text-ink truncate">
              {user?.name ?? user?.email}
            </p>
            <p className="font-mono text-[10px] text-accent">admin</p>
          </div>
        </div>
        <Link
          to="/"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] text-ink-3 hover:text-ink hover:bg-bg-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Về trang chủ
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] text-ink-3 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" /> Đăng xuất
        </button>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* ── Sidebar (desktop) ── */}
      <aside className="w-[236px] shrink-0 border-r border-line sticky top-0 h-dvh hidden lg:block">
        <Sidebar pathname={pathname} user={user} logout={logout} />
      </aside>

      {/* ── Sidebar (mobile drawer) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-[260px] border-r border-line shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
              className="absolute top-4 -right-12 w-9 h-9 rounded-lg bg-bg-1 border border-line text-ink-2 grid place-items-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar
              pathname={pathname}
              user={user}
              logout={logout}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 h-14 px-4 border-b border-line bg-bg/90 backdrop-blur">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
            className="w-9 h-9 rounded-lg border border-line text-ink-2 grid place-items-center cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
          <p className="font-mono font-extrabold text-[14px] text-ink tracking-tight">
            Hoisted<span className="text-accent">()</span>
            <span className="font-normal text-ink-3 text-[11px] ml-2">admin</span>
          </p>
        </div>

        <main className="flex-1 min-w-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
