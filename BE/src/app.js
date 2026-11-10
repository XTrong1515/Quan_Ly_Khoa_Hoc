require('dotenv').config();
require('./utils/express-async');
const path    = require('path');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const multer  = require('multer');

const adminRoutes          = require('./routes/admin');
const instructorRoutes     = require('./routes/instructor');
const aiRoutes             = require('./routes/ai');
const applicationRoutes    = require('./routes/applications');
const uploadRoutes         = require('./routes/upload');
const authRoutes           = require('./routes/auth');
const userRoutes           = require('./routes/user');
const courseRoutes         = require('./routes/courses');
const reviewRoutes         = require('./routes/reviews');
const lessonRoutes         = require('./routes/lessons');
const lessonProgressRoutes = require('./routes/lessonProgress');
const orderRoutes          = require('./routes/orders');
const enrollmentRoutes     = require('./routes/enrollments');
const quizRoutes           = require('./routes/quizzes');
const discussionRoutes     = require('./routes/discussions');
const wishlistRoutes       = require('./routes/wishlists');
const notificationRoutes   = require('./routes/notifications');
const { authMiddleware }   = require('./middleware/auth');
const { myTransactions }   = require('./controllers/orderController');
const { createSiteReview } = require('./controllers/reviewController');
const homeController       = require('./controllers/homeController');
const { platformStats }    = require('./controllers/statsController');

const app = express();

// Header bảo mật (X-Content-Type-Options, X-Frame-Options, HSTS, CSP…); ẩn "X-Powered-By: Express".
// CORP = cross-origin để FE (khác cổng) vẫn hiển thị ảnh trong /uploads.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: process.env.FE_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' })); // nội dung bài học (MEDIUMTEXT) có thể vượt mức mặc định 100 KB

// ?a=1&a=2 hoặc ?a[b]=1 làm req.query.a thành mảng / object → handler gọi .trim() sẽ lỗi. Luôn đưa về chuỗi.
app.use((req, _res, next) => {
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value !== 'string') req.query[key] = Array.isArray(value) && typeof value[0] === 'string' ? value[0] : '';
  }
  next();
});

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/home',                                     homeController.home);
app.get('/api/stats',                                    platformStats);
app.use('/api/admin/upload',    uploadRoutes);
app.use('/api/admin',           adminRoutes);
app.use('/api/instructor/upload', uploadRoutes);
app.use('/api/instructor',      instructorRoutes);
app.use('/api/auth',            authRoutes);
app.use('/api/user',            userRoutes);
app.use('/api/courses',         reviewRoutes);   // /:id/reviews* — before /:slug catch-all
app.use('/api/courses',         courseRoutes);
app.use('/api/lessons',         lessonRoutes);
app.use('/api/lesson-progress', lessonProgressRoutes);
app.use('/api/orders',          orderRoutes);
app.use('/api/enrollments',     enrollmentRoutes);
app.use('/api/quizzes',         quizRoutes);
app.use('/api/discussions',     discussionRoutes);
app.use('/api/wishlists',       wishlistRoutes);
app.use('/api/notifications',   notificationRoutes);
app.use('/api/ai',              aiRoutes);
app.use('/api/instructor-applications', applicationRoutes);
app.get('/api/transactions/me', authMiddleware, myTransactions);
app.post('/api/site-reviews',   authMiddleware, createSiteReview);

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date() }));

// Sitemap cho công cụ tìm kiếm — chỉ trang công khai và khóa đã xuất bản (robots.txt của FE trỏ về đây)
app.get('/sitemap.xml', async (_req, res) => {
  const pool = require('./config/db');
  const site = (process.env.FE_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
  const [courses] = await pool.query("SELECT slug, updated_at FROM courses WHERE status = 'PUBLISHED' ORDER BY id");
  const entry = (path, lastmod, priority) => `  <url><loc>${site}${path}</loc>${
    lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}<priority>${priority}</priority></url>`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entry('/', null, '1.0'),
    entry('/courses', null, '0.9'),
    entry('/become-instructor', null, '0.5'),
    ...courses.map((c) => entry(`/courses/${encodeURIComponent(c.slug)}`, c.updated_at, '0.8')),
    '</urlset>',
  ].join('\n');
  res.set({ 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
  return res.send(xml);
});

// eslint-disable-next-line no-unused-vars -- Express nhận diện error middleware qua đúng 4 tham số
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'File vượt quá dung lượng cho phép' : 'File tải lên không hợp lệ' });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Dữ liệu gửi lên quá lớn' });
  console.error('[unhandled]', req.method, req.originalUrl, err);
  return res.status(500).json({ message: 'Lỗi máy chủ' });
});

module.exports = app;
