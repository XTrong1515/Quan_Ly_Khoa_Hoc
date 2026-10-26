/* ESLint 8 (eslintrc) — khớp script `npm run lint` (--ext js,jsx, --max-warnings 0) */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.3' } },
  plugins: ['react-refresh'],
  rules: {
    'react/prop-types': 'off',
    // Giao diện cố ý hiển thị chữ dạng comment code ("// Chưa có dữ liệu") — không phải comment bị lọt
    'react/jsx-no-comment-textnodes': 'off',
    // Dấu nháy trong văn bản tiếng Việt hiển thị bình thường với React
    'react/no-unescaped-entities': 'off',
    // Một số module cố ý export chung hằng số + component (course-editor, chart, exercise) — chỉ ảnh hưởng HMR khi dev
    'react-refresh/only-export-components': 'off',
    'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
  },
};
