import { useEffect, useMemo } from 'react';

/**
 * Per-page SEO: document title, meta description and optional JSON-LD.
 * Renders nothing; cleans up its JSON-LD script on unmount.
 */
export function Seo({ title, description, jsonLd }) {
  const json = useMemo(() => (jsonLd ? JSON.stringify(jsonLd) : null), [jsonLd]);

  useEffect(() => {
    if (title) document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const prevDescription = meta.getAttribute('content');
    if (description) meta.setAttribute('content', description);

    let script;
    if (json) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = json;
      document.head.appendChild(script);
    }

    return () => {
      if (description && prevDescription != null) meta.setAttribute('content', prevDescription);
      if (script) script.remove();
    };
  }, [title, description, json]);

  return null;
}
