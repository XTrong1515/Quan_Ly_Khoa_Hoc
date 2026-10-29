import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Wallet, Sparkles, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { Seo } from '@/components/seo.jsx';
import { api, apiMessage, setToken } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';

const inputCls = 'w-full px-3 py-2.5 text-[13.5px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent';
const labelCls = 'block font-mono text-[10px] text-ink-3 mb-1.5 uppercase tracking-widest';

const BENEFITS = [
  { icon: GraduationCap, title: 'Công cụ soạn khóa học', text: 'Video bảo mật, tài liệu PDF, quiz và bài tập code chấm tự động.' },
  { icon: Sparkles, title: 'Trợ lý AI cho giảng viên', text: 'AI soạn nháp nội dung bài học và câu hỏi trắc nghiệm — bạn duyệt trước khi đăng.' },
  { icon: Wallet, title: 'Chia sẻ doanh thu', text: 'Theo dõi doanh thu từng khóa; quản trị viên đối soát và chuyển khoản vào tài khoản ngân hàng bạn khai báo.' },
];

const EMPTY = { headline: '', expertise: '', bio: '', portfolioUrl: '', courseIdea: '' };
const RULES = { headline: [10, 255], expertise: [3, 255], bio: [50, 3000] };

function ApplicationForm({ onSubmitted }) {
  const [form, setForm] = useState(EMPTY);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const m = useMutation({
    mutationFn: () => api.post('/api/instructor-applications', form),
    onSuccess: () => { toast.success('Đã gửi đơn. Bạn sẽ nhận thông báo khi có kết quả duyệt.'); onSubmitted(); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa gửi được đơn đăng ký. Thử lại sau giây lát.')),
  });
  const invalid = Object.entries(RULES).some(([k, [min, max]]) => form[k].trim().length < min || form[k].trim().length > max);
  const counter = (k) => {
    const [min] = RULES[k]; const n = form[k].trim().length;
    return <span className={cn('font-mono text-[10px]', n < min ? 'text-ink-3' : 'text-success')}>{n}/{min}+</span>;
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="card p-6 space-y-4">
      <div>
        <div className="flex justify-between"><label className={labelCls}>Chức danh / giới thiệu ngắn *</label>{counter('headline')}</div>
        <input value={form.headline} onChange={set('headline')} maxLength={255} placeholder="vd: Frontend Engineer · 5 năm kinh nghiệm React" className={inputCls} />
      </div>
      <div>
        <div className="flex justify-between"><label className={labelCls}>Chuyên môn *</label>{counter('expertise')}</div>
        <input value={form.expertise} onChange={set('expertise')} maxLength={255} placeholder="vd: JavaScript, React, Node.js" className={inputCls} />
      </div>
      <div>
        <div className="flex justify-between"><label className={labelCls}>Giới thiệu bản thân & kinh nghiệm *</label>{counter('bio')}</div>
        <textarea value={form.bio} onChange={set('bio')} rows={5} maxLength={3000}
          placeholder="Kinh nghiệm làm việc, giảng dạy, dự án tiêu biểu…" className={cn(inputCls, 'resize-y')} />
      </div>
      <div>
        <label className={labelCls}>Link portfolio / GitHub / LinkedIn</label>
        <input value={form.portfolioUrl} onChange={set('portfolioUrl')} maxLength={500} placeholder="https://github.com/…" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Ý tưởng khóa học đầu tiên</label>
        <textarea value={form.courseIdea} onChange={set('courseIdea')} rows={3} maxLength={2000} className={cn(inputCls, 'resize-y')} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={invalid || m.isPending}>{m.isPending ? 'Đang gửi…' : 'Gửi đơn đăng ký'}</Button>
      </div>
    </form>
  );
}

export default function BecomeInstructorPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { role, user, refreshToken } = useAuth();
  const [switching, setSwitching] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['my-instructor-application'],
    queryFn: () => api.get('/api/instructor-applications/me').then((r) => r.data),
    enabled: role !== 'guest',
  });
  const application = data?.application;

  // Đơn đã duyệt: xin access token mới (role mới nằm trong token) — không bắt đăng nhập lại
  const enterInstructorArea = async () => {
    setSwitching(true);
    try {
      const { data: t } = await api.post('/api/auth/refresh', { refreshToken });
      setToken(t.accessToken);
      useAuth.setState({ token: t.accessToken, role: 'instructor', user: { ...user, role: 'INSTRUCTOR' } });
      navigate('/instructor');
    } catch {
      toast.error('Phiên đăng nhập đã cũ. Đăng nhập lại để vào khu vực giảng viên.');
    } finally { setSwitching(false); }
  };

  let body;
  if (role === 'guest') {
    body = (
      <div className="card p-6 text-center">
        <p className="text-[14px] text-ink-2 mb-4">Đăng nhập để gửi đơn đăng ký làm giảng viên.</p>
        <div className="flex justify-center gap-2">
          <Link to="/login"><Button>Đăng nhập</Button></Link>
          <Link to="/register"><Button variant="ghost">Tạo tài khoản</Button></Link>
        </div>
      </div>
    );
  } else if (role === 'instructor' || role === 'admin') {
    body = (
      <div className="card p-6 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
        <p className="flex-1 text-[14px] text-ink">Tài khoản của bạn đã có quyền giảng viên.</p>
        <Link to={role === 'admin' ? '/admin/courses' : '/instructor'}><Button>Vào khu vực quản lý</Button></Link>
      </div>
    );
  } else if (isLoading) {
    body = <p className="font-mono text-[12px] text-ink-3">Đang tải trạng thái đơn…</p>;
  } else if (application?.status === 'APPROVED') {
    body = (
      <div className="card p-6 flex flex-wrap items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
        <p className="flex-1 text-[14px] text-ink">Đơn của bạn đã được duyệt — chào mừng giảng viên mới!</p>
        <Button onClick={enterInstructorArea} disabled={switching}>{switching ? 'Đang chuyển…' : 'Vào khu vực giảng viên'}</Button>
      </div>
    );
  } else if (application?.status === 'PENDING') {
    body = (
      <div className="card p-6 flex items-start gap-3">
        <Clock className="w-5 h-5 text-js shrink-0 mt-0.5" />
        <div>
          <p className="text-[14px] text-ink font-medium">Đơn đang chờ duyệt</p>
          <p className="text-[13px] text-ink-3 mt-1">Gửi lúc {new Date(application.createdAt).toLocaleString('vi-VN')} · {application.expertise}</p>
          <p className="text-[13px] text-ink-3 mt-1">Bạn sẽ nhận thông báo khi có kết quả.</p>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        {application?.status === 'REJECTED' && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-danger/10 text-danger text-[13px]">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p><b>Đơn trước chưa được duyệt.</b> Lý do: {application.adminNote || 'không ghi lý do'} — bổ sung thông tin bên dưới rồi gửi lại.</p>
          </div>
        )}
        <ApplicationForm onSubmitted={() => qc.invalidateQueries({ queryKey: ['my-instructor-application'] })} />
      </div>
    );
  }

  return (
    <>
      <Seo title="Trở thành giảng viên — Hoisted" description="Chia sẻ kiến thức JavaScript, xây khóa học và nhận doanh thu cùng Hoisted." />
      <div className="max-w-[880px] mx-auto px-5 sm:px-8 py-10">
        <p className="eyebrow mb-2"><span className="text-accent">~/</span><span className="text-ink-3">trở-thành-giảng-viên</span></p>
        <h1 className="display text-[30px] sm:text-[36px] leading-tight mb-3">Dạy JavaScript cùng Hoisted</h1>
        <p className="text-ink-2 text-[15px] mb-8 max-w-[620px]">Chia sẻ kinh nghiệm thực chiến, xây khóa học của riêng bạn và nhận phần doanh thu từ mỗi lượt mua.</p>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-5">
              <Icon className="w-5 h-5 text-accent mb-3" />
              <p className="font-display font-semibold text-[14.5px] text-ink mb-1">{title}</p>
              <p className="text-[13px] text-ink-3 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {body}
      </div>
    </>
  );
}
