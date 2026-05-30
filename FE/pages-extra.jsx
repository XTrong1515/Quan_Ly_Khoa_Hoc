// pages-extra.jsx — Payment Result, Profile Settings, My Orders, Transaction History

// ── Payment Result ────────────────────────────────────────────────────────
const PaymentResultPage = ({ status = 'success' }) => {
  const ok = status === 'success';
  return (
    <div className="hd-root hd-dark" style={{ minHeight: '100%' }}>
      <Nav active="" cartCount={0}/>
      <div style={{ padding: '64px 64px 80px', display: 'grid', placeItems: 'center' }}>
        <div className="hd-card" style={{ padding: 40, maxWidth: 640, width: '100%', textAlign: 'center',
          backgroundImage: ok
            ? 'radial-gradient(circle at 50% 0%, rgba(52,211,153,.10), transparent 60%)'
            : 'radial-gradient(circle at 50% 0%, rgba(244,63,94,.10), transparent 60%)' }}>
          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: 999,
            background: ok ? 'rgba(52,211,153,.14)' : 'rgba(244,63,94,.14)',
            color: ok ? 'var(--green)' : 'var(--rose)',
            display: 'grid', placeItems: 'center', margin: '0 auto 22px',
          }}>
            {ok ? (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            )}
          </div>

          <div className="hd-eyebrow" style={{ marginBottom: 8, color: ok ? 'var(--green)' : 'var(--rose)' }}>
            {ok ? '// transaction.status = 200 OK' : '// transaction.status = 402 Required'}
          </div>
          <h1 className="hd-display" style={{ fontSize: 36, margin: '0 0 12px' }}>
            {ok ? 'Thanh toán thành công!' : 'Thanh toán không thành công'}
          </h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.55, margin: '0 0 24px', maxWidth: 480, marginInline: 'auto' }}>
            {ok
              ? 'Cảm ơn bạn đã đăng ký. 3 khóa đã được mở khóa trong My Learning. Hóa đơn đã gửi tới email khang@hoisted.dev.'
              : 'Giao dịch bị gateway từ chối. Số tiền chưa bị trừ. Vui lòng thử lại với phương thức khác hoặc kiểm tra lại số dư thẻ.'}
          </p>

          {/* receipt summary */}
          <div className="hd-soft" style={{ padding: 20, textAlign: 'left', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Mã đơn</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#HO-12483</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Thời gian</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>19/05/2026 · 14:42</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Phương thức</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>VNPay · Vietcombank ****1234</span>
            </div>
            <hr className="hd-div" style={{ margin: '12px 0' }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Tổng thanh toán</span>
              <span style={{ font: '700 18px var(--font-mono)', color: ok ? 'var(--accent)' : 'var(--ink)' }}>
                {ok ? '1,617,300đ' : '— đ'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {ok ? (
              <>
                <button className="hd-btn hd-btn-primary hd-btn-lg">Đi tới My Learning →</button>
                <button className="hd-btn hd-btn-ghost hd-btn-lg">{I.download} Tải hóa đơn</button>
              </>
            ) : (
              <>
                <button className="hd-btn hd-btn-primary hd-btn-lg">Thử lại thanh toán</button>
                <button className="hd-btn hd-btn-ghost hd-btn-lg">Đổi phương thức</button>
              </>
            )}
          </div>

          {ok && (
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--line)', font: '500 12px var(--font-mono)', color: 'var(--ink-3)' }}>
              hoặc <a href="#" style={{ color: 'var(--accent)' }}>xem hóa đơn dạng PDF</a> · <a href="#" style={{ color: 'var(--accent)' }}>liên hệ hỗ trợ</a>
            </div>
          )}
        </div>
      </div>
      <Footer/>
    </div>
  );
};

// ── Profile Settings ──────────────────────────────────────────────────────
const ProfileSettingsPage = () => (
  <div className="hd-root hd-dark" style={{ minHeight: '100%' }}>
    <Nav active=""/>
    <div style={{ padding: '36px 64px 8px' }}>
      <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)', marginBottom: 14 }}>Trang chủ / Tài khoản / Cài đặt</div>
      <h1 className="hd-display" style={{ fontSize: 32, margin: 0 }}>Cài đặt tài khoản</h1>
    </div>

    <div style={{ padding: '28px 64px 64px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32 }}>
      {/* sidebar tabs */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'sticky', top: 80, alignSelf: 'start' }}>
        {[
          ['Thông tin cá nhân', true, I.user],
          ['Đổi mật khẩu', false, I.lock],
          ['Avatar', false],
          ['Email & thông báo', false, I.bell],
          ['Phương thức thanh toán', false, I.card],
          ['Ngôn ngữ & vùng', false],
          ['Xóa tài khoản', false, I.trash, 'danger'],
        ].map(([t, on, ic, tone], i) => (
          <button key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            background: on ? 'var(--bg-2)' : 'transparent',
            color: tone === 'danger' ? 'var(--rose)' : on ? 'var(--ink)' : 'var(--ink-2)',
            border: 0, cursor: 'pointer',
            font: '500 13px var(--font-body)',
            position: 'relative',
          }}>
            {on && <span style={{ position: 'absolute', left: -14, top: 12, width: 3, height: 14, background: 'var(--accent)', borderRadius: 999 }}/>}
            {ic && <span style={{ color: on ? 'var(--accent)' : 'var(--ink-3)' }}>{ic}</span>}
            <span>{t}</span>
          </button>
        ))}
      </aside>

      {/* content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Avatar block */}
        <section className="hd-card" style={{ padding: 24 }}>
          <div className="hd-eyebrow" style={{ marginBottom: 14 }}>// avatar</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div className="hd-av" style={{ width: 72, height: 72, fontSize: 24 }}>KP</div>
            <div style={{ flex: 1 }}>
              <div style={{ font: '600 14.5px var(--font-display)', marginBottom: 4 }}>Ảnh đại diện</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>
                PNG / JPG, tối đa 2MB. Đề xuất 400×400.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="hd-btn hd-btn-ghost hd-btn-sm">Đổi ảnh</button>
                <button className="hd-btn hd-btn-quiet hd-btn-sm">Xóa</button>
              </div>
            </div>
          </div>
        </section>

        {/* Info form */}
        <section className="hd-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div className="hd-eyebrow">// thông tin cá nhân</div>
              <div style={{ font: '600 14px var(--font-display)', marginTop: 2 }}>Hồ sơ public</div>
            </div>
            <span style={{ font: '500 11.5px var(--font-mono)', color: 'var(--ink-3)' }}>2 thay đổi chưa lưu</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Họ và tên" value="Phạm Khang"/>
            <Field label="Username" value="@khang.hoisted"/>
            <Field label="Email" value="khang@hoisted.dev"/>
            <Field label="SĐT" value="0987 654 321"/>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ font: '500 12.5px var(--font-mono)', color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Bio</label>
              <textarea className="hd-input" style={{ height: 96, padding: 12, resize: 'none', fontFamily: 'var(--font-body)' }}
                defaultValue="Frontend dev tại Tiki. Học JS không bao giờ là đủ."/>
            </div>
          </div>
          <div style={{ marginTop: 22, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="hd-btn hd-btn-quiet">Hủy</button>
            <button className="hd-btn hd-btn-primary">Lưu thay đổi</button>
          </div>
        </section>

        {/* Change password */}
        <section className="hd-card" style={{ padding: 24 }}>
          <div className="hd-eyebrow" style={{ marginBottom: 14 }}>// đổi mật khẩu</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Mật khẩu hiện tại" type="password" placeholder="••••••••"/>
            </div>
            <Field label="Mật khẩu mới" type="password" placeholder="••••••••"/>
            <Field label="Xác nhận mật khẩu mới" type="password" placeholder="••••••••"/>
          </div>
          <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 8 }}>
            <div className="hd-eyebrow" style={{ marginBottom: 8 }}>// yêu cầu</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12.5, color: 'var(--ink-2)' }}>
              {[
                ['≥ 8 ký tự', true],
                ['1 chữ HOA', true],
                ['1 số', false],
                ['1 ký tự đặc biệt', false],
              ].map(([t, on], i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: on ? 'var(--green)' : 'var(--ink-3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 999, border: on ? 0 : '1px solid var(--line-2)', background: on ? 'var(--green)' : 'transparent', display: 'grid', placeItems: 'center', color: 'var(--js-ink)' }}>
                    {on && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 12l5 5L20 7"/></svg>}
                  </span>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="hd-btn hd-btn-primary">Đổi mật khẩu</button>
          </div>
        </section>

        {/* 2FA */}
        <section className="hd-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div className="hd-eyebrow" style={{ marginBottom: 6 }}>// 2-factor auth</div>
            <div style={{ font: '600 14px var(--font-display)', marginBottom: 4 }}>Xác thực 2 lớp qua app</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Authy, Google Authenticator hoặc 1Password.</div>
          </div>
          <span className="hd-chip" style={{ background: 'rgba(244,63,94,.12)', color: 'var(--rose)' }}>Đang tắt</span>
          <button className="hd-btn hd-btn-ghost">Bật 2FA</button>
        </section>
      </div>
    </div>
    <Footer/>
  </div>
);

// ── My Orders ─────────────────────────────────────────────────────────────
const MyOrdersPage = () => {
  const orders = [
    { id: 'HO-12483', date: '19/05/2026', items: '3 khóa', total: '1,617,300đ', status: 'paid', method: 'VNPay' },
    { id: 'HO-12421', date: '02/05/2026', items: 'JS: The Hard Parts', total: '599,000đ', status: 'paid', method: 'Momo' },
    { id: 'HO-12388', date: '24/04/2026', items: 'React Performance', total: '749,000đ', status: 'paid', method: 'Visa' },
    { id: 'HO-12305', date: '02/04/2026', items: 'TS for JS Devs', total: '549,000đ', status: 'refund', method: 'VNPay' },
    { id: 'HO-12211', date: '18/03/2026', items: 'Async Patterns', total: '449,000đ', status: 'failed', method: 'VNPay' },
  ];
  return (
    <div className="hd-root hd-dark" style={{ minHeight: '100%' }}>
      <Nav active=""/>
      <div style={{ padding: '36px 64px 0' }}>
        <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)', marginBottom: 14 }}>Trang chủ / Tài khoản / Đơn hàng</div>
        <h1 className="hd-display" style={{ fontSize: 32, margin: '0 0 6px' }}>Đơn hàng của tôi</h1>
        <p style={{ color: 'var(--ink-2)', margin: 0 }}>Tổng <b>5 đơn</b> · đã thanh toán <b>3</b> · hoàn tiền <b>1</b> · thất bại <b>1</b></p>
      </div>

      <div style={{ padding: '24px 64px 64px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <span style={{ position: 'absolute', left: 10, top: 11, color: 'var(--ink-3)' }}>{I.search}</span>
            <input className="hd-input" placeholder="Tìm mã đơn, tên khóa…" style={{ paddingLeft: 34 }}/>
          </div>
          <div style={{ display: 'flex', gap: 6, border: '1px solid var(--line)', borderRadius: 8, padding: 3 }}>
            {['Tất cả', 'Đã thanh toán', 'Đang chờ', 'Hoàn tiền', 'Thất bại'].map((t, i) => (
              <button key={t} style={{
                font: '500 12px var(--font-body)', padding: '6px 12px',
                background: i === 0 ? 'var(--bg-2)' : 'transparent',
                color: i === 0 ? 'var(--ink)' : 'var(--ink-3)',
                border: 0, borderRadius: 5, cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>
          <div style={{ flex: 1 }}/>
          <button className="hd-btn hd-btn-ghost hd-btn-sm">{I.download} Export CSV</button>
        </div>

        {/* Table */}
        <div className="hd-card" style={{ overflow: 'hidden' }}>
          <table className="hd-table">
            <thead><tr>
              <th>Mã đơn</th><th>Ngày</th><th>Khóa học</th><th>Phương thức</th><th>Tổng</th><th>Trạng thái</th><th></th>
            </tr></thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>#{o.id}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{o.date}</td>
                  <td>{o.items}</td>
                  <td style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{o.method}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{o.total}</td>
                  <td><StatusBadge s={o.status}/></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="hd-btn hd-btn-ghost hd-btn-sm">Chi tiết →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer/>
    </div>
  );
};

// ── Transaction History ───────────────────────────────────────────────────
const TransactionHistoryPage = () => {
  const txs = [
    { id: 'TX-99834', t: '19/05/2026 14:42', m: 'VNPay · VCB ****1234', d: 'Thanh toán đơn HO-12483', a: '+1,617,300đ', dir: 'in', s: 'success' },
    { id: 'TX-99721', t: '02/05/2026 09:18', m: 'Momo · 0987***321', d: 'Thanh toán đơn HO-12421', a: '+599,000đ', dir: 'in', s: 'success' },
    { id: 'TX-99602', t: '24/04/2026 22:04', m: 'Visa ****4488', d: 'Thanh toán đơn HO-12388', a: '+749,000đ', dir: 'in', s: 'success' },
    { id: 'TX-99580', t: '23/04/2026 10:32', m: 'VNPay · VCB ****1234', d: 'Hoàn tiền đơn HO-12305', a: '-549,000đ', dir: 'out', s: 'success' },
    { id: 'TX-99480', t: '18/03/2026 19:00', m: 'VNPay · VCB ****1234', d: 'Thử thanh toán HO-12211', a: '0đ', dir: 'fail', s: 'failed' },
    { id: 'TX-99214', t: '01/03/2026 16:21', m: 'Hoisted credit', d: 'Áp dụng coupon NEWDEV10', a: '-49,900đ', dir: 'credit', s: 'success' },
  ];
  return (
    <div className="hd-root hd-dark" style={{ minHeight: '100%' }}>
      <Nav active=""/>
      <div style={{ padding: '36px 64px 0' }}>
        <div style={{ font: '500 12px var(--font-mono)', color: 'var(--ink-3)', marginBottom: 14 }}>Trang chủ / Tài khoản / Lịch sử giao dịch</div>
        <h1 className="hd-display" style={{ fontSize: 32, margin: '0 0 6px' }}>Lịch sử giao dịch</h1>
        <p style={{ color: 'var(--ink-2)', margin: 0 }}>Tất cả ledger entry — bao gồm thanh toán, hoàn tiền, credit nội bộ.</p>
      </div>

      {/* Summary cards */}
      <div style={{ padding: '24px 64px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          ['Tổng chi 2026', '3,914,400đ', 'var(--accent)'],
          ['Hoàn tiền', '549,000đ', 'var(--rose)'],
          ['Credit còn lại', '49,900đ', 'var(--green)'],
          ['Coupon đã dùng', '3 / 5', 'var(--indigo)'],
        ].map(([l, v, c]) => (
          <div key={l} className="hd-card" style={{ padding: 16 }}>
            <div className="hd-eyebrow" style={{ marginBottom: 8 }}>{l}</div>
            <div style={{ font: '700 22px var(--font-mono)', color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '24px 64px 64px' }}>
        <div className="hd-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="hd-eyebrow">// ledger · 6 entries</div>
            <div style={{ flex: 1 }}/>
            <select className="hd-input" style={{ width: 140, height: 32, fontSize: 12.5 }}>
              <option>30 ngày qua</option><option>90 ngày</option><option>2026</option><option>Tất cả</option>
            </select>
          </div>
          <table className="hd-table">
            <thead><tr>
              <th>TX ID</th><th>Thời gian</th><th>Mô tả</th><th>Phương thức</th><th style={{ textAlign: 'right' }}>Số tiền</th><th>Status</th>
            </tr></thead>
            <tbody>
              {txs.map((tx, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{tx.id}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{tx.t}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center',
                        background: tx.dir === 'in' ? 'rgba(247,223,30,.10)' :
                                    tx.dir === 'out' ? 'rgba(244,63,94,.12)' :
                                    tx.dir === 'credit' ? 'rgba(99,102,241,.14)' : 'rgba(244,63,94,.12)',
                        color: tx.dir === 'in' ? 'var(--accent)' :
                               tx.dir === 'out' ? 'var(--rose)' :
                               tx.dir === 'credit' ? 'var(--indigo)' : 'var(--rose)',
                        fontSize: 14,
                      }}>{tx.dir === 'in' ? '↓' : tx.dir === 'out' ? '↑' : tx.dir === 'credit' ? '✦' : '✕'}</span>
                      {tx.d}
                    </div>
                  </td>
                  <td style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{tx.m}</td>
                  <td style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'right',
                    color: tx.dir === 'in' ? 'var(--ink)' :
                           tx.dir === 'out' ? 'var(--rose)' :
                           tx.dir === 'credit' ? 'var(--green)' : 'var(--ink-3)',
                  }}>{tx.a}</td>
                  <td><StatusBadge s={tx.s === 'success' ? 'paid' : 'failed'}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer/>
    </div>
  );
};

Object.assign(window, { PaymentResultPage, ProfileSettingsPage, MyOrdersPage, TransactionHistoryPage });
