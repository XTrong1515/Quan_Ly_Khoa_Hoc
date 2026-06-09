import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Tag, Users,
  ShoppingCart, Star, LogOut, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/auth';

const NAV_GROUPS = [
  {
    items: [
      { to: '/admin',        label: 'Dashboard',  icon: LayoutDashboard, exact: true },
      { to: '/admin/orders', label: 'Đơn hàng',  icon: ShoppingCart },
    ],
  },
  {
    label: '// Nội dung',
    items: [
      { to: '/admin/courses',    label: 'Khóa học', icon: BookOpen },
      { to: '/admin/categories', label: 'Danh mục', icon: Tag },
      { to: '/admin/reviews',    label: 'Đánh giá', icon: Star },
    ],
  },
  {
    label: '// Người dùng',
    items: [
      { to: '/admin/users', label: 'Học viên', icon: Users },
    ],
  },
];

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();
}

export function AdminLayout() {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();

  return (
    <div className="flex min-h-screen bg-bg">
      {/* ── Sidebar ── */}
      <aside className="w-[220px] shrink-0 border-r border-line flex flex-col bg-bg sticky top-0 h-screen">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-line">
          <p className="font-mono font-extrabold text-[16px] text-accent tracking-tight">Hoisted()</p>
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mt-0.5">// Admin Console</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, exact }) => {
                  const active = exact ? pathname === to : pathname.startsWith(to);
                  return (
                    <Link key={to} to={to}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                        active
                          ? 'bg-accent/10 text-accent'
                          : 'text-ink-2 hover:bg-bg-2 hover:text-ink',
                      )}>
                      <Icon className="w-4 h-4 shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-3 border-t border-line pt-3">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full shrink-0 grid place-items-center font-mono font-bold text-[12px] text-bg select-none"
              style={{ background: 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}>
              {getInitials(user?.name ?? user?.email ?? 'A')}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11.5px] text-ink truncate">{user?.name ?? user?.email}</p>
              <p className="font-mono text-[10px] text-ink-3">super_admin</p>
            </div>
          </div>
          <Link to="/"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] text-ink-3 hover:text-ink hover:bg-bg-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Về trang chủ
          </Link>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] text-ink-3 hover:text-danger hover:bg-danger/10 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
