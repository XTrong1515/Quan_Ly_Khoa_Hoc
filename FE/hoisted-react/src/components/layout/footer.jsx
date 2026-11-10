import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '../logo.jsx';
import { useAuth } from '@/store/auth';
import { api } from '@/lib/api';

const LEVELS = [
  ['BEGINNER', 'Khóa cơ bản'],
  ['INTERMEDIATE', 'Khóa trung cấp'],
  ['ADVANCED', 'Khóa nâng cao'],
];

function FooterColumn({ title, children }) {
  return (
    <nav aria-label={title}>
      <h2 className="font-display font-semibold text-[13px] text-ink mb-3.5">{title}</h2>
      <ul className="space-y-0.5 text-[13.5px] text-ink-2">{children}</ul>
    </nav>
  );
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="inline-block py-1 hover:text-accent transition-colors">{children}</Link>
    </li>
  );
}

/* Chỉ liên kết tới trang có thật. Cột "Chủ đề" lấy từ danh mục đang có khóa học (dùng chung cache với trang chủ). */
export function Footer() {
  const { role } = useAuth();
  const { data } = useQuery({
    queryKey: ['home'],
    queryFn: () => api.get('/api/home').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const categories = (data?.categories ?? []).filter((c) => Number(c.count) > 0).slice(0, 6);

  return (
    <footer className="border-t border-line bg-bg-1">
      <div className="px-5 sm:px-8 lg:px-16 py-12 grid gap-10 grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1 max-w-xs">
          <Logo />
          <p className="text-[13.5px] text-ink-2 leading-[1.7] mt-4">
            Học JavaScript từ bản chất: xem bài giảng, tự viết code và được chấm bằng test ngay trên trình duyệt.
          </p>
        </div>

        {categories.length > 0 && (
          <FooterColumn title="Chủ đề">
            {categories.map((c) => (
              <FooterLink key={c.slug} to={`/courses?category=${c.slug}`}>{c.name}</FooterLink>
            ))}
          </FooterColumn>
        )}

        <FooterColumn title="Khóa học">
          <FooterLink to="/courses">Tất cả khóa học</FooterLink>
          {LEVELS.map(([level, label]) => (
            <FooterLink key={level} to={`/courses?level=${level}`}>{label}</FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Hoisted">
          <FooterLink to="/assistant">Trợ lý AI</FooterLink>
          <FooterLink to="/become-instructor">Trở thành giảng viên</FooterLink>
          {role === 'guest' ? (
            <>
              <FooterLink to="/register">Tạo tài khoản</FooterLink>
              <FooterLink to="/login">Đăng nhập</FooterLink>
            </>
          ) : (
            <>
              <FooterLink to="/me">Học tập của tôi</FooterLink>
              <FooterLink to="/me/orders">Đơn hàng</FooterLink>
            </>
          )}
        </FooterColumn>
      </div>

      {/* pr-24: chừa chỗ cho nút trợ lý AI nổi ở góc phải */}
      <div className="pl-5 sm:pl-8 lg:pl-16 pr-24 py-5 border-t border-line flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12.5px] text-ink-3">
        <p>© {new Date().getFullYear()} Hoisted · Đồ án tốt nghiệp, Khoa CNTT — ĐH Tài nguyên và Môi trường TP.HCM</p>
        <p>Thanh toán qua VNPay</p>
      </div>
    </footer>
  );
}
