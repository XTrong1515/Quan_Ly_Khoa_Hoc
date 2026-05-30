// pages-admin-course-edit.jsx — Admin: Course Editor + Lesson Editor (YouTube focus)

// ── Helper: parse YouTube URL → video id ─────────────────────────────────
// (in production, do this server-side và verify oEmbed metadata)
const parseYouTubeId = (url) => {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
};

// ── Course Editor (full page) ────────────────────────────────────────────
const AdminCourseEditPage = () => {
  // Demo state — trong production sẽ là useForm() + zod + react-query mutation
  const ytPreview = 'https://www.youtube.com/watch?v=8aGhZQkoFbQ';
  const previewId = parseYouTubeId(ytPreview);

  return (
    <AdminShell active="Khóa học">
      {/* Sticky top action bar */}
      <header style={{
        padding: '14px 28px', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 5,
        background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
        backdropFilter: 'blur(8px)',
      }}>
        <button className="hd-icon-btn"><span style={{ transform: 'rotate(180deg)', display: 'flex' }}>{I.chevR}</span></button>
        <div>
          <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>
            <a href="#" style={{ color: 'inherit' }}>Khóa học</a> /
            <a href="#" style={{ color: 'inherit' }}>JavaScript: The Hard Parts</a> / <span style={{ color: 'var(--ink-2)' }}>Chỉnh sửa</span>
          </div>
          <h1 className="hd-display" style={{ fontSize: 18, margin: '2px 0 0' }}>JavaScript: The Hard Parts</h1>
        </div>
        <StatusBadge s="draft"/>
        <span style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>
          ● auto-saved 2 phút trước
        </span>
        <div style={{ flex: 1 }}/>
        <button className="hd-btn hd-btn-quiet hd-btn-sm">Hủy thay đổi</button>
        <button className="hd-btn hd-btn-ghost hd-btn-sm">{I.play} Xem thử</button>
        <button className="hd-btn hd-btn-ghost hd-btn-sm">Lưu nháp</button>
        <button className="hd-btn hd-btn-primary hd-btn-sm">{I.check} Xuất bản</button>
      </header>

      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        {/* ── MAIN COLUMN ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* 1. Basic info */}
          <SectionCard step="01" title="Thông tin cơ bản" hint="Hiển thị trên card và trang chi tiết. Tiêu đề rõ ràng, mô tả ngắn 1-2 câu.">
            <FieldRow>
              <Field label="Tên khóa học *" value="JavaScript: The Hard Parts" trailing="42 / 80"/>
            </FieldRow>
            <FieldRow>
              <Field label="Slug URL *" value="javascript-the-hard-parts" trailing="hoisted.dev/courses/…"/>
            </FieldRow>
            <FieldRow>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Mô tả ngắn *</label>
                <textarea className="hd-input" rows="2"
                  defaultValue="Mổ xẻ những khái niệm khó của JavaScript — execution context, closures, prototype, event loop."
                  style={{ height: 64, padding: 10, resize: 'none', fontFamily: 'var(--font-body)' }}/>
                <div style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)', marginTop: 4 }}>
                  103 / 160 ký tự · dùng cho preview + SEO meta description
                </div>
              </div>
            </FieldRow>
            <FieldRow>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Mô tả chi tiết *</label>
                {/* Mock rich editor toolbar */}
                <div style={{
                  display: 'flex', gap: 4, padding: 6,
                  background: 'var(--bg-2)', border: '1px solid var(--line)', borderBottom: 0,
                  borderRadius: '8px 8px 0 0',
                }}>
                  {['B', 'I', 'U', '•', '1.', 'H1', 'H2', '⌘', '🔗', '<>', '"'].map((t, i) => (
                    <button key={i} style={{
                      width: 28, height: 28, borderRadius: 5, background: 'transparent', border: 0,
                      color: 'var(--ink-2)', cursor: 'pointer',
                      font: t === 'I' ? 'italic 600 13px var(--font-display)'
                           : t === 'B' ? '700 13px var(--font-display)'
                           : '500 12px var(--font-body)',
                    }}>{t}</button>
                  ))}
                  <div style={{ flex: 1 }}/>
                  <span style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)', alignSelf: 'center', padding: '0 8px' }}>
                    Markdown supported
                  </span>
                </div>
                <textarea className="hd-input" rows="6"
                  style={{ borderRadius: '0 0 8px 8px', borderTop: 0, height: 140, padding: 12, fontFamily: 'var(--font-body)', resize: 'vertical' }}
                  defaultValue={`Khoá học mổ xẻ những khái niệm "khó" của JavaScript — execution context, closures, prototype chain, event loop — theo cách trực quan và áp dụng được vào production.

Sau khi hoàn thành, bạn sẽ:
- Trace bằng tay được mọi đoạn async
- Hiểu vì sao await không "block" thread
- Implement được Promise.all từ đầu`}/>
              </div>
            </FieldRow>
          </SectionCard>

          {/* 2. Media — THUMBNAIL + PROMO VIDEO via YouTube URL */}
          <SectionCard step="02" title="Hình ảnh & Video giới thiệu"
            hint="Thumbnail dùng cho card. Video giới thiệu là YouTube Unlisted — học viên xem được trên trang Course Detail trước khi mua.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Thumbnail uploader */}
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                  Thumbnail *
                </label>
                <div style={{
                  aspectRatio: '16/9', borderRadius: 10,
                  border: '1.5px dashed var(--line-2)',
                  background: 'var(--bg-2)',
                  display: 'grid', placeItems: 'center', textAlign: 'center', position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* current thumbnail */}
                  <div className="hd-thumb hd-thumb-yellow" style={{ position: 'absolute', inset: 0, borderRadius: 8 }}>
                    <div className="hd-thumb-glyph">JS</div>
                  </div>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,.6))',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: 10 }}>
                    <span style={{ font: '500 11px var(--font-mono)', color: '#fff' }}>thumbnail.jpg · 1.4 MB</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="hd-btn hd-btn-ghost hd-btn-sm" style={{ background: 'rgba(0,0,0,.5)', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }}>Thay</button>
                      <button className="hd-btn hd-btn-ghost hd-btn-sm" style={{ background: 'rgba(0,0,0,.5)', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }}>{I.trash}</button>
                    </div>
                  </div>
                </div>
                <div style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)', marginTop: 6 }}>
                  PNG / JPG · 1280×720 đề xuất · ≤ 2 MB
                </div>
              </div>

              {/* YouTube promo video */}
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Video giới thiệu (YouTube URL)</span>
                  <span style={{ color: 'var(--ink-3)' }}>tùy chọn</span>
                </label>
                <YouTubeInput url={ytPreview} duration="3:24" id={previewId}/>
              </div>
            </div>
          </SectionCard>

          {/* 3. Classification & Pricing */}
          <SectionCard step="03" title="Phân loại & Giá"
            hint="Danh mục và level quyết định khóa xuất hiện ở filter nào.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Danh mục *</label>
                <select className="hd-input">
                  <option>JavaScript Core</option><option>React</option><option>TypeScript</option>
                </select>
              </div>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Cấp độ *</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Beginner', 'Intermediate', 'Advanced'].map((l, i) => (
                    <label key={l} className="hd-card" style={{
                      flex: 1, padding: '10px 12px', textAlign: 'center', cursor: 'pointer',
                      borderColor: i === 2 ? 'var(--accent)' : 'var(--line)',
                      background: i === 2 ? 'var(--bg-2)' : 'var(--bg-1)',
                      font: '500 13px var(--font-display)',
                    }}>{l}</label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Ngôn ngữ</label>
                <select className="hd-input">
                  <option>Tiếng Việt</option><option>English</option>
                </select>
              </div>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Giảng viên *</label>
                <div className="hd-input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 0 4px' }}>
                  <div className="hd-av" style={{ width: 26, height: 26, fontSize: 10 }}>WS</div>
                  <span style={{ flex: 1, fontSize: 13 }}>Will Sentance</span>
                  <button className="hd-btn hd-btn-quiet hd-btn-sm" style={{ height: 26, padding: '0 8px' }}>Đổi</button>
                </div>
              </div>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Giá bán *</label>
                <div style={{ position: 'relative' }}>
                  <input className="hd-input" defaultValue="599000" style={{ paddingRight: 36, fontFamily: 'var(--font-mono)', fontWeight: 600 }}/>
                  <span style={{ position: 'absolute', right: 10, top: 10, font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>đ</span>
                </div>
              </div>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Giá gốc (gạch ngang)</label>
                <div style={{ position: 'relative' }}>
                  <input className="hd-input" defaultValue="899000" style={{ paddingRight: 36, fontFamily: 'var(--font-mono)' }}/>
                  <span style={{ position: 'absolute', right: 10, top: 10, font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>đ</span>
                </div>
              </div>
            </div>
            <div style={{
              marginTop: 14, padding: '10px 14px', background: 'rgba(52,211,153,.06)',
              border: '1px solid rgba(52,211,153,.3)', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 10,
              font: '500 12.5px var(--font-mono)', color: 'var(--green)',
            }}>
              <span>✓</span>
              Giảm <b>33%</b> · học viên thấy badge "-33%" trên thẻ khóa học
            </div>
          </SectionCard>

          {/* 4. Curriculum builder — HEART OF THE PAGE */}
          <SectionCard step="04" title="Curriculum — chương trình học"
            hint="Tổ chức theo Section → Lesson. Mỗi lesson có YouTube URL hoặc file Cloudinary. Drag handle ▤ để sắp lại thứ tự.">
            <CurriculumBuilder/>
          </SectionCard>

          {/* 5. Learn / Requirements */}
          <SectionCard step="05" title="Bạn sẽ học được gì · Yêu cầu · Đối tượng" hint="Hiển thị ở khu giữa trang Course Detail.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <ListBuilder title="Bạn sẽ học được gì" items={[
                'Trace bằng tay được mọi đoạn async',
                'Hiểu vì sao await không "block" thread',
                'Implement Promise.all từ đầu',
                'Phân biệt microtask vs macrotask',
              ]} placeholder="Thêm điểm bạn sẽ học…"/>
              <ListBuilder title="Yêu cầu trước khóa" items={[
                'Biết JS cơ bản (variable, function, array)',
                'Đã viết một vài project nhỏ',
              ]} placeholder="Thêm yêu cầu…"/>
            </div>
            <div style={{ marginTop: 14 }}>
              <ListBuilder title="Khóa học dành cho ai" items={[
                'Junior dev muốn nâng cao hiểu biết JS',
                'Dev đã đi làm muốn phỏng vấn senior',
                'Self-taught dev còn lỗ hổng về JS internals',
              ]} placeholder="Thêm đối tượng…"/>
            </div>
          </SectionCard>

          {/* 6. SEO + advanced */}
          <SectionCard step="06" title="SEO & cài đặt nâng cao" collapsed>
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
              Click để mở · meta title / description / OG image / lifetime access / certificate / download permissions
            </div>
          </SectionCard>
        </div>

        {/* ── RIGHT RAIL ──────────────────────────────────────────── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 80 }}>
          {/* Live preview */}
          <div className="hd-card" style={{ padding: 14 }}>
            <div className="hd-eyebrow" style={{ marginBottom: 10 }}>// preview · cách card hiển thị</div>
            <CourseCard course={COURSES[0]}/>
          </div>

          {/* Publish checklist */}
          <div className="hd-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="hd-eyebrow">// publish checklist</div>
              <span style={{ font: '600 13px var(--font-mono)', color: 'var(--accent)' }}>8 / 10</span>
            </div>
            <div className="hd-bar" style={{ marginBottom: 16 }}><span style={{ width: '80%' }}/></div>
            {[
              ['Tên khóa học', true],
              ['Mô tả chi tiết', true],
              ['Thumbnail', true],
              ['Video giới thiệu', true],
              ['Danh mục + cấp độ', true],
              ['Giảng viên', true],
              ['Giá bán', true],
              ['≥ 1 section + 3 lesson', true],
              ['Ít nhất 1 lesson "xem thử" miễn phí', false, 'critical'],
              ['Mô tả ≥ 200 ký tự cho SEO', false],
            ].map(([t, done, tone], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontSize: 13 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 999,
                  background: done ? 'var(--accent)' : 'transparent',
                  border: done ? 0 : '1.5px solid var(--line-2)',
                  display: 'grid', placeItems: 'center',
                  color: 'var(--accent-ink)',
                }}>
                  {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 12l5 5L20 7"/></svg>}
                </span>
                <span style={{
                  flex: 1,
                  color: done ? 'var(--ink-2)' : tone === 'critical' ? 'var(--rose)' : 'var(--ink-2)',
                  textDecoration: done ? 'line-through' : 'none',
                  opacity: done ? .55 : 1,
                }}>{t}</span>
                {tone === 'critical' && !done && <span style={{ font: '500 10px var(--font-mono)', color: 'var(--rose)' }}>BẮT BUỘC</span>}
              </div>
            ))}
          </div>

          {/* Activity / history */}
          <div className="hd-card" style={{ padding: 18 }}>
            <div className="hd-eyebrow" style={{ marginBottom: 12 }}>// hoạt động gần đây</div>
            {[
              ['Bạn', 'thêm lesson "The Event Loop, step by step"', '2 phút', 'var(--accent)'],
              ['Bạn', 'cập nhật giá thành 599,000đ', '14 phút', 'var(--ink-2)'],
              ['Will Sentance', 'upload video lesson 12', '1 giờ', 'var(--indigo)'],
              ['Bạn', 'tạo Section 03 — Asynchronous JS', '3 giờ', 'var(--ink-2)'],
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', fontSize: 12.5 }}>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: row[3], marginTop: 7, flexShrink: 0 }}/>
                <div style={{ flex: 1, color: 'var(--ink-2)' }}>
                  <b style={{ color: 'var(--ink)' }}>{row[0]}</b> {row[1]}
                </div>
                <span style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)' }}>{row[2]}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AdminShell>
  );
};

// ── SectionCard wrapper ──────────────────────────────────────────────────
const SectionCard = ({ step, title, hint, children, collapsed }) => (
  <div className="hd-card" style={{ padding: 22 }}>
    <div style={{ display: 'flex', alignItems: 'start', gap: 14, marginBottom: hint ? 4 : 14 }}>
      <span style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--bg-2)', color: 'var(--accent)',
        font: '700 13px var(--font-mono)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>{step}</span>
      <div style={{ flex: 1 }}>
        <div style={{ font: '600 15px var(--font-display)' }}>{title}</div>
        {hint && <div style={{ font: '500 12px var(--font-body)', color: 'var(--ink-3)', marginTop: 2 }}>{hint}</div>}
      </div>
      {collapsed && <span style={{ color: 'var(--ink-3)', transform: 'rotate(-90deg)', display: 'flex' }}>{I.chev}</span>}
    </div>
    {!collapsed && <div style={{ marginTop: 16 }}>{children}</div>}
  </div>
);
const FieldRow = ({ children }) => <div style={{ marginBottom: 14 }}>{children}</div>;

// ── YouTube URL input with live preview ──────────────────────────────────
const YouTubeInput = ({ url, duration, id, compact }) => (
  <div>
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 10, top: 11,
        color: 'var(--rose)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12,
      }}>▶</span>
      <input className="hd-input" defaultValue={url}
        placeholder="https://www.youtube.com/watch?v=…"
        style={{ paddingLeft: 32, paddingRight: 92, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}/>
      {id && (
        <span style={{
          position: 'absolute', right: 8, top: 6,
          display: 'flex', alignItems: 'center', gap: 6,
          font: '500 11px var(--font-mono)', color: 'var(--green)',
          background: 'rgba(52,211,153,.10)',
          padding: '4px 8px', borderRadius: 5,
        }}>
          <span className="hd-dot hd-dot-g"/> id={id}
        </span>
      )}
    </div>

    {/* Inline preview — YouTube oEmbed thumbnail */}
    {id && (
      <div className="hd-soft" style={{
        marginTop: 8, padding: compact ? 8 : 10,
        display: 'grid', gridTemplateColumns: compact ? '90px 1fr' : '140px 1fr', gap: 12,
        alignItems: 'center',
      }}>
        <div style={{
          aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', position: 'relative',
          background: `linear-gradient(135deg, #ef4444, #7f1d1d)`,
        }}>
          {/* faux yt thumbnail */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.18), transparent 60%)' }}/>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <div style={{
              width: compact ? 28 : 38, height: compact ? 20 : 28, background: 'rgba(0,0,0,.7)',
              borderRadius: 6, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, paddingLeft: 3,
            }}>▶</div>
          </div>
          <div style={{
            position: 'absolute', right: 4, bottom: 4,
            background: 'rgba(0,0,0,.8)', color: '#fff',
            font: '600 10px var(--font-mono)',
            padding: '1px 4px', borderRadius: 2,
          }}>{duration}</div>
        </div>
        <div>
          <div style={{ font: '500 11px var(--font-mono)', color: 'var(--green)', marginBottom: 4 }}>
            ✓ Đã xác thực qua YouTube oEmbed
          </div>
          <div style={{ font: '600 13px var(--font-display)', lineHeight: 1.3, marginBottom: 4 }}>
            Course preview · Will Sentance giới thiệu khóa
          </div>
          <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>
            youtube.com · {duration} · Unlisted · 1080p
          </div>
        </div>
      </div>
    )}

    <div style={{ display: 'flex', gap: 14, font: '500 11px var(--font-mono)', color: 'var(--ink-3)', marginTop: 6 }}>
      <span>✓ Hỗ trợ: <span style={{ color: 'var(--ink-2)' }}>youtube.com/watch?v=…</span></span>
      <span>✓ <span style={{ color: 'var(--ink-2)' }}>youtu.be/…</span></span>
      <span>✓ <span style={{ color: 'var(--ink-2)' }}>/shorts/…</span></span>
    </div>
  </div>
);

// ── List builder (learning outcomes / requirements / audience) ───────────
const ListBuilder = ({ title, items, placeholder }) => (
  <div>
    <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>{title}</label>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((t, i) => (
        <div key={i} className="hd-soft" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 6px 4px' }}>
          <span style={{ color: 'var(--ink-3)', cursor: 'grab' }}>{I.drag}</span>
          <span style={{ color: 'var(--accent)' }}>{I.check}</span>
          <input className="hd-input" defaultValue={t}
            style={{ flex: 1, height: 28, padding: '0 8px', background: 'transparent', border: 0, fontSize: 13 }}/>
          <button className="hd-icon-btn" style={{ width: 24, height: 24, border: 0 }}>{I.x}</button>
        </div>
      ))}
      <button style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 8,
        background: 'transparent', border: '1.5px dashed var(--line-2)',
        color: 'var(--ink-3)', cursor: 'pointer', font: '500 13px var(--font-body)',
        marginTop: 2,
      }}>
        {I.plus} {placeholder}
      </button>
    </div>
  </div>
);

// ── Curriculum builder — sections with lessons (YouTube URLs!) ───────────
const CurriculumBuilder = () => {
  const sections = [
    { t: 'Foundations of JS', n: 4, expanded: false },
    { t: 'Closures & Lexical Scope', n: 3, expanded: false },
    {
      t: 'Asynchronous JavaScript', n: 4, expanded: true,
      lessons: [
        { name: 'Callback-based async', dur: '9:48', yt: 'https://youtu.be/abc1234567a', free: true, status: 'ok' },
        { name: 'The microtask queue',  dur: '13:21', yt: 'https://www.youtube.com/watch?v=def7654321b', free: false, status: 'ok' },
        { name: 'The Event Loop, step by step', dur: '14:02', yt: '', free: false, status: 'missing', editing: true },
        { name: 'Promises & .then chains', dur: '15:38', yt: 'https://youtu.be/xyz9876543c', free: false, status: 'ok' },
      ],
    },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span className="hd-eyebrow">// 3 sections · 11 lesson · tổng 1h 22m</span>
        <div style={{ flex: 1 }}/>
        <button className="hd-btn hd-btn-ghost hd-btn-sm">{I.plus} Section</button>
        <button className="hd-btn hd-btn-ghost hd-btn-sm">{I.plus} Lesson</button>
        <button className="hd-btn hd-btn-quiet hd-btn-sm">⤓ Import từ CSV</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sections.map((s, si) => (
          <div key={si} className="hd-soft" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: 12,
              background: s.expanded ? 'var(--bg)' : 'transparent',
              borderBottom: s.expanded ? '1px solid var(--line)' : 0 }}>
              <span style={{ color: 'var(--ink-3)', cursor: 'grab' }}>{I.drag}</span>
              <span style={{ color: 'var(--ink-3)', transform: s.expanded ? 'rotate(180deg)' : 'none', display: 'flex' }}>{I.chev}</span>
              <span style={{
                font: '600 11.5px var(--font-mono)', color: 'var(--ink-3)',
                background: 'var(--bg-3)', padding: '2px 8px', borderRadius: 5,
              }}>0{si + 1}</span>
              <input className="hd-input" defaultValue={s.t}
                style={{ flex: 1, height: 30, padding: '0 8px', background: 'transparent', border: 0, fontWeight: 600 }}/>
              <span style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)' }}>{s.n} lesson</span>
              <button className="hd-btn hd-btn-quiet hd-btn-sm" style={{ height: 26, padding: '0 8px' }}>
                {I.plus} Lesson
              </button>
              <button className="hd-icon-btn" style={{ width: 28, height: 28 }}>{I.trash}</button>
            </div>

            {s.expanded && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {s.lessons.map((l, li) => (
                  <LessonRow key={li} lesson={l} idx={li + 1}/>
                ))}
                <button style={{
                  margin: 8, padding: '10px 12px', borderRadius: 8,
                  background: 'transparent', border: '1.5px dashed var(--line-2)',
                  color: 'var(--ink-3)', cursor: 'pointer', font: '500 13px var(--font-body)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {I.plus} Thêm lesson vào section này
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add section */}
        <button style={{
          padding: '14px 12px', borderRadius: 10,
          background: 'transparent', border: '1.5px dashed var(--line-2)',
          color: 'var(--ink-3)', cursor: 'pointer', font: '500 14px var(--font-body)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginTop: 4,
        }}>
          {I.plus} Thêm Section mới
        </button>
      </div>
    </div>
  );
};

// ── Lesson row — clicks expand into YouTube URL panel ────────────────────
const LessonRow = ({ lesson, idx }) => {
  const id = parseYouTubeId(lesson.yt);
  return (
    <div style={{
      borderBottom: '1px solid var(--line)',
      background: lesson.editing ? 'rgba(247,223,30,.04)' : 'transparent',
      borderLeft: lesson.editing ? '3px solid var(--accent)' : '3px solid transparent',
    }}>
      <div style={{ padding: '10px 12px 10px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--ink-3)', cursor: 'grab' }}>{I.drag}</span>
        <span style={{
          width: 24, height: 24, borderRadius: 5,
          background: lesson.yt ? 'rgba(247,223,30,.10)' : 'rgba(244,63,94,.10)',
          color: lesson.yt ? 'var(--accent)' : 'var(--rose)',
          display: 'grid', placeItems: 'center',
          font: '700 10px var(--font-mono)',
        }}>{idx.toString().padStart(2, '0')}</span>
        <input className="hd-input" defaultValue={lesson.name}
          style={{ flex: 1, height: 30, padding: '0 8px', background: 'transparent', border: 0, fontSize: 13.5 }}/>

        {/* YouTube status pill */}
        {lesson.yt ? (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            font: '500 11px var(--font-mono)', color: 'var(--green)',
            background: 'rgba(52,211,153,.10)', padding: '4px 8px', borderRadius: 5,
          }}>▶ youtu.be/{id?.slice(0, 6)}…</span>
        ) : (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            font: '500 11px var(--font-mono)', color: 'var(--rose)',
            background: 'rgba(244,63,94,.10)', padding: '4px 8px', borderRadius: 5,
          }}>⚠ chưa có video</span>
        )}

        <span style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)', width: 40, textAlign: 'right' }}>{lesson.dur}</span>

        {/* Free preview toggle */}
        <label title="Cho xem thử miễn phí" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <span style={{
            position: 'relative', width: 28, height: 16, borderRadius: 999,
            background: lesson.free ? 'var(--accent)' : 'var(--bg-3)',
            transition: 'background .15s', display: 'block',
          }}>
            <span style={{
              position: 'absolute', top: 2, left: lesson.free ? 14 : 2,
              width: 12, height: 12, borderRadius: 999, background: '#fff', transition: 'left .15s',
            }}/>
          </span>
          <span style={{ font: '500 10px var(--font-mono)', color: lesson.free ? 'var(--accent)' : 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', width: 42 }}>
            {lesson.free ? 'Free' : 'Paid'}
          </span>
        </label>

        <button className="hd-icon-btn" style={{ width: 28, height: 28 }} title="Chỉnh sửa">{I.edit}</button>
        <button className="hd-icon-btn" style={{ width: 28, height: 28 }} title="Xóa">{I.trash}</button>
      </div>

      {/* Expanded editor for the active lesson */}
      {lesson.editing && (
        <div style={{ padding: '6px 14px 16px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
            <div>
              <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                Video URL (YouTube) *
              </label>
              <YouTubeInput url="" id={null} duration=""/>
              <div style={{
                marginTop: 10, padding: '10px 12px',
                background: 'rgba(244,63,94,.06)', border: '1px solid rgba(244,63,94,.25)',
                borderRadius: 8, font: '500 12px var(--font-mono)', color: 'var(--rose)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ⚠ Dán link YouTube để học viên xem được lesson này.
                <button style={{
                  background: 'transparent', border: 0, color: 'var(--rose)',
                  textDecoration: 'underline', cursor: 'pointer', font: 'inherit',
                  marginLeft: 'auto',
                }}>Dùng Cloudinary thay thế →</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                  Mô tả lesson
                </label>
                <textarea className="hd-input" rows="3" placeholder="Hiển thị dưới video player…"
                  style={{ height: 64, padding: 10, resize: 'none', fontFamily: 'var(--font-body)' }}/>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="hd-btn hd-btn-ghost hd-btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  {I.attach} File đính kèm
                </button>
                <button className="hd-btn hd-btn-ghost hd-btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  {I.plus} Quiz / câu hỏi
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="hd-btn hd-btn-primary hd-btn-sm">Lưu lesson</button>
            <button className="hd-btn hd-btn-quiet hd-btn-sm">Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Lesson Editor (focused modal) — dedicated YouTube workflow view ──────
const AdminLessonEditorPage = () => (
  <AdminShell active="Bài học">
    {/* Top bar */}
    <header style={{
      padding: '14px 28px', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <button className="hd-icon-btn"><span style={{ transform: 'rotate(180deg)', display: 'flex' }}>{I.chevR}</span></button>
      <div>
        <div className="hd-eyebrow">// admin / khóa học / lesson</div>
        <h1 className="hd-display" style={{ fontSize: 18, margin: '2px 0 0' }}>The Event Loop, step by step</h1>
      </div>
      <div style={{ flex: 1 }}/>
      <button className="hd-btn hd-btn-quiet hd-btn-sm">Hủy</button>
      <button className="hd-btn hd-btn-ghost hd-btn-sm">Xem thử →</button>
      <button className="hd-btn hd-btn-primary hd-btn-sm">{I.check} Lưu lesson</button>
    </header>

    <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      {/* Left: form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <SectionCard step="01" title="Thông tin lesson">
          <FieldRow>
            <Field label="Tiêu đề *" value="The Event Loop, step by step" trailing="29 / 80"/>
          </FieldRow>
          <FieldRow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Section</label>
                <select className="hd-input"><option>03 — Asynchronous JS</option></select>
              </div>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Thứ tự</label>
                <input className="hd-input" defaultValue="03" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}/>
              </div>
              <div>
                <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Loại nội dung</label>
                <select className="hd-input"><option>Video bài giảng</option><option>Bài tập</option><option>Quiz</option></select>
              </div>
            </div>
          </FieldRow>
        </SectionCard>

        <SectionCard step="02" title="Nguồn video"
          hint="MVP dùng YouTube Unlisted. Production sẽ chuyển sang Cloudinary Signed URL để bảo mật.">
          {/* Source tabs */}
          <div style={{ display: 'flex', gap: 6, padding: 3, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 16 }}>
            {[
              ['YouTube', true, '▶'],
              ['Cloudinary', false, '☁'],
              ['Upload trực tiếp', false, '↑'],
              ['Vimeo', false, 'V'],
            ].map(([t, on, ic], i) => (
              <button key={i} style={{
                flex: 1, padding: '8px 12px', border: 0, borderRadius: 5,
                background: on ? 'var(--bg-1)' : 'transparent',
                color: on ? 'var(--ink)' : 'var(--ink-3)',
                font: '500 12.5px var(--font-body)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: 'pointer',
                boxShadow: on ? '0 1px 3px rgba(0,0,0,.15), inset 0 0 0 1px var(--line)' : 'none',
              }}>
                <span style={{ color: t === 'YouTube' ? 'var(--rose)' : 'var(--ink-3)' }}>{ic}</span>
                {t}
              </button>
            ))}
          </div>

          <YouTubeInput url="https://www.youtube.com/watch?v=8aGhZQkoFbQ" duration="14:02" id="8aGhZQkoFbQ"/>

          <hr className="hd-div" style={{ margin: '20px 0' }}/>

          {/* Auto-detected meta */}
          <div className="hd-eyebrow" style={{ marginBottom: 10 }}>// auto-detect từ YouTube oEmbed</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              ['Thời lượng', '14:02'],
              ['Chất lượng tối đa', '1080p'],
              ['Caption', 'EN, VI'],
              ['Privacy', 'Unlisted'],
            ].map(([l, v]) => (
              <div key={l} className="hd-soft" style={{ padding: 12 }}>
                <div className="hd-eyebrow" style={{ marginBottom: 4 }}>{l}</div>
                <div style={{ font: '600 14px var(--font-mono)' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Privacy warning per docx spec */}
          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.25)',
            borderRadius: 8, display: 'flex', gap: 12, alignItems: 'start',
          }}>
            <span style={{ color: 'var(--amber)', fontSize: 16 }}>⚠</span>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              <b style={{ color: 'var(--ink)' }}>Lưu ý bảo mật:</b> YouTube Unlisted có thể truy cập trực tiếp nếu URL bị lộ.
              Sản phẩm production nên chuyển sang <a href="#" style={{ color: 'var(--amber)' }}>Cloudinary Signed URL có thời hạn</a>.
            </div>
          </div>
        </SectionCard>

        <SectionCard step="03" title="Nội dung bổ sung">
          <FieldRow>
            <div>
              <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Mô tả lesson</label>
              <textarea className="hd-input" rows="3"
                style={{ height: 88, padding: 10, resize: 'none', fontFamily: 'var(--font-body)' }}
                defaultValue={`Trong bài này, chúng ta sẽ "chạy" tay một đoạn code có cả setTimeout và Promise.then để thấy chính xác V8 lập lịch như thế nào.`}/>
            </div>
          </FieldRow>

          {/* Attachments */}
          <FieldRow>
            <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>File đính kèm (tài liệu PDF, code starter…)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { name: 'event-loop-cheatsheet.pdf', s: '1.4 MB', i: 'pdf' },
                { name: 'starter-code.zip', s: '12 KB', i: 'zip' },
              ].map((a, i) => (
                <div key={i} className="hd-soft" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg)', color: 'var(--accent)',
                    display: 'grid', placeItems: 'center', font: '700 10px var(--font-mono)' }}>{a.i}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)' }}>{a.s}</div>
                  </div>
                  <button className="hd-icon-btn" style={{ width: 26, height: 26, border: 0 }}>{I.x}</button>
                </div>
              ))}
              <button style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'transparent', border: '1.5px dashed var(--line-2)',
                color: 'var(--ink-3)', cursor: 'pointer', font: '500 13px var(--font-body)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {I.attach} Kéo thả file vào đây hoặc <span style={{ color: 'var(--accent)' }}>chọn file</span>
              </button>
            </div>
          </FieldRow>
        </SectionCard>

        <SectionCard step="04" title="Cài đặt & quyền">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Cho xem thử miễn phí', 'Học viên chưa mua khóa vẫn xem được lesson này', true, 'critical'],
              ['Cho phép download video', 'Hiện nút tải video (cẩn thận với bản quyền)', false],
              ['Bắt buộc xem hết mới mở lesson tiếp theo', 'Chặn người dùng skip', true],
              ['Hiển thị transcript tự động', 'YouTube auto-caption → text bên cạnh video', true],
            ].map(([l, d, on, tone], i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'start', gap: 12, cursor: 'pointer', padding: '4px 0' }}>
                <span style={{
                  position: 'relative', width: 34, height: 20, borderRadius: 999,
                  background: on ? 'var(--accent)' : 'var(--bg-3)', flexShrink: 0, marginTop: 1,
                }}>
                  <span style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff' }}/>
                </span>
                <div>
                  <div style={{ font: '500 13px var(--font-body)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {l}
                    {tone === 'critical' && on && <span className="hd-chip" style={{ background: 'rgba(247,223,30,.10)', color: 'var(--accent)' }}>PREVIEW</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{d}</div>
                </div>
              </label>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Right: player preview */}
      <aside style={{ position: 'sticky', top: 80 }}>
        <div className="hd-eyebrow" style={{ marginBottom: 10 }}>// preview · cách lesson hiển thị cho học viên</div>
        <div className="hd-card" style={{ padding: 12, marginBottom: 14 }}>
          {/* Embedded YouTube player mock */}
          <div style={{
            position: 'relative', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden',
            background: 'linear-gradient(135deg, #1a1f3a, #050810)',
          }}>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 999,
                background: 'rgba(247,223,30,.95)', color: 'var(--js-ink)',
                display: 'grid', placeItems: 'center', fontSize: 22, paddingLeft: 4,
              }}>▶</div>
            </div>
            <div style={{ position: 'absolute', top: 8, left: 8, font: '500 10px var(--font-mono)',
              background: 'rgba(0,0,0,.7)', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>
              embed · youtu.be/8aGhZQkoFbQ
            </div>
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: '12px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.6))',
              color: '#fff', font: '500 11px var(--font-mono)',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>00:00 / 14:02</span>
              <span>1080p · CC</span>
            </div>
          </div>
          <div style={{ padding: '12px 4px 4px' }}>
            <div style={{ font: '600 14px var(--font-display)', marginBottom: 4 }}>The Event Loop, step by step</div>
            <div style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>Section 03 · 14:02 · Will Sentance</div>
          </div>
        </div>

        {/* Tech / API trace per docx — show how Backend serves video */}
        <div className="hd-card" style={{ padding: 16 }}>
          <div className="hd-eyebrow" style={{ marginBottom: 10 }}>// flow phục vụ video (theo docx)</div>
          <pre style={{ font: '500 11px/1.6 var(--font-mono)', color: 'var(--ink-2)', margin: 0, whiteSpace: 'pre-wrap' }}>
{`GET /api/lessons/14

→ middleware.auth(req)
→ check Enrollments(user_id, course_id)
   ├─ ✓ → return { id, title, youtube_id, … }
   └─ ✗ → 403 Forbidden

frontend: <iframe src="youtube.com/embed/8aGhZQkoFbQ" />`}
          </pre>
        </div>
      </aside>
    </div>
  </AdminShell>
);

Object.assign(window, { AdminCourseEditPage, AdminLessonEditorPage, parseYouTubeId });
