import { Link } from 'react-router-dom';
import { IdeFrame } from '@/components/ide-frame.jsx';

/**
 * MyOrders
 * Bảng đơn hàng với status badge, filter chips. Click xem chi tiết.
 *
 * 📐 Design reference: xem Hoisted.html — section/artboard tương ứng.
 * Copy markup từ design file (pages-*.jsx) và refactor:
 *   - thay inline style bằng Tailwind classes
 *   - thay hard-coded color bằng tokens (bg-bg-2, text-ink-2, …)
 *   - lift state lên Zustand store hoặc React Query hook
 *
 * Suggested data hooks:
 *   - useQuery({ queryKey: ['…'], queryFn: api.… })
 *   - useMutation cho actions (mark complete, add to cart, v.v.)
 */
export default function MyOrdersPage() {
  return (
    <div className="px-16 py-12 max-w-5xl mx-auto">
      <p className="eyebrow mb-2">// stub · /me/orders</p>
      <h1 className="display text-4xl mb-3">MyOrders</h1>
      <p className="text-ink-2 mb-6 max-w-xl">Bảng đơn hàng với status badge, filter chips. Click xem chi tiết.</p>

      <IdeFrame tab="TODO.md">
        <pre className="font-mono text-[13px] leading-relaxed text-ink-2 p-5 whitespace-pre-wrap">
{`# MyOrders

Page này đã có thiết kế hi-fi trong design canvas.
Mở Hoisted.html → tìm artboard "MyOrders" để copy markup.

Bước tiếp theo:
  □ Copy JSX từ design canvas vào file này
  □ Refactor inline style → Tailwind classes
  □ Wire state vào Zustand stores (auth, cart, …)
  □ Thay mock data bằng React Query + axios
  □ Form validation: react-hook-form + zod
`}
        </pre>
      </IdeFrame>

      <div className="mt-6 flex gap-3">
        <Link to="/" className="font-mono text-sm text-accent">← về trang chủ</Link>
      </div>
    </div>
  );
}
