import { Link, useLocation } from 'react-router-dom';
import { Seo } from '@/components/seo.jsx';
import { Button } from '@/components/ui/button.jsx';

/* Trang 404 thật — trước đây mọi đường dẫn lạ bị chuyển về trang chủ (soft-404, công cụ tìm kiếm coi là nội dung trùng) */
export default function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <div className="relative overflow-hidden">
      <Seo title="Không tìm thấy trang — Hoisted" description="Đường dẫn này không tồn tại trên Hoisted." />
      <div className="relative max-w-xl mx-auto px-6 py-24 sm:py-32 text-center">
        <p className="font-mono text-[13px] text-ink-3 mb-6 break-all">
          <span className="text-danger">ReferenceError:</span> {pathname} is not defined
        </p>
        <h1 className="display text-[34px] sm:text-[44px] mb-4">Trang này chưa được khai báo</h1>
        <p className="text-ink-2 text-[15px] leading-[1.7] mb-8">
          Đường dẫn có thể đã đổi hoặc gõ nhầm. Khóa học và tài khoản của bạn vẫn ở nguyên chỗ cũ.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/courses"><Button size="lg">Xem khóa học</Button></Link>
          <Link to="/"><Button size="lg" variant="ghost">Về trang chủ</Button></Link>
        </div>
      </div>
    </div>
  );
}
