// pages-marketing.jsx — Homepage, Course Listing, Course Detail

// ── Homepage (Techy — main direction) ─────────────────────────────────────
const HomePage = () => (
  <div className="hd-root hd-dark" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    <Nav active="Khóa học" role="guest"/>

    {/* Hero */}
    <section style={{ padding: '64px 64px 48px', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 56, alignItems: 'center' }}>
      <div>
        <div className="hd-chip" style={{ marginBottom: 20 }}>
          <span className="hd-dot hd-dot-g"/> Đang mở khóa: Async Patterns 2026
        </div>
        <h1 className="hd-display" style={{ fontSize: 68, margin: 0, marginBottom: 22 }}>
          Học JavaScript
          <br/>
          <span style={{ position: 'relative' }}>
            từ <span style={{ color: 'var(--accent)' }}>gốc</span>
            <span style={{
              position: 'absolute', top: -16, right: -8,
              fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink-3)',
              fontWeight: 500, letterSpacing: '0',
            }}>// hoisted up</span>
          </span>
          <br/>
          tới production-ready.
        </h1>
        <p style={{ fontSize: 16.5, color: 'var(--ink-2)', maxWidth: 480, lineHeight: 1.55, marginBottom: 32 }}>
          120+ giờ video chuyên sâu về JS core, async, hệ thống module, React internals và
          Node runtime — dạy bởi instructor đang đứng trong production team thật.
        </p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 36 }}>
          <button className="hd-btn hd-btn-primary hd-btn-lg">Bắt đầu học miễn phí</button>
          <button className="hd-btn hd-btn-ghost hd-btn-lg">
            {I.play} Xem demo (3:24)
          </button>
        </div>
        <div style={{ display: 'flex', gap: 32, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
          {[['12k+', 'học viên đang học'], ['4.86', 'avg rating'], ['18', 'instructors thực chiến']].map(([n, l]) => (
            <div key={l}>
              <div style={{ font: '700 22px var(--font-mono)', color: 'var(--ink)' }}>{n}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hero IDE mock */}
      <IdeFrame tab="event-loop.js">
        <div className="hd-code">
          <span className="c">{`// 1. Sync stack rồi mới microtask`}</span>{'\n'}
          <span className="k">function</span> <span className="f">hoisted</span>() {'{'}
          {'\n  '}<span className="k">const</span> queue = <span className="o">[]</span>;
          {'\n  '}<span className="f">Promise</span>.<span className="f">resolve</span>().<span className="f">then</span>(() {'=> '}
          {'\n    '}queue.<span className="f">push</span>(<span className="s">'micro'</span>));
          {'\n  '}<span className="f">setTimeout</span>(() {'=> '}queue.<span className="f">push</span>(<span className="s">'macro'</span>), <span className="n">0</span>);
          {'\n  '}<span className="k">return</span> queue;
          {'\n'}{'}'}
          {'\n\n'}<span className="c">{`// 👉 ['micro', 'macro']`}</span>
        </div>
        <div style={{
          padding: 14, borderTop: '1px solid var(--line)', background: 'var(--bg-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          font: '500 12px var(--font-mono)', color: 'var(--ink-3)',
        }}>
          <span>▶ Run • Lesson 14 — The Event Loop</span>
          <span style={{ color: 'var(--accent)' }}>● live</span>
        </div>
      </IdeFrame>
    </section>

    {/* Category strip */}
    <section style={{ padding: '8px 64px 24px' }}>
      <div className="hd-eyebrow" style={{ marginBottom: 14 }}>// duyệt theo chủ đề</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {[
          { l: 'JS Core', n: 24, g: '{}' },
          { l: 'Async', n: 8, g: '⟳' },
          { l: 'React', n: 16, g: 'Rx' },
          { l: 'TypeScript', n: 11, g: 'TS' },
          { l: 'Node.js', n: 9, g: 'Nx' },
          { l: 'Testing', n: 6, g: '✓' },
        ].map(c => (
          <div key={c.l} className="hd-card" style={{ padding: 16, cursor: 'pointer' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--bg-2)', color: 'var(--accent)',
              font: '700 16px var(--font-mono)',
              display: 'grid', placeItems: 'center', marginBottom: 14,
            }}>{c.g}</div>
            <div style={{ font: '600 14px var(--font-display)' }}>{c.l}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{c.n} khóa học</div>
          </div>
        ))}
      </div>
    </section>

    {/* Featured */}
    <section style={{ padding: '32px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div className="hd-eyebrow">// nổi bật tuần này</div>
          <h2 className="hd-display" style={{ fontSize: 32, margin: '6px 0 0' }}>Khóa học được học nhiều nhất</h2>
        </div>
        <a href="#" style={{ font: '500 13px var(--font-mono)', color: 'var(--ink-2)' }}>xem tất cả →</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {COURSES.slice(0, 3).map(c => <CourseCard key={c.id} course={c}/>)}
      </div>
    </section>

    {/* Path / curriculum CTA */}
    <section style={{ padding: '32px 64px' }}>
      <div className="hd-card" style={{ padding: 36, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
        <div>
          <div className="hd-eyebrow" style={{ color: 'var(--accent)' }}>// learning path</div>
          <h3 className="hd-display" style={{ fontSize: 28, margin: '8px 0 14px' }}>
            Lộ trình "JS Engineer" — 6 tháng, có cố vấn 1-1
          </h3>
          <p style={{ color: 'var(--ink-2)', marginBottom: 22, maxWidth: 460 }}>
            Đi từ vanilla JS → async → framework → testing → ship lên production. 9 khóa core, 4 dự án thực tế, review code hằng tuần.
          </p>
          <button className="hd-btn hd-btn-primary">Xem lộ trình</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['01', 'JS Foundations', '4 weeks'],
            ['02', 'Hard Parts of JS', '6 weeks'],
            ['03', 'Async & Patterns', '4 weeks'],
            ['04', 'React Production', '6 weeks'],
            ['05', 'Capstone Project', '4 weeks'],
          ].map(([n, t, w], i) => (
            <div key={n} style={{
              display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 14,
              padding: '14px 16px',
              background: i === 1 ? 'var(--bg-2)' : 'transparent',
              border: '1px solid var(--line)', borderRadius: 10,
              alignItems: 'center',
            }}>
              <span style={{ font: '700 14px var(--font-mono)', color: i === 1 ? 'var(--accent)' : 'var(--ink-3)' }}>{n}</span>
              <span style={{ font: '600 14px var(--font-display)' }}>{t}</span>
              <span style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>{w}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Testimonials */}
    <section style={{ padding: '40px 64px 24px' }}>
      <div className="hd-eyebrow" style={{ marginBottom: 14 }}>// what devs say</div>
      <h2 className="hd-display" style={{ fontSize: 32, margin: '0 0 24px' }}>
        Hơn 12k dev đã hoisted sự nghiệp với chúng tôi
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { q: 'Phần Event Loop của Lina là phần duy nhất khiến mình thực sự "thấy" cách async chạy trong V8. Worth every đồng.',
            n: 'Nguyễn An', r: 'Frontend @ Tiki' },
          { q: 'Chuyển từ tutorial hell sang đi làm được trong 5 tháng. Mentor review code hằng tuần là game changer.',
            n: 'Trần Vy', r: 'Junior @ FPT Software' },
          { q: 'Tài liệu sâu hơn rất nhiều khóa "fullstack" mình từng trả tiền. Khá tiếc là không gặp sớm hơn.',
            n: 'Phạm Quân', r: 'Senior @ MoMo' },
        ].map((t, i) => (
          <div key={i} className="hd-card" style={{ padding: 24 }}>
            <div className="hd-star" style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
              {Array.from({ length: 5 }).map((_, k) => <span key={k}>{I.star}</span>)}
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)', margin: '0 0 18px' }}>
              "{t.q}"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div className="hd-av" style={{ width: 28, height: 28, fontSize: 10 }}>{t.n.split(' ').map(s => s[0]).join('')}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.n}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{t.r}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* CTA strip */}
    <section style={{ padding: '40px 64px 64px' }}>
      <div className="hd-card" style={{
        padding: 36, textAlign: 'center',
        backgroundImage: 'radial-gradient(circle at 30% 0%, rgba(247,223,30,.10), transparent 50%)',
      }}>
        <div className="hd-eyebrow" style={{ marginBottom: 10 }}>// sẵn sàng?</div>
        <h2 className="hd-display" style={{ fontSize: 36, margin: '0 0 14px' }}>
          <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>const</span>{' '}
          you <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>=</span>{' '}
          <span style={{ color: 'var(--accent)' }}>level_up</span>(<span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>'JS'</span>)
        </h2>
        <p style={{ color: 'var(--ink-2)', margin: '0 auto 20px', maxWidth: 520 }}>
          Đăng ký nhận tài liệu Event Loop deep-dive PDF (62 trang) miễn phí + coupon 30% cho khóa đầu tiên.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', maxWidth: 460, margin: '0 auto' }}>
          <input className="hd-input" placeholder="your@email.dev" style={{ flex: 1 }}/>
          <button className="hd-btn hd-btn-primary">Đăng ký</button>
        </div>
      </div>
    </section>

    <Footer/>
  </div>
);

// ── Course Listing ────────────────────────────────────────────────────────
const CourseListingPage = () => {
  const all = [...COURSES, ...COURSES.map((c, i) => ({ ...c, id: c.id + 10, title: c.title }))].slice(0, 9);
  return (
    <div className="hd-root hd-dark" style={{ minHeight: '100%' }}>
      <Nav active="Khóa học"/>
      {/* breadcrumb + title */}
      <div style={{ padding: '36px 64px 8px' }}>
        <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)', marginBottom: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
          <a href="#" style={{ color: 'inherit' }}>Trang chủ</a> / <span style={{ color: 'var(--ink-2)' }}>Khóa học</span>
        </div>
        <h1 className="hd-display" style={{ fontSize: 40, margin: '0 0 8px' }}>
          Tất cả khóa học <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 22 }}>(127)</span>
        </h1>
        <p style={{ color: 'var(--ink-2)', maxWidth: 640, margin: 0 }}>
          Lọc theo chủ đề, level, ngôn ngữ instructor. Khóa đang giảm giá có badge vàng.
        </p>
      </div>

      <div style={{ padding: '24px 64px 64px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>
        {/* Sidebar */}
        <aside>
          <div className="hd-card" style={{ padding: 20, position: 'sticky', top: 80 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ font: '600 13.5px var(--font-display)' }}>Bộ lọc</div>
              <a href="#" style={{ font: '500 11.5px var(--font-mono)', color: 'var(--accent)' }}>reset</a>
            </div>
            <FilterGroup label="Chủ đề" items={[
              ['JS Core', 24, true],
              ['Async / Promise', 8],
              ['React', 16, true],
              ['TypeScript', 11],
              ['Node.js', 9],
              ['Testing', 6],
            ]}/>
            <FilterGroup label="Cấp độ" items={[
              ['Beginner', 32],
              ['Intermediate', 64, true],
              ['Advanced', 31, true],
            ]}/>
            <FilterGroup label="Giá" type="range"/>
            <FilterGroup label="Rating" items={[
              ['4.5+ ★', 88, true],
              ['4.0+ ★', 119],
              ['Tất cả', 127],
            ]}/>
          </div>
        </aside>

        {/* Results */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="hd-chip">JS Core <span style={{ opacity: .6 }}>✕</span></span>
              <span className="hd-chip">React <span style={{ opacity: .6 }}>✕</span></span>
              <span className="hd-chip">Intermediate <span style={{ opacity: .6 }}>✕</span></span>
              <span className="hd-chip">4.5+ ★ <span style={{ opacity: .6 }}>✕</span></span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>sort:</span>
              <select className="hd-input" style={{ width: 180, height: 34, fontSize: 12.5 }}>
                <option>Phổ biến nhất</option>
                <option>Mới nhất</option>
                <option>Giá tăng dần</option>
                <option>Rating cao nhất</option>
              </select>
              <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 8, padding: 2 }}>
                <button className="hd-icon-btn" style={{ border: 0, background: 'var(--bg-2)' }}>{I.grid}</button>
                <button className="hd-icon-btn" style={{ border: 0 }}>{I.list}</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {all.map((c, i) => <CourseCard key={i} course={c}/>)}
          </div>

          {/* Pagination */}
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {['‹', 1, 2, 3, '…', 11, '›'].map((p, i) => (
              <button key={i} className="hd-icon-btn" style={{
                width: 36, height: 36, fontFamily: 'var(--font-mono)', fontSize: 13,
                background: p === 2 ? 'var(--accent)' : 'transparent',
                color: p === 2 ? 'var(--accent-ink)' : 'var(--ink-2)',
                borderColor: p === 2 ? 'transparent' : 'var(--line)',
              }}>{p}</button>
            ))}
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  );
};

const FilterGroup = ({ label, items, type }) => (
  <div style={{ marginBottom: 22 }}>
    <div className="hd-eyebrow" style={{ marginBottom: 10 }}>{label}</div>
    {type === 'range' ? (
      <div>
        <div style={{ position: 'relative', height: 32, marginBottom: 8 }}>
          <div style={{ position: 'absolute', top: 14, left: 0, right: 0, height: 4, background: 'var(--bg-2)', borderRadius: 999 }}/>
          <div style={{ position: 'absolute', top: 14, left: '20%', right: '30%', height: 4, background: 'var(--accent)', borderRadius: 999 }}/>
          <div style={{ position: 'absolute', top: 8, left: '20%', width: 16, height: 16, background: 'var(--ink)', borderRadius: '50%', border: '2px solid var(--accent)' }}/>
          <div style={{ position: 'absolute', top: 8, left: '70%', width: 16, height: 16, background: 'var(--ink)', borderRadius: '50%', border: '2px solid var(--accent)' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>
          <span>199k</span><span>899k</span>
        </div>
      </div>
    ) : items.map(([name, n, on]) => (
      <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}>
        <span style={{
          width: 16, height: 16, borderRadius: 4,
          background: on ? 'var(--accent)' : 'transparent',
          border: on ? '0' : '1px solid var(--line-2)',
          display: 'grid', placeItems: 'center',
          color: 'var(--accent-ink)',
        }}>
          {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 12l5 5L20 7"/></svg>}
        </span>
        <span style={{ fontSize: 13, flex: 1 }}>{name}</span>
        <span style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>{n}</span>
      </label>
    ))}
  </div>
);

// ── Course Detail ─────────────────────────────────────────────────────────
const CourseDetailPage = () => {
  const c = COURSES[0];
  return (
    <div className="hd-root hd-dark" style={{ minHeight: '100%' }}>
      <Nav active="Khóa học"/>
      {/* Hero band */}
      <div style={{ padding: '40px 64px 28px', borderBottom: '1px solid var(--line)',
        backgroundImage: 'radial-gradient(circle at 80% 0%, rgba(247,223,30,.06), transparent 50%)' }}>
        <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)', marginBottom: 14 }}>
          <a href="#" style={{ color: 'inherit' }}>Khóa học</a> /
          <a href="#" style={{ color: 'inherit' }}>JS Core</a> / <span style={{ color: 'var(--ink-2)' }}>{c.title}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span className="hd-chip"><span className="hd-dot hd-dot-y"/> Bestseller</span>
              <span className="hd-chip hd-chip-line">{c.cat}</span>
              <span className="hd-chip hd-chip-line">{c.level}</span>
            </div>
            <h1 className="hd-display" style={{ fontSize: 44, margin: '0 0 16px', maxWidth: 720 }}>
              {c.title}
            </h1>
            <p style={{ fontSize: 16.5, color: 'var(--ink-2)', maxWidth: 680, lineHeight: 1.55, margin: '0 0 24px' }}>
              Khoá học mổ xẻ những khái niệm "khó" của JavaScript — execution context, closures, prototype chain, event loop —
              theo cách trực quan và áp dụng được vào production.
            </p>
            <div style={{ display: 'flex', gap: 28, alignItems: 'center', fontSize: 13.5, color: 'var(--ink-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="hd-star">{I.star}</span>
                <b style={{ color: 'var(--ink)' }}>{c.rating}</b>
                <span style={{ color: 'var(--ink-3)' }}>({c.students} đánh giá)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{I.clock} {c.hours} giờ video</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{I.doc} {c.lessons} bài</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{I.cap} Cấp chứng chỉ</div>
            </div>
            <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="hd-av" style={{ width: 36, height: 36 }}>WS</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Will Sentance</div>
                <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>Founder · Codesmith</div>
              </div>
            </div>
          </div>

          {/* Sticky purchase card */}
          <div className="hd-card" style={{ padding: 16, height: 'fit-content', position: 'sticky', top: 80 }}>
            <CourseThumb course={c}/>
            <div style={{ padding: '18px 4px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ font: '700 28px var(--font-mono)' }}>{formatVND(c.price)}</span>
                <span style={{ font: '500 14px var(--font-mono)', color: 'var(--ink-3)', textDecoration: 'line-through' }}>{formatVND(c.old)}</span>
                <span className="hd-chip" style={{ background: 'rgba(52,211,153,.12)', color: 'var(--green)' }}>-33%</span>
              </div>
              <div style={{ font: '500 12px var(--font-mono)', color: 'var(--rose)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="hd-dot hd-dot-r"/> Còn 11 giờ ở mức giá này
              </div>
              <button className="hd-btn hd-btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}>
                Mua ngay
              </button>
              <button className="hd-btn hd-btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: 18 }}>
                {I.cart} Thêm vào giỏ
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, color: 'var(--ink-2)' }}>
                {['Truy cập trọn đời', '4 dự án thực hành', 'Cộng đồng riêng trên Discord', 'Hoàn tiền 14 ngày'].map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--accent)' }}>{I.check}</span>{b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div style={{ padding: '32px 64px', maxWidth: 'calc(100% - 380px - 64px - 48px)' }}>
        <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid var(--line)', marginBottom: 28 }}>
          {[['Mô tả', true], ['Curriculum'], ['Reviews'], ['Giảng viên']].map(([t, on], i) => (
            <button key={i} style={{
              background: 'transparent', border: 0, padding: '12px 0',
              borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent',
              color: on ? 'var(--ink)' : 'var(--ink-3)',
              font: '600 13.5px var(--font-display)',
              cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>

        {/* Curriculum */}
        <div className="hd-eyebrow" style={{ marginBottom: 12 }}>// curriculum (8 sections · 64 lessons · 18.5h)</div>
        {[
          { t: '01 · Foundations of JS', n: 8, h: '2h 10m', open: true, lessons: [
            { name: 'Welcome & how to study this course', t: '4:12', free: true },
            { name: 'Thread of execution, stack, memory', t: '12:38', free: true },
            { name: 'Function calls & execution context', t: '14:02' },
            { name: 'Hoisting — what it really means', t: '9:41' },
          ]},
          { t: '02 · Closures & Lexical Scope', n: 9, h: '2h 48m' },
          { t: '03 · Asynchronous JavaScript', n: 11, h: '3h 22m' },
          { t: '04 · Prototypes & Classes', n: 7, h: '1h 56m' },
          { t: '05 · Modules & Bundlers', n: 8, h: '2h 14m' },
        ].map((s, i) => (
          <div key={i} className="hd-card" style={{ marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
              background: s.open ? 'var(--bg-2)' : 'transparent' }}>
              <span style={{ color: 'var(--ink-3)', transform: s.open ? 'rotate(180deg)' : 'none', display: 'flex' }}>{I.chev}</span>
              <div style={{ flex: 1, font: '600 14px var(--font-display)' }}>{s.t}</div>
              <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>{s.n} bài · {s.h}</div>
            </div>
            {s.open && (
              <div style={{ borderTop: '1px solid var(--line)' }}>
                {s.lessons.map((l, j) => (
                  <div key={j} style={{ padding: '12px 18px 12px 50px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: j < s.lessons.length - 1 ? '1px solid var(--line)' : 0 }}>
                    <span style={{ color: l.free ? 'var(--accent)' : 'var(--ink-3)' }}>{l.free ? I.play : I.lock}</span>
                    <div style={{ flex: 1, fontSize: 13.5 }}>{l.name}</div>
                    {l.free && <span className="hd-chip" style={{ background: 'rgba(52,211,153,.12)', color: 'var(--green)' }}>Xem thử</span>}
                    <span style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>{l.t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <Footer/>
    </div>
  );
};

Object.assign(window, { HomePage, CourseListingPage, CourseDetailPage, FilterGroup });
