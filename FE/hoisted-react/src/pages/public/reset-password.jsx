import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/logo.jsx';
import { Button } from '@/components/ui/button.jsx';
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
      <div className="min-h-screen flex items-center justify-center p-6"
           style={{ background: 'linear-gradient(180deg, #0F1525 0%, #0B0F19 100%)' }}>
        <div className="text-center">
          <p className="text-danger font-mono mb-4">Link không hợp lệ.</p>
          <Link to="/forgot-password" className="text-accent underline">Yêu cầu link mới →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'linear-gradient(180deg, #0F1525 0%, #0B0F19 100%)' }}>
      <div className="w-full max-w-[420px]">
        <div className="mb-8"><Logo size={18} /></div>

        {done ? (
          <div className="bg-bg rounded-xl border border-line p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-success/15 grid place-items-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-success" />
            </div>
            <h1 className="display text-[22px] mb-2">Mật khẩu đã được đặt lại</h1>
            <p className="text-ink-3 text-[13.5px] mb-6">Bạn có thể đăng nhập bằng mật khẩu mới.</p>
            <Button size="lg" className="w-full justify-center" onClick={() => navigate('/login')}>
              Đến trang đăng nhập →
            </Button>
          </div>
        ) : (
          <div className="bg-bg rounded-xl border border-line p-8">
            <h1 className="display text-[22px] mb-1">Đặt lại mật khẩu</h1>
            <p className="text-ink-3 text-[13.5px] mb-6">Tạo mật khẩu mới cho tài khoản của bạn.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* New password */}
              <div>
                <label className="font-mono text-[12.5px] font-medium text-ink-2 mb-1.5 block">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    className="input h-[42px] text-sm pr-10 font-mono w-full"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-2 w-7 h-[26px] grid place-items-center text-ink-3 hover:text-ink">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-danger font-mono">{errors.password.message}</p>
                )}
                {pw && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {REQS.map((r) => {
                      const ok = r.test(pw);
                      return (
                        <span key={r.label} className={cn(
                          'flex items-center gap-1 font-mono text-[11px]',
                          ok ? 'text-success' : 'text-ink-3',
                        )}>
                          <span className={cn(
                            'w-3 h-3 rounded-full grid place-items-center',
                            ok ? 'bg-success' : 'border border-line',
                          )}>
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
                <label className="font-mono text-[12.5px] font-medium text-ink-2 mb-1.5 block">
                  Xác nhận mật khẩu
                </label>
                <input
                  {...register('confirm')}
                  type="password"
                  className="input h-[42px] text-sm font-mono w-full"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {errors.confirm && (
                  <p className="mt-1 text-xs text-danger font-mono">{errors.confirm.message}</p>
                )}
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting} className="justify-center mt-1">
                {isSubmitting ? 'Đang lưu…' : 'Đặt lại mật khẩu →'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
