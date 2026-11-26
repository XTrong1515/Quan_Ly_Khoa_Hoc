/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // "… Fallback": font hệ thống đã chỉnh số đo cho khớp (src/index.css) → không xô layout khi font tải xong
        sans:    ['"Space Grotesk"', '"Space Grotesk Fallback"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Space Grotesk Fallback"', 'system-ui', 'sans-serif'],
        // pixel / dot-matrix — chỉ cho tiêu đề lớn (.display), logo, số lớn; không dùng cho chữ nhỏ
        pixel:   ['Handjet', '"Handjet Fallback"', '"Arial Narrow"', 'sans-serif'],
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
        // viền khối đậm (card, nút, ô nhập) — khác `line` (đường chia mảnh bên trong)
        edge:    'rgb(var(--edge) / <alpha-value>)',
        accent:  'rgb(var(--accent) / <alpha-value>)',
        // vàng pixel cho CTA chính / điểm nhấn, chữ trên nó luôn navy
        pop:     'rgb(var(--pop) / <alpha-value>)',
        'pop-ink': 'rgb(var(--pop-ink) / <alpha-value>)',
        navy:    'rgb(var(--navy) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',
        // raw brand
        js:      '#F7DF1E',
        indigo:  '#6366F1',
        // màu trạng thái đổi theo giao diện để chữ đạt tương phản AA trên nền sáng
        success: 'rgb(var(--success) / <alpha-value>)',
        danger:  'rgb(var(--danger) / <alpha-value>)',
        warn:    'rgb(var(--warn) / <alpha-value>)',
      },
      letterSpacing: { tight2: '-0.01em' },
    },
    // Neo-brutalism: góc gần như vuông. Ghi đè thang mặc định để mọi rounded-* cũ trong app cùng đổi.
    borderRadius: {
      none: '0', sm: '2px', DEFAULT: '3px', md: '3px', lg: '4px', xl: '5px', '2xl': '6px', '3xl': '8px', full: '9999px',
    },
    // Bóng cứng lệch, không blur — màu theo --shadow (navy ở light, đen ở dark).
    boxShadow: {
      none: 'none',
      sm:  '2px 2px 0 0 rgb(var(--shadow))',
      DEFAULT: '3px 3px 0 0 rgb(var(--shadow))',
      md:  '4px 4px 0 0 rgb(var(--shadow))',
      lg:  '5px 5px 0 0 rgb(var(--shadow))',
      xl:  '6px 6px 0 0 rgb(var(--shadow))',
      '2xl': '8px 8px 0 0 rgb(var(--shadow))',
      inner: 'inset 2px 2px 0 0 rgb(var(--shadow) / 0.15)',
    },
  },
  plugins: [],
};
