// app.jsx — Hoisted design canvas composition

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mode": "as-designed",
  "accent": "yellow",
  "density": "regular",
  "showVariations": true
}/*EDITMODE-END*/;

const ACCENTS = {
  yellow:  { dark: '#F7DF1E', darkInk: '#0B0F19', light: '#4F46E5', lightInk: '#fff', chipD: 'rgba(247,223,30,.10)', chipL: 'rgba(79,70,229,.10)' },
  indigo:  { dark: '#818CF8', darkInk: '#0B0F19', light: '#4F46E5', lightInk: '#fff', chipD: 'rgba(129,140,248,.14)', chipL: 'rgba(79,70,229,.10)' },
  emerald: { dark: '#34D399', darkInk: '#0B0F19', light: '#059669', lightInk: '#fff', chipD: 'rgba(52,211,153,.14)', chipL: 'rgba(5,150,105,.10)' },
  violet:  { dark: '#C084FC', darkInk: '#0B0F19', light: '#7C3AED', lightInk: '#fff', chipD: 'rgba(192,132,252,.14)', chipL: 'rgba(124,58,237,.10)' },
};

function applyTweaks(t) {
  const a = ACCENTS[t.accent] || ACCENTS.yellow;
  // 1) accent overrides (dark + light scopes)
  let css = `
    .hd-dark { --accent: ${a.dark}; --accent-ink: ${a.darkInk}; --chip: ${a.chipD}; --chip-ink: ${a.dark}; }
    .hd-light { --accent: ${a.light}; --accent-ink: ${a.lightInk}; --chip: ${a.chipL}; --chip-ink: ${a.light}; }
  `;
  // 2) Mode override — flip dark→light or vice versa across all artboards
  if (t.mode === 'all-light') {
    css += `
      .hd-dark {
        --bg:#F8FAFC; --bg-1:#fff; --bg-2:#F1F5F9; --bg-3:#fff;
        --line:rgba(15,23,42,.08); --line-2:rgba(15,23,42,.16);
        --ink:#0B0F19; --ink-2:#475569; --ink-3:#94A3B8;
        color-scheme: light;
      }
      .hd-dark .hd-code .k { color:#7C3AED; }
      .hd-dark .hd-code .s { color:#B45309; }
      .hd-dark .hd-code .f { color:#B45309; }
      .hd-dark .hd-code .c { color:#94A3B8; }
      .hd-dark .hd-code .n { color:#1D4ED8; }
      .hd-dark .hd-code .o { color:#0F766E; }
    `;
  }
  if (t.mode === 'all-dark') {
    css += `
      .hd-light {
        --bg:#0B0F19; --bg-1:#0F1525; --bg-2:#161C2F; --bg-3:#1E263D;
        --line:rgba(255,255,255,.07); --line-2:rgba(255,255,255,.14);
        --ink:#F4F5F9; --ink-2:#B6BCD0; --ink-3:#6B7392;
        color-scheme: dark;
      }
    `;
  }
  // 3) Density
  if (t.density === 'compact') {
    css += `.hd-root { font-size: 13px; } .hd-btn { height: 34px; padding: 0 14px; }`;
  } else if (t.density === 'cozy') {
    css += `.hd-root { font-size: 15px; } .hd-btn { height: 42px; padding: 0 18px; }`;
  }

  let el = document.getElementById('hd-tweak-overrides');
  if (!el) {
    el = document.createElement('style');
    el.id = 'hd-tweak-overrides';
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyTweaks(t); }, [t]);

  // helper to wrap a page in a scaled-down artboard that doesn't itself scroll
  const W = 1440;

  return (
    <>
      <DesignCanvas>
        <DCSection id="public" title="① Public — guest + commerce"
          subtitle="Trang công khai cho khách + giỏ + checkout. Dark mode default, accent vàng JS, mono cho code và label.">
          <DCArtboard id="home" label="Homepage" width={W} height={2000}>
            <HomePage/>
          </DCArtboard>
          <DCArtboard id="listing" label="Course Listing · filters + sort + pagination" width={W} height={1500}>
            <CourseListingPage/>
          </DCArtboard>
          <DCArtboard id="detail" label="Course Detail · sticky purchase + curriculum" width={W} height={1700}>
            <CourseDetailPage/>
          </DCArtboard>
          <DCArtboard id="login" label="Login / Register · split + IDE motif" width={W} height={820}>
            <LoginPage/>
          </DCArtboard>
          <DCArtboard id="cart" label="Cart + Checkout (gộp 1 page)" width={W} height={1400}>
            <CartPage/>
          </DCArtboard>
          <DCArtboard id="pay-ok" label="Payment Result · success" width={W} height={920}>
            <PaymentResultPage status="success"/>
          </DCArtboard>
          <DCArtboard id="pay-fail" label="Payment Result · failed" width={W} height={920}>
            <PaymentResultPage status="failed"/>
          </DCArtboard>
        </DCSection>

        <DCSection id="user" title="② Authenticated User"
          subtitle="Trải nghiệm học của user — Lesson Player là page critical, các page còn lại bao quanh nó.">
          <DCArtboard id="lesson" label="⭐ Lesson Player — CRITICAL · 2 cột 70/30" width={W} height={920}>
            <LessonPlayerPage/>
          </DCArtboard>
          <DCArtboard id="mylearning" label="My Learning · continue card + grid" width={W} height={1300}>
            <MyLearningPage/>
          </DCArtboard>
          <DCArtboard id="profile" label="Profile Settings · tabs trái + sections phải" width={W} height={1500}>
            <ProfileSettingsPage/>
          </DCArtboard>
          <DCArtboard id="orders" label="My Orders · table + filter chips" width={W} height={900}>
            <MyOrdersPage/>
          </DCArtboard>
          <DCArtboard id="tx" label="Transaction History · ledger entries" width={W} height={1000}>
            <TransactionHistoryPage/>
          </DCArtboard>
        </DCSection>

        <DCSection id="admin" title="③ Admin Console"
          subtitle="Layout sidebar 232px, table-dense, charts dùng spark + line. Dùng cùng tokens với app, accent chỉ ở active state và CTA chính.">
          <DCArtboard id="dash" label="Dashboard · stats + revenue + funnel" width={W} height={1200}>
            <AdminDashboardPage/>
          </DCArtboard>
          <DCArtboard id="mgmt" label="Course Management · table + curriculum editor (drag)" width={W} height={1400}>
            <AdminCoursesPage/>
          </DCArtboard>
          <DCArtboard id="course-edit" label="⭐ Course Editor · form nhập liệu đầy đủ" width={W} height={2400}>
            <AdminCourseEditPage/>
          </DCArtboard>
          <DCArtboard id="lesson-edit" label="Lesson Editor · YouTube URL focus + flow API" width={W} height={1500}>
            <AdminLessonEditorPage/>
          </DCArtboard>
          <DCArtboard id="users" label="User Management · stats + bulk actions" width={W} height={1100}>
            <AdminUsersPage/>
          </DCArtboard>
          <DCArtboard id="orders-admin" label="Order Management · realtime queue" width={W} height={1100}>
            <AdminOrdersPage/>
          </DCArtboard>
          <DCArtboard id="reviews" label="Review Moderation · approve / hide / reply" width={W} height={1300}>
            <AdminReviewsPage/>
          </DCArtboard>
          <DCArtboard id="cats" label="Category Management · drag reorder + edit panel" width={W} height={1000}>
            <AdminCategoriesPage/>
          </DCArtboard>
        </DCSection>

        {t.showVariations && (
          <DCSection id="variations" title="④ Variations của Homepage"
            subtitle="Cùng nội dung, 2 hướng visual khác — so sánh cạnh nhau với direction chính ở trên.">
            <DCArtboard id="safe" label="A · Safe · Udemy-style, light mode, indigo" width={W} height={1900}>
              <HomePageSafe/>
            </DCArtboard>
            <DCArtboard id="bold" label="B · Bold experimental · terminal-as-website" width={W} height={1700}>
              <HomePageBold/>
            </DCArtboard>
          </DCSection>
        )}
      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="Theme"/>
        <TweakRadio label="Mode" value={t.mode}
          options={[
            { value: 'as-designed', label: 'Mixed' },
            { value: 'all-dark', label: 'Dark' },
            { value: 'all-light', label: 'Light' },
          ]}
          onChange={(v) => setTweak('mode', v)}/>
        <TweakColor label="Accent color"
          value={ACCENTS[t.accent].dark}
          options={Object.values(ACCENTS).map(a => a.dark)}
          onChange={(v) => {
            const found = Object.entries(ACCENTS).find(([k, a]) => a.dark === v);
            if (found) setTweak('accent', found[0]);
          }}/>

        <TweakSection label="Density"/>
        <TweakRadio label="Spacing" value={t.density}
          options={['compact', 'regular', 'cozy']}
          onChange={(v) => setTweak('density', v)}/>

        <TweakSection label="Show"/>
        <TweakToggle label="Section ④ — Variations"
          value={t.showVariations}
          onChange={(v) => setTweak('showVariations', v)}/>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
