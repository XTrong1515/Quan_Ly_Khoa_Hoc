import { useState, Suspense } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Tag, Users,
  ShoppingCart, Star, LogOut, ArrowLeft, Menu, X, GraduationCap, Wallet, UserCircle, Banknote, UserPlus, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import { PageFallback } from '@/components/page-fallback.jsx';
import { Dialog } from '@/components/ui/dialog.jsx';
import { Logo } from '@/components/logo.jsx';
import { ChatWidget } from '@/components/ai/chat-widget.jsx';
import { ASSISTANTS } from '@/components/ai/assistants.js';

const ADMIN_NAV = [
  {
    label: 'Vận hành',
    items: [
      { to: '/admin',        label: 'Tổng quan', icon: LayoutDashboard, exact: true },
      { to: '/admin/orders', label: 'Đơn hàng',  icon: ShoppingCart },
      { to: '/admin/payouts', label: 'Chi trả GV', icon: Banknote },
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
      { to: '/admin/users', label: 'Người dùng', icon: Users },
      { to: '/admin/instructor-applications', label: 'Đơn giảng viên', icon: UserPlus },
    ],
  },
];

const INSTRUCTOR_NAV = [
  {
    label: 'Giảng dạy',
    items: [
      { to: '/instructor',         label: 'Tổng quan', icon: LayoutDashboard, exact: true },
      { to: '/instructor/courses', label: 'Khóa học của tôi', icon: GraduationCap },
      { to: '/instructor/assistant', label: 'Trợ lý AI', icon: Sparkles },
      { to: '/instructor/revenue', label: 'Doanh thu', icon: Wallet },
      { to: '/instructor/profile', label: 'Hồ sơ & nhận tiền', icon: UserCircle },
    ],
  },
];

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();
}

// Sidebar luôn navy (cả hai giao diện) như bảng điều khiển pixel: mục đang mở là khối xanh viền đen + bóng cứng.
function Sidebar({ pathname, user, logout, onNavigate, navGroups, home, consoleLabel, roleLabel }) {
  return (
    <div className="flex flex-col h-full bg-navy text-white">
      {/* Brand */}
      <div className="flex items-center px-5 h-[72px] border-b-2 border-white/10" onClickCapture={onNavigate}>
        <Logo to={home} size={16} onDark sub={consoleLabel} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-6" aria-label={`Điều hướng ${roleLabel}`}>
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="font-mono text-[11px] font-bold text-white/55 uppercase tracking-[0.14em] px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-1.5">
              {group.items.map(({ to, label, icon: Icon, exact }) => {
                const active = exact ? pathname === to : pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-sm border-2 text-[13px] font-bold transition-colors',
                      active
                        ? 'bg-[#2547D0] text-white border-black shadow-[3px_3px_0_0_#000]'
                        : 'border-transparent text-white/80 hover:bg-white/10 hover:text-white',
                    )}
                  >
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
      <div className="px-3 pb-4 border-t-2 border-white/10 pt-3 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-9 h-9 shrink-0 rounded-sm border-2 border-black bg-pop text-navy grid place-items-center font-mono font-bold text-[11px] select-none">
            {getInitials(user?.name ?? user?.email ?? 'A')}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[12.5px] text-white truncate">
              {user?.name ?? user?.email}
            </p>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-pop">{roleLabel}</p>
          </div>
        </div>
        <Link
          to="/"
          className="w-full flex items-center justify-center gap-2 h-9 rounded-sm border-2 border-black bg-white text-navy text-[12.5px] font-bold shadow-[2px_2px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_0_#000] transition-[transform,box-shadow]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Về trang chủ
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-sm border-2 border-black bg-[#C8361A] text-white text-[12.5px] font-bold shadow-[2px_2px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_0_#000] transition-[transform,box-shadow] cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" /> Đăng xuất
        </button>
      </div>
    </div>
  );
}

function ConsoleLayout({ navGroups, home, consoleLabel, roleLabel, assistant }) {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const shell = { navGroups, home, consoleLabel, roleLabel };

  return (
    <div className="flex min-h-dvh">
      {/* ── Sidebar (desktop) ── */}
      <aside className="w-[240px] shrink-0 border-r-2 border-edge sticky top-0 h-dvh hidden lg:block">
        <Sidebar pathname={pathname} user={user} logout={logout} {...shell} />
      </aside>

      {/* ── Sidebar (mobile drawer) ── */}
      {mobileOpen && (
        // overflow-visible: nút đóng nằm ngoài mép phải ngăn kéo
        <Dialog onClose={() => setMobileOpen(false)} aria-label="Menu điều hướng"
          className="m-0 h-dvh max-h-none w-[260px] max-w-none rounded-none border-0 border-r-2 shadow-none overflow-visible">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
              className="absolute top-4 -right-12 w-9 h-9 rounded-sm bg-bg-1 border-2 border-edge shadow-sm text-ink grid place-items-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar
              pathname={pathname}
              user={user}
              logout={logout}
              onNavigate={() => setMobileOpen(false)}
              {...shell}
            />
        </Dialog>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 h-14 px-4 border-b-2 border-edge bg-bg-1">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
            className="w-9 h-9 rounded-lg border-2 border-edge text-ink-2 grid place-items-center cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
          <p className="font-pixel font-semibold text-[22px] leading-none text-ink">
            Hoisted<span className="font-mono text-[0.72em] tracking-[-0.06em] text-accent">()</span>
            <span className="font-mono font-bold uppercase tracking-[0.08em] text-ink-3 text-[11px] ml-2">{roleLabel}</span>
          </p>
        </div>

        <main className="flex-1 min-w-0 overflow-auto">
          <Suspense fallback={<PageFallback />}><Outlet /></Suspense>
        </main>
      </div>
      {assistant && <ChatWidget assistant={assistant} />}
    </div>
  );
}

export function AdminLayout() {
  return <ConsoleLayout navGroups={ADMIN_NAV} home="/admin" consoleLabel="Admin console" roleLabel="admin" />;
}

export function InstructorLayout() {
  return <ConsoleLayout navGroups={INSTRUCTOR_NAV} home="/instructor" consoleLabel="Instructor studio" roleLabel="giảng viên" assistant={ASSISTANTS.instructor} />;
}
