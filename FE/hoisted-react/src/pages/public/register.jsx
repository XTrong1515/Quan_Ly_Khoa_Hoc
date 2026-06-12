import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/logo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useAuth } from '@/store/auth';
import { apiMessage } from '@/lib/api';
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

const BENEFITS = [
  'Truy cập ngay 6 khóa miễn phí',
  'Coupon 30% cho khóa trả phí đầu tiên',
  'Tài liệu Event Loop deep-dive PDF (62 trang)',
  'Lưu tiến độ & ghi chú trên mọi thiết bị',
];

const REQS = [
  { label: '≥ 8 ký tự', test: (pw) => pw.length >= 8 },
  { label: '1 chữ HOA', test: (pw) => /[A-Z]/.test(pw) },
  { label: '1 số', test: (pw) => /[0-9]/.test(pw) },
  { label: '1 ký tự đặc biệt', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const register_action = useAuth((s) => s.register);
  const [showPw, setShowPw] = useState(false);

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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.05fr]">
      {/* ── Left: marketing / social proof ──────────────────────── */}
      <div className="hidden lg:flex flex-col p-12 border-r border-line relative"
           style={{ background: 'linear-gradient(180deg, #0F1525 0%, #0B0F19 100%)' }}>
        <Logo size={18} />
        <div className="flex-1 flex flex-col justify-center max-w-[480px]">
          <p className="eyebrow text-accent mb-3.5">// new dev, who dis</p>
          <h1 className="display text-[40px] mb-4">
            Khởi tạo tài khoản,<br />
            <span className="text-accent">hoist</span> sự nghiệp lên.
          </h1>
          <p className="text-ink-2 text-[15px] leading-[1.55] mb-8">
            Miễn phí mãi mãi cho 6+ khóa vanilla JS. Nâng cấp khi bạn sẵn sàng đi sâu hơn.
          </p>

          <div className="flex flex-col gap-3 mb-8">
            {BENEFITS.map((t) => (
              <div key={t} className="flex items-center gap-3 text-sm text-ink-2">
                <span className="w-[22px] h-[22px] rounded-full shrink-0 grid place-items-center bg-success/15 text-success">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                {t}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3.5 pt-6 border-t border-line">
            <div className="flex">
              {['#F7DF1E', '#6366F1', '#34D399', '#F472B6', '#FB923C'].map((c, i) => (
                <div key={i}
                  className="w-8 h-8 rounded-full grid place-items-center font-mono font-bold text-[11px] text-[#0B0F19] border-2 border-[#0B0F19]"
                  style={{ background: `linear-gradient(135deg, ${c}, #1a1f3a)`, marginLeft: i ? -10 : 0 }}>
                  {'ANKPTM'[i]}
                </div>
              ))}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-ink">+218 dev tham gia tuần này</div>
              <div className="font-mono text-[11.5px] text-ink-3">★★★★★ 4.86 từ 3,219 đánh giá</div>
            </div>
          </div>
        </div>
        <p className="font-mono text-[11.5px] text-ink-3">
          🔒 Dữ liệu mã hóa · không spam · hủy bất cứ lúc nào
        </p>
      </div>

      {/* ── Right: form ─────────────────────────────────────────── */}
      <div className="flex flex-col p-8 lg:px-16 lg:py-10">
        <div className="self-end flex items-center gap-2.5 text-[13px] text-ink-3">
          Đã có tài khoản?
          <Link to="/login" className="text-ink font-semibold">Đăng nhập →</Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}
              className="flex-1 flex flex-col justify-center max-w-[400px] self-center w-full py-6">
          <h2 className="display text-[28px] mb-2">Tạo tài khoản</h2>
          <p className="text-ink-3 text-[13.5px] mb-6">Chỉ mất 30 giây. Không cần thẻ tín dụng.</p>

          {/* Social */}
          <div className="flex gap-2 mb-[18px]">
            <Button type="button" variant="ghost" className="flex-1 justify-center">⌥ GitHub</Button>
            <Button type="button" variant="ghost" className="flex-1 justify-center">G Google</Button>
          </div>

          <div className="flex items-center gap-3 mb-[18px] text-ink-3 text-[11.5px] font-mono">
            <div className="flex-1 h-px bg-line" />
            hoặc đăng ký bằng email
            <div className="flex-1 h-px bg-line" />
          </div>

          <div className="flex flex-col gap-3.5">
            {/* Name */}
            <FormField label="Họ và tên" error={errors.name?.message}>
              <input {...register('name')} className="input h-[42px] text-sm" placeholder="Phạm Văn Khang" />
            </FormField>

            {/* Email */}
            <FormField label="Email" error={errors.email?.message}
              hint={emailValid && <ValidHint>hợp lệ</ValidHint>}>
              <div className="relative">
                <input {...register('email')} type="email"
                  className={cn('input h-[42px] text-sm pr-9', emailValid && 'border-success/40')}
                  placeholder="hoisted@dev.com" />
                {emailValid && <Check className="absolute right-3 top-3.5 w-4 h-4 text-success" strokeWidth={2.5} />}
              </div>
            </FormField>

            {/* Password + strength */}
            <FormField label="Mật khẩu" error={errors.password?.message}
              hint={pw && <span className={cn('font-mono text-[11.5px]', STRENGTH_COLOR[score])}>{STRENGTH_LABEL[score]}</span>}>
              <div className="relative">
                <input {...register('password')} type={showPw ? 'text' : 'password'}
                  className="input h-[42px] text-sm pr-10 font-mono" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-2 w-7 h-[26px] grid place-items-center text-ink-3 hover:text-ink">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* strength bars */}
              <div className="flex gap-1 mt-2">
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
                        ok ? 'bg-success' : 'border border-line')}>
                        {ok && <Check className="w-2 h-2" strokeWidth={4} />}
                      </span>
                      {r.label}
                    </span>
                  );
                })}
              </div>
            </FormField>

            {/* Confirm */}
            <FormField label="Xác nhận mật khẩu" error={errors.confirm?.message}
              hint={matchValid && <ValidHint>khớp</ValidHint>}>
              <input {...register('confirm')} type="password"
                className={cn('input h-[42px] text-sm', matchValid && 'border-success/40')}
                placeholder="••••••••" />
            </FormField>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 my-[18px] text-[12.5px] text-ink-2 leading-[1.5] cursor-pointer">
            <input {...register('terms')} type="checkbox" className="sr-only peer" />
            <span className={cn('w-[18px] h-[18px] rounded shrink-0 mt-px grid place-items-center text-accent-ink',
              terms ? 'bg-accent' : 'border border-line')}>
              {terms && <Check className="w-3 h-3" strokeWidth={3.5} />}
            </span>
            <span>
              Tôi đồng ý với <a href="#" className="text-accent">Điều khoản dịch vụ</a> và{' '}
              <a href="#" className="text-accent">Chính sách bảo mật</a> của Hoisted.
            </span>
          </label>
          {errors.terms && <p className="-mt-2 mb-3 text-xs text-danger font-mono">{errors.terms.message}</p>}

          <Button type="submit" size="lg" disabled={isSubmitting} className="justify-center">
            {isSubmitting ? 'Đang tạo…' : 'Tạo tài khoản →'}
          </Button>

          <p className="mt-4 font-mono text-[11.5px] text-ink-3 text-center">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-accent underline underline-offset-2">Đăng nhập →</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

/* ── Small helpers ───────────────────────────────────────────── */
function FormField({ label, hint, error, children }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="font-mono text-[12.5px] font-medium text-ink-2">{label}</label>
        {hint}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-danger font-mono">{error}</p>}
    </div>
  );
}

function ValidHint({ children }) {
  return (
    <span className="font-mono text-[11.5px] text-success flex items-center gap-1">
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
      {children}
    </span>
  );
}
