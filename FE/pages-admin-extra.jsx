// pages-admin-extra.jsx — User Mgmt, Order Mgmt, Review Moderation, Category Mgmt

// ── User Management ──────────────────────────────────────────────────────
const AdminUsersPage = () => {
  const users = [
    { name: 'Nguyễn An', email: 'an@gmail.com', av: 'NA', courses: 8, spent: '4.8M', joined: '12/2024', role: 'student', st: 'active', last: '2h trước' },
    { name: 'Trần Vy',  email: 'vy@fpt.vn',   av: 'TV', courses: 3, spent: '1.9M', joined: '03/2025', role: 'student', st: 'active', last: 'Hôm nay' },
    { name: 'Phạm Quân', email: 'quan@momo.vn', av: 'PQ', courses: 12, spent: '8.4M', joined: '07/2024', role: 'pro',     st: 'active', last: '15m trước' },
    { name: 'Lê Minh',  email: 'minh@dev.io',  av: 'LM', courses: 1, spent: '599K', joined: '04/2026', role: 'student', st: 'locked', last: '5 ngày' },
    { name: 'Will Sentance', email: 'will@codesmith.io', av: 'WS', courses: 0, spent: '—', joined: '01/2024', role: 'instructor', st: 'active', last: '1h trước' },
    { name: 'Đoàn Hà', email: 'ha.doan@kms.com', av: 'ĐH', courses: 5, spent: '2.4M', joined: '09/2025', role: 'student', st: 'active', last: 'Hôm qua' },
    { name: 'Khang Phạm', email: 'khang@hoisted.dev', av: 'KP', courses: 6, spent: '3.9M', joined: '06/2024', role: 'admin', st: 'active', last: 'Vừa xong' },
  ];
  const roleColor = { admin: 'var(--rose)', instructor: 'var(--indigo)', pro: 'var(--accent)', student: 'var(--ink-3)' };
  return (
    <AdminShell active="Học viên">
      <header style={{ padding: '18px 28px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div className="hd-eyebrow">// admin / người dùng</div>
          <h1 className="hd-display" style={{ fontSize: 22, margin: '2px 0 0' }}>Quản lý người dùng</h1>
        </div>
        <div style={{ flex: 1 }}/>
        <button className="hd-btn hd-btn-ghost hd-btn-sm">{I.download} Export</button>
        <button className="hd-btn hd-btn-primary hd-btn-sm">{I.plus} Mời người dùng</button>
      </header>

      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard label="Tổng người dùng" value="12,481" delta="+218" up sparkColor="var(--accent)"/>
          <StatCard label="Hoạt động 7d" value="3,842" delta="+11%" up sparkColor="var(--indigo)"/>
          <StatCard label="Instructor" value="18" sub="3 pending" sparkColor="var(--green)"/>
          <StatCard label="Bị khóa" value="34" delta="+2" down alert sparkColor="var(--rose)"/>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <span style={{ position: 'absolute', left: 10, top: 11, color: 'var(--ink-3)' }}>{I.search}</span>
            <input className="hd-input" placeholder="Tìm tên, email, ID…" style={{ paddingLeft: 34 }}/>
          </div>
          <select className="hd-input" style={{ width: 140 }}><option>Mọi vai trò</option><option>Student</option><option>Instructor</option><option>Admin</option></select>
          <select className="hd-input" style={{ width: 140 }}><option>Mọi status</option><option>Active</option><option>Locked</option></select>
          <select className="hd-input" style={{ width: 160 }}><option>Sắp xếp: mới nhất</option><option>Chi nhiều nhất</option><option>Đăng ký nhiều khóa</option></select>
          <div style={{ flex: 1 }}/>
          <span style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>12,481 kết quả</span>
        </div>

        <div className="hd-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--bg-2)', font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)' }}>
            <Box on/>
            <span><b style={{ color: 'var(--ink)' }}>2 đã chọn</b></span>
            <div style={{ flex: 1 }}/>
            <button className="hd-btn hd-btn-ghost hd-btn-sm">Gửi email</button>
            <button className="hd-btn hd-btn-ghost hd-btn-sm">Đặt vai trò</button>
            <button className="hd-btn hd-btn-ghost hd-btn-sm" style={{ color: 'var(--rose)' }}>{I.lock} Khóa</button>
          </div>
          <table className="hd-table">
            <thead><tr>
              <th style={{ width: 32 }}><Box/></th>
              <th>Người dùng</th><th>Vai trò</th><th>Khóa đã mua</th><th>Tổng chi</th><th>Tham gia</th><th>Hoạt động</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i}>
                  <td><Box on={i < 2}/></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="hd-av">{u.av}</div>
                      <div>
                        <div style={{ font: '600 13.5px var(--font-display)' }}>{u.name}</div>
                        <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      font: '600 11px var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.04em',
                      padding: '3px 9px', borderRadius: 999,
                      background: `color-mix(in srgb, ${roleColor[u.role]} 14%, transparent)`,
                      color: roleColor[u.role],
                    }}>{u.role}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{u.courses}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{u.spent}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{u.joined}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{u.last}</td>
                  <td><StatusBadge s={u.st}/></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="hd-icon-btn" style={{ width: 28, height: 28 }} title="Xem"><span style={{ fontSize: 14 }}>{I.user}</span></button>
                      <button className="hd-icon-btn" style={{ width: 28, height: 28 }} title="Khóa">{I.lock}</button>
                      <button className="hd-icon-btn" style={{ width: 28, height: 28 }}>{I.more}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

// ── Order Management ─────────────────────────────────────────────────────
const AdminOrdersPage = () => {
  const orders = [
    { id: 'HO-12483', u: 'Nguyễn An', av: 'NA', items: 3, total: '1,617,300đ', m: 'VNPay', st: 'paid',    t: '14:42' },
    { id: 'HO-12482', u: 'Trần Vy',   av: 'TV', items: 1, total: '599,000đ',   m: 'Momo',  st: 'paid',    t: '13:18' },
    { id: 'HO-12481', u: 'Phạm Quân', av: 'PQ', items: 3, total: '1,997,000đ', m: 'VNPay', st: 'pending', t: '12:48' },
    { id: 'HO-12480', u: 'Lê Minh',   av: 'LM', items: 1, total: '749,000đ',   m: 'Visa',  st: 'paid',    t: '11:30' },
    { id: 'HO-12479', u: 'Đoàn Hà',   av: 'ĐH', items: 1, total: '549,000đ',   m: 'VNPay', st: 'failed',  t: '10:12' },
    { id: 'HO-12478', u: 'Mai Hùng',  av: 'MH', items: 2, total: '1,348,000đ', m: 'Momo',  st: 'refund',  t: '09:01' },
  ];
  return (
    <AdminShell active="Đơn hàng">
      <header style={{ padding: '18px 28px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div className="hd-eyebrow">// admin / đơn hàng</div>
          <h1 className="hd-display" style={{ fontSize: 22, margin: '2px 0 0' }}>Quản lý đơn hàng</h1>
        </div>
        <div style={{ flex: 1 }}/>
        <span style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>cập nhật real-time · cách 30s</span>
        <button className="hd-btn hd-btn-ghost hd-btn-sm">{I.download} Export</button>
      </header>

      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard label="Đơn hôm nay" value="42" delta="+8" up sparkColor="var(--accent)"/>
          <StatCard label="Đang chờ TT" value="24" delta="+3" sparkColor="var(--js)" alert/>
          <StatCard label="Doanh thu hôm nay" value="18.4M" suffix="đ" delta="+11%" up sparkColor="var(--green)"/>
          <StatCard label="Tỉ lệ failed" value="2.4%" delta="-0.6pp" up sparkColor="var(--rose)"/>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[['Tất cả', 482, true], ['Đã thanh toán', 421], ['Đang chờ', 24], ['Thất bại', 28], ['Hoàn tiền', 9]].map(([t, n, on], i) => (
            <button key={i} className="hd-card" style={{
              padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
              background: on ? 'var(--bg-2)' : 'var(--bg-1)',
              border: on ? '1px solid var(--accent)' : '1px solid var(--line)',
              color: on ? 'var(--ink)' : 'var(--ink-2)',
              font: '500 12.5px var(--font-body)',
              cursor: 'pointer', borderRadius: 999,
            }}>{t} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{n}</span></button>
          ))}
          <div style={{ flex: 1 }}/>
          <input className="hd-input" placeholder="Tìm theo mã đơn / email…" style={{ width: 280 }}/>
        </div>

        <div className="hd-card" style={{ overflow: 'hidden' }}>
          <table className="hd-table">
            <thead><tr>
              <th>Mã đơn</th><th>Khách hàng</th><th>Items</th><th>Tổng</th><th>Phương thức</th><th>Thời gian</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>#{o.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="hd-av" style={{ width: 28, height: 28, fontSize: 10 }}>{o.av}</div>
                      <span style={{ fontSize: 13 }}>{o.u}</span>
                    </div>
                  </td>
                  <td><span className="hd-chip hd-chip-line">{o.items} khóa</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{o.total}</td>
                  <td style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{o.m}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{o.t}</td>
                  <td><StatusBadge s={o.st}/></td>
                  <td style={{ textAlign: 'right' }}>
                    {o.st === 'pending' ? (
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="hd-btn hd-btn-primary hd-btn-sm" style={{ height: 26, padding: '0 10px' }}>Xác nhận</button>
                        <button className="hd-btn hd-btn-quiet hd-btn-sm" style={{ height: 26, padding: '0 10px', color: 'var(--rose)' }}>Hủy</button>
                      </div>
                    ) : (
                      <button className="hd-btn hd-btn-ghost hd-btn-sm">Chi tiết →</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

// ── Review Moderation ────────────────────────────────────────────────────
const AdminReviewsPage = () => {
  const reviews = [
    { u: 'Nguyễn An', av: 'NA', course: 'JS: The Hard Parts', r: 5, t: '2h trước', st: 'pending',
      txt: 'Phần Event Loop là phần duy nhất mà mình thấy thực sự khai sáng. Phần Closures cũng rất chắc tay. Đáng tiền.' },
    { u: 'Trần Vy',   av: 'TV', course: 'React Performance', r: 1, t: '5h trước', st: 'pending', flag: true,
      txt: 'Sao mà có thằng instructor nói toàn ngu vậy không biết. Đề nghị refund ngay không thì tao báo công an. 🤡🤡🤡' },
    { u: 'Phạm Quân', av: 'PQ', course: 'TS for JS Devs', r: 4, t: '1 ngày', st: 'approved',
      txt: 'Nội dung sâu, nhưng phần generics có thể giải thích chậm hơn chút. Overall 4/5 vì có project thực hành tốt.' },
    { u: 'Đoàn Hà',   av: 'ĐH', course: 'Async Patterns', r: 5, t: '2 ngày', st: 'approved',
      txt: 'Cô Lina giảng dễ hiểu, phần microtask vs macrotask cuối cùng đã thông. Tốt.' },
    { u: 'Mai Hùng',  av: 'MH', course: 'Node.js Internals', r: 2, t: '3 ngày', st: 'hidden',
      txt: 'Khóa cũ rồi, dùng Node 18 trong khi đã có Node 22. Cần update.' },
  ];
  const star = (n) => Array.from({ length: 5 }).map((_, i) => (
    <span key={i} style={{ color: i < n ? 'var(--js)' : 'var(--ink-3)', opacity: i < n ? 1 : .3 }}>★</span>
  ));
  return (
    <AdminShell active="Đánh giá">
      <header style={{ padding: '18px 28px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div className="hd-eyebrow">// admin / đánh giá</div>
          <h1 className="hd-display" style={{ fontSize: 22, margin: '2px 0 0' }}>Kiểm duyệt đánh giá</h1>
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 6, border: '1px solid var(--line)', borderRadius: 8, padding: 3 }}>
          {['Chờ duyệt 12', 'Đã duyệt', 'Đã ẩn', 'Bị flag 3'].map((t, i) => (
            <button key={t} style={{
              font: '500 12px var(--font-body)', padding: '6px 12px',
              background: i === 0 ? 'var(--bg-2)' : 'transparent',
              color: i === 0 ? 'var(--ink)' : 'var(--ink-3)',
              border: 0, borderRadius: 5, cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
      </header>

      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Reviews list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map((rv, i) => (
            <div key={i} className="hd-card" style={{
              padding: 20,
              borderColor: rv.flag ? 'var(--rose)' : 'var(--line)',
              backgroundImage: rv.flag ? 'linear-gradient(90deg, rgba(244,63,94,.06), transparent 30%)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: 14, marginBottom: 12 }}>
                <div className="hd-av">{rv.av}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ font: '600 13.5px var(--font-display)' }}>{rv.u}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>· {rv.t}</span>
                    {rv.flag && <span className="hd-chip" style={{ background: 'rgba(244,63,94,.14)', color: 'var(--rose)' }}>⚐ flagged · 4 báo cáo</span>}
                    <StatusBadge s={rv.st === 'pending' ? 'review' : rv.st === 'approved' ? 'active' : 'draft'}/>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>
                    <span>{star(rv.r)}</span>
                    <span>·</span>
                    <span>khóa: <span style={{ color: 'var(--ink-2)' }}>{rv.course}</span></span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 14px', paddingLeft: 46 }}>
                {rv.txt}
              </p>
              <div style={{ display: 'flex', gap: 8, paddingLeft: 46 }}>
                {rv.st === 'pending' ? (
                  <>
                    <button className="hd-btn hd-btn-primary hd-btn-sm" style={{ background: 'var(--green)', color: '#fff' }}>{I.check} Duyệt</button>
                    <button className="hd-btn hd-btn-ghost hd-btn-sm" style={{ color: 'var(--rose)' }}>{I.x} Từ chối</button>
                    <button className="hd-btn hd-btn-quiet hd-btn-sm">Ẩn tạm thời</button>
                    <button className="hd-btn hd-btn-quiet hd-btn-sm">Trả lời</button>
                  </>
                ) : rv.st === 'approved' ? (
                  <>
                    <button className="hd-btn hd-btn-ghost hd-btn-sm">Ẩn</button>
                    <button className="hd-btn hd-btn-quiet hd-btn-sm">Trả lời</button>
                  </>
                ) : (
                  <>
                    <button className="hd-btn hd-btn-ghost hd-btn-sm">Hiện lại</button>
                    <button className="hd-btn hd-btn-quiet hd-btn-sm" style={{ color: 'var(--rose)' }}>{I.trash} Xóa</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right rail: rating distribution */}
        <aside style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
          <div className="hd-card" style={{ padding: 18 }}>
            <div className="hd-eyebrow" style={{ marginBottom: 10 }}>// phân bố · tất cả khóa</div>
            <div style={{ font: '700 32px var(--font-mono)', marginBottom: 2 }}>4.82</div>
            <div style={{ display: 'flex', gap: 2, color: 'var(--js)', fontSize: 14, marginBottom: 4 }}>{star(5)}</div>
            <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)', marginBottom: 16 }}>3,219 đánh giá</div>
            {[[5, 78], [4, 16], [3, 4], [2, 1], [1, 1]].map(([s, p]) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', width: 16 }}>{s}★</span>
                <div style={{ flex: 1, height: 6, background: 'var(--bg-2)', borderRadius: 999 }}>
                  <div style={{ width: p + '%', height: '100%', background: 'var(--accent)', borderRadius: 999 }}/>
                </div>
                <span style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-2)', width: 28, textAlign: 'right' }}>{p}%</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AdminShell>
  );
};

// ── Category Management ─────────────────────────────────────────────────
const AdminCategoriesPage = () => {
  const cats = [
    { name: 'JavaScript Core', slug: 'js-core', n: 24, color: '#F7DF1E', icon: '{}', desc: 'Hoisting, execution context, closures, this binding.' },
    { name: 'Asynchronous',   slug: 'async',   n: 8,  color: '#34D399', icon: '⟳',  desc: 'Promises, async/await, event loop, microtasks.' },
    { name: 'React',          slug: 'react',   n: 16, color: '#818CF8', icon: 'Rx', desc: 'Hooks, performance, server components, suspense.' },
    { name: 'TypeScript',     slug: 'ts',      n: 11, color: '#38BDF8', icon: 'TS', desc: 'Generics, utility types, type narrowing.' },
    { name: 'Node.js',        slug: 'node',    n: 9,  color: '#F43F5E', icon: 'Nx', desc: 'Runtime internals, streams, cluster, workers.' },
    { name: 'Testing',        slug: 'testing', n: 6,  color: '#A78BFA', icon: '✓',  desc: 'Vitest, Playwright, contract tests.' },
    { name: 'Tooling',        slug: 'tooling', n: 4,  color: '#FB923C', icon: '⚙',  desc: 'Vite, esbuild, monorepo, CI/CD.' },
  ];
  return (
    <AdminShell active="Danh mục">
      <header style={{ padding: '18px 28px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div className="hd-eyebrow">// admin / danh mục</div>
          <h1 className="hd-display" style={{ fontSize: 22, margin: '2px 0 0' }}>Quản lý danh mục</h1>
        </div>
        <div style={{ flex: 1 }}/>
        <span style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>7 danh mục · 78 khóa</span>
        <button className="hd-btn hd-btn-primary hd-btn-sm">{I.plus} Thêm danh mục</button>
      </header>

      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 22 }}>
        {/* List with drag handles */}
        <div className="hd-card" style={{ padding: 8 }}>
          <div style={{ padding: '10px 14px', font: '500 11px var(--font-mono)', color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            // drag để sắp xếp lại thứ tự hiển thị
          </div>
          {cats.map((c, i) => (
            <div key={i} className="hd-soft" style={{
              padding: '14px 16px', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 16,
              border: i === 0 ? '1px solid var(--line-2)' : '1px solid transparent',
            }}>
              <span style={{ color: 'var(--ink-3)', cursor: 'grab' }}>{I.drag}</span>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: `color-mix(in srgb, ${c.color} 18%, var(--bg-3))`,
                color: c.color, display: 'grid', placeItems: 'center',
                font: '700 18px var(--font-mono)',
              }}>{c.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                  <span style={{ font: '600 14px var(--font-display)' }}>{c.name}</span>
                  <span style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>/{c.slug}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{c.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ font: '700 16px var(--font-mono)' }}>{c.n}</div>
                <div style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)' }}>khóa</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="hd-icon-btn" style={{ width: 28, height: 28 }}>{I.edit}</button>
                <button className="hd-icon-btn" style={{ width: 28, height: 28 }}>{I.trash}</button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit panel — selected: js-core */}
        <aside style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
          <div className="hd-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <div className="hd-eyebrow">// đang sửa</div>
                <div style={{ font: '600 16px var(--font-display)', marginTop: 4 }}>JavaScript Core</div>
              </div>
              <button className="hd-icon-btn">{I.x}</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Tên danh mục" value="JavaScript Core"/>
              <Field label="Slug (URL)" value="js-core"/>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Mô tả</label>
                <textarea className="hd-input" defaultValue="Hoisting, execution context, closures, this binding."
                  style={{ height: 72, padding: 12, fontFamily: 'var(--font-body)', resize: 'none' }}/>
              </div>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 8 }}>Màu đại diện</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['#F7DF1E', '#34D399', '#818CF8', '#38BDF8', '#F43F5E', '#A78BFA', '#FB923C'].map((c, i) => (
                    <span key={c} style={{
                      width: 28, height: 28, borderRadius: 999, background: c, cursor: 'pointer',
                      border: i === 0 ? '2px solid var(--ink)' : '2px solid transparent',
                      boxShadow: i === 0 ? `0 0 0 2px var(--bg-1), 0 0 0 4px ${c}` : 'none',
                    }}/>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 8 }}>Glyph / icon</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['{}', '⟳', 'Rx', 'TS', 'Nx', '✓', '⚙', '⌘'].map((g, i) => (
                    <span key={g} style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: i === 0 ? 'var(--accent)' : 'var(--bg-2)',
                      color: i === 0 ? 'var(--accent-ink)' : 'var(--ink-2)',
                      display: 'grid', placeItems: 'center', cursor: 'pointer',
                      font: '700 14px var(--font-mono)',
                    }}>{g}</span>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>
                <span style={{
                  position: 'relative', width: 32, height: 18, borderRadius: 999,
                  background: 'var(--accent)', flexShrink: 0,
                }}>
                  <span style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, background: '#fff', borderRadius: 999 }}/>
                </span>
                Hiển thị trên trang chủ
              </label>
            </div>
            <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
              <button className="hd-btn hd-btn-quiet" style={{ flex: 1, justifyContent: 'center' }}>Hủy</button>
              <button className="hd-btn hd-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Lưu</button>
            </div>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
};

Object.assign(window, { AdminUsersPage, AdminOrdersPage, AdminReviewsPage, AdminCategoriesPage });
