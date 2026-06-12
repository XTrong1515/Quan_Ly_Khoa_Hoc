import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, Bell, ShoppingCart, Moon, Sun, LogOut, BookOpen, Settings, ChevronDown, X, Heart, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Logo } from '../logo.jsx';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { api, apiMessage } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const LINKS = [
  { to: '/courses',  label: 'Khóa học'    },
  { to: '/paths',    label: 'Lộ trình'    },
  { to: '/blog',     label: 'Blog'        },
  { to: '/business', label: 'Doanh nghiệp' },
];

const THUMB_COLORS = {
  yellow: '#F7DF1E', indigo: '#6366F1', rose: '#F43F5E',
  green:  '#10B981', violet: '#8B5CF6', sky:  '#06B6D4',
};

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

      <SearchBox />

      <div className="flex items-center gap-1.5">
        <IconBtn onClick={toggle} title="Toggle theme">
          {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </IconBtn>

        {/* Notifications Bell */}
        <NotificationsBell />

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
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1 focus:outline-none"
              title={user?.name}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-line" />
              ) : (
                <div
                  className="w-8 h-8 rounded-full grid place-items-center font-mono font-bold text-xs text-[#0B0F19] shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}
                >
                  {avatarLabel}
                </div>
              )}
              <ChevronDown className={cn(
                'w-3.5 h-3.5 text-ink-3 transition-transform duration-200',
                menuOpen && 'rotate-180',
              )} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-xl border border-line bg-bg-1 shadow-xl py-1.5 z-50">
                <div className="px-4 py-3 border-b border-line">
                  <div className="flex items-center gap-2.5">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-line" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full grid place-items-center font-mono font-bold text-xs text-[#0B0F19] shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}
                      >
                        {avatarLabel}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink truncate leading-tight">{user?.name}</p>
                      <p className="text-[11px] text-ink-3 truncate font-mono">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <MenuItem to="/me" icon={BookOpen} onClick={() => setMenuOpen(false)}>
                    Học của tôi
                  </MenuItem>
                  <MenuItem to="/me/wishlist" icon={Heart} onClick={() => setMenuOpen(false)}>
                    Khóa học yêu thích
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

/* ── Notifications Bell ─────────────────────────────────────────── */
function NotificationsBell() {
  const { role } = useAuth();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const { data, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/api/notifications').then(r => r.data),
    enabled: role !== 'guest',
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount   = data?.unreadCount ?? 0;

  const markRead = async (id, link) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      refetch();
      if (link) navigate(link);
      setOpen(false);
    } catch (err) {
      toast.error(apiMessage(err));
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      refetch();
    } catch (err) {
      toast.error(apiMessage(err));
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <IconBtn title="Notifications" onClick={() => role !== 'guest' && setOpen(v => !v)}>
          <Bell className="w-4 h-4" />
        </IconBtn>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white font-mono font-bold text-[9.5px] grid place-items-center border-2 border-bg pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-xl border border-line bg-bg shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="font-semibold text-[13px] text-ink">Thông báo</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="font-mono text-[11px] text-accent hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center font-mono text-[12px] text-ink-3">
                // Chưa có thông báo nào
              </p>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id, n.link)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-line last:border-0 hover:bg-bg-2 transition-colors',
                    !n.isRead && 'bg-accent/5',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {!n.isRead && (
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    )}
                    <div className={cn('flex-1 min-w-0', n.isRead && 'pl-4')}>
                      <p className="text-[12.5px] font-medium text-ink leading-snug line-clamp-1">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="font-mono text-[11px] text-ink-3 mt-0.5 line-clamp-2 leading-snug">
                          {n.body}
                        </p>
                      )}
                      <p className="font-mono text-[10px] text-ink-3 mt-1">
                        {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Search box with live dropdown ─────────────────────────────── */
function SearchBox() {
  const navigate    = useNavigate();
  const inputRef    = useRef(null);
  const containerRef = useRef(null);

  const [value,      setValue]     = useState('');
  const [debounced,  setDebounced] = useState('');
  const [open,       setOpen]      = useState(false);
  const [activeIdx,  setActiveIdx] = useState(-1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 300);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    function handle(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  useEffect(() => {
    function handle(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['nav-search', debounced],
    queryFn: () =>
      api.get('/api/courses', { params: { search: debounced, limit: 6, page: 1 } }).then(r => r.data),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const courses     = data?.courses ?? [];
  const total       = data?.total   ?? 0;
  const showDropdown = open && debounced.length >= 2;

  const commit = (slug) => {
    navigate(`/courses/${slug}`);
    setValue('');
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.blur();
  };

  const commitSearch = () => {
    if (!value.trim()) return;
    navigate(`/courses?search=${encodeURIComponent(value.trim())}`);
    setValue('');
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'Enter') commitSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, courses.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && courses[activeIdx]) {
        commit(courses[activeIdx].slug);
      } else {
        commitSearch();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="flex-1 max-w-sm ml-auto relative">
      <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-3 pointer-events-none z-10" />
      <input
        ref={inputRef}
        value={value}
        onChange={e => { setValue(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="input pl-10 pr-16 w-full"
        placeholder="Tìm khóa học, JS, React…"
        autoComplete="off"
      />
      {value ? (
        <button
          onClick={() => { setValue(''); setOpen(false); inputRef.current?.focus(); }}
          className="absolute right-9 top-2 p-0.5 text-ink-3 hover:text-ink transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span className="absolute right-2 top-2 font-mono text-[11px] text-ink-3 border border-line rounded px-1.5 py-0.5 pointer-events-none">
          ⌘K
        </span>
      )}

      {showDropdown && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-bg border border-line rounded-xl shadow-2xl overflow-hidden z-50">
          {isFetching && courses.length === 0 && (
            <p className="px-4 py-3 font-mono text-[12px] text-ink-3">Đang tìm...</p>
          )}
          {!isFetching && courses.length === 0 && (
            <p className="px-4 py-3 font-mono text-[12px] text-ink-3">
              // Không tìm thấy "{debounced}"
            </p>
          )}
          {courses.map((c, i) => (
            <button
              key={c.id}
              onMouseDown={() => commit(c.slug)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-line last:border-0',
                i === activeIdx ? 'bg-bg-2' : 'hover:bg-bg-2',
              )}>
              <MiniThumb course={c} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate leading-snug">{c.title}</p>
                <p className="font-mono text-[11px] text-ink-3 truncate">{c.instructor_name}</p>
              </div>
              <span className={cn(
                'font-mono text-[11px] shrink-0',
                c.price === 0 ? 'text-success' : 'text-ink-3',
              )}>
                {formatVND(c.price)}
              </span>
            </button>
          ))}
          <button
            onMouseDown={commitSearch}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12.5px] text-accent font-medium hover:bg-bg-2 transition-colors border-t border-line">
            <Search className="w-3.5 h-3.5" />
            {total > courses.length
              ? `Xem tất cả ${total} kết quả cho "${debounced}"`
              : `Tìm kiếm "${debounced}"`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Mini thumbnail 36×36 for dropdown rows ────────────────────── */
function MiniThumb({ course }) {
  const url = course.thumbnail_url || course.thumbnailUrl;
  if (url) {
    return <img src={url} alt="" className="w-9 h-9 rounded object-cover shrink-0 border border-line" />;
  }
  const bg = THUMB_COLORS[course.thumb] ?? '#6366F1';
  return (
    <div className="w-9 h-9 rounded shrink-0 grid place-items-center font-mono font-bold text-[13px] text-[#0B0F19]"
      style={{ background: bg }}>
      {course.glyph ?? course.title?.[0] ?? '?'}
    </div>
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
