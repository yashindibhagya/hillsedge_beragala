import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** How long to keep looking for a hash target before giving up (ms). */
const HASH_TIMEOUT = 4000;

/**
 * Routing between pages lands at the top; an in-page hash link (#reserve,
 * #process…) scrolls to its target instead.
 *
 * Route components are lazily loaded, and menu sections wait on the API, so
 * the target frequently does not exist on the first frame after navigation —
 * hence the bounded retry rather than a single lookup.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return undefined;
    }

    let frame = 0;
    const deadline = performance.now() + HASH_TIMEOUT;

    const look = () => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      if (performance.now() < deadline) frame = requestAnimationFrame(look);
    };

    frame = requestAnimationFrame(look);
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
