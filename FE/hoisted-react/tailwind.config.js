/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"Inter Tight"', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
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
        line:    'rgb(var(--line) / <alpha-value>)',
        accent:  'rgb(var(--accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',
        // raw brand
        js:      '#F7DF1E',
        indigo:  '#6366F1',
        success: '#34D399',
        danger:  '#F43F5E',
        warn:    '#F59E0B',
      },
      borderRadius: { xl2: '14px' },
      letterSpacing: { tight2: '-0.025em' },
    },
  },
  plugins: [],
};
