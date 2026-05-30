import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Nav } from './components/layout/nav.jsx';
import { Footer } from './components/layout/footer.jsx';
import { useAuth } from './store/auth';

// Public
import HomePage           from './pages/public/home.jsx';
import CourseListingPage  from './pages/public/course-listing.jsx';
import CourseDetailPage   from './pages/public/course-detail.jsx';
import LoginPage          from './pages/public/login.jsx';
import RegisterPage       from './pages/public/register.jsx';
import CartPage           from './pages/public/cart.jsx';
import PaymentResultPage  from './pages/public/payment-result.jsx';

// User
import LessonPlayerPage      from './pages/user/lesson-player.jsx';
import MyLearningPage        from './pages/user/my-learning.jsx';
import ProfileSettingsPage   from './pages/user/profile.jsx';
import MyOrdersPage          from './pages/user/my-orders.jsx';
import TransactionsPage      from './pages/user/transactions.jsx';

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
        <Route path="/courses/:id"        element={<CourseDetailPage />} />
        <Route path="/cart"               element={<CartPage />} />
        <Route path="/payment/success"    element={<PaymentResultPage status="success" />} />
        <Route path="/payment/failed"     element={<PaymentResultPage status="failed" />} />

        {/* user */}
        <Route path="/me"                 element={<RequireAuth><MyLearningPage /></RequireAuth>} />
        <Route path="/me/profile"         element={<RequireAuth><ProfileSettingsPage /></RequireAuth>} />
        <Route path="/me/orders"          element={<RequireAuth><MyOrdersPage /></RequireAuth>} />
        <Route path="/me/transactions"    element={<RequireAuth><TransactionsPage /></RequireAuth>} />
      </Route>

      <Route element={<BareLayout />}>
        <Route path="/login"              element={<LoginPage />} />
        <Route path="/register"           element={<RegisterPage />} />
        <Route path="/learn/:courseId/:lessonId"
                                          element={<RequireAuth><LessonPlayerPage /></RequireAuth>} />

        {/* admin */}
        <Route path="/admin"              element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
        <Route path="/admin/courses"      element={<RequireAdmin><AdminCoursesPage /></RequireAdmin>} />
        <Route path="/admin/users"        element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
        <Route path="/admin/orders"       element={<RequireAdmin><AdminOrdersPage /></RequireAdmin>} />
        <Route path="/admin/reviews"      element={<RequireAdmin><AdminReviewsPage /></RequireAdmin>} />
        <Route path="/admin/categories"   element={<RequireAdmin><AdminCategoriesPage /></RequireAdmin>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
