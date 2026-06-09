require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const adminRoutes          = require('./routes/admin');
const authRoutes           = require('./routes/auth');
const userRoutes           = require('./routes/user');
const courseRoutes         = require('./routes/courses');
const reviewRoutes         = require('./routes/reviews');
const lessonRoutes         = require('./routes/lessons');
const lessonProgressRoutes = require('./routes/lessonProgress');
const orderRoutes          = require('./routes/orders');
const enrollmentRoutes     = require('./routes/enrollments');
const { authMiddleware }   = require('./middleware/auth');
const { myTransactions }   = require('./controllers/orderController');
const { createSiteReview } = require('./controllers/reviewController');
const homeController       = require('./controllers/homeController');

const app = express();

app.use(cors({
  origin: process.env.FE_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.get('/api/home',                                     homeController.home);
app.use('/api/admin',           adminRoutes);
app.use('/api/auth',            authRoutes);
app.use('/api/user',            userRoutes);
app.use('/api/courses',         reviewRoutes);   // /:id/reviews* — before /:slug catch-all
app.use('/api/courses',         courseRoutes);
app.use('/api/lessons',         lessonRoutes);
app.use('/api/lesson-progress', lessonProgressRoutes);
app.use('/api/orders',          orderRoutes);
app.use('/api/enrollments',     enrollmentRoutes);
app.get('/api/transactions/me', authMiddleware, myTransactions);
app.post('/api/site-reviews',   authMiddleware, createSiteReview);

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date() }));

module.exports = app;
