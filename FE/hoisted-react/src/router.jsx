import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Nav } from './components/layout/nav.jsx';
import { Footer } from './components/layout/footer.jsx';
import { AdminLayout } from './components/layout/admin-layout.jsx';
import { useAuth } from './store/auth';

// Public
import HomePage           from './pages/public/home.jsx';
import CourseListingPage  from './pages/public/course-listing.jsx';
import CourseDetailPage   from './pages/public/course-detail.jsx';
import LoginPage           from './pages/public/login.jsx';
import RegisterPage        from './pages/public/register.jsx';
import ForgotPasswordPage  from './pages/public/forgot-password.jsx';
import ResetPasswordPage   from './pages/public/reset-password.jsx';
import CartPage               from './pages/public/cart.jsx';
import PaymentPendingPage     from './pages/public/payment-pending.jsx';
import PaymentResultPage      from './pages/public/payment-result.jsx';

// User
import LessonPlayerPage      from './pages/user/lesson-player.jsx';
import MyLearningPage        from './pages/user/my-learning.jsx';
import ProfileSettingsPage   from './pages/user/profile.jsx';
import MyOrdersPage          from './pages/user/my-orders.jsx';
import TransactionsPage      from './pages/user/transactions.jsx';
import WishlistPage          from './pages/user/wishlist.jsx';

// Admin
import AdminDashboardPage    from './pages/admin/dashboard.jsx';
import AdminCoursesPage      from './pages/admin/courses.jsx';
import AdminUsersPage        from './pages/admin/users.jsx';
import AdminOrdersPage       from './pages/admin/orders.jsx';
import AdminReviewsPage      from './pages/admin/reviews.jsx';
import AdminCategoriesPage   from './pages/admin/categories.jsx';

/* ── Layout shells ────────────────────────────────────────────── */
function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="flex-1"><Outlet /></div>
      <Footer />
    </div>
  );
}

/* Lesson player is full-bleed — no main nav/footer */
function BareLayout() {
  return <Outlet />;
}

/* ── Route guards ─────────────────────────────────────────────── */
function RequireAuth({ children }) {
  const { role } = useAuth();
  if (role === 'guest') return <Navigate to="/login" replace />;
  return children;
}
function RequireAdmin({ children }) {
  const { role } = useAuth();
  if (role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

/* ── Router tree ──────────────────────────────────────────────── */
export function Router() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/"                   element={<HomePage />} />
        <Route path="/courses"            element={<CourseListingPage />} />
        <Route path="/courses/:slug"       element={<CourseDetailPage />} />
        <Route path="/cart"               element={<CartPage />} />
        <Route path="/payment/pending/:orderId" element={<RequireAuth><PaymentPendingPage /></RequireAuth>} />
        <Route path="/payment/result"     element={<PaymentResultPage />} />

        {/* user */}
        <Route path="/me"                 element={<RequireAuth><MyLearningPage /></RequireAuth>} />
        <Route path="/me/profile"         element={<RequireAuth><ProfileSettingsPage /></RequireAuth>} />
        <Route path="/me/orders"          element={<RequireAuth><MyOrdersPage /></RequireAuth>} />
        <Route path="/me/transactions"    element={<RequireAuth><TransactionsPage /></RequireAuth>} />
        <Route path="/me/wishlist"        element={<RequireAuth><WishlistPage /></RequireAuth>} />
      </Route>

      <Route element={<BareLayout />}>
        <Route path="/login"              element={<LoginPage />} />
        <Route path="/register"           element={<RegisterPage />} />
        <Route path="/forgot-password"    element={<ForgotPasswordPage />} />
        <Route path="/reset-password"     element={<ResetPasswordPage />} />
        <Route path="/learn/:courseId/:lessonId"
                                          element={<RequireAuth><LessonPlayerPage /></RequireAuth>} />

      </Route>

      {/* Admin — own layout with sidebar */}
      <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route path="/admin"              element={<AdminDashboardPage />} />
        <Route path="/admin/courses"      element={<AdminCoursesPage />} />
        <Route path="/admin/users"        element={<AdminUsersPage />} />
        <Route path="/admin/orders"       element={<AdminOrdersPage />} />
        <Route path="/admin/reviews"      element={<AdminReviewsPage />} />
        <Route path="/admin/categories"   element={<AdminCategoriesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
