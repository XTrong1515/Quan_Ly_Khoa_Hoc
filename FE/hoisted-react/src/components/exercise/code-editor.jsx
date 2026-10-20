import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTheme } from '@/store/theme';
import { cn } from '@/lib/utils';

const EXTENSIONS = [javascript()];

/** Editor JS (CodeMirror 6, đóng gói sẵn — không tải từ CDN). Import qua React.lazy để không nặng bundle chính. */
export default function CodeEditor({ value, onChange, height = '100%', readOnly = false, className }) {
  const mode = useTheme((s) => s.mode);
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={EXTENSIONS}
      theme={mode === 'dark' ? oneDark : 'light'}
      height={height}
      readOnly={readOnly}
      basicSetup={{ tabSize: 2, foldGutter: false }}
      className={cn('text-[13px] [&_.cm-editor]:outline-none', className)}
    />
  );
}
