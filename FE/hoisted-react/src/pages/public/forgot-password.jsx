import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/logo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { api, apiMessage } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

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
        // Chỉ báo lỗi thật khi server error
        setSent(false);
        alert(apiMessage(err, 'Lỗi máy chủ, vui lòng thử lại'));
      } else {
        setSent(true);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'linear-gradient(180deg, #0F1525 0%, #0B0F19 100%)' }}>
      <div className="w-full max-w-[420px]">
        <div className="mb-8">
          <Logo size={18} />
        </div>

        {!sent ? (
          <div className="bg-bg rounded-xl border border-line p-8">
            <div className="w-10 h-10 rounded-full bg-accent/15 grid place-items-center mb-4">
              <Mail className="w-5 h-5 text-accent" />
            </div>
            <h1 className="display text-[22px] mb-1">Quên mật khẩu?</h1>
            <p className="text-ink-3 text-[13.5px] mb-6">
              Nhập email tài khoản — chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div>
                <label className="font-mono text-[12.5px] font-medium text-ink-2 mb-1.5 block">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className="input h-[42px] text-sm w-full"
                  placeholder="hoisted@dev.com"
                  autoComplete="email"
                  autoFocus
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-danger font-mono">{errors.email.message}</p>
                )}
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting} className="justify-center">
                {isSubmitting ? 'Đang gửi…' : 'Gửi link đặt lại →'}
              </Button>
            </form>

            <Link to="/login"
              className="flex items-center gap-1.5 mt-5 text-[12.5px] text-ink-3 hover:text-ink font-mono">
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <div className="bg-bg rounded-xl border border-line p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-success/15 grid place-items-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-success" />
            </div>
            <h1 className="display text-[22px] mb-2">Kiểm tra hộp thư</h1>
            <p className="text-ink-3 text-[13.5px] mb-1">
              Nếu <span className="text-ink font-semibold">{getValues('email')}</span> tồn tại trong hệ thống,
            </p>
            <p className="text-ink-3 text-[13.5px] mb-6">
              bạn sẽ nhận được email hướng dẫn trong vài phút.
            </p>
            <p className="font-mono text-[11.5px] text-ink-3 bg-bg-2 rounded-lg px-3 py-2 mb-6">
              Không thấy email? Kiểm tra thư mục Spam hoặc thử lại.
            </p>
            <button onClick={() => setSent(false)}
              className="text-[13px] text-accent underline underline-offset-2 font-mono">
              Gửi lại email
            </button>
            <div className="mt-4">
              <Link to="/login" className="text-[12.5px] text-ink-3 hover:text-ink font-mono flex items-center justify-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
