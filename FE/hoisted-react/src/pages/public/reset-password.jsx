import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Check, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/logo.jsx';
import { Seo } from '@/components/seo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { AuthScreen } from './forgot-password.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Tối thiểu 8 ký tự')
      .regex(/[A-Z]/, 'Cần ít nhất 1 chữ HOA')
      .regex(/[0-9]/, 'Cần ít nhất 1 số')
      .regex(/[^A-Za-z0-9]/, 'Cần ít nhất 1 ký tự đặc biệt'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'Mật khẩu không khớp',
  });

const REQS = [
  { label: '≥ 8 ký tự',         test: (pw) => pw.length >= 8 },
  { label: '1 chữ HOA',         test: (pw) => /[A-Z]/.test(pw) },
  { label: '1 số',              test: (pw) => /[0-9]/.test(pw) },
  { label: '1 ký tự đặc biệt', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const pw = watch('password') || '';

  const onSubmit = async (data) => {
    try {
      await api.post('/api/auth/reset-password', { token, password: data.password });
      setDone(true);
      toast.success('Đặt lại mật khẩu thành công!');
    } catch (err) {
      toast.error(apiMessage(err, 'Link không hợp lệ hoặc đã hết hạn'));
    }
  };

  if (!token) {
    return (
      <AuthScreen>
        <Seo title="Link không hợp lệ — Hoisted" />
        <div className="mb-8"><Logo size={18} /></div>
        <div className="bg-bg rounded-2xl border border-line p-8 text-center shadow-2xl shadow-black/40">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 grid place-items-center mx-auto mb-5">
            <AlertTriangle className="w-6 h-6 text-danger" aria-hidden="true" />
          </div>
          <h1 className="display text-[24px] mb-2">Link không hợp lệ</h1>
          <p className="text-ink-2 text-[13.5px] leading-relaxed mb-6">
            Link đặt lại mật khẩu bị thiếu hoặc đã hết hạn. Yêu cầu một link mới để tiếp tục.
          </p>
          <Link to="/forgot-password">
            <Button size="lg" className="w-full justify-center">Yêu cầu link mới →</Button>
          </Link>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <Seo title="Đặt lại mật khẩu — Hoisted" />
      <div className="mb-8"><Logo size={18} /></div>

      {done ? (
        <div className="bg-bg rounded-2xl border border-line p-8 text-center shadow-2xl shadow-black/40">
          <div className="w-14 h-14 rounded-2xl bg-success/10 grid place-items-center mx-auto mb-5 shadow-[0_0_36px_rgb(52_211_153/0.2)]">
            <ShieldCheck className="w-6 h-6 text-success" aria-hidden="true" />
          </div>
          <h1 className="display text-[24px] mb-2">Mật khẩu đã được đặt lại</h1>
          <p className="text-ink-3 text-[13.5px] mb-6">Bạn có thể đăng nhập bằng mật khẩu mới.</p>
          <Button
            size="lg"
            className="w-full justify-center shadow-[0_8px_24px_rgb(var(--accent)/0.3)]"
            onClick={() => navigate('/login')}
          >
            Đến trang đăng nhập →
          </Button>
        </div>
      ) : (
        <div className="bg-bg rounded-2xl border border-line p-8 shadow-2xl shadow-black/40">
          <p className="eyebrow mb-4">
            <span className="text-accent">~/hoisted</span> <span className="text-ink-3">/ đặt-lại-mật-khẩu</span>
          </p>
          <div className="w-11 h-11 rounded-xl bg-accent/10 grid place-items-center mb-4">
            <KeyRound className="w-5 h-5 text-accent" aria-hidden="true" />
          </div>
          <h1 className="display text-[24px] mb-1.5">Đặt lại mật khẩu</h1>
          <p className="text-ink-3 text-[13.5px] mb-6">Tạo mật khẩu mới cho tài khoản của bạn.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* New password */}
            <div>
              <label htmlFor="rp-password" className="font-mono text-[12.5px] font-medium text-ink-2 mb-1.5 block">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="rp-password"
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  className="input h-[44px] text-sm pr-11 font-mono w-full rounded-xl"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  autoFocus
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
              {errors.password && (
                <p className="mt-1.5 text-xs text-danger font-mono" role="alert">{errors.password.message}</p>
              )}
              {pw && (
                <div className="flex flex-wrap gap-2.5 mt-2.5">
                  {REQS.map((r) => {
                    const ok = r.test(pw);
                    return (
                      <span key={r.label} className={cn(
                        'flex items-center gap-1.5 font-mono text-[11px]',
                        ok ? 'text-success' : 'text-ink-3',
                      )}>
                        <span className={cn(
                          'w-[13px] h-[13px] rounded-full grid place-items-center',
                          ok ? 'bg-success' : 'border border-line',
                        )} aria-hidden="true">
                          {ok && <Check className="w-2 h-2 text-[#0B0F19]" strokeWidth={4} />}
                        </span>
                        {r.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label htmlFor="rp-confirm" className="font-mono text-[12.5px] font-medium text-ink-2 mb-1.5 block">
                Xác nhận mật khẩu
              </label>
              <input
                id="rp-confirm"
                {...register('confirm')}
                type="password"
                className="input h-[44px] text-sm font-mono w-full rounded-xl"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {errors.confirm && (
                <p className="mt-1.5 text-xs text-danger font-mono" role="alert">{errors.confirm.message}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="justify-center mt-1 shadow-[0_8px_24px_rgb(var(--accent)/0.3)]"
            >
              {isSubmitting ? 'Đang lưu…' : 'Đặt lại mật khẩu →'}
            </Button>
          </form>
        </div>
      )}
    </AuthScreen>
  );
}
