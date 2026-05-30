import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, BookOpen, FileText, Grid3x3,
  Star, Users, GraduationCap } from 'lucide-react';
import { Logo } from '../logo.jsx';
import { cn } from '@/lib/utils';

const GROUPS = [
  { label: '// overview', items: [
    { to: '/admin',          label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/orders',   label: 'Đơn hàng',  icon: ShoppingCart, badge: '24' },
  ]},
  { label: '// nội dung', items: [
    { to: '/admin/courses',     label: 'Khóa học',  icon: BookOpen },
    { to: '/admin/lessons',     label: 'Bài học',   icon: FileText },
    { to: '/admin/categories',  label: 'Danh mục',  icon: Grid3x3 },
    { to: '/admin/reviews',     label: 'Đánh giá',  icon: Star, badge: '12' },
  ]},
  { label: '// người dùng', items: [
    { to: '/admin/users',       label: 'Học viên',   icon: Users },
    { to: '/admin/instructors', label: 'Giảng viên', icon: GraduationCap },
  ]},
];

export function AdminShell({ children }) {
  return (
    <div className="min-h-screen grid grid-cols-[232px_1fr]">
      <aside className="border-r border-line p-4 flex flex-col gap-1 bg-bg">
        <div className="p-2 pb-4">
          <Logo size={15} />
          <p className="eyebrow mt-1.5">// admin console</p>
        </div>
        {GROUPS.map((g) => (
          <div key={g.label}>
            <p className="eyebrow px-3 pt-3 pb-1.5">{g.label}</p>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium relative',
                  isActive ? 'bg-bg-2 text-ink' : 'text-ink-2 hover:bg-bg-2',
                )}>
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute -left-3.5 top-2 w-[3px] h-4 bg-accent rounded-full" />}
                    <it.icon className={cn('w-4 h-4', isActive ? 'text-accent' : 'text-ink-3')} />
                    <span className="flex-1 text-left">{it.label}</span>
                    {it.badge && (
                      <span className="font-mono text-[10px] bg-bg-3 text-ink-2 px-1.5 py-0.5 rounded">
                        {it.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>
      <main className="flex flex-col">{children}</main>
    </div>
  );
}
