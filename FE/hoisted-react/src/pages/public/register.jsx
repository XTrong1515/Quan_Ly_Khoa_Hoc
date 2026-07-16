import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Eye, EyeOff, ShieldCheck, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/logo.jsx';
import { Seo } from '@/components/seo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useAuth } from '@/store/auth';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ── Validation schema (Zod) ─────────────────────────────────── */
const schema = z
  .object({
    name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    password: z
      .string()
      .min(8, 'Tối thiểu 8 ký tự')
      .regex(/[A-Z]/, 'Cần ít nhất 1 chữ HOA')
      .regex(/[0-9]/, 'Cần ít nhất 1 số')
      .regex(/[^A-Za-z0-9]/, 'Cần ít nhất 1 ký tự đặc biệt'),
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: 'Bạn cần đồng ý điều khoản' }) }),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'Mật khẩu không khớp',
  });

/* ── Password strength helper ────────────────────────────────── */
function strengthOf(pw = '') {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH_LABEL = ['Quá yếu', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];
const STRENGTH_COLOR = ['text-danger', 'text-danger', 'text-warn', 'text-js', 'text-success'];
const STRENGTH_BAR = ['bg-danger', 'bg-danger', 'bg-warn', 'bg-js', 'bg-success'];

const REQS = [
  { label: '≥ 8 ký tự', test: (pw) => pw.length >= 8 },
  { label: '1 chữ HOA', test: (pw) => /[A-Z]/.test(pw) },
  { label: '1 số', test: (pw) => /[0-9]/.test(pw) },
  { label: '1 ký tự đặc biệt', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => api.get('/api/stats').then(r => r.data),
    staleTime: 5 * 60_000,
  });
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const register_action = useAuth((s) => s.register);
  const [showPw, setShowPw] = useState(false);
  const { data: platformStats } = usePlatformStats();

  const {
    register, handleSubmit, watch, formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { terms: false },
    mode: 'onChange',
  });

  const pw = watch('password') || '';
  const email = watch('email') || '';
  const confirm = watch('confirm') || '';
  const terms = watch('terms');
  const score = strengthOf(pw);
  const emailValid = !errors.email && email.length > 0;
  const matchValid = confirm.length > 0 && pw === confirm;

  const onSubmit = async (data) => {
    try {
      await register_action({ name: data.name, email: data.email, password: data.password });
      toast.success('Đăng ký thành công! Chào mừng bạn đến với Hoisted.');
      navigate('/me');
    } catch (err) {
      toast.error(apiMessage(err, 'Đăng ký thất bại, vui lòng thử lại'));
    }
  };

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <Seo title="Tạo tài khoản miễn phí — Hoisted" />

      {/* ── Left: brand panel (always dark, like an editor) ──────── */}
      <div className="hidden lg:flex flex-col p-12 relative overflow-hidden bg-[#0B0F19] text-[#F4F5F9]">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 80%, transparent)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 55% 50% at 20% 10%, rgb(247 223 30 / .10) 0%, transparent 60%), radial-gradient(ellipse 45% 45% at 90% 95%, rgb(99 102 241 / .12) 0%, transparent 60%)',
          }}
        />

        <div className="relative">
          <Logo size={18} />
        </div>

        <div className="relative flex-1 flex flex-col justify-center max-w-[480px]">
          <h1 className="display text-[36px] leading-[1.12] mb-3 text-[#F4F5F9]">
            Khởi tạo tài khoản,<br />
            <span className="text-js">hoist</span> sự nghiệp lên.
          </h1>
          <p className="text-[#B6BCD0] text-[14.5px] leading-[1.6] mb-8">
            Miễn phí mãi mãi cho {platformStats?.freeCourses ?? 6}+ khóa vanilla JS.
            Nâng cấp khi bạn sẵn sàng đi sâu hơn.
          </p>

          {/* Terminal: account scaffold */}
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur font-mono text-[12.5px] leading-[2] overflow-hidden mb-8 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 px-4 h-9 bg-white/[0.04] border-b border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" aria-hidden="true" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" aria-hidden="true" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" aria-hidden="true" />
              <span className="ml-2 text-[10.5px] text-slate-500">tài-khoản-mới — hoisted</span>
            </div>
            <div className="px-5 py-4 text-slate-300" aria-hidden="true">
              <p><span className="text-js">$</span> npx create-hoisted-account</p>
              <p><span className="text-emerald-400">✓</span> {platformStats?.freeCourses ?? 6} khóa miễn phí: đã mở khóa</p>
              <p><span className="text-emerald-400">✓</span> Coupon −30% khóa đầu tiên: đã thêm</p>
              <p><span className="text-emerald-400">✓</span> PDF Event Loop deep-dive: đã tặng</p>
              <p>
                <span className="text-sky-300">?</span> Bắt đầu từ đâu → <span className="text-js">JavaScript Core</span>
                <span className="inline-block w-[7px] h-[13px] align-middle ml-1 bg-slate-300 animate-caret" />
              </p>
            </div>
          </div>

          {/* Social proof from real stats */}
          <div className="flex items-center gap-3.5">
            <div className="flex" aria-hidden="true">
              {['#F7DF1E', '#6366F1', '#34D399', '#F472B6', '#FB923C'].map((c, i) => (
                <div key={i}
                  className="w-8 h-8 rounded-full grid place-items-center font-mono font-bold text-[11px] text-[#0B0F19] border-2 border-[#0B0F19]"
                  style={{ background: `linear-gradient(135deg, ${c}, #1a1f3a)`, marginLeft: i ? -10 : 0 }}>
                  {'ANKPTM'[i]}
                </div>
              ))}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[#F4F5F9]">
                +{(platformStats?.newUsersThisWeek ?? 0).toLocaleString('vi-VN')} dev tham gia tuần này
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11.5px] text-slate-400 mt-0.5">
                <span className="flex gap-0.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn('w-3 h-3', s <= Math.round(platformStats?.avgRating ?? 5) ? 'fill-js text-js' : 'text-slate-600')}
                    />
                  ))}
                </span>
                {(platformStats?.avgRating ?? 0).toFixed(1)} từ {(platformStats?.totalReviews ?? 0).toLocaleString('vi-VN')} đánh giá
              </div>
            </div>
          </div>
        </div>

        <p className="relative flex items-center gap-2 font-mono text-[11.5px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Dữ liệu mã hóa · không spam · hủy bất cứ lúc nào
        </p>
      </div>

      {/* ── Right: form ─────────────────────────────────────────── */}
      <div className="relative flex flex-col p-6 sm:p-8 lg:px-16 lg:py-10 overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none opacity-50 lg:hidden" aria-hidden="true" />

        <div className="relative flex items-center justify-between">
          <span className="lg:hidden"><Logo size={16} /></span>
          <div className="ml-auto flex items-center gap-2.5 text-[13px] text-ink-3">
            Đã có tài khoản?
            <Link to="/login" className="text-accent font-semibold hover:underline underline-offset-2">
              Đăng nhập →
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="relative flex-1 flex flex-col justify-center max-w-[400px] self-center w-full py-8"
        >
          <p className="eyebrow mb-2">
            <span className="text-accent">~/hoisted</span> <span className="text-ink-3">/ đăng-ký</span>
          </p>
          <h2 className="display text-[30px] mb-2">Tạo tài khoản</h2>
          <p className="text-ink-3 text-[13.5px] mb-7">Chỉ mất 30 giây. Không cần thẻ tín dụng.</p>

          <div className="flex flex-col gap-4">
            {/* Name */}
            <FormField label="Họ và tên" htmlFor="reg-name" error={errors.name?.message}>
              <input
                id="reg-name"
                {...register('name')}
                className="input h-[44px] text-sm rounded-xl"
                placeholder="Phạm Văn Khang"
                autoComplete="name"
              />
            </FormField>

            {/* Email */}
            <FormField label="Email" htmlFor="reg-email" error={errors.email?.message}
              hint={emailValid && <ValidHint>hợp lệ</ValidHint>}>
              <div className="relative">
                <input
                  id="reg-email"
                  {...register('email')}
                  type="email"
                  className={cn('input h-[44px] text-sm pr-9 rounded-xl', emailValid && 'border-success/40')}
                  placeholder="hoisted@dev.com"
                  autoComplete="email"
                />
                {emailValid && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" strokeWidth={2.5} aria-hidden="true" />}
              </div>
            </FormField>

            {/* Password + strength */}
            <FormField label="Mật khẩu" htmlFor="reg-password" error={errors.password?.message}
              hint={pw && <span className={cn('font-mono text-[11.5px]', STRENGTH_COLOR[score])}>{STRENGTH_LABEL[score]}</span>}>
              <div className="relative">
                <input
                  id="reg-password"
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  className="input h-[44px] text-sm pr-11 font-mono rounded-xl"
                  placeholder="••••••••"
                  autoComplete="new-password"
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
              {/* strength bars */}
              <div className="flex gap-1 mt-2" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={cn('flex-1 h-[3px] rounded-full transition-colors',
                    i < score ? STRENGTH_BAR[score] : 'bg-bg-3')} />
                ))}
              </div>
              {/* requirement chips */}
              <div className="flex flex-wrap gap-2.5 mt-2.5">
                {REQS.map((r) => {
                  const ok = r.test(pw);
                  return (
                    <span key={r.label} className={cn('flex items-center gap-1.5 font-mono text-[11px]',
                      ok ? 'text-success' : 'text-ink-3')}>
                      <span className={cn('w-[13px] h-[13px] rounded-full grid place-items-center text-[#0B0F19]',
                        ok ? 'bg-success' : 'border border-line')} aria-hidden="true">
                        {ok && <Check className="w-2 h-2" strokeWidth={4} />}
                      </span>
                      {r.label}
                    </span>
                  );
                })}
              </div>
            </FormField>

            {/* Confirm */}
            <FormField label="Xác nhận mật khẩu" htmlFor="reg-confirm" error={errors.confirm?.message}
              hint={matchValid && <ValidHint>khớp</ValidHint>}>
              <input
                id="reg-confirm"
                {...register('confirm')}
                type="password"
                className={cn('input h-[44px] text-sm rounded-xl', matchValid && 'border-success/40')}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </FormField>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 my-5 text-[12.5px] text-ink-2 leading-[1.5] cursor-pointer w-fit">
            <input {...register('terms')} type="checkbox" className="sr-only peer" />
            <span className={cn(
              'w-[18px] h-[18px] rounded-md shrink-0 mt-px grid place-items-center transition-colors',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60',
              terms ? 'bg-accent text-accent-ink' : 'border-2 border-ink-3 bg-bg-2',
            )}>
              {terms && <Check className="w-3 h-3" strokeWidth={3.5} aria-hidden="true" />}
            </span>
            <span>
              Tôi đồng ý với <a href="#" className="text-accent hover:underline underline-offset-2">Điều khoản dịch vụ</a> và{' '}
              <a href="#" className="text-accent hover:underline underline-offset-2">Chính sách bảo mật</a> của Hoisted.
            </span>
          </label>
          {errors.terms && <p className="-mt-2 mb-3 text-xs text-danger font-mono" role="alert">{errors.terms.message}</p>}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="justify-center shadow-[0_8px_24px_rgb(var(--accent)/0.3)]"
          >
            {isSubmitting ? 'Đang tạo…' : 'Tạo tài khoản →'}
          </Button>

          <p className="mt-6 font-mono text-[11.5px] text-ink-3 text-center">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-accent underline underline-offset-2">Đăng nhập →</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

/* ── Small helpers ───────────────────────────────────────────── */
function FormField({ label, htmlFor, hint, error, children }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label htmlFor={htmlFor} className="font-mono text-[12.5px] font-medium text-ink-2">{label}</label>
        {hint}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs text-danger font-mono" role="alert">{error}</p>}
    </div>
  );
}

function ValidHint({ children }) {
  return (
    <span className="font-mono text-[11.5px] text-success flex items-center gap-1">
      <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
      {children}
    </span>
  );
}
