// pages-admin.jsx — Admin Dashboard, Course Management

const AdminShell = ({ active = 'Dashboard', children }) => (
  <div className="hd-root hd-dark" style={{ minHeight: '100%', display: 'grid', gridTemplateColumns: '232px 1fr' }}>
    {/* Sidebar */}
    <aside style={{
      borderRight: '1px solid var(--line)',
      padding: '20px 14px',
      display: 'flex', flexDirection: 'column', gap: 4,
      background: 'var(--bg)',
    }}>
      <div style={{ padding: '4px 8px 16px' }}>
        <Logo size={15}/>
        <div className="hd-eyebrow" style={{ marginTop: 6, fontSize: 10 }}>// admin console</div>
      </div>

      <div className="hd-eyebrow" style={{ padding: '12px 12px 6px', fontSize: 10 }}>// overview</div>
      {[
        ['Dashboard', I.dash],
        ['Đơn hàng', I.cart, '24'],
      ].map(([t, ic, badge]) => (
        <AdminNavItem key={t} t={t} ic={ic} badge={badge} active={t === active}/>
      ))}

      <div className="hd-eyebrow" style={{ padding: '12px 12px 6px', fontSize: 10 }}>// nội dung</div>
      {[
        ['Khóa học', I.book],
        ['Bài học', I.doc],
        ['Danh mục', I.grid],
        ['Đánh giá', I.star, '12'],
      ].map(([t, ic, badge]) => (
        <AdminNavItem key={t} t={t} ic={ic} badge={badge} active={t === active}/>
      ))}

      <div className="hd-eyebrow" style={{ padding: '12px 12px 6px', fontSize: 10 }}>// người dùng</div>
      {[
        ['Học viên', I.user],
        ['Giảng viên', I.cap],
      ].map(([t, ic]) => (
        <AdminNavItem key={t} t={t} ic={ic} active={t === active}/>
      ))}

      <div style={{ flex: 1 }}/>
      <div className="hd-soft" style={{ padding: 14, margin: '8px 4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div className="hd-av">AD</div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Khang Phạm</div>
            <div style={{ font: '500 10.5px var(--font-mono)', color: 'var(--ink-3)' }}>super_admin</div>
          </div>
        </div>
        <button className="hd-btn hd-btn-quiet hd-btn-sm" style={{ width: '100%', justifyContent: 'flex-start', padding: '0 8px' }}>
          Đăng xuất
        </button>
      </div>
    </aside>
    {/* Main */}
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  </div>
);

const AdminNavItem = ({ t, ic, badge, active }) => (
  <button style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', borderRadius: 8,
    background: active ? 'var(--bg-2)' : 'transparent',
    border: 0, color: active ? 'var(--ink)' : 'var(--ink-2)',
    cursor: 'pointer',
    position: 'relative',
    font: '500 13px var(--font-body)',
  }}>
    {active && <span style={{ position: 'absolute', left: -14, top: 9, width: 3, height: 16, background: 'var(--accent)', borderRadius: 999 }}/>}
    <span style={{ color: active ? 'var(--accent)' : 'var(--ink-3)' }}>{ic}</span>
    <span style={{ flex: 1, textAlign: 'left' }}>{t}</span>
    {badge && <span style={{
      font: '600 10px var(--font-mono)',
      background: 'var(--bg-3)', color: 'var(--ink-2)',
      padding: '2px 6px', borderRadius: 5,
    }}>{badge}</span>}
  </button>
);

// ── Admin Dashboard ───────────────────────────────────────────────────────
const AdminDashboardPage = () => (
  <AdminShell active="Dashboard">
    {/* Top bar */}
    <header style={{ padding: '18px 28px', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', gap: 16 }}>
      <div>
        <div className="hd-eyebrow">// admin / overview</div>
        <h1 className="hd-display" style={{ fontSize: 22, margin: '2px 0 0' }}>Dashboard</h1>
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 8, padding: 3, gap: 2 }}>
        {['7d', '30d', '3m', '12m'].map((p, i) => (
          <button key={p} style={{
            font: '500 12px var(--font-mono)', padding: '5px 12px',
            background: i === 1 ? 'var(--bg-2)' : 'transparent',
            color: i === 1 ? 'var(--ink)' : 'var(--ink-3)',
            border: 0, borderRadius: 5, cursor: 'pointer',
          }}>{p}</button>
        ))}
      </div>
      <button className="hd-btn hd-btn-ghost hd-btn-sm">{I.download} Export CSV</button>
      <button className="hd-btn hd-btn-primary hd-btn-sm">{I.plus} Khóa mới</button>
    </header>

    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22, overflow: 'auto' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Doanh thu 30d" value="487.2M" suffix="đ" delta="+12.4%" up sparkColor="var(--accent)" />
        <StatCard label="Học viên mới" value="1,284" delta="+8.1%" up sparkColor="var(--indigo)" />
        <StatCard label="Khóa đang bán" value="127" sub="6 draft" delta="+3" up sparkColor="var(--green)" />
        <StatCard label="Đơn cần xử lý" value="24" delta="-5" down sparkColor="var(--rose)" alert />
      </div>

      {/* Chart row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* Revenue line chart */}
        <div className="hd-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="hd-eyebrow">// revenue · 30 days</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                <span style={{ font: '700 26px var(--font-mono)' }}>487,234,000đ</span>
                <span className="hd-chip" style={{ background: 'rgba(52,211,153,.12)', color: 'var(--green)' }}>+12.4% vs prev</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
              <Legend color="var(--accent)" label="2026"/>
              <Legend color="rgba(255,255,255,.18)" label="2025"/>
            </div>
          </div>
          <LineChart/>
        </div>

        {/* Top courses */}
        <div className="hd-card" style={{ padding: 22 }}>
          <div className="hd-eyebrow" style={{ marginBottom: 16 }}>// top courses · revenue</div>
          {[
            { t: 'JS: The Hard Parts', v: 142.4, max: 142.4, c: 'var(--accent)' },
            { t: 'React Performance', v: 98.2, max: 142.4, c: 'var(--indigo)' },
            { t: 'TypeScript for JS Devs', v: 76.4, max: 142.4, c: 'var(--green)' },
            { t: 'Async Patterns', v: 64.1, max: 142.4, c: 'var(--js)' },
            { t: 'Node.js Internals', v: 41.0, max: 142.4, c: 'var(--rose)' },
          ].map((row, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12.5 }}>
                <span style={{ color: 'var(--ink)' }}>{row.t}</span>
                <span style={{ font: '600 12px var(--font-mono)', color: 'var(--ink-2)' }}>{row.v}M</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: (row.v / row.max * 100) + '%', height: '100%', background: row.c, borderRadius: 999 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity table + funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <div className="hd-card">
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="hd-eyebrow">// đơn hàng gần đây</div>
              <div style={{ font: '600 14px var(--font-display)', marginTop: 2 }}>Recent orders</div>
            </div>
            <a href="#" style={{ font: '500 12px var(--font-mono)', color: 'var(--accent)' }}>xem tất cả →</a>
          </div>
          <table className="hd-table">
            <thead><tr>
              <th>Order</th><th>Khách</th><th>Khóa</th><th>Tổng</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {[
                ['#HO-12483', 'Nguyễn An', '2 khóa', '1,348,000đ', 'paid'],
                ['#HO-12482', 'Trần Vy', 'JS Hard Parts', '599,000đ', 'paid'],
                ['#HO-12481', 'Phạm Quân', '3 khóa', '1,997,000đ', 'pending'],
                ['#HO-12480', 'Lê Minh', 'React Perf', '749,000đ', 'paid'],
                ['#HO-12479', 'Đoàn Hà', 'TS for JS', '549,000đ', 'failed'],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{r[0]}</td>
                  <td>{r[1]}</td>
                  <td style={{ color: 'var(--ink-2)' }}>{r[2]}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r[3]}</td>
                  <td><StatusBadge s={r[4]}/></td>
                  <td><button className="hd-icon-btn" style={{ width: 26, height: 26 }}>{I.chevR}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="hd-card" style={{ padding: 22 }}>
          <div className="hd-eyebrow" style={{ marginBottom: 14 }}>// funnel · last 30d</div>
          {[
            { t: 'Page view', v: 24840, w: 100, c: 'var(--ink-2)' },
            { t: 'Click trial', v: 8120, w: 38, c: 'var(--indigo)' },
            { t: 'Add to cart', v: 3470, w: 18, c: 'var(--green)' },
            { t: 'Checkout', v: 1840, w: 9.2, c: 'var(--js)' },
            { t: 'Paid', v: 1284, w: 6.5, c: 'var(--accent)' },
          ].map((row, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                <span>{row.t}</span>
                <span style={{ font: '600 12px var(--font-mono)' }}>
                  {new Intl.NumberFormat().format(row.v)}
                  <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>{row.w}%</span>
                </span>
              </div>
              <div style={{ height: 10, background: 'var(--bg-2)', borderRadius: 4 }}>
                <div style={{ width: row.w + '%', height: '100%', background: row.c, borderRadius: 4 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </AdminShell>
);

const StatCard = ({ label, value, suffix, sub, delta, up, down, alert, sparkColor }) => (
  <div className="hd-card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
    {alert && <span style={{ position: 'absolute', top: 14, right: 14, width: 6, height: 6, borderRadius: 999, background: 'var(--rose)' }}/>}
    <div className="hd-eyebrow" style={{ marginBottom: 10 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
      <span style={{ font: '700 26px var(--font-mono)', letterSpacing: '-0.02em' }}>{value}</span>
      {suffix && <span style={{ font: '500 14px var(--font-mono)', color: 'var(--ink-3)' }}>{suffix}</span>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 11.5px var(--font-mono)' }}>
      <span style={{ color: up ? 'var(--green)' : down ? 'var(--rose)' : 'var(--ink-3)' }}>
        {up ? '▲' : down ? '▼' : ''} {delta}
      </span>
      {sub && <span style={{ color: 'var(--ink-3)' }}>· {sub}</span>}
    </div>
    {/* Spark */}
    <svg width="100%" height="36" viewBox="0 0 200 36" preserveAspectRatio="none" style={{ position: 'absolute', right: 0, bottom: 0, left: 0, opacity: .8 }}>
      <defs>
        <linearGradient id={`spk-${label.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sparkColor} stopOpacity=".25"/>
          <stop offset="100%" stopColor={sparkColor} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d="M0,28 L20,22 L40,24 L60,18 L80,20 L100,12 L120,16 L140,10 L160,12 L180,6 L200,8 L200,36 L0,36 Z"
            fill={`url(#spk-${label.replace(/\W/g, '')})`}/>
      <path d="M0,28 L20,22 L40,24 L60,18 L80,20 L100,12 L120,16 L140,10 L160,12 L180,6 L200,8"
            fill="none" stroke={sparkColor} strokeWidth="1.5"/>
    </svg>
  </div>
);

const Legend = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
    <span style={{ width: 10, height: 2, background: color, borderRadius: 999 }}/>{label}
  </div>
);

const StatusBadge = ({ s }) => {
  const map = {
    paid:     ['var(--green)', 'Đã thanh toán'],
    pending:  ['var(--js)', 'Đang chờ'],
    failed:   ['var(--rose)', 'Thất bại'],
    refund:   ['var(--ink-3)', 'Hoàn tiền'],
    active:   ['var(--green)', 'Hoạt động'],
    draft:    ['var(--ink-3)', 'Nháp'],
    review:   ['var(--js)', 'Đang duyệt'],
    locked:   ['var(--rose)', 'Khóa'],
  };
  const [c, l] = map[s] || ['var(--ink-3)', s];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      font: '600 11px var(--font-mono)',
      padding: '3px 9px', borderRadius: 999,
      background: `color-mix(in srgb, ${c} 14%, transparent)`,
      color: c,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: c }}/>
      {l}
    </span>
  );
};

// Faux line chart with two series (current + previous)
const LineChart = () => {
  // generate two paths
  const points = (seed) => Array.from({ length: 30 }).map((_, i) => {
    const v = 0.5 + Math.sin(i / 4 + seed) * 0.18 + Math.cos(i / 7 + seed * 1.7) * 0.12 + (i / 60);
    return [i / 29, Math.max(0.05, Math.min(0.95, v))];
  });
  const p1 = points(0.8);
  const p2 = points(1.6).map(([x, y]) => [x, y * 0.78]);
  const w = 600, h = 220;
  const toPath = (pts) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x * w},${(1 - y) * h}`).join(' ');
  const toArea = (pts) => `${toPath(pts)} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="lg-now" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity=".32"/>
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(v => (
        <line key={v} x1="0" x2={w} y1={v * h} y2={v * h} stroke="var(--line)" strokeWidth="1"/>
      ))}
      {/* prev */}
      <path d={toPath(p2)} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" strokeDasharray="3 4"/>
      {/* current */}
      <path d={toArea(p1)} fill="url(#lg-now)"/>
      <path d={toPath(p1)} fill="none" stroke="var(--accent)" strokeWidth="2"/>
      {/* dots on current end */}
      <circle cx={p1[p1.length - 1][0] * w} cy={(1 - p1[p1.length - 1][1]) * h} r="4" fill="var(--accent)" stroke="var(--bg-1)" strokeWidth="2"/>
      {/* x labels */}
      {['Nov 01', 'Nov 08', 'Nov 15', 'Nov 22', 'Nov 30'].map((t, i, arr) => (
        <text key={t} x={(i / (arr.length - 1)) * w} y={h + 16} fontFamily="JetBrains Mono"
          fontSize="10" fill="var(--ink-3)" textAnchor={i === 0 ? 'start' : i === arr.length - 1 ? 'end' : 'middle'}>{t}</text>
      ))}
    </svg>
  );
};

// ── Course Management ─────────────────────────────────────────────────────
const AdminCoursesPage = () => (
  <AdminShell active="Khóa học">
    <header style={{ padding: '18px 28px', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', gap: 16 }}>
      <div>
        <div className="hd-eyebrow">// admin / khóa học</div>
        <h1 className="hd-display" style={{ fontSize: 22, margin: '2px 0 0' }}>Quản lý khóa học</h1>
      </div>
      <div style={{ flex: 1 }}/>
      <button className="hd-btn hd-btn-ghost hd-btn-sm">{I.download} Export</button>
      <button className="hd-btn hd-btn-primary hd-btn-sm">{I.plus} Tạo khóa mới</button>
    </header>

    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <span style={{ position: 'absolute', left: 10, top: 11, color: 'var(--ink-3)' }}>{I.search}</span>
          <input className="hd-input" placeholder="Tìm theo tên, ID, instructor…" style={{ paddingLeft: 34 }}/>
        </div>
        <select className="hd-input" style={{ width: 140 }}>
          <option>Mọi danh mục</option><option>JS Core</option><option>React</option>
        </select>
        <select className="hd-input" style={{ width: 140 }}>
          <option>Mọi cấp độ</option><option>Beginner</option><option>Advanced</option>
        </select>
        <select className="hd-input" style={{ width: 140 }}>
          <option>Mọi trạng thái</option><option>Active</option><option>Draft</option>
        </select>
        <div style={{ flex: 1 }}/>
        <span style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>127 kết quả</span>
      </div>

      <div className="hd-card" style={{ overflow: 'hidden' }}>
        <table className="hd-table">
          <thead><tr>
            <th style={{ width: 32 }}><Box/></th>
            <th>Khóa học</th>
            <th>Danh mục</th>
            <th>Giá</th>
            <th>Học viên</th>
            <th>Rating</th>
            <th>Status</th>
            <th>Cập nhật</th>
            <th></th>
          </tr></thead>
          <tbody>
            {[
              { c: COURSES[0], st: 'active', up: '2 giờ trước', sel: true, st2: '12,438', r: 4.9 },
              { c: COURSES[1], st: 'active', up: '1 ngày', st2: '8,142', r: 4.8 },
              { c: COURSES[2], st: 'review', up: 'Hôm nay', st2: '5,728', r: 4.9 },
              { c: COURSES[3], st: 'active', up: '3 ngày', st2: '9,341', r: 4.7 },
              { c: COURSES[4], st: 'draft', up: '5 ngày', st2: '—', r: '—' },
              { c: COURSES[5], st: 'active', up: '2 tuần', st2: '22,108', r: 4.6 },
            ].map(({ c, st, up, sel, st2, r }, i) => (
              <tr key={i}>
                <td><Box on={sel}/></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 56, aspectRatio: '16/9', flexShrink: 0 }}>
                      <CourseThumb course={c}/>
                    </div>
                    <div>
                      <div style={{ font: '600 13.5px var(--font-display)' }}>{c.title}</div>
                      <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)', marginTop: 1 }}>
                        bởi {c.instr} · {c.lessons} bài
                      </div>
                    </div>
                  </div>
                </td>
                <td><span className="hd-chip hd-chip-line">{c.cat}</span></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatVND(c.price)}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{st2}</td>
                <td>
                  {r !== '—' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span className="hd-star">{I.star}</span>
                      <b style={{ fontFamily: 'var(--font-mono)' }}>{r}</b>
                    </span>
                  ) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                </td>
                <td><StatusBadge s={st}/></td>
                <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>{up}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="hd-icon-btn" style={{ width: 28, height: 28 }}>{I.edit}</button>
                    <button className="hd-icon-btn" style={{ width: 28, height: 28 }}>{I.more}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: nested lesson editor (drag-reorder) */}
      <div className="hd-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="hd-eyebrow">// curriculum editor · JS: The Hard Parts</div>
            <div style={{ font: '600 14px var(--font-display)', marginTop: 2 }}>Bài học — drag để sắp xếp lại</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="hd-btn hd-btn-ghost hd-btn-sm">+ Section</button>
            <button className="hd-btn hd-btn-primary hd-btn-sm">+ Bài học</button>
          </div>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { t: '01 · Foundations of JS', n: 8 },
            { t: '02 · Closures & Lexical Scope', n: 9 },
            { t: '03 · Asynchronous JavaScript', n: 11, exp: true },
          ].map((s, i) => (
            <div key={i} className="hd-soft" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: 12 }}>
                <span style={{ color: 'var(--ink-3)', cursor: 'grab' }}>{I.drag}</span>
                <span style={{ color: 'var(--ink-3)' }}>{I.chev}</span>
                <div style={{ flex: 1, font: '600 13px var(--font-display)' }}>{s.t}</div>
                <span style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>{s.n} bài</span>
                <button className="hd-icon-btn" style={{ width: 28, height: 28 }}>{I.edit}</button>
                <button className="hd-icon-btn" style={{ width: 28, height: 28 }}>{I.more}</button>
              </div>
              {s.exp && (
                <div style={{ borderTop: '1px solid var(--line)' }}>
                  {[
                    'Callback-based async (9:48)',
                    'The microtask queue (13:21)',
                    'The Event Loop, step by step (14:02)',
                    'Promises & .then chains (15:38)',
                  ].map((l, j) => (
                    <div key={j} style={{
                      padding: '8px 12px 8px 44px', display: 'flex', alignItems: 'center', gap: 12,
                      borderBottom: j < 3 ? '1px solid var(--line)' : 0, fontSize: 12.5,
                    }}>
                      <span style={{ color: 'var(--ink-3)', cursor: 'grab' }}>{I.drag}</span>
                      <span style={{ width: 24, font: '600 11px var(--font-mono)', color: 'var(--ink-3)' }}>0{j + 1}</span>
                      <span style={{ flex: 1 }}>{l}</span>
                      <button className="hd-icon-btn" style={{ width: 26, height: 26 }}>{I.edit}</button>
                      <button className="hd-icon-btn" style={{ width: 26, height: 26 }}>{I.trash}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  </AdminShell>
);

const Box = ({ on }) => (
  <span style={{
    display: 'inline-grid', placeItems: 'center',
    width: 16, height: 16, borderRadius: 4,
    background: on ? 'var(--accent)' : 'transparent',
    border: on ? 0 : '1px solid var(--line-2)',
    color: 'var(--accent-ink)',
  }}>
    {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 12l5 5L20 7"/></svg>}
  </span>
);

Object.assign(window, { AdminDashboardPage, AdminCoursesPage });
