import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Trang riêng tư / theo tài khoản: không cho công cụ tìm kiếm thu thập (khớp NOINDEX_PREFIXES trong src/router.jsx)
const PRIVATE_PATHS = [
  '/admin', '/instructor', '/me', '/learn', '/cart', '/payment', '/assistant',
  '/login', '/register', '/forgot-password', '/reset-password',
];

/**
 * robots.txt sinh lúc build / dev: dòng Sitemap cần URL tuyệt đối nên phụ thuộc môi trường.
 * Sitemap do API phục vụ (GET /sitemap.xml) vì danh sách khóa học nằm trong DB.
 */
function robotsTxt(apiUrl) {
  const body = [
    'User-agent: *',
    ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`),
    'Allow: /',
    '',
    `Sitemap: ${apiUrl.replace(/\/$/, '')}/sitemap.xml`,
    '',
  ].join('\n');
  return {
    name: 'hoisted-robots-txt',
    configureServer(server) {
      server.middlewares.use('/robots.txt', (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(body);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: body });
    },
  };
}

/**
 * og:image / twitter:image trong index.html là đường dẫn tương đối — Facebook, Zalo, Slack… không chạy JS nên
 * cần URL tuyệt đối ngay trong HTML. Đặt VITE_SITE_URL (vd: https://hoisted.vn) khi build để ghép sẵn.
 */
function absoluteShareImage(siteUrl) {
  const base = (siteUrl || '').replace(/\/$/, '');
  return {
    name: 'hoisted-absolute-share-image',
    transformIndexHtml(html, ctx) {
      if (!base) {
        if (!ctx.server) console.warn('[hoisted] VITE_SITE_URL chưa đặt — og:image vẫn là đường dẫn tương đối (mạng xã hội sẽ không hiện ảnh).');
        return html;
      }
      return html.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")\//g, `$1${base}/`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), robotsTxt(env.VITE_API_URL || 'http://localhost:3001'), absoluteShareImage(env.VITE_SITE_URL)],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: { port: 5173 },
  };
});
