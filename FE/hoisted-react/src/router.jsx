import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Nav } from './components/layout/nav.jsx';
import { Footer } from './components/layout/footer.jsx';
import { AdminLayout, InstructorLayout } from './components/layout/admin-layout.jsx';
import { useAuth } from './store/auth';
import { PageFallback } from './components/page-fallback.jsx';

// Trang chủ / danh sách / chi tiết khóa học tải ngay; các trang khác (học, admin, giảng viên…) tách chunk riêng

// Public
import HomePage           from './pages/public/home.jsx';
import CourseListingPage  from './pages/public/course-listing.jsx';
import CourseDetailPage   from './pages/public/course-detail.jsx';
const LoginPage = lazy(() => import('./pages/public/login.jsx'));
const RegisterPage = lazy(() => import('./pages/public/register.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/public/forgot-password.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/public/reset-password.jsx'));
const CartPage = lazy(() => import('./pages/public/cart.jsx'));
const PaymentPendingPage = lazy(() => import('./pages/public/payment-pending.jsx'));
const PaymentResultPage = lazy(() => import('./pages/public/payment-result.jsx'));
const BecomeInstructorPage = lazy(() => import('./pages/public/become-instructor.jsx'));

// User
const LessonPlayerPage = lazy(() => import('./pages/user/lesson-player.jsx'));
const MyLearningPage = lazy(() => import('./pages/user/my-learning.jsx'));
const ProfileSettingsPage = lazy(() => import('./pages/user/profile.jsx'));
const MyOrdersPage = lazy(() => import('./pages/user/my-orders.jsx'));
const TransactionsPage = lazy(() => import('./pages/user/transactions.jsx'));
const WishlistPage = lazy(() => import('./pages/user/wishlist.jsx'));
const AssistantPage = lazy(() => import('./pages/user/assistant.jsx'));
import { ChatWidget }        from './components/ai/chat-widget.jsx';

// Admin
const AdminDashboardPage = lazy(() => import('./pages/admin/dashboard.jsx'));
const AdminCoursesPage = lazy(() => import('./pages/admin/courses.jsx'));
const AdminUsersPage = lazy(() => import('./pages/admin/users.jsx'));
const AdminOrdersPage = lazy(() => import('./pages/admin/orders.jsx'));
const AdminReviewsPage = lazy(() => import('./pages/admin/reviews.jsx'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/categories.jsx'));
const AdminPayoutsPage = lazy(() => import('./pages/admin/payouts.jsx'));
const AdminInstructorApplicationsPage = lazy(() => import('./pages/admin/instructor-applications.jsx'));

// Instructor
const InstructorDashboardPage = lazy(() => import('./pages/instructor/dashboard.jsx'));
const InstructorCoursesPage = lazy(() => import('./pages/instructor/courses.jsx'));
const InstructorRevenuePage = lazy(() => import('./pages/instructor/revenue.jsx'));
const InstructorProfilePage = lazy(() => import('./pages/instructor/profile.jsx'));

/* ── Layout shells ────────────────────────────────────────────── */
function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="flex-1"><Suspense fallback={<PageFallback />}><Outlet /></Suspense></div>
      <Footer />
      <ChatWidget />
    </div>
  );
}

/* Lesson player is full-bleed — no main nav/footer */
function BareLayout() {
  return <Suspense fallback={<PageFallback />}><Outlet /></Suspense>;
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
function RequireInstructor({ children }) {
  const { role } = useAuth();
  if (role === 'guest') return <Navigate to="/login" replace />;
  if (role !== 'instructor') return <Navigate to="/" replace />;
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
        <Route path="/become-instructor"  element={<BecomeInstructorPage />} />

        {/* user */}
        <Route path="/me"                 element={<RequireAuth><MyLearningPage /></RequireAuth>} />
        <Route path="/me/profile"         element={<RequireAuth><ProfileSettingsPage /></RequireAuth>} />
        <Route path="/me/orders"          element={<RequireAuth><MyOrdersPage /></RequireAuth>} />
        <Route path="/me/transactions"    element={<RequireAuth><TransactionsPage /></RequireAuth>} />
        <Route path="/me/wishlist"        element={<RequireAuth><WishlistPage /></RequireAuth>} />
        <Route path="/assistant"          element={<RequireAuth><AssistantPage /></RequireAuth>} />
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
        <Route path="/admin/payouts"      element={<AdminPayoutsPage />} />
        <Route path="/admin/instructor-applications" element={<AdminInstructorApplicationsPage />} />
      </Route>

      {/* Instructor — cùng layout console, menu riêng */}
      <Route element={<RequireInstructor><InstructorLayout /></RequireInstructor>}>
        <Route path="/instructor"         element={<InstructorDashboardPage />} />
        <Route path="/instructor/courses" element={<InstructorCoursesPage />} />
        <Route path="/instructor/revenue" element={<InstructorRevenuePage />} />
        <Route path="/instructor/profile" element={<InstructorProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
