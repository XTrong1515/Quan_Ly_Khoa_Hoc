import { NavLink } from 'react-router-dom';
import { BookOpen, Heart, ReceiptText, CreditCard, Settings } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/me',              label: 'Học tập',   icon: BookOpen, end: true },
  { to: '/me/wishlist',     label: 'Yêu thích', icon: Heart },
  { to: '/me/orders',       label: 'Đơn hàng',  icon: ReceiptText },
  { to: '/me/transactions', label: 'Giao dịch', icon: CreditCard },
  { to: '/me/profile',      label: 'Cài đặt',   icon: Settings },
];

/* Shared shell for the logged-in account zone (/me/*) */
export function AccountShell({ title, desc, action, children }) {
  const { user } = useAuth();

  return (
    <div>
      <header className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-bg-2" aria-hidden="true" />
        <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none" aria-hidden="true" />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 45% 80% at 15% 0%, rgb(var(--accent) / .10) 0%, transparent 60%), radial-gradient(ellipse 35% 60% at 95% 100%, rgb(99 102 241 / .08) 0%, transparent 60%)',
          }}
        />

        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-8 pt-10">
          <div className="flex flex-wrap items-center gap-5 mb-8">
            {/* Avatar */}
            <div className="p-[3px] rounded-full bg-gradient-to-br from-accent to-indigo flex-shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={`Ảnh đại diện của ${user?.name ?? 'bạn'}`}
                  width="56" height="56"
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-bg-1 grid place-items-center font-display font-bold text-[20px] text-ink">
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="eyebrow mb-1">
                <span className="text-accent">~/hoisted</span> <span className="text-ink-3">/ {user?.name ?? 'tài-khoản'}</span>
              </p>
              <h1 className="display text-[26px] sm:text-[32px] truncate">{title}</h1>
              {desc && <p className="text-[13.5px] text-ink-2 mt-1">{desc}</p>}
            </div>

            {action}
          </div>

          {/* Section nav */}
          <nav
            className="flex gap-1 -mb-px overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Trang tài khoản"
          >
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  'flex items-center gap-2 px-4 py-3 text-[13.5px] font-medium border-b-2 whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-accent text-ink'
                    : 'border-transparent text-ink-3 hover:text-ink-2',
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-8">{children}</div>
    </div>
  );
}
