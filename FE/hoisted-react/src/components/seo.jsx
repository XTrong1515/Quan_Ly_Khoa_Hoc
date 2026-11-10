import { useEffect, useMemo } from 'react';

const SITE_NAME = 'Hoisted';

function setMeta(selector, attrs, content) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  const previous = el.getAttribute('content');
  el.setAttribute('content', content);
  return () => { if (previous != null) el.setAttribute('content', previous); };
}

/**
 * SEO theo từng trang: title, description, Open Graph / Twitter và JSON-LD (tùy chọn).
 * Canonical và robots do `RouteMeta` trong router.jsx đặt theo đường dẫn.
 * Không render gì; khi rời trang thì trả lại giá trị mặc định của index.html.
 */
export function Seo({ title, description, image, type = 'website', jsonLd }) {
  const json = useMemo(() => (jsonLd ? JSON.stringify(jsonLd) : null), [jsonLd]);

  useEffect(() => {
    const restore = [];
    const previousTitle = document.title;
    if (title) {
      document.title = title;
      restore.push(() => { document.title = previousTitle; });
      restore.push(setMeta('meta[property="og:title"]', { property: 'og:title' }, title));
      restore.push(setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title));
    }
    if (description) {
      restore.push(setMeta('meta[name="description"]', { name: 'description' }, description));
      restore.push(setMeta('meta[property="og:description"]', { property: 'og:description' }, description));
      restore.push(setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description));
    }
    if (image) {
      const absolute = new URL(image, window.location.origin).href;
      restore.push(setMeta('meta[property="og:image"]', { property: 'og:image' }, absolute));
      restore.push(setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, absolute));
    }
    restore.push(setMeta('meta[property="og:type"]', { property: 'og:type' }, type));
    restore.push(setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME));

    let script;
    if (json) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = json;
      document.head.appendChild(script);
    }

    return () => {
      restore.reverse().forEach((undo) => undo());
      if (script) script.remove();
    };
  }, [title, description, image, type, json]);

  return null;
}
