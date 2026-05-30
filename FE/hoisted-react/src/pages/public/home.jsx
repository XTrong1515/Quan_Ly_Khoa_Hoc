import { Link } from 'react-router-dom';
import { Play, Check } from 'lucide-react';
import { CourseCard } from '@/components/course-card.jsx';
import { IdeFrame } from '@/components/ide-frame.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Chip } from '@/components/ui/chip.jsx';
import { COURSES, CATEGORIES } from '@/data/courses';

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="px-16 py-16 grid grid-cols-[1.05fr_0.95fr] gap-14 items-center">
        <div>
          <Chip className="mb-5">
            <span className="w-2 h-2 rounded-full bg-success" />
            Đang mở khóa: Async Patterns 2026
          </Chip>
          <h1 className="display text-[68px] leading-[1.05] mb-5">
            Học JavaScript<br />
            <span className="relative">
              từ <span className="text-accent">gốc</span>
              <span className="absolute -top-4 -right-2 font-mono text-sm text-ink-3 font-medium">// hoisted up</span>
            </span><br />
            tới production-ready.
          </h1>
          <p className="text-base text-ink-2 max-w-[480px] leading-[1.55] mb-8">
            120+ giờ video chuyên sâu về JS core, async, hệ thống module, React internals
            và Node runtime — dạy bởi instructor đang đứng trong production team thật.
          </p>
          <div className="flex gap-3 mb-9">
            <Button size="lg">Bắt đầu học miễn phí</Button>
            <Button size="lg" variant="ghost"><Play className="w-4 h-4" /> Xem demo (3:24)</Button>
          </div>
          <div className="flex gap-8 pt-6 border-t border-line">
            {[
              ['12k+', 'học viên đang học'],
              ['4.86', 'avg rating'],
              ['18', 'instructors thực chiến'],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="font-mono font-bold text-[22px]">{n}</div>
                <div className="text-xs text-ink-3 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <IdeFrame tab="event-loop.js">
          <pre className="font-mono text-[12.5px] leading-[1.65] text-ink-2 p-5 whitespace-pre overflow-hidden">
{`// 1. Sync stack rồi mới microtask
function hoisted() {
  const queue = [];
  Promise.resolve().then(() =>
    queue.push('micro'));
  setTimeout(() => queue.push('macro'), 0);
  return queue;
}

// 👉 ['micro', 'macro']`}
          </pre>
          <div className="px-4 py-3 border-t border-line bg-bg-2 flex items-center justify-between font-mono text-xs text-ink-3">
            <span>▶ Run • Lesson 14 — The Event Loop</span>
            <span className="text-accent">● live</span>
          </div>
        </IdeFrame>
      </section>

      {/* Categories */}
      <section className="px-16 pb-6">
        <p className="eyebrow mb-3.5">// duyệt theo chủ đề</p>
        <div className="grid grid-cols-6 gap-3">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} to={`/courses?cat=${c.slug}`} className="card p-4 hover:bg-bg-2 transition">
              <div className="w-9 h-9 rounded-lg bg-bg-2 text-accent grid place-items-center font-mono font-bold text-base mb-3.5">
                {c.icon}
              </div>
              <div className="font-display font-semibold text-sm">{c.name}</div>
              <div className="text-xs text-ink-3 mt-0.5">{c.count} khóa học</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="px-16 py-8">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="eyebrow">// nổi bật tuần này</p>
            <h2 className="display text-[32px] mt-1.5">Khóa học được học nhiều nhất</h2>
          </div>
          <Link to="/courses" className="font-mono text-[13px] text-ink-2">xem tất cả →</Link>
        </div>
        <div className="grid grid-cols-3 gap-5">
          {COURSES.slice(0, 3).map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="px-16 py-12">
        <div className="card p-10 text-center"
             style={{ backgroundImage: 'radial-gradient(circle at 30% 0%, rgb(247 223 30 / .1), transparent 50%)' }}>
          <p className="eyebrow mb-2.5">// sẵn sàng?</p>
          <h2 className="display text-[36px] mb-3.5">
            <span className="text-ink-3 font-mono font-medium">const</span>{' '}
            you{' '}
            <span className="text-ink-3 font-mono font-medium">=</span>{' '}
            <span className="text-accent">level_up</span>
            (<span className="text-ink-3 font-mono font-medium">'JS'</span>)
          </h2>
          <p className="text-ink-2 max-w-lg mx-auto mb-5">
            Đăng ký nhận tài liệu Event Loop deep-dive PDF (62 trang) miễn phí + coupon 30%.
          </p>
          <div className="flex gap-2.5 justify-center max-w-md mx-auto">
            <input className="input flex-1" placeholder="your@email.dev" />
            <Button>Đăng ký</Button>
          </div>
        </div>
      </section>
    </>
  );
}
