// pages-variations.jsx — Safe (Udemy-ish, light) + Bold experimental homepages

// ── SAFE: light, clean edtech, indigo accent ──────────────────────────────
const HomePageSafe = () => (
  <div className="hd-root hd-light" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    {/* Promo strip */}
    <div style={{
      background: '#4F46E5', color: '#fff', padding: '8px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      fontSize: 12.5,
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,.16)', padding: '2px 8px', borderRadius: 4, letterSpacing: '.04em' }}>FLASH</span>
      <span>Giảm 50% trên 30+ khóa bestsellers. Còn <b>11 giờ 24 phút</b>.</span>
      <a href="#" style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3 }}>xem deal →</a>
    </div>

    <Nav active="Khóa học" role="guest"/>

    {/* Hero */}
    <section style={{ padding: '56px 64px 40px', display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 56, alignItems: 'center' }}>
      <div>
        <div className="hd-chip" style={{ marginBottom: 18 }}>★ #1 nền tảng học JS tại VN 2025</div>
        <h1 className="hd-display" style={{ fontSize: 56, margin: 0, marginBottom: 18 }}>
          Trở thành <span style={{ color: 'var(--accent)' }}>JavaScript developer</span> được tin tưởng.
        </h1>
        <p style={{ fontSize: 16.5, color: 'var(--ink-2)', maxWidth: 520, lineHeight: 1.55, marginBottom: 28 }}>
          Khóa học có lộ trình rõ ràng, dự án thực tế và mentor 1-1. Học bằng tiếng Việt,
          được công nhận bởi 200+ công ty.
        </p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          <button className="hd-btn hd-btn-primary hd-btn-lg">Bắt đầu miễn phí</button>
          <button className="hd-btn hd-btn-ghost hd-btn-lg">Xem lộ trình</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* avatar stack */}
          <div style={{ display: 'flex' }}>
            {['#F7DF1E', '#4F46E5', '#34D399', '#F43F5E', '#A78BFA'].map((c, i) => (
              <div key={i} style={{
                width: 32, height: 32, borderRadius: 999,
                background: `linear-gradient(135deg, ${c}, #fff)`,
                border: '2px solid #fff', marginLeft: i ? -10 : 0,
                font: '700 11px var(--font-mono)', display: 'grid', placeItems: 'center', color: '#0B0F19',
              }}>{'AKLPTM'[i]}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>12,481 dev đang học</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>★★★★★ 4.86 từ 3,219 đánh giá</div>
          </div>
        </div>
      </div>

      {/* Hero visual: course preview card */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', inset: '-12px', borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(79,70,229,.10), rgba(247,223,30,.10))', filter: 'blur(20px)' }}/>
        <div className="hd-card" style={{ padding: 22, position: 'relative' }}>
          <div className="hd-thumb hd-thumb-indigo" style={{ marginBottom: 18 }}>
            <div className="hd-thumb-glyph" style={{ color: '#fff', opacity: .25 }}>JS</div>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 999, background: '#fff',
                color: '#4F46E5', display: 'grid', placeItems: 'center', fontSize: 20, paddingLeft: 4,
              }}>▶</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <span className="hd-chip">Bestseller</span>
            <span className="hd-chip hd-chip-line">Intermediate</span>
          </div>
          <div style={{ font: '700 20px var(--font-display)', marginBottom: 6 }}>
            JavaScript: The Hard Parts
          </div>
          <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 12 }}>bởi Will Sentance · 18.5h · 64 bài</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div>
              <span style={{ font: '700 22px var(--font-display)', color: 'var(--ink)' }}>599.000đ</span>{' '}
              <span style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'line-through' }}>899.000đ</span>
            </div>
            <button className="hd-btn hd-btn-primary">Học thử miễn phí</button>
          </div>
        </div>
      </div>
    </section>

    {/* Logos band */}
    <section style={{ padding: '24px 64px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 16, letterSpacing: '.04em' }}>
        ĐƯỢC TIN DÙNG BỞI TEAM ENGINEERING TẠI
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, opacity: .55 }}>
        {['MOMO', 'TIKI', 'VNG', 'Shopee', 'FPT Soft', 'Tinhvan', 'Got It', 'KMS'].map(b => (
          <span key={b} style={{ font: '700 16px var(--font-display)', letterSpacing: '-.01em' }}>{b}</span>
        ))}
      </div>
    </section>

    {/* Categories */}
    <section style={{ padding: '48px 64px 24px' }}>
      <h2 className="hd-display" style={{ fontSize: 28, margin: '0 0 24px' }}>Khám phá theo chủ đề</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { l: 'JavaScript Core', n: '24 khóa', c: '#F59E0B' },
          { l: 'Frontend & React', n: '32 khóa', c: '#4F46E5' },
          { l: 'TypeScript', n: '11 khóa', c: '#0EA5E9' },
          { l: 'Backend & Node', n: '18 khóa', c: '#10B981' },
        ].map(c => (
          <div key={c.l} className="hd-card" style={{ padding: 20, cursor: 'pointer' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: c.c, marginBottom: 14 }}/>
            <div style={{ font: '600 15px var(--font-display)' }}>{c.l}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>{c.n} →</div>
          </div>
        ))}
      </div>
    </section>

    {/* Featured grid */}
    <section style={{ padding: '24px 64px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginBottom: 22 }}>
        <h2 className="hd-display" style={{ fontSize: 28, margin: 0 }}>Khóa được học nhiều nhất</h2>
        <a href="#" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>xem tất cả →</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
        {COURSES.slice(0, 4).map(c => <CourseCard key={c.id} course={c}/>)}
      </div>
    </section>

    {/* Why us */}
    <section style={{ padding: '48px 64px', background: 'var(--bg-2)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
        {[
          ['01', 'Lộ trình rõ ràng', 'Đi từ vanilla JS tới production trong 6 tháng, không lạc đường.'],
          ['02', 'Mentor 1-1 hằng tuần', 'Review code, mock interview, định hướng nghề bởi senior thật.'],
          ['03', 'Dự án có thể đưa vào CV', 'Mỗi khóa kèm 1 capstone deploy được, hỗ trợ giới thiệu việc làm.'],
        ].map(([n, t, p]) => (
          <div key={n}>
            <div style={{ font: '700 28px var(--font-mono)', color: 'var(--accent)', marginBottom: 12 }}>{n}</div>
            <h3 className="hd-display" style={{ fontSize: 20, margin: '0 0 8px' }}>{t}</h3>
            <p style={{ color: 'var(--ink-2)', margin: 0, fontSize: 14, lineHeight: 1.6 }}>{p}</p>
          </div>
        ))}
      </div>
    </section>

    <Footer/>
  </div>
);

// ── BOLD experimental: terminal/IDE-as-website ────────────────────────────
const HomePageBold = () => (
  <div className="hd-root hd-dark" style={{
    minHeight: '100%',
    background: '#08090F',
    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.05) 1px, transparent 0)',
    backgroundSize: '24px 24px',
  }}>
    {/* terminal-style top bar */}
    <header style={{
      borderBottom: '1px solid var(--line)',
      padding: '12px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
      background: 'rgba(8,9,15,.85)', backdropFilter: 'blur(8px)',
    }}>
      <div className="hd-ide-dots"><span/><span/><span/></div>
      <span style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>~/hoisted</span>
      <span style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>—</span>
      <span style={{ font: '500 12px var(--font-mono)', color: 'var(--accent)' }}>node v22.0.0</span>
      <div style={{ flex: 1 }}/>
      {['index.tsx', 'curriculum.json', 'README.md'].map((t, i) => (
        <span key={t} style={{
          font: '500 12px var(--font-mono)',
          padding: '4px 10px', borderRadius: 5,
          color: i === 0 ? 'var(--ink)' : 'var(--ink-3)',
          background: i === 0 ? 'var(--bg-2)' : 'transparent',
          border: i === 0 ? '1px solid var(--line)' : 0,
        }}>{t}</span>
      ))}
    </header>

    {/* Massive type-treatment hero */}
    <section style={{ padding: '48px 48px 24px', position: 'relative' }}>
      <div style={{
        position: 'absolute', right: 48, top: 48, bottom: 24, width: '40%',
        opacity: .04, fontSize: 320, fontFamily: 'var(--font-mono)', fontWeight: 800,
        color: 'var(--accent)', lineHeight: 1, letterSpacing: '-0.06em',
        pointerEvents: 'none', userSelect: 'none', overflow: 'hidden',
      }}>{'{}'}</div>

      <div style={{ position: 'relative', maxWidth: 980 }}>
        <div style={{ font: '500 12px var(--font-mono)', color: 'var(--accent)', marginBottom: 18, letterSpacing: '.06em' }}>
          ▸ ./bootcamp --year=2026 --vibe=feral
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 120, fontWeight: 800,
          letterSpacing: '-0.045em',
          lineHeight: 0.92,
          margin: 0, marginBottom: 18,
        }}>
          JS isn&apos;t<br/>
          <span style={{ display: 'inline-block', position: 'relative' }}>
            weird<span style={{
              position: 'absolute', left: 0, right: 0, top: '52%', height: 8,
              background: 'var(--accent)', mixBlendMode: 'difference',
            }}/>
          </span>{' '}
          <span style={{ color: 'var(--ink-3)' }}>// it&apos;s</span><br/>
          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>under</span>specified<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <div style={{
          font: '500 14px var(--font-mono)',
          color: 'var(--ink-2)', maxWidth: 580, marginBottom: 32, lineHeight: 1.6,
        }}>
          {`/**
 * Khóa học dành cho dev đã chán
 * những bài "Top 10 JS Tricks".
 * Đi sâu specs. Trace bằng tay. Đập
 * vào hệ thống cho tới khi nó kêu.
 */`}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <button className="hd-btn hd-btn-primary hd-btn-lg" style={{ borderRadius: 0, fontFamily: 'var(--font-mono)', textTransform: 'lowercase' }}>
            ▸ enroll()
          </button>
          <button className="hd-btn hd-btn-ghost hd-btn-lg" style={{ borderRadius: 0, fontFamily: 'var(--font-mono)', textTransform: 'lowercase' }}>
            man hoisted
          </button>
          <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>
            ⏎ press <kbd style={{ background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 3, border: '1px solid var(--line)' }}>enter</kbd>
          </div>
        </div>
      </div>
    </section>

    {/* asymmetric stat / quote row */}
    <section style={{ padding: '12px 48px 36px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.4fr', gap: 0,
      borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      {[
        ['12,481', 'devs.length'],
        ['18.5h', 'avg.duration'],
        ['0.94', 'completion.rate'],
      ].map(([v, l], i) => (
        <div key={i} style={{ padding: '20px 24px', borderRight: '1px solid var(--line)' }}>
          <div style={{ font: '700 30px var(--font-mono)', color: 'var(--accent)' }}>{v}</div>
          <div style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)', marginTop: 6 }}>{l}</div>
        </div>
      ))}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ font: '500 14px var(--font-mono)', color: 'var(--ink-2)', lineHeight: 1.55 }}>
          <span style={{ color: 'var(--accent)' }}>{'>'}</span> "Đi qua khóa này xong, mình không còn cảm giác JS là magic. Mình thấy V8 chạy."
        </div>
        <div style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)', marginTop: 8 }}>— @trinhle, FE @ Shopee</div>
      </div>
    </section>

    {/* curriculum as filetree */}
    <section style={{ padding: '36px 48px', display: 'grid', gridTemplateColumns: '380px 1fr', gap: 32 }}>
      <div>
        <div className="hd-eyebrow" style={{ color: 'var(--accent)', marginBottom: 14 }}>// tree</div>
        <h2 className="hd-display" style={{ fontSize: 28, margin: '0 0 14px' }}>
          Đây là toàn bộ<br/>nội dung. Không úp mở.
        </h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6 }}>
          Học theo thứ tự bạn muốn. Phần lớn các khóa khác giấu curriculum sau paywall —
          chúng tôi đưa ra ngay từ đầu.
        </p>
      </div>
      <div style={{ font: '500 13px/1.85 var(--font-mono)', color: 'var(--ink-2)' }}>
        {[
          ['▼', 'hoisted/', null, true],
          ['  ▼', 'js-core/', '24 bài', true, 1],
          ['    ●', 'execution-context.mp4', '12:38', false, 2, true],
          ['    ●', 'hoisting-explained.mp4', '9:41', false, 2, true],
          ['    ○', 'scope-chain.mp4', '11:02', false, 2],
          ['    ○', 'this-binding.mp4', '14:18', false, 2],
          ['  ▼', 'async/', '11 bài', true, 1],
          ['    ●', 'event-loop.mp4', '14:02', false, 2, true],
          ['    ●', 'microtasks.mp4', '13:21', false, 2, true],
          ['    ○', 'promises-internals.mp4', '15:38', false, 2],
          ['  ▶', 'react/', '16 bài', false, 1],
          ['  ▶', 'typescript/', '11 bài', false, 1],
          ['  ▶', 'node-runtime/', '9 bài', false, 1],
          ['  ▶', 'capstone/', '4 dự án', false, 1],
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, color: row[5] ? 'var(--accent)' : row[3] ? 'var(--ink)' : 'var(--ink-2)' }}>
            <span style={{ color: 'var(--ink-3)', minWidth: 60, whiteSpace: 'pre' }}>{row[0]}</span>
            <span style={{ flex: 1, fontWeight: row[3] ? 600 : 400 }}>{row[1]}</span>
            {row[2] && <span style={{ color: 'var(--ink-3)' }}>{row[2]}</span>}
          </div>
        ))}
      </div>
    </section>

    {/* manifesto */}
    <section style={{ padding: '36px 48px 64px', borderTop: '1px solid var(--line)' }}>
      <div className="hd-eyebrow" style={{ marginBottom: 14 }}>// manifesto.md</div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
        border: '1px solid var(--line)',
      }}>
        {[
          { n: '01.', t: 'Specs over vibes.', p: 'Mọi tuyên bố về cách JS chạy đều phải truy về ECMAScript spec hoặc V8 source.' },
          { n: '02.', t: 'Read more than write.', p: 'Bạn sẽ đọc source code thật của libs lớn, không chỉ làm CRUD tutorial.' },
          { n: '03.', t: 'Show your work.', p: 'Hoàn thành khóa = capstone deploy public + write-up — không tích trữ "đã học".' },
        ].map((b, i) => (
          <div key={i} style={{
            padding: 28,
            borderRight: i < 2 ? '1px solid var(--line)' : 0,
          }}>
            <div style={{ font: '700 14px var(--font-mono)', color: 'var(--accent)', marginBottom: 18 }}>{b.n}</div>
            <h3 style={{ font: '700 22px/1.2 var(--font-display)', letterSpacing: '-.02em', margin: '0 0 12px' }}>{b.t}</h3>
            <p style={{ color: 'var(--ink-2)', margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{b.p}</p>
          </div>
        ))}
      </div>
    </section>

    <Footer/>
  </div>
);

Object.assign(window, { HomePageSafe, HomePageBold });
