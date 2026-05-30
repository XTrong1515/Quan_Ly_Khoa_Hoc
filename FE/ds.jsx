// ds.jsx — shared atoms for Hoisted

// ── Tiny inline icons (1-2 strokes, no slop) ──────────────────────────────
const Icon = ({ d, size = 16, fill = 'none', stroke = 'currentColor', sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {typeof d === 'string' ? <path d={d}/> : d}
  </svg>
);
const I = {
  search:   <Icon d="M11 19a8 8 0 1 0-5.3-14A8 8 0 0 0 11 19zm10 2l-5.5-5.5"/>,
  cart:     <Icon d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6 M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>,
  bell:     <Icon d="M6 8a6 6 0 1 1 12 0v5l1.5 3h-15L6 13V8zM10 19a2 2 0 1 0 4 0"/>,
  user:     <Icon d="M4 21a8 8 0 0 1 16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>,
  play:     <Icon d="M6 4l14 8-14 8V4z" fill="currentColor" sw={0}/>,
  star:     <Icon d="M12 2.5l3 6.3 6.8 1-5 4.9 1.2 6.9L12 18.3 5.9 21.6 7.2 14.7l-5-4.9 6.9-1z" fill="currentColor" sw={0}/>,
  chev:     <Icon d="M6 9l6 6 6-6"/>,
  chevR:    <Icon d="M9 6l6 6-6 6"/>,
  check:    <Icon d="M5 12l5 5L20 7"/>,
  plus:     <Icon d="M12 5v14M5 12h14"/>,
  x:        <Icon d="M6 6l12 12M18 6L6 18"/>,
  lock:     <Icon d="M5 11h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM8 11V7a4 4 0 0 1 8 0v4"/>,
  filter:   <Icon d="M3 5h18l-7 9v6l-4-2v-4z"/>,
  grid:     <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>,
  list:     <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>,
  clock:    <Icon d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>,
  level:    <Icon d="M3 20h4V10H3zM10 20h4V4h-4zM17 20h4v-8h-4z"/>,
  doc:      <Icon d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6"/>,
  drag:     <Icon d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" sw={3}/>,
  edit:     <Icon d="M16 3l5 5L8 21H3v-5z"/>,
  trash:    <Icon d="M4 7h16M9 7V4h6v3M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7"/>,
  more:     <Icon d="M5 12h.01M12 12h.01M19 12h.01" sw={3}/>,
  dash:     <Icon d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 9h8V3h-8z"/>,
  book:     <Icon d="M4 5a2 2 0 0 1 2-2h13v17H6a2 2 0 0 0-2 2zM4 5v15a2 2 0 0 0 2 2h13"/>,
  flame:    <Icon d="M12 2c1 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-5 2 1 3 2 3-3z"/>,
  download: <Icon d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14"/>,
  send:     <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>,
  attach:   <Icon d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a4 4 0 0 1 6 6L11 19a2 2 0 0 1-3-3l8-8"/>,
  cap:      <Icon d="M3 9l9-5 9 5-9 5zM7 11v5c0 1.7 2.7 3 5 3s5-1.3 5-3v-5"/>,
  card:     <Icon d="M3 6h18v12H3zM3 10h18"/>,
};

// ── Logo ──────────────────────────────────────────────────────────────────
const Logo = ({ size = 17 }) => (
  <div className="hd-logo" style={{ fontSize: size }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
      <path d="M12 19V6M12 6l-5 5M12 6l5 5" />
    </svg>
    <span>Hoisted<b>()</b></span>
  </div>
);

// ── IDE chrome wrapper ────────────────────────────────────────────────────
const IdeFrame = ({ tab = 'index.js', children, style }) => (
  <div className="hd-ide" style={style}>
    <div className="hd-ide-bar">
      <div className="hd-ide-dots"><span/><span/><span/></div>
      <div className="hd-ide-tab">{tab}</div>
    </div>
    {children}
  </div>
);

// ── Course thumb (no real images; gradient + glyph) ───────────────────────
const COURSES = [
  { id: 1, title: 'JavaScript: The Hard Parts', glyph: 'JS', thumb: 'yellow',
    instr: 'Will Sentance', level: 'Advanced', hours: 18.5, lessons: 64,
    price: 599000, old: 899000, rating: 4.9, students: '12.4k',
    tag: 'Bestseller', cat: 'Core' },
  { id: 2, title: 'React Performance Deep-dive', glyph: 'Rx', thumb: 'indigo',
    instr: 'Khang Phạm', level: 'Advanced', hours: 12.0, lessons: 48,
    price: 749000, old: 1199000, rating: 4.8, students: '8.1k',
    tag: 'Hot', cat: 'React' },
  { id: 3, title: 'Async Patterns & Event Loop', glyph: '⟳', thumb: 'green',
    instr: 'Lina Trần', level: 'Intermediate', hours: 9.5, lessons: 32,
    price: 449000, old: 699000, rating: 4.9, students: '5.7k',
    tag: 'New', cat: 'Core' },
  { id: 4, title: 'TypeScript for JS Devs', glyph: 'TS', thumb: 'sky',
    instr: 'Đặng Quang', level: 'Intermediate', hours: 14.0, lessons: 52,
    price: 549000, old: 899000, rating: 4.7, students: '9.3k',
    tag: null, cat: 'Types' },
  { id: 5, title: 'Node.js Internals', glyph: 'Nx', thumb: 'rose',
    instr: 'Mike Hughes', level: 'Advanced', hours: 16.0, lessons: 58,
    price: 699000, old: 1099000, rating: 4.8, students: '4.2k',
    tag: null, cat: 'Backend' },
  { id: 6, title: 'Vanilla JS Patterns', glyph: '{}', thumb: 'violet',
    instr: 'Hà Trang', level: 'Beginner', hours: 7.5, lessons: 26,
    price: 0, old: 0, rating: 4.6, students: '22.1k',
    tag: 'Free', cat: 'Core' },
];

const formatVND = (n) => n === 0 ? 'Free' : new Intl.NumberFormat('vi-VN').format(n) + 'đ';

const CourseThumb = ({ course, size = 'md' }) => (
  <div className={`hd-thumb hd-thumb-${course.thumb}`}>
    <div className="hd-thumb-glyph">{course.glyph}</div>
    <div className="hd-thumb-meta">
      <span>{course.lessons} lessons</span>
      <span>{course.hours}h</span>
    </div>
    {course.tag && (
      <div style={{
        position: 'absolute', top: 10, left: 10,
        background: '#0B0F19', color: course.tag === 'Free' ? 'var(--js)' : '#fff',
        font: '600 10px var(--font-mono)', letterSpacing: '.06em', textTransform: 'uppercase',
        padding: '4px 8px', borderRadius: 6,
      }}>{course.tag}</div>
    )}
  </div>
);

const CourseCard = ({ course, compact = false }) => (
  <div className="hd-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <CourseThumb course={course}/>
    <div style={{ padding: '4px 4px 8px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <span className="hd-chip hd-chip-line">{course.cat}</span>
        <span className="hd-chip hd-chip-line">{course.level}</span>
      </div>
      <div style={{ font: '600 15.5px var(--font-display)', letterSpacing: '-0.012em', marginBottom: 4 }}>
        {course.title}
      </div>
      <div style={{ color: 'var(--ink-3)', fontSize: 12.5, marginBottom: 12 }}>
        bởi {course.instr}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
          <span className="hd-star">{I.star}</span>
          <b style={{ color: 'var(--ink)' }}>{course.rating}</b>
          <span style={{ color: 'var(--ink-3)' }}>({course.students})</span>
        </div>
        <div style={{ font: '700 15px var(--font-mono)', color: course.price === 0 ? 'var(--accent)' : 'var(--ink)' }}>
          {formatVND(course.price)}
        </div>
      </div>
    </div>
  </div>
);

// ── Top nav ───────────────────────────────────────────────────────────────
const Nav = ({ active = 'Khóa học', cartCount = 2, role = 'user' }) => (
  <nav className="hd-nav">
    <Logo/>
    <div className="hd-nav-links">
      {['Khóa học', 'Lộ trình', 'Blog', 'Doanh nghiệp'].map(l => (
        <a key={l} href="#" className={active === l ? 'active' : ''}>{l}</a>
      ))}
    </div>
    <div style={{ flex: 1, maxWidth: 360, marginLeft: 'auto' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: 11, color: 'var(--ink-3)' }}>{I.search}</span>
        <input className="hd-input" placeholder="Tìm khóa học, JS, React, async…" style={{ paddingLeft: 34 }}/>
        <span style={{ position: 'absolute', right: 8, top: 8,
          font: '500 11px var(--font-mono)', color: 'var(--ink-3)',
          border: '1px solid var(--line)', borderRadius: 5, padding: '3px 6px' }}>⌘K</span>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button className="hd-icon-btn" title="Notifications">{I.bell}</button>
      <button className="hd-icon-btn" title="Cart" style={{ position: 'relative' }}>
        {I.cart}
        {cartCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--accent)', color: 'var(--accent-ink)',
            font: '700 9.5px var(--font-mono)',
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 999, display: 'grid', placeItems: 'center',
            border: '2px solid var(--bg)',
          }}>{cartCount}</span>
        )}
      </button>
      {role === 'guest' ? (
        <>
          <button className="hd-btn hd-btn-ghost hd-btn-sm">Đăng nhập</button>
          <button className="hd-btn hd-btn-primary hd-btn-sm">Đăng ký</button>
        </>
      ) : (
        <div className="hd-av">KP</div>
      )}
    </div>
  </nav>
);

// ── Footer mini (compact since we're in artboards) ────────────────────────
const Footer = () => (
  <footer style={{
    borderTop: '1px solid var(--line)',
    padding: '28px 32px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    color: 'var(--ink-3)', fontSize: 12.5,
  }}>
    <Logo/>
    <div style={{ display: 'flex', gap: 22, fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '.04em' }}>
      <span>© 2026 Hoisted</span>
      <a href="#" style={{ color: 'inherit' }}>Privacy</a>
      <a href="#" style={{ color: 'inherit' }}>Terms</a>
      <a href="#" style={{ color: 'inherit' }}>Github</a>
    </div>
  </footer>
);

// Export to global
Object.assign(window, { Icon, I, Logo, IdeFrame, COURSES, formatVND, CourseThumb, CourseCard, Nav, Footer });
