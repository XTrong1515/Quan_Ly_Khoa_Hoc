/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // "… Fallback": font hệ thống đã chỉnh số đo cho khớp (src/index.css) → không xô layout khi font tải xong
        sans:    ['"Inter Tight"', '"Inter Tight Fallback"', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', '"Inter Tight Fallback"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"JetBrains Mono Fallback"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // semantic tokens — wired through CSS variables in src/index.css
        bg:      'rgb(var(--bg) / <alpha-value>)',
        'bg-1':  'rgb(var(--bg-1) / <alpha-value>)',
        'bg-2':  'rgb(var(--bg-2) / <alpha-value>)',
        'bg-3':  'rgb(var(--bg-3) / <alpha-value>)',
        ink:     'rgb(var(--ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--ink-3) / <alpha-value>)',
        // --line là bộ ba RGB, --line-a là độ đậm hairline. Trước đây alpha nằm trong --line nên rgb() sai cú pháp
        // và mọi đường viền rơi về currentColor (viền trắng / đen đậm).
        line:    'rgb(var(--line) / calc(var(--line-a) * <alpha-value>))',
        accent:  'rgb(var(--accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',
        // raw brand
        js:      '#F7DF1E',
        indigo:  '#6366F1',
        // màu trạng thái đổi theo giao diện để chữ đạt tương phản AA trên nền sáng
        success: 'rgb(var(--success) / <alpha-value>)',
        danger:  'rgb(var(--danger) / <alpha-value>)',
        warn:    'rgb(var(--warn) / <alpha-value>)',
      },
      borderRadius: { xl2: '14px' },
      letterSpacing: { tight2: '-0.025em' },
    },
  },
  plugins: [],
};
