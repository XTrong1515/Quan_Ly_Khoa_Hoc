import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

/*
 * Hiển thị nội dung do giảng viên / admin soạn (bài học, mô tả khóa học) một cách AN TOÀN.
 * - Nội dung cũ dạng HTML → lọc bằng DOMPurify (bỏ <script>, onerror=…, javascript:…) rồi mới render.
 *   Trước đây render thẳng bằng dangerouslySetInnerHTML → giảng viên có thể chèn script đánh cắp token
 *   (lưu trong localStorage) của học viên / admin xem trang.
 * - Nội dung mới dạng Markdown → react-markdown (không thực thi HTML thô).
 */
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
});

const looksLikeHtml = (s) => /^\s*<(p|div|h[1-6]|ul|ol|section|article|span|strong|em|br|pre|blockquote|table|img)\b/i.test(s);

const BASE_CLS = 'text-ink-2 leading-[1.75] text-[14px] [&_p]:mb-3 [&_h2]:text-ink [&_h3]:text-ink [&_h4]:text-ink [&_h5]:text-ink [&_h6]:text-ink [&_h2]:font-display [&_h3]:font-display [&_h2]:font-semibold [&_h2]:text-[17px] [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:text-[15px] [&_h3]:mt-5 [&_h3]:mb-1.5 [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-1.5 [&_h5]:font-semibold [&_h5]:mt-3 [&_h5]:mb-1 [&_h6]:font-semibold [&_h6]:mt-3 [&_h6]:mb-1 [&>:first-child]:mt-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:text-ink [&_a]:text-accent [&_a]:underline [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:bg-bg-2 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-bg-2 [&_pre]:p-3 [&_pre]:rounded-sm [&_pre]:border-2 [&_pre]:border-edge [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:bg-bg-2 [&_blockquote]:rounded-sm [&_blockquote]:px-4 [&_blockquote]:py-2.5 [&_blockquote]:my-3 [&_blockquote]:text-ink-2';

/*
 * Trang đã có <h1> (tên khóa học / bài học) ngay phía trên nội dung, nên tiêu đề tác giả viết được
 * dời cấp: tiêu đề cao nhất trong nội dung luôn thành <h2>, các tiêu đề khác giữ khoảng cách tương đối
 * (tác giả hay viết thẳng "### Ý chính" → h2, không còn h1 thứ hai hay nhảy cấp h1 → h4).
 */
const clampLevel = (level) => Math.min(Math.max(level, 2), 6);

function markdownTopLevel(md) {
  let inFence = false;
  let top = 7;
  for (const line of md.split('\n')) {
    if (/^ {0,3}(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^ {0,3}(#{1,6})(\s|$)/.exec(line);
    if (m) top = Math.min(top, m[1].length);
  }
  return top;
}

const markdownOffset = (md) => { const top = markdownTopLevel(md); return top <= 6 ? 2 - top : 0; };

// Bộ component theo độ dời (ổn định giữa các lần render — tránh React remount tiêu đề)
const headingSets = new Map();
function headingComponents(offset) {
  if (!headingSets.has(offset)) {
    headingSets.set(offset, Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((level) => {
        const Tag = `h${clampLevel(level + offset)}`;
        const Heading = ({ node, ...props }) => <Tag {...props} />;
        return [`h${level}`, Heading];
      }),
    ));
  }
  return headingSets.get(offset);
}

function shiftHtmlHeadings(fragment) {
  const heads = [...fragment.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  if (heads.length) {
    const offset = 2 - Math.min(...heads.map((el) => Number(el.tagName[1])));
    heads.forEach((el) => {
      const next = document.createElement(`h${clampLevel(Number(el.tagName[1]) + offset)}`);
      for (const attr of el.attributes) next.setAttribute(attr.name, attr.value);
      while (el.firstChild) next.appendChild(el.firstChild);
      el.replaceWith(next);
    });
  }
  const box = document.createElement('div');
  box.appendChild(fragment);
  return box.innerHTML;
}

export function RichContent({ content, className }) {
  if (!content) return null;
  if (looksLikeHtml(content)) {
    const fragment = DOMPurify.sanitize(content, {
      USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input'], RETURN_DOM_FRAGMENT: true,
    });
    const html = shiftHtmlHeadings(fragment);
    return <div className={cn(BASE_CLS, className)} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <div className={cn(BASE_CLS, className)}>
      <ReactMarkdown components={headingComponents(markdownOffset(content))}>{content}</ReactMarkdown>
    </div>
  );
}
