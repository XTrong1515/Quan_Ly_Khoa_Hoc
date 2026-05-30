import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/logo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useAuth } from '@/store/auth';
import { apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Nhập mật khẩu'),
  remember: z.boolean().optional(),
});

const HIGHLIGHTS = [
  '6 khóa miễn phí · không cần thẻ tín dụng',
  'Lưu tiến độ & ghi chú trên mọi thiết bị',
  'Cộng đồng 3,200+ dev đang học cùng bạn',
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuth((s) => s.login);
  const [showPw, setShowPw] = useState(false);

  const from = location.state?.from?.pathname || '/me';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { remember: false },
  });

  const remember = watch('remember');

  const onSubmit = async (data) => {
    try {
      await login({ email: data.email, password: data.password });
      toast.success('Chào mừng trở lại!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(apiMessage(err, 'Email hoặc mật khẩu không đúng'));
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.05fr]">
      {/* ── Left: marketing ──────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col p-12 border-r border-line relative"
        style={{ background: 'linear-gradient(180deg, #0F1525 0%, #0B0F19 100%)' }}
      >
        <Logo size={18} />
        <div className="flex-1 flex flex-col justify-center max-w-[460px]">
          <p className="eyebrow text-accent mb-3.5">// welcome back, dev</p>
          <h1 className="display text-[40px] mb-4">
            Tiếp tục hành trình,<br />
            <span className="text-accent">nơi bạn dừng lại.</span>
          </h1>
          <p className="text-ink-2 text-[15px] leading-[1.55] mb-8">
            Toàn bộ tiến độ, ghi chú và khóa học đang chờ bạn quay lại.
          </p>

          <div className="flex flex-col gap-3 mb-10">
            {HIGHLIGHTS.map((t) => (
              <div key={t} className="flex items-center gap-3 text-sm text-ink-2">
                <span className="w-[22px] h-[22px] rounded-full shrink-0 grid place-items-center bg-accent/15 text-accent">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                {t}
              </div>
            ))}
          </div>

          <blockquote className="border-l-2 border-accent pl-4">
            <p className="text-ink-2 text-[14px] italic leading-relaxed mb-2">
              &ldquo;Hoisted là nơi duy nhất tôi thực sự hiểu Event Loop sau 2 năm copy–paste.&rdquo;
            </p>
            <footer className="font-mono text-[11.5px] text-ink-3">
              — Nguyễn Minh Tuấn · Frontend Dev @Tiki
            </footer>
          </blockquote>
        </div>
        <p className="font-mono text-[11.5px] text-ink-3">
          🔒 Dữ liệu mã hóa · không spam · hủy bất cứ lúc nào
        </p>
      </div>

      {/* ── Right: form ─────────────────────────────────────────── */}
      <div className="flex flex-col p-8 lg:px-16 lg:py-10">
        <div className="self-end flex items-center gap-2.5 text-[13px] text-ink-3">
          Chưa có tài khoản?
          <Link to="/register" className="text-ink font-semibold">Đăng ký →</Link>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 flex flex-col justify-center max-w-[400px] self-center w-full py-6"
        >
          <h2 className="display text-[28px] mb-2">Đăng nhập</h2>
          <p className="text-ink-3 text-[13.5px] mb-6">Vào ngay — khóa học đang chờ bạn.</p>

          {/* Social */}
          <div className="flex gap-2 mb-[18px]">
            <Button type="button" variant="ghost" className="flex-1 justify-center">⌥ GitHub</Button>
            <Button type="button" variant="ghost" className="flex-1 justify-center">G Google</Button>
          </div>

          <div className="flex items-center gap-3 mb-[18px] text-ink-3 text-[11.5px] font-mono">
            <div className="flex-1 h-px bg-line" />
            hoặc đăng nhập bằng email
            <div className="flex-1 h-px bg-line" />
          </div>

          <div className="flex flex-col gap-3.5">
            {/* Email */}
            <FormField label="Email" error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                className="input h-[42px] text-sm"
                placeholder="hoisted@dev.com"
                autoComplete="email"
              />
            </FormField>

            {/* Password */}
            <FormField
              label="Mật khẩu"
              trailing={
                <Link to="/forgot-password" className="font-mono text-xs text-accent">
                  Quên mật khẩu?
                </Link>
              }
              error={errors.password?.message}
            >
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  className="input h-[42px] text-sm pr-10 font-mono"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-2 w-7 h-[26px] grid place-items-center text-ink-3 hover:text-ink"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2.5 my-[18px] text-[12.5px] text-ink-2 cursor-pointer select-none">
            <input {...register('remember')} type="checkbox" className="sr-only" />
            <span className={cn(
              'w-[18px] h-[18px] rounded shrink-0 grid place-items-center text-accent-ink',
              remember ? 'bg-accent' : 'border border-line',
            )}>
              {remember && <Check className="w-3 h-3" strokeWidth={3.5} />}
            </span>
            Ghi nhớ đăng nhập
          </label>

          <Button type="submit" size="lg" disabled={isSubmitting} className="justify-center">
            {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập →'}
          </Button>

          <p className="mt-5 font-mono text-[11.5px] text-ink-3 text-center">
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
function FormField({ label, trailing, error, children }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="font-mono text-[12.5px] font-medium text-ink-2">{label}</label>
        {trailing}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-danger font-mono">{error}</p>}
    </div>
  );
}
