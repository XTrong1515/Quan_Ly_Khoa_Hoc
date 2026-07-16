import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/logo.jsx';
import { Seo } from '@/components/seo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { api, apiMessage } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

/* Dark auth backdrop shared with login/register's brand panel */
export function AuthScreen({ children }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 relative overflow-hidden bg-[#0B0F19]">
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
            'radial-gradient(ellipse 50% 45% at 25% 5%, rgb(247 223 30 / .09) 0%, transparent 60%), radial-gradient(ellipse 45% 45% at 85% 95%, rgb(99 102 241 / .11) 0%, transparent 60%)',
        }}
      />
      <div className="relative w-full max-w-[440px]">{children}</div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      await api.post('/api/auth/forgot-password', { email: data.email });
      setSent(true);
    } catch (err) {
      // Vẫn show sent để không lộ email có tồn tại không
      if (err?.response?.status >= 500) {
        setSent(false);
        toast.error(apiMessage(err, 'Lỗi máy chủ, vui lòng thử lại'));
      } else {
        setSent(true);
      }
    }
  };

  return (
    <AuthScreen>
      <Seo title="Quên mật khẩu — Hoisted" />

      <div className="mb-8">
        <Logo size={18} />
      </div>

      {!sent ? (
        <div className="bg-bg rounded-2xl border border-line p-8 shadow-2xl shadow-black/40">
          <p className="eyebrow mb-4">
            <span className="text-accent">~/hoisted</span> <span className="text-ink-3">/ quên-mật-khẩu</span>
          </p>
          <div className="w-11 h-11 rounded-xl bg-accent/10 grid place-items-center mb-4">
            <Mail className="w-5 h-5 text-accent" aria-hidden="true" />
          </div>
          <h1 className="display text-[24px] mb-1.5">Quên mật khẩu?</h1>
          <p className="text-ink-3 text-[13.5px] leading-relaxed mb-6">
            Nhập email tài khoản — chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label htmlFor="fp-email" className="font-mono text-[12.5px] font-medium text-ink-2 mb-1.5 block">
                Email
              </label>
              <input
                id="fp-email"
                {...register('email')}
                type="email"
                className="input h-[44px] text-sm w-full rounded-xl"
                placeholder="hoisted@dev.com"
                autoComplete="email"
                autoFocus
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-danger font-mono" role="alert">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="justify-center shadow-[0_8px_24px_rgb(var(--accent)/0.3)]"
            >
              {isSubmitting ? 'Đang gửi…' : 'Gửi link đặt lại →'}
            </Button>
          </form>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 mt-6 text-[12.5px] text-ink-3 hover:text-ink font-mono transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Quay lại đăng nhập
          </Link>
        </div>
      ) : (
        <div className="bg-bg rounded-2xl border border-line p-8 text-center shadow-2xl shadow-black/40">
          <div className="w-14 h-14 rounded-2xl bg-success/10 grid place-items-center mx-auto mb-5 shadow-[0_0_36px_rgb(52_211_153/0.2)]">
            <MailCheck className="w-6 h-6 text-success" aria-hidden="true" />
          </div>
          <h1 className="display text-[24px] mb-3">Kiểm tra hộp thư</h1>
          <p className="text-ink-2 text-[13.5px] leading-relaxed mb-5">
            Nếu <span className="text-ink font-semibold">{getValues('email')}</span> tồn tại trong hệ thống,
            bạn sẽ nhận được email hướng dẫn trong vài phút.
          </p>
          <p className="font-mono text-[11.5px] text-ink-3 bg-bg-2 border border-line rounded-xl px-4 py-2.5 mb-6">
            Không thấy email? Kiểm tra thư mục Spam hoặc gửi lại.
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-[13px] text-accent underline underline-offset-2 font-mono cursor-pointer hover:opacity-80 transition-opacity"
          >
            Gửi lại email
          </button>
          <div className="mt-5">
            <Link
              to="/login"
              className="text-[12.5px] text-ink-3 hover:text-ink font-mono inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Quay lại đăng nhập
            </Link>
          </div>
        </div>
      )}
    </AuthScreen>
  );
}
