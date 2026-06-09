🔒 CROSS-CUTTING CONCERNS
Authentication & Authorization
JWT trong Authorization header: `Bearer <token>`
Middleware:
`requireAuth`: kiểm tra token hợp lệ
`requireAdmin`: requireAuth + role = 'ADMIN'
`requireEnrollment`: requireAuth + check user enrolled course chứa lesson đang request
Refresh token flow: khi access token hết hạn, gọi `POST /api/auth/refresh` với cookie
Validation
Frontend: Zod schema cho mọi form
Backend: express-validator hoặc Zod cho mọi endpoint nhận input
Error response chuẩn: `{ error: { code: string, message: string, field?: string } }`
Error handling
Global error middleware ở backend
Frontend: toast cho error 4xx, redirect login cho 401, error boundary cho crash UI
Security
Bcrypt password (salt 10)
Rate limit: login (5/15min), forgot-password (3/15min), general API (100/min)
Input sanitize: dùng express-mongo-sanitize, escape HTML trong reviews/description
CORS: chỉ allow frontend origin
Helmet.js cho HTTP security headers
SQL Injection: dùng ORM với parameterized query, không string concat
Responsive
Mobile-first, breakpoints Tailwind chuẩn: sm(640), md(768), lg(1024), xl(1280)
Test trên iPhone 12 (390px), iPad (768px), desktop (1440px)
Loading & Empty States
Skeleton loader cho list pages
Spinner cho action button khi loading
Empty state với illustration friendly khi: cart rỗng, my learning rỗng, không có search result, không có review
Performance
React Query cache 5 phút cho list endpoints
Lazy load route + image (loading="lazy")
Debounce 500ms cho search input
Compress images qua Cloudinary auto-format
---
📊 DATABASE SCHEMA SUMMARY
11 bảng chính:
`users` (id, email UK, password_hash, full_name, avatar_url, phone, role ENUM, status ENUM, timestamps)
`password\\\_resets` (id, user_id FK, token UK, expires_at, used)
`categories` (id, name, slug UK, description, icon_url)
`courses` (id, category_id FK, title, slug UK, description, price, original_price, level ENUM, instructor_name, what_you_learn JSON, requirements JSON, total_lessons, total_duration_minutes, status ENUM, timestamps)
`lessons` (id, course_id FK, title, video_url, content, duration_minutes, order_index, is_preview, attachment_url)
`enrollments` (id, user_id FK, course_id FK, order_id FK, enrolled_at, progress_percent, completed_at) — UNIQUE(user_id, course_id)
`lesson\\\_progress` (id, enrollment_id FK, lesson_id FK, is_completed, last_watched_seconds, completed_at) — UNIQUE(enrollment_id, lesson_id)
`orders` (id, user_id FK, order_code UK, total_amount, status ENUM, payment_method, transaction_id, paid_at, created_at)
`order\\\_items` (id, order_id FK, course_id FK, price)
`reviews` (id, user_id FK, course_id FK, rating 1-5, comment, status ENUM, created_at) — UNIQUE(user_id, course_id)
`site\\\_reviews` (id, user_id FK, rating, comment, status ENUM, created_at)
---
🎨 DESIGN DIRECTION
Vibe: Modern edtech, professional, trustworthy với touch geeky cho dev
Color palette:
Accent: vàng JS `#F7DF1E` (dùng sparingly, không làm background lớn)
Brand primary: indigo `#4F46E5` hoặc deep blue `#1E293B`
Background: `#F8FAFC` / `#FFFFFF`
Success: `#10B981`, Error: `#EF4444`, Warning: `#F59E0B`
Typography:
Heading: Inter / Plus Jakarta Sans (700-800)
Body: Inter (400-500)
Code: JetBrains Mono / Fira Code
Component style: rounded-lg (8px), shadow-sm, hover lift translate-y-1, transition-all 200ms
---
📦 [OUTPUT MONG MUỐN]
> \\\*\\\*Phần này bạn customize tùy lần dùng. Một số mẫu sẵn:\\\*\\\*
Mẫu A — Generate code skeleton
```
Hãy generate cho tôi:
1. Sequelize models cho 11 bảng với relationships đầy đủ
2. Express route + controller skeleton cho TẤT CẢ API endpoints liệt kê ở trên
3. React Router setup với route guards (PublicRoute, PrivateRoute, AdminRoute)
4. Auth middleware (JWT verify, requireAdmin, requireEnrollment)
Output dạng code, có comment giải thích, sẵn sàng copy-paste vào project.
