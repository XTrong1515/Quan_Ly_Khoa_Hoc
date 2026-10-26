import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { api, apiMessage } from '@/lib/api';

const inputCls = 'w-full px-3 py-2 text-[13px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent';
const labelCls = 'block font-mono text-[10px] text-ink-3 mb-1.5 uppercase tracking-widest';

/** Hồ sơ giảng viên: thông tin hiển thị trên trang khóa học + tài khoản nhận doanh thu. */
export default function InstructorProfilePage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['instructor-profile'],
    queryFn: () => api.get('/api/instructor/profile').then((r) => r.data.profile),
  });
  const [form, setForm] = useState(null);
  useEffect(() => { if (data && !form) setForm({ ...data }); }, [data, form]);

  const save = useMutation({
    mutationFn: () => api.put('/api/instructor/profile', form),
    onSuccess: () => {
      toast.success('Đã lưu hồ sơ');
      qc.invalidateQueries({ queryKey: ['instructor-profile'] });
      qc.invalidateQueries({ queryKey: ['instructor-revenue'] });
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const field = (key) => ({ value: form?.[key] ?? '', onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  return (
    <div className="p-5 sm:p-8 max-w-3xl">
      <p className="eyebrow mb-1.5"><span className="text-accent">~/instructor</span> <span className="text-ink-3">/ hồ-sơ</span></p>
      <h1 className="font-display font-bold text-[24px] mb-6">Hồ sơ giảng viên</h1>

      {!form ? <p className="font-mono text-[12px] text-ink-3">Đang tải…</p> : (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-6">
          <section className="card p-5 space-y-4">
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">Hiển thị trên trang khóa học</p>
            <div>
              <label className={labelCls}>Họ tên</label>
              <input value={form.name ?? ''} disabled className={`${inputCls} opacity-60`} />
            </div>
            <div>
              <label className={labelCls}>Chức danh / giới thiệu ngắn</label>
              <input {...field('headline')} maxLength={255} placeholder="vd: Senior Frontend Engineer · 8 năm kinh nghiệm" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Giới thiệu</label>
              <textarea {...field('bio')} rows={5} maxLength={3000} className={`${inputCls} resize-y`} />
            </div>
          </section>

          <section className="card p-5 space-y-4">
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">Tài khoản nhận doanh thu</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Ngân hàng</label>
                <input {...field('bankName')} maxLength={100} placeholder="vd: Vietcombank" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Số tài khoản</label>
                <input {...field('bankAccountNumber')} inputMode="numeric" maxLength={24} placeholder="0123456789" className={`${inputCls} font-mono`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Chủ tài khoản (không dấu)</label>
              <input {...field('bankAccountName')} maxLength={100} placeholder="NGUYEN VAN A" className={`${inputCls} uppercase`} />
            </div>
            <p className="font-mono text-[11px] text-ink-3">// Hoisted chuyển khoản định kỳ phần doanh thu của bạn vào tài khoản này.</p>
          </section>

          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu hồ sơ'}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
