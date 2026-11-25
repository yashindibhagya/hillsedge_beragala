import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { shareImage } from '../data/site';
import { useSite } from '../context/SiteData';
import { buildStructuredData, serializeGraph } from '../lib/structuredData';

/**
 * Keeps the page's schema.org data in step with the route and the live
 * settings. What it describes is documented on buildStructuredData.
 *
 * The build prerenders the same graphs into each route's HTML, marked
 * `data-prerendered`; those are from the published fallback facts, so they
 * are dropped here in favour of the live ones rather than left to duplicate.
 */
export function StructuredData() {
  const { pathname } = useLocation();
  const { settings, categories, menu, media } = useSite();

  useEffect(() => {
    document.head
      .querySelectorAll('script[type="application/ld+json"][data-prerendered]')
      .forEach((node) => node.remove());

    const graphs = buildStructuredData({
      origin: window.location.origin,
      pathname,
      settings,
      categories,
      menu: menu.data,
      media,
      fallbackImage: shareImage.src,
    });

    const nodes = graphs.map((graph) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.hillsedge = graph['@type'].toLowerCase();
      script.textContent = serializeGraph(graph);
      document.head.appendChild(script);
      return script;
    });

    return () => nodes.forEach((node) => node.remove());
  }, [pathname, settings, categories, menu.data, media]);

  return null;
}

export default StructuredData;
