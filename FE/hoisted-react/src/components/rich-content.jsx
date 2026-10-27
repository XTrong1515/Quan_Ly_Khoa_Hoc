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

const BASE_CLS = 'text-ink-2 leading-[1.75] text-[14px] [&_p]:mb-3 [&_h1]:text-ink [&_h2]:text-ink [&_h3]:text-ink [&_h1]:font-display [&_h2]:font-display [&_h1]:font-bold [&_h1]:text-[20px] [&_h2]:font-semibold [&_h2]:text-[17px] [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:text-ink [&_a]:text-accent [&_a]:underline [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:bg-bg-2 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-bg-2 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-ink-3';

export function RichContent({ content, className }) {
  if (!content) return null;
  if (looksLikeHtml(content)) {
    const html = DOMPurify.sanitize(content, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input'] });
    return <div className={cn(BASE_CLS, className)} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <div className={cn(BASE_CLS, className)}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
