import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { useAuth } from '@/store/auth';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ── Schemas ─────────────────────────────────────────────────── */
const profileSchema = z.object({
  name:     z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  username: z
    .string()
    .regex(/^[a-z0-9_.]{3,30}$/, 'Username: 3–30 ký tự, chỉ dùng a-z, 0-9, . hoặc _')
    .or(z.literal(''))
    .optional(),
  phone: z
    .string()
    .regex(/^[0-9+\-\s]{0,15}$/, 'Số điện thoại không hợp lệ')
    .or(z.literal(''))
    .optional(),
  bio: z.string().max(200, 'Tối đa 200 ký tự').optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(8, 'Tối thiểu 8 ký tự')
      .regex(/[A-Z]/, 'Cần ít nhất 1 chữ HOA')
      .regex(/[0-9]/, 'Cần ít nhất 1 số')
      .regex(/[^A-Za-z0-9]/, 'Cần ít nhất 1 ký tự đặc biệt'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu không khớp',
  });

/* ── Page ────────────────────────────────────────────────────── */
export default function ProfileSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 font-mono text-[12px] text-ink-3 mb-5">
        <Link to="/" className="hover:text-ink-2 transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/me" className="hover:text-ink-2 transition-colors">Tài khoản</Link>
        <span>/</span>
        <span className="text-ink-2">Cài đặt</span>
      </div>

      <h1 className="text-2xl font-bold text-ink mb-8">Cài đặt tài khoản</h1>

      <div className="flex flex-col gap-4">
        <AvatarSection />
        <InfoSection />
        <PasswordSection />
        <TwoFactorSection />
      </div>
    </div>
  );
}

/* ── Avatar ──────────────────────────────────────────────────── */
function AvatarSection() {
  const { user } = useAuth();
  const avatarLabel = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="card p-6">
      <p className="eyebrow mb-4">// Avatar</p>
      <div className="flex items-center gap-5">
        <div
          className="w-[62px] h-[62px] rounded-full grid place-items-center font-mono font-bold text-xl text-[#0B0F19] shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}
        >
          {avatarLabel}
        </div>
        <div>
          <p className="font-semibold text-ink text-[15px]">Ảnh đại diện</p>
          <p className="text-[12.5px] text-ink-3 mt-0.5">PNG / JPG, tối đa 2MB. Đề xuất 400×400.</p>
          <div className="flex gap-2 mt-3">
            <Button variant="ghost" size="sm">Đổi ảnh</Button>
            <Button variant="quiet" size="sm">Xóa</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Thông tin cá nhân ───────────────────────────────────────── */
function InfoSection() {
  const { user, updateUser } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name:     user?.name     || '',
      username: user?.username || '',
      phone:    user?.phone    || '',
      bio:      user?.bio      || '',
    },
  });

  const dirtyCount = Object.keys(dirtyFields).length;

  const onSubmit = async (data) => {
    try {
      const { data: res } = await api.put('/api/user/profile', {
        name:     data.name,
        username: data.username || null,
        phone:    data.phone    || null,
        bio:      data.bio      || null,
      });
      updateUser(res.user);
      reset({
        name:     res.user.name     || '',
        username: res.user.username || '',
        phone:    res.user.phone    || '',
        bio:      res.user.bio      || '',
      });
      toast.success('Cập nhật thông tin thành công');
    } catch (err) {
      toast.error(apiMessage(err, 'Cập nhật thất bại'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="card p-6">
        {/* Section header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="eyebrow">// Thông tin cá nhân</p>
            <p className="text-[13px] text-ink-2 mt-1.5">Hồ sơ public</p>
          </div>
          {dirtyCount > 0 && (
            <span className="font-mono text-[11.5px] text-warn">
              {dirtyCount} thay đổi chưa lưu
            </span>
          )}
        </div>

        {/* 2-column grid: name / username, email / phone */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Họ và tên" error={errors.name?.message}>
            <input
              {...register('name')}
              className="input h-[42px] text-sm"
              placeholder="Phạm Khang"
            />
          </Field>

          <Field label="Username" error={errors.username?.message}>
            <input
              {...register('username')}
              className="input h-[42px] text-sm font-mono"
              placeholder="@khang.hoisted"
            />
          </Field>

          <Field label="Email">
            <input
              value={user?.email || ''}
              readOnly
              className="input h-[42px] text-sm opacity-50 cursor-not-allowed"
            />
          </Field>

          <Field label="SĐT" error={errors.phone?.message}>
            <input
              {...register('phone')}
              className="input h-[42px] text-sm"
              placeholder="0987 654 321"
            />
          </Field>
        </div>

        {/* Bio — full width */}
        <div className="mt-4">
          <Field label="Bio" error={errors.bio?.message}>
            <textarea
              {...register('bio')}
              className="input py-2.5 h-auto text-sm resize-none"
              rows={3}
              placeholder="Frontend dev tại Tiki. Học JS không bao giờ là đủ."
            />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => reset()}
            disabled={!isDirty}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ── Đổi mật khẩu ────────────────────────────────────────────── */
function PasswordSection() {
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const newPw = watch('newPassword') || '';

  const onSubmit = async (data) => {
    try {
      await api.put('/api/user/password', {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      });
      toast.success('Đổi mật khẩu thành công. Các thiết bị khác sẽ bị đăng xuất.');
      reset();
    } catch (err) {
      toast.error(apiMessage(err, 'Đổi mật khẩu thất bại'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="card p-6">
        <p className="eyebrow mb-5">// Đổi mật khẩu</p>

        {/* Mật khẩu hiện tại — full width */}
        <Field label="Mật khẩu hiện tại" error={errors.currentPassword?.message}>
          <div className="relative">
            <input
              {...register('currentPassword')}
              type={showCur ? 'text' : 'password'}
              className="input h-[42px] text-sm pr-10 font-mono"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <PwToggle show={showCur} onToggle={() => setShowCur((v) => !v)} />
          </div>
        </Field>

        {/* Mật khẩu mới + xác nhận — 2 cột */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Field label="Mật khẩu mới" error={errors.newPassword?.message}>
            <div className="relative">
              <input
                {...register('newPassword')}
                type={showNew ? 'text' : 'password'}
                className="input h-[42px] text-sm pr-10 font-mono"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <PwToggle show={showNew} onToggle={() => setShowNew((v) => !v)} />
            </div>
          </Field>

          <Field label="Xác nhận mật khẩu mới" error={errors.confirmPassword?.message}>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showCon ? 'text' : 'password'}
                className="input h-[42px] text-sm pr-10 font-mono"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <PwToggle show={showCon} onToggle={() => setShowCon((v) => !v)} />
            </div>
          </Field>
        </div>

        {/* Password requirements */}
        {newPw && (
          <div className="mt-3">
            <p className="eyebrow mb-2">// Yêu cầu</p>
            <PwReqs password={newPw} />
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu…' : 'Đổi mật khẩu'}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ── 2-Factor Auth ───────────────────────────────────────────── */
function TwoFactorSection() {
  return (
    <div className="card p-6">
      <p className="eyebrow mb-4">// 2-Factor Auth</p>
      <div className="flex justify-between items-center gap-4">
        <div>
          <p className="font-semibold text-ink">Xác thực 2 lớp qua app</p>
          <p className="text-[13px] text-ink-2 mt-0.5">
            Authy, Google Authenticator hoặc 1Password.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-[11.5px] font-semibold px-2.5 py-1 rounded-md bg-danger/15 text-danger">
            Đang tắt
          </span>
          <Button variant="ghost" size="sm">Bật 2FA</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared helpers ──────────────────────────────────────────── */
function Field({ label, hint, error, children }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="font-mono text-[12.5px] font-medium text-ink-2">{label}</label>
        {hint && <span className="font-mono text-[11.5px] text-ink-3">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-danger font-mono">{error}</p>}
    </div>
  );
}

function PwToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2 top-2 w-7 h-[26px] grid place-items-center text-ink-3 hover:text-ink"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

const PW_REQS = [
  { label: '≥ 8 ký tự',        test: (pw) => pw.length >= 8 },
  { label: '1 chữ HOA',        test: (pw) => /[A-Z]/.test(pw) },
  { label: '1 số',             test: (pw) => /[0-9]/.test(pw) },
  { label: '1 ký tự đặc biệt', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function PwReqs({ password }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {PW_REQS.map((r) => {
        const ok = r.test(password);
        return (
          <span
            key={r.label}
            className={cn('flex items-center gap-1.5 font-mono text-[11px]', ok ? 'text-success' : 'text-ink-3')}
          >
            <span className={cn('w-3.5 h-3.5 rounded-full grid place-items-center shrink-0', ok ? 'bg-success' : 'border border-line')}>
              {ok && <Check className="w-2 h-2 text-[#0B0F19]" strokeWidth={4} />}
            </span>
            {r.label}
          </span>
        );
      })}
    </div>
  );
}
