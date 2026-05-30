// pages-app.jsx — My Learning, Lesson Player (critical), Cart+Checkout, Login

// ── Login / Register split-screen ─────────────────────────────────────────
const LoginPage = () => (
  <div className="hd-root hd-dark" style={{ minHeight: '100%', display: 'grid', gridTemplateColumns: '1fr 1.05fr' }}>
    {/* Left: marketing side */}
    <div style={{
      padding: '40px 48px', position: 'relative',
      background: 'linear-gradient(180deg, #0F1525 0%, #0B0F19 100%)',
      borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
    }}>
      <Logo size={18}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 480 }}>
        <div className="hd-eyebrow" style={{ marginBottom: 14, color: 'var(--accent)' }}>// welcome back, dev</div>
        <h1 className="hd-display" style={{ fontSize: 40, margin: '0 0 18px' }}>
          Tiếp tục từ chỗ
          <br/>bạn đã <span style={{ color: 'var(--accent)' }}>hoist</span> lên.
        </h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.55, marginBottom: 36 }}>
          Tiến độ, ghi chú, mã nguồn dự án — tất cả đợi bạn quay lại đúng giây bạn rời đi.
        </p>
        <IdeFrame tab="resume.js">
          <div className="hd-code" style={{ fontSize: 12 }}>
            <span className="k">await</span> <span className="f">user</span>.<span className="f">resume</span>({'{'}
            {'\n  '}<span className="n">course</span><span className="o">:</span> <span className="s">'JS: The Hard Parts'</span>,
            {'\n  '}<span className="n">lesson</span><span className="o">:</span> <span className="n">14</span>,
            {'\n  '}<span className="n">timestamp</span><span className="o">:</span> <span className="s">'08:42'</span>,
            {'\n'}{'}'})
            {'\n'}<span className="c">{`// → "The Event Loop, step 3"`}</span>
          </div>
        </IdeFrame>
      </div>
      <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>
        12,481 dev đã đăng nhập trong 30 ngày qua
      </div>
    </div>

    {/* Right: form */}
    <div style={{ padding: '40px 64px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--ink-3)' }}>
        Chưa có tài khoản?
        <a href="#" style={{ color: 'var(--ink)', fontWeight: 600 }}>Đăng ký →</a>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 380, alignSelf: 'center', width: '100%' }}>
        <h2 className="hd-display" style={{ fontSize: 28, margin: '0 0 8px' }}>Đăng nhập</h2>
        <p style={{ color: 'var(--ink-3)', fontSize: 13.5, margin: '0 0 28px' }}>
          Bằng email hoặc tài khoản dev quen thuộc.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          <button className="hd-btn hd-btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 16 }}>⌥</span> GitHub
          </button>
          <button className="hd-btn hd-btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 16 }}>G</span> Google
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 18px', color: 'var(--ink-3)', fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
          OR
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Email" placeholder="hoisted@dev.com" value="khang@hoisted.dev"/>
          <Field label="Mật khẩu" placeholder="••••••••" type="password" trailing="Quên?" value="securepassword"/>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 24px', fontSize: 13, color: 'var(--ink-2)' }}>
          <span style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent-ink)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 12l5 5L20 7"/></svg>
          </span>
          Ghi nhớ thiết bị này
        </label>

        <button className="hd-btn hd-btn-primary hd-btn-lg" style={{ justifyContent: 'center' }}>
          Đăng nhập →
        </button>

        <div style={{ marginTop: 24, font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)', textAlign: 'center' }}>
          Bằng cách đăng nhập, bạn đồng ý với <a href="#" style={{ color: 'var(--ink-2)' }}>điều khoản</a> và <a href="#" style={{ color: 'var(--ink-2)' }}>chính sách</a>.
        </div>
      </div>
    </div>
  </div>
);

const Field = ({ label, value, placeholder, type, trailing }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)' }}>{label}</label>
      {trailing && <a href="#" style={{ font: '500 12px var(--font-mono)', color: 'var(--accent)' }}>{trailing}</a>}
    </div>
    <input className="hd-input" type={type || 'text'} defaultValue={value} placeholder={placeholder}
      style={{ height: 42, fontSize: 14 }}/>
  </div>
);

// ── Cart + Checkout (combined view) ───────────────────────────────────────
const CartPage = () => {
  const items = [COURSES[0], COURSES[1], COURSES[3]];
  const total = items.reduce((s, c) => s + c.price, 0);
  const discount = Math.round(total * 0.1);
  return (
    <div className="hd-root hd-dark" style={{ minHeight: '100%' }}>
      <Nav active="" cartCount={3}/>
      <div style={{ padding: '36px 64px 8px' }}>
        <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)', marginBottom: 14 }}>Trang chủ / Giỏ hàng</div>
        <h1 className="hd-display" style={{ fontSize: 36, margin: 0 }}>Giỏ hàng <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 20 }}>(3)</span></h1>
      </div>

      {/* Stepper */}
      <div style={{ padding: '20px 64px 12px', display: 'flex', gap: 14, alignItems: 'center' }}>
        {[['1', 'Giỏ hàng', true], ['2', 'Thanh toán', true], ['3', 'Hoàn tất', false]].map(([n, t, on], i) => (
          <React.Fragment key={n}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 26, height: 26, borderRadius: 999,
                display: 'grid', placeItems: 'center',
                background: on ? 'var(--accent)' : 'var(--bg-2)',
                color: on ? 'var(--accent-ink)' : 'var(--ink-3)',
                font: '700 12px var(--font-mono)',
              }}>{n}</span>
              <span style={{ font: '600 13px var(--font-display)', color: on ? 'var(--ink)' : 'var(--ink-3)' }}>{t}</span>
            </div>
            {i < 2 && <div style={{ flex: '0 0 60px', height: 1, background: 'var(--line-2)' }}/>}
          </React.Fragment>
        ))}
      </div>

      <div style={{ padding: '24px 64px 64px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
        {/* Left: items + checkout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Cart items */}
          <div className="hd-card" style={{ padding: 6 }}>
            {items.map((c, i) => (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 16, padding: 14,
                borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 0, alignItems: 'center',
              }}>
                <CourseThumb course={c}/>
                <div>
                  <div style={{ font: '600 15px var(--font-display)', marginBottom: 6 }}>{c.title}</div>
                  <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)', marginBottom: 10 }}>
                    bởi {c.instr} · {c.lessons} bài · {c.hours}h
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12.5 }}>
                    <a href="#" style={{ color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4 }}>♡ Lưu sau</a>
                    <a href="#" style={{ color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: 4 }}>{I.trash} Xóa</a>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: '700 17px var(--font-mono)' }}>{formatVND(c.price)}</div>
                  <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)', textDecoration: 'line-through' }}>{formatVND(c.old)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Payment method */}
          <div>
            <h3 className="hd-display" style={{ fontSize: 20, margin: '0 0 14px' }}>Phương thức thanh toán</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { name: 'VNPay', sub: 'ATM / QR', on: true, glyph: 'VN' },
                { name: 'Momo', sub: 'Ví điện tử', glyph: 'Mo' },
                { name: 'Visa / Master', sub: 'Thẻ quốc tế', glyph: 'V' },
              ].map(p => (
                <label key={p.name} className="hd-card" style={{
                  padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  borderColor: p.on ? 'var(--accent)' : 'var(--line)',
                  boxShadow: p.on ? 'inset 0 0 0 1px var(--accent)' : 'none',
                }}>
                  <div style={{
                    width: 40, height: 28, borderRadius: 5,
                    background: 'var(--bg-2)',
                    display: 'grid', placeItems: 'center',
                    font: '700 11px var(--font-mono)', color: 'var(--ink-2)',
                  }}>{p.glyph}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ font: '600 13px var(--font-display)' }}>{p.name}</div>
                    <div style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)' }}>{p.sub}</div>
                  </div>
                  <span style={{
                    width: 16, height: 16, borderRadius: 999,
                    border: p.on ? '5px solid var(--accent)' : '1px solid var(--line-2)',
                    background: p.on ? 'var(--bg)' : 'transparent',
                  }}/>
                </label>
              ))}
            </div>
          </div>

          {/* Billing */}
          <div>
            <h3 className="hd-display" style={{ fontSize: 20, margin: '0 0 14px' }}>Thông tin xuất hóa đơn</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Họ và tên" value="Phạm Khang"/>
              <Field label="Email" value="khang@hoisted.dev"/>
              <Field label="SĐT" value="0987 654 321"/>
              <Field label="Mã số thuế (tùy chọn)" placeholder="0301234567"/>
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <aside>
          <div className="hd-card" style={{ padding: 22, position: 'sticky', top: 80 }}>
            <div style={{ font: '600 14px var(--font-display)', marginBottom: 16 }}>Tóm tắt đơn hàng</div>
            <SumRow label="Tạm tính (3 khóa)" v={formatVND(total)}/>
            <SumRow label="Giảm giá NEWDEV10" v={`-${formatVND(discount)}`} accent/>
            <SumRow label="Thuế VAT (đã gồm)" v="0đ" muted/>
            <hr className="hd-div" style={{ margin: '14px 0' }}/>
            <SumRow label="Tổng cộng" v={formatVND(total - discount)} big/>
            <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)', margin: '10px 0 18px' }}>
              tiết kiệm {formatVND(items.reduce((s, c) => s + c.old, 0) - (total - discount))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <input className="hd-input" placeholder="Mã giảm giá" defaultValue="NEWDEV10" style={{ fontFamily: 'var(--font-mono)' }}/>
              <button className="hd-btn hd-btn-ghost hd-btn-sm">Áp dụng</button>
            </div>
            <button className="hd-btn hd-btn-primary hd-btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              {I.lock} Thanh toán an toàn
            </button>
            <div style={{ marginTop: 14, font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)', display: 'flex', gap: 10, justifyContent: 'center' }}>
              <span>{I.lock}</span> SSL 256-bit · PCI-DSS
            </div>
          </div>
        </aside>
      </div>
      <Footer/>
    </div>
  );
};

const SumRow = ({ label, v, accent, muted, big }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
    <span style={{ color: muted ? 'var(--ink-3)' : 'var(--ink-2)', fontSize: big ? 14 : 13 }}>{label}</span>
    <span style={{
      font: big ? '700 22px var(--font-mono)' : '600 13.5px var(--font-mono)',
      color: accent ? 'var(--green)' : 'var(--ink)',
    }}>{v}</span>
  </div>
);

// ── My Learning ───────────────────────────────────────────────────────────
const MyLearningPage = () => {
  const learning = [
    { ...COURSES[0], progress: 64, lastLesson: 'The Event Loop · 14/64', ts: '08:42 / 14:02', resume: true },
    { ...COURSES[2], progress: 22, lastLesson: 'Promise chaining · 7/32', ts: '01:18 / 09:35' },
    { ...COURSES[3], progress: 100, lastLesson: 'Hoàn thành ✓', ts: '52/52 bài' },
    { ...COURSES[5], progress: 8,  lastLesson: 'Module patterns · 2/26', ts: '03:50 / 11:21' },
  ];
  return (
    <div className="hd-root hd-dark" style={{ minHeight: '100%' }}>
      <Nav active=""/>
      <div style={{ padding: '36px 64px 0' }}>
        <h1 className="hd-display" style={{ fontSize: 36, margin: '0 0 6px' }}>Hành trình của bạn</h1>
        <p style={{ color: 'var(--ink-2)', margin: 0 }}>4 khóa đang học · 2 đã hoàn thành · streak 12 ngày 🔥</p>
      </div>

      {/* Continue learning hero */}
      <section style={{ padding: '24px 64px' }}>
        <div className="hd-eyebrow" style={{ marginBottom: 12 }}>// continue where you left</div>
        <div className="hd-card" style={{
          padding: 24, display: 'grid', gridTemplateColumns: '320px 1fr auto', gap: 28, alignItems: 'center',
          backgroundImage: 'linear-gradient(90deg, rgba(247,223,30,.06), transparent 60%)',
        }}>
          <CourseThumb course={learning[0]}/>
          <div>
            <div className="hd-eyebrow" style={{ color: 'var(--accent)', marginBottom: 8 }}>// đang học</div>
            <h2 className="hd-display" style={{ fontSize: 22, margin: '0 0 6px' }}>{learning[0].title}</h2>
            <div style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', marginBottom: 16 }}>
              Tiếp tục: <b style={{ color: 'var(--ink)' }}>{learning[0].lastLesson}</b> · {learning[0].ts}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div className="hd-bar" style={{ flex: 1 }}><span style={{ width: '64%' }}/></div>
              <span style={{ font: '600 13px var(--font-mono)', color: 'var(--accent)' }}>64%</span>
            </div>
            <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>
              41 / 64 bài · còn 6h 38m
            </div>
          </div>
          <button className="hd-btn hd-btn-primary hd-btn-lg">
            {I.play} Tiếp tục
          </button>
        </div>
      </section>

      {/* Filters tabs */}
      <section style={{ padding: '12px 64px 8px' }}>
        <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid var(--line)' }}>
          {[['Tất cả', 6, true], ['Đang học', 4], ['Đã xong', 2], ['Đánh dấu', 1]].map(([t, n, on], i) => (
            <button key={i} style={{
              background: 'transparent', border: 0, padding: '12px 0',
              borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent',
              color: on ? 'var(--ink)' : 'var(--ink-3)',
              font: '600 13.5px var(--font-display)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>{t} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>({n})</span></button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section style={{ padding: '20px 64px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {learning.map(c => (
            <div key={c.id} className="hd-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <CourseThumb course={c}/>
                {c.progress === 100 && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,15,25,.65)',
                    display: 'grid', placeItems: 'center', borderRadius: 10 }}>
                    <span className="hd-chip" style={{ background: 'var(--green)', color: 'var(--js-ink)', height: 28, fontSize: 12 }}>
                      ✓ Hoàn thành
                    </span>
                  </div>
                )}
              </div>
              <div style={{ padding: '4px 4px 8px' }}>
                <div style={{ font: '600 14.5px var(--font-display)', marginBottom: 4, lineHeight: 1.3 }}>{c.title}</div>
                <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)', marginBottom: 12 }}>{c.lastLesson}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div className="hd-bar" style={{ flex: 1 }}><span style={{ width: c.progress + '%' }}/></div>
                  <span style={{ font: '600 12px var(--font-mono)', color: c.progress === 100 ? 'var(--green)' : 'var(--ink-2)' }}>{c.progress}%</span>
                </div>
                <button className="hd-btn hd-btn-ghost hd-btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  {c.progress === 100 ? 'Xem chứng chỉ' : c.progress === 0 ? 'Bắt đầu' : 'Tiếp tục học'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer/>
    </div>
  );
};

// ── Lesson Player (CRITICAL) ──────────────────────────────────────────────
const LessonPlayerPage = () => {
  const sections = [
    { t: '01 · Foundations', n: 1, lessons: [
      { name: 'Welcome to the course', t: '4:12', done: true },
      { name: 'Thread of execution', t: '12:38', done: true },
    ]},
    { t: '02 · Execution Context', n: 2, lessons: [
      { name: 'Global execution context', t: '8:24', done: true },
      { name: 'Function execution context', t: '11:02', done: true },
      { name: 'The variable environment', t: '9:18', done: true },
    ]},
    { t: '03 · Asynchronous JS', n: 3, open: true, lessons: [
      { name: 'Callback-based async', t: '9:48', done: true },
      { name: 'The microtask queue', t: '13:21', done: true },
      { name: 'The Event Loop, step by step', t: '14:02', active: true },
      { name: 'Promises & .then chains', t: '15:38' },
      { name: 'async / await internals', t: '12:50' },
      { name: 'Exercise: implement Promise.all', t: '8:12', exercise: true },
    ]},
    { t: '04 · Closures', n: 4, lessons: [
      { name: 'What is a closure', t: '10:18' },
      { name: 'Closure use cases', t: '9:42' },
    ]},
  ];
  return (
    <div className="hd-root hd-dark" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Slim lesson nav (different from main nav) */}
      <header style={{
        height: 56, padding: '0 24px', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 20, background: 'var(--bg)',
      }}>
        <button className="hd-icon-btn" title="Quay về My Learning"><span style={{ transform: 'rotate(180deg)', display: 'flex' }}>{I.chevR}</span></button>
        <div style={{ borderLeft: '1px solid var(--line)', height: 24 }}/>
        <Logo size={15}/>
        <div style={{ flex: 1 }}>
          <div style={{ font: '600 13.5px var(--font-display)' }}>JavaScript: The Hard Parts</div>
          <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>Bài 14 / 64 · Section 03 — Asynchronous JS</div>
        </div>
        {/* progress */}
        <div style={{ width: 160 }}>
          <div className="hd-bar"><span style={{ width: '64%' }}/></div>
          <div style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)', marginTop: 4, textAlign: 'right' }}>64% complete · streak 12🔥</div>
        </div>
        <button className="hd-btn hd-btn-ghost hd-btn-sm">{I.download} Tải tài liệu</button>
        <button className="hd-icon-btn">{I.bell}</button>
        <div className="hd-av">KP</div>
      </header>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', minHeight: 0 }}>
        {/* Left column — player */}
        <main style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
          {/* Video frame */}
          <div style={{
            position: 'relative',
            aspectRatio: '16/9',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #1a1f3a, #050810)',
            border: '1px solid var(--line)',
          }}>
            {/* fake video content */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'grid', placeItems: 'center',
              background: 'radial-gradient(circle at 30% 30%, rgba(99,102,241,.20), transparent 60%), radial-gradient(circle at 70% 70%, rgba(247,223,30,.10), transparent 60%)',
            }}>
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.7)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 18 }}>// the event loop</div>
                <div style={{
                  width: 76, height: 76, borderRadius: 999,
                  background: 'rgba(247,223,30,.95)', color: 'var(--js-ink)',
                  display: 'grid', placeItems: 'center', margin: '0 auto',
                  fontSize: 28, paddingLeft: 6,
                }}>▶</div>
                <div style={{ marginTop: 18, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,.5)' }}>1080p · paused at 08:42</div>
              </div>
            </div>

            {/* timeline bar */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 16px 12px',
              background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.55) 60%)' }}>
              <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,.20)', borderRadius: 999, marginBottom: 10 }}>
                <div style={{ position: 'absolute', inset: 0, width: '62%', background: 'var(--accent)', borderRadius: 999 }}/>
                {/* notes pins */}
                {[18, 35, 56, 78].map(p => (
                  <div key={p} style={{ position: 'absolute', top: -3, left: p + '%', width: 2, height: 10, background: '#fff', borderRadius: 2 }}/>
                ))}
                <div style={{ position: 'absolute', top: -4, left: '62%', width: 12, height: 12, marginLeft: -6, background: 'var(--accent)', borderRadius: 999, boxShadow: '0 0 0 4px rgba(247,223,30,.25)' }}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                <span>▶</span>
                <span>⏮  ⏭</span>
                <span>08:42 / 14:02</span>
                <div style={{ flex: 1 }}/>
                <span>1.25×</span>
                <span>CC</span>
                <span>⚙</span>
                <span>⛶</span>
              </div>
            </div>
          </div>

          {/* Title + actions */}
          <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 20 }}>
            <div>
              <div className="hd-eyebrow" style={{ marginBottom: 6 }}>// Section 03 · Lesson 03</div>
              <h1 className="hd-display" style={{ fontSize: 24, margin: '0 0 6px' }}>The Event Loop, step by step</h1>
              <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>
                Will Sentance · 14:02 · cập nhật T11 / 2025
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="hd-btn hd-btn-ghost hd-btn-sm">♡ Lưu</button>
              <button className="hd-btn hd-btn-ghost hd-btn-sm">+ Note</button>
              <button className="hd-btn hd-btn-primary">{I.check} Đánh dấu hoàn thành</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid var(--line)', display: 'flex', gap: 24, marginTop: 4 }}>
            {[['Overview', true], ['Notes (4)'], ['Attachments (3)'], ['Code playground'], ['Discussion (28)'], ['Transcript']].map(([t, on], i) => (
              <button key={i} style={{
                background: 'transparent', border: 0, padding: '10px 0',
                borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent',
                color: on ? 'var(--ink)' : 'var(--ink-3)',
                font: '600 13px var(--font-display)', cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
            {/* Overview */}
            <div>
              <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: '4px 0 14px' }}>
                Trong bài này, chúng ta sẽ "chạy" tay một đoạn code có cả <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--js)' }}>setTimeout</code> và <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--js)' }}>Promise.then</code> để thấy chính xác V8 lập lịch như thế nào — vì sao microtask luôn chạy trước macrotask trong cùng một tick.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="hd-eyebrow">// trong bài này bạn sẽ</div>
                {[
                  'Phân biệt call stack, microtask queue, callback queue',
                  'Trace bằng tay 4 ví dụ async kinh điển',
                  'Hiểu vì sao await không "block" thread',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--ink-2)' }}>
                    <span style={{ color: 'var(--accent)' }}>{I.check}</span>{t}
                  </div>
                ))}
              </div>
            </div>

            {/* Attachments preview */}
            <div>
              <div className="hd-eyebrow" style={{ marginBottom: 8 }}>// đính kèm</div>
              {[
                { name: 'event-loop-cheatsheet.pdf', s: '1.4 MB', i: 'pdf' },
                { name: 'starter-code.zip', s: '12 KB', i: 'zip' },
                { name: 'slides-section-03.pdf', s: '8.2 MB', i: 'pdf' },
              ].map((a, i) => (
                <div key={i} className="hd-soft" style={{ padding: '10px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 6, background: 'var(--bg)', color: 'var(--accent)',
                    display: 'grid', placeItems: 'center', font: '700 10px var(--font-mono)',
                  }}>{a.i}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)' }}>{a.s}</div>
                  </div>
                  <button className="hd-icon-btn">{I.download}</button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes pinned to timestamps */}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="hd-eyebrow">// ghi chú của bạn (4)</div>
              <button className="hd-btn hd-btn-ghost hd-btn-sm">+ Thêm note ở 08:42</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { t: '02:31', n: 'Stack rỗng = đã sẵn sàng để event loop "tick".' },
                { t: '05:48', n: 'Microtask queue luôn empty trước khi browser repaint.' },
                { t: '08:18', n: 'await thực ra chỉ là syntactic sugar quanh .then() — viết lại được.' },
              ].map((n, i) => (
                <div key={i} className="hd-soft" style={{ padding: '12px 14px', display: 'flex', gap: 14 }}>
                  <button style={{
                    font: '600 12px var(--font-mono)', color: 'var(--accent)',
                    background: 'var(--bg)', border: 0, padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                    height: 'fit-content',
                  }}>{n.t}</button>
                  <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink-2)' }}>{n.n}</div>
                  <button className="hd-icon-btn" style={{ width: 26, height: 26 }}>{I.more}</button>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Right column — curriculum */}
        <aside style={{ borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ font: '600 14px var(--font-display)', marginBottom: 6 }}>Nội dung khóa học</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="hd-bar" style={{ flex: 1 }}><span style={{ width: '64%' }}/></div>
              <span style={{ font: '600 12px var(--font-mono)', color: 'var(--accent)' }}>41/64</span>
            </div>
            <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)', marginTop: 6 }}>
              4 sections · 64 bài · 18h 30m
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {sections.map((s, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                <button style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  background: s.open ? 'var(--bg-2)' : 'transparent',
                  border: 0, padding: '12px 20px', cursor: 'pointer', color: 'var(--ink)',
                  textAlign: 'left',
                }}>
                  <span style={{ color: 'var(--ink-3)', transform: s.open ? 'rotate(180deg)' : 'none', display: 'flex' }}>{I.chev}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ font: '600 12.5px var(--font-display)' }}>{s.t}</div>
                    <div style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)', marginTop: 1 }}>{s.lessons.length} bài</div>
                  </div>
                </button>
                {s.open && s.lessons.map((l, j) => (
                  <div key={j} style={{
                    padding: '10px 20px 10px 44px', display: 'flex', alignItems: 'center', gap: 10,
                    background: l.active ? 'rgba(247,223,30,.06)' : 'transparent',
                    borderLeft: l.active ? '3px solid var(--accent)' : '3px solid transparent',
                    cursor: 'pointer',
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 999,
                      display: 'grid', placeItems: 'center',
                      background: l.done ? 'var(--accent)' : 'transparent',
                      border: l.done ? 0 : '1.5px solid var(--line-2)',
                      color: 'var(--accent-ink)', flexShrink: 0,
                    }}>
                      {l.done ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 12l5 5L20 7"/></svg>
                       : l.active ? <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }}/> : null}
                    </span>
                    <div style={{ flex: 1, fontSize: 12.5, fontWeight: l.active ? 600 : 400, color: l.active ? 'var(--ink)' : 'var(--ink-2)' }}>
                      {l.exercise && <span style={{ font: '600 9px var(--font-mono)', color: 'var(--accent)', background: 'rgba(247,223,30,.10)', padding: '2px 5px', borderRadius: 3, marginRight: 6, letterSpacing: '.06em' }}>EX</span>}
                      {l.name}
                    </div>
                    <span style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)' }}>{l.t}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

Object.assign(window, { LoginPage, CartPage, MyLearningPage, LessonPlayerPage, Field, SumRow });
