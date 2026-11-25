import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { shareImage } from '../data/site';
import { fullTitle as composeTitle, pageSeo } from '../data/seo';

/** Creates the tag if it is missing, then sets it. */
function setMeta(selector, attributes) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    document.head.appendChild(tag);
  }
  for (const [name, value] of Object.entries(attributes)) tag.setAttribute(name, value);
  return tag;
}

/**
 * Keeps the tab title, description, canonical URL, robots directive and Open
 * Graph tags in step with the route. Absolute URLs come from the live origin,
 * so they are correct on whatever domain the site is served from.
 *
 * The build prerenders the same tags into each route's HTML, so this finds
 * them already in place on a cold load and only has work to do on navigation.
 *
 * `brandSuffix: false` hands the whole title to the page — see data/seo.js.
 */
export function useDocumentTitle(title, description, { noindex = false, brandSuffix = true } = {}) {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = composeTitle(title, brandSuffix);
    const url = `${window.location.origin}${pathname}`;

    document.title = fullTitle;
    setMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex, follow' : 'index, follow',
    });
    setMeta('link[rel="canonical"]', { rel: 'canonical', href: url });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });

    // Bundled asset URLs are root-relative; the crawlers want them absolute.
    const image = new URL(shareImage.src, window.location.origin).href;
    setMeta('meta[property="og:image"]', { property: 'og:image', content: image });
    setMeta('meta[property="og:image:alt"]', {
      property: 'og:image:alt',
      content: shareImage.alt,
    });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });

    if (description) {
      setMeta('meta[name="description"]', { name: 'description', content: description });
      setMeta('meta[property="og:description"]', {
        property: 'og:description',
        content: description,
      });
    }
  }, [title, description, noindex, brandSuffix, pathname]);
}

/** The title and description data/seo.js holds for one of the site's pages. */
export function usePageSeo(path) {
  const { title, description, brandSuffix } = pageSeo[path];
  useDocumentTitle(title, description, { brandSuffix });
}

export default useDocumentTitle;
