import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/logo.jsx';
import { Seo } from '@/components/seo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useAuth } from '@/store/auth';
import { api, apiMessage } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Nhập mật khẩu'),
});

function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => api.get('/api/stats').then(r => r.data),
    staleTime: 5 * 60_000,
  });
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuth((s) => s.login);
  const [showPw, setShowPw] = useState(false);
  const { data: platformStats } = usePlatformStats();

  // Trang cần quay lại (bị chặn vì chưa đăng nhập) — không có thì về trang chính theo vai trò
  const from = location.state?.from?.pathname;
  const ROLE_HOME = { admin: '/admin', instructor: '/instructor' };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const user = await login({ email: data.email, password: data.password });
      toast.success('Chào mừng trở lại!');
      navigate(from || ROLE_HOME[String(user?.role ?? '').toLowerCase()] || '/me', { replace: true });
    } catch (err) {
      toast.error(apiMessage(err, 'Không đăng nhập được. Thử lại sau giây lát.'));
    }
  };

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <Seo title="Đăng nhập — Hoisted" />

      {/* ── Left: brand panel (always dark, like an editor) ──────── */}
      <div className="hidden lg:flex flex-col p-12 relative overflow-hidden bg-navy text-white border-r-2 border-black">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(rgb(255 255 255 / 0.16) 1.2px, transparent 1.5px)',
            backgroundSize: '18px 18px',
            maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 80%, transparent)',
          }}
        />

        <div className="relative">
          <Logo size={18} onDark />
        </div>

        <div className="relative flex-1 flex flex-col justify-center max-w-[480px]">
          <h1 className="display text-[36px] leading-[1.12] mb-3 text-white">
            Tiếp tục hành trình,<br />
            <span className="text-js">nơi bạn dừng lại.</span>
          </h1>
          <p className="text-[#B6BCD0] text-[14.5px] leading-[1.6] mb-8">
            Tiến độ, bài tập đã nộp và khóa học của bạn vẫn ở nguyên chỗ cũ.
          </p>

          {/* Terminal: session restore */}
          <div className="rounded border-2 border-black bg-[#081230] font-mono text-[12.5px] leading-[2] overflow-hidden mb-8 shadow-[6px_6px_0_0_#FFCF33]">
            <div className="flex items-center gap-2 px-4 h-9 bg-[#F2542D] border-b-2  text-navy">
              <span className="w-2.5 h-2.5 bg-black" aria-hidden="true" />
              <span className="w-2.5 h-2.5 bg-[#FFCF33] border-2 border-black" aria-hidden="true" />
              <span className="w-2.5 h-2.5 bg-white border-2 border-black" aria-hidden="true" />
              <span className="ml-2 text-[11px] font-bold text-navy">phiên-học — hoisted</span>
            </div>
            <div className="px-5 py-4 text-slate-300" aria-hidden="true">
              <p><span className="text-js">$</span> hoisted resume</p>
              <p className="text-slate-400">→ Khôi phục phiên học của bạn…</p>
              <p><span className="text-emerald-400">✓</span> Tiến độ các khóa học: đã đồng bộ</p>
              <p><span className="text-emerald-400">✓</span> Bài tập đã nộp: đã đồng bộ</p>
              <p>
                <span className="text-emerald-400">✓</span> Sẵn sàng. Học tiếp thôi
                <span className="inline-block w-[7px] h-[13px] align-middle ml-1 bg-slate-300 animate-caret" />
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Chỉ hiện số thật từ /api/stats — chưa tải được thì không hiện */}
            {(platformStats ? [
              Number(platformStats.freeCourses) > 0
                ? `${Number(platformStats.freeCourses).toLocaleString('vi-VN')} khóa học miễn phí · đăng ký không cần thẻ`
                : 'Đăng ký miễn phí, không cần thẻ thanh toán',
              `${Number(platformStats.totalUsers).toLocaleString('vi-VN')} tài khoản đã đăng ký trên Hoisted`,
            ] : []).map((t) => (
              <div key={t} className="flex items-center gap-3 text-sm text-[#B6BCD0]">
                <span className="w-[22px] h-[22px] rounded-sm border-2 border-black shrink-0 grid place-items-center bg-[#FFCF33] text-navy">
                  <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>

        <p className="relative flex items-center gap-2 font-mono text-[11.5px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Mật khẩu được lưu dạng băm (bcrypt) · không gửi email quảng cáo
        </p>
      </div>

      {/* ── Right: form ─────────────────────────────────────────── */}
      <div className="relative flex flex-col p-6 sm:p-8 lg:px-16 lg:py-10 overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none opacity-50 lg:hidden" aria-hidden="true" />

        <div className="relative flex items-center justify-between">
          <span className="lg:hidden"><Logo size={16} /></span>
          <div className="ml-auto flex items-center gap-2.5 text-[13px] text-ink-3">
            Chưa có tài khoản?
            <Link to="/register" className="text-accent font-semibold hover:underline underline-offset-2">
              Đăng ký →
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="relative flex-1 flex flex-col justify-center max-w-[400px] self-center w-full py-8"
        >
          <p className="eyebrow mb-2">
            <span className="text-accent">~/hoisted</span> <span className="text-ink-3">/ đăng-nhập</span>
          </p>
          <h2 className="display text-[30px] mb-2">Đăng nhập</h2>
          <p className="text-ink-3 text-[13.5px] mb-7">Vào ngay — khóa học đang chờ bạn.</p>

          <div className="flex flex-col gap-4">
            <FormField label="Email" error={errors.email?.message} htmlFor="login-email">
              <input
                id="login-email"
                {...register('email')}
                type="email"
                className="input h-[44px] text-sm rounded-xl"
                placeholder="hoisted@dev.com"
                autoComplete="email"
              />
            </FormField>

            <FormField
              label="Mật khẩu"
              htmlFor="login-password"
              trailing={
                <Link to="/forgot-password" className="font-mono text-xs text-accent hover:underline underline-offset-2">
                  Quên mật khẩu?
                </Link>
              }
              error={errors.password?.message}
            >
              <div className="relative">
                <input
                  id="login-password"
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  className="input h-[44px] text-sm pr-11 font-mono rounded-xl"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg grid place-items-center text-ink-3 hover:text-ink hover:bg-bg-2 transition-colors cursor-pointer"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>
          </div>

          {/* Phiên luôn được giữ (refresh token 30 ngày) — bỏ ô "Ghi nhớ đăng nhập" vì nó không có tác dụng */}
          <div className="my-5" />

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="justify-center shadow"
          >
            {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập →'}
          </Button>

          <p className="mt-6 font-mono text-[11.5px] text-ink-3 text-center">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-accent underline underline-offset-2">
              Tạo miễn phí →
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */
function FormField({ label, htmlFor, trailing, error, children }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label htmlFor={htmlFor} className="font-mono text-[12.5px] font-medium text-ink-2">{label}</label>
        {trailing}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs text-danger font-mono" role="alert">{error}</p>}
    </div>
  );
}
