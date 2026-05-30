# Hoisted — Học JS từ gốc

E-commerce website cho khóa học JavaScript trực tuyến. Frontend React + Vite + Tailwind.

> 📐 **Design reference**: tất cả page có bản hi-fi trong file `Hoisted.html` ở project root (xem qua design canvas có pan/zoom). Khi implement, copy markup từ canvas vào file `.jsx` tương ứng và refactor inline-style sang Tailwind classes.

---

## Tech stack

| | |
|---|---|
| Build  | Vite 5 + React 18 |
| Style  | Tailwind CSS 3 (design tokens qua CSS variables) |
| State  | Zustand (auth, cart, theme) |
| Form   | React Hook Form + Zod |
| Server | TanStack Query (React Query) + Axios |
| Router | React Router 6 |
| Charts | Recharts |
| Video  | react-player |
| Icons  | lucide-react |
| Toast  | sonner |

---

## Getting started

```bash
cd hoisted-react
npm install
npm run dev          # → http://localhost:5173
```

Build production:
```bash
npm run build
npm run preview
```

---

## Folder structure

```
hoisted-react/
├── index.html                      ← Vite entry, Google Fonts links
├── vite.config.js                  ← path alias '@' → ./src
├── tailwind.config.js              ← tokens map vào CSS variables
├── postcss.config.js
└── src/
    ├── main.jsx                    ← React 18 root + providers
    ├── App.jsx
    ├── router.jsx                  ← Routes + guards + 2 layout shells
    ├── index.css                   ← Tailwind + design tokens (dark/light)
    │
    ├── lib/
    │   ├── utils.js                ← cn() — clsx + tailwind-merge
    │   └── format.js               ← formatVND, formatHours, clampPct
    │
    ├── data/
    │   └── courses.js              ← mock data — replace bằng API
    │
    ├── store/
    │   ├── auth.js                 ← user, role (guest/user/admin), login, logout
    │   ├── cart.js                 ← items, add, remove, clear
    │   └── theme.js                ← dark/light toggle
    │
    ├── components/
    │   ├── ui/                     ← atoms: button, card, input, chip, status-badge, progress
    │   ├── layout/                 ← nav, footer, admin-shell
    │   ├── logo.jsx
    │   ├── ide-frame.jsx           ← IDE-style window chrome (motif chính)
    │   ├── course-thumb.jsx        ← gradient + glyph thumbnail
    │   └── course-card.jsx
    │
    └── pages/
        ├── public/                 home · course-listing · course-detail · login · cart · payment-result
        ├── user/                   lesson-player · my-learning · profile · my-orders · transactions
        └── admin/                  dashboard · courses · users · orders · reviews · categories
```

---

## Roles & routing

| Role | Truy cập |
|---|---|
| `guest`     | `/`, `/courses`, `/courses/:id`, `/login`, `/register`, `/cart`, `/payment/*` |
| `user`      | tất cả của guest + `/me/*`, `/learn/:courseId/:lessonId` |
| `admin`     | tất cả + `/admin/*` |

Guards trong `router.jsx`: `RequireAuth` và `RequireAdmin`. Redirect sang `/login` hoặc `/` khi không đủ quyền.

Để test admin: login với email chứa "admin" (xem `store/auth.js`).

---

## Design tokens — cách dùng

Trong `index.css`, tokens được khai báo dưới dạng RGB triplets:

```css
html.dark  { --bg: 11 15 25; --ink: 244 245 249; --accent: 247 223 30; }
html:not(.dark) { --bg: 248 250 252; --ink: 11 15 25; --accent: 79 70 229; }
```

`tailwind.config.js` đã wire các tokens này thành classes:

```jsx
<div className="bg-bg-1 text-ink-2 border border-line">
  <h2 className="text-accent">Hoisted()</h2>
</div>
```

Khi cần opacity dùng cú pháp Tailwind:
```jsx
<div className="bg-accent/10 text-accent/80" />
```

---

## Trạng thái implementation

✅ **Hoàn chỉnh**: Vite config, Tailwind config, design tokens, layout, router, guards, stores, atoms, course card, IDE frame, **Homepage**.

🚧 **Stub** (16 trang): có file + comment hướng dẫn, nội dung markup copy từ `Hoisted.html`.
Mỗi stub đã có route hoạt động, gradient placeholder và link "← về trang chủ" để verify navigation.

**Để hoàn thiện 1 page**:
1. Mở `Hoisted.html` trong project root, focus vào artboard tương ứng
2. Đọc markup trong `pages-*.jsx` (project root, không phải `hoisted-react/src/`)
3. Copy markup vào file `.jsx` đúng vị trí
4. Refactor: inline style → Tailwind classes (xem mapping ở dưới)
5. Wire state vào stores hoặc React Query

---

## Mapping inline style ↔ Tailwind

| Design file (`Hoisted.html`) | Production (`hoisted-react`) |
|---|---|
| `className="hd-card"`         | `className="card"` |
| `className="hd-btn hd-btn-primary"` | `<Button>...` |
| `style={{ color: 'var(--ink-2)' }}` | `className="text-ink-2"` |
| `style={{ font: '700 22px var(--font-mono)' }}` | `className="font-mono font-bold text-[22px]"` |
| `className="hd-eyebrow"`      | `className="eyebrow"` (defined in `index.css`) |
| `className="hd-ide"`          | `<IdeFrame>` component |

---

## TODO trước khi đi production

- [ ] Backend API integration — thay `src/data/*.js` bằng React Query
- [ ] Axios interceptor (auth token, refresh, error toast)
- [ ] Lesson player: react-player + progress sync (debounce postMessage)
- [ ] Code playground tab: embed CodeSandbox/Sandpack
- [ ] Admin charts: hoán đổi placeholder SVG bằng Recharts
- [ ] Drag-reorder admin/categories + admin/courses curriculum: cài `@dnd-kit/core`
- [ ] Skeleton states cho list (xem `react-loading-skeleton`)
- [ ] Error boundary + 404 page (hiện tại redirect about /)
- [ ] i18n: i18next nếu cần đa ngôn ngữ
- [ ] Lighthouse pass (lazy-load, code-split admin routes)

---

## Vibe / brand check

- **Logo**: `Hoisted()` — chữ thường, dấu ngoặc đơn như function call, mũi tên hoist lên ở icon.
- **Font system**: Inter Tight (display + body) + JetBrains Mono (code, eyebrows, labels).
- **Palette**: deep ink `#0B0F19` background · JS yellow `#F7DF1E` accent (dark) · indigo `#4F46E5` (light) · `#34D399` success · `#F43F5E` danger.
- **Motif**: IDE chrome (3 dots + filename tab) xuất hiện ở hero, login, lesson player.
- **Eyebrow comments**: `// section name` style — gắn vào mọi heading nhỏ để giữ vibe coder.
