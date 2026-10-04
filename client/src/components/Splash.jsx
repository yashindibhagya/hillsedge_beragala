import { useEffect } from 'react';

/** Never hold the splash longer than this, however the app is doing. */
const MIN_VISIBLE_MS = 650;

/**
 * Retires the splash screen that index.html paints before any JavaScript.
 *
 * The markup and its animation are static (an inline script would need the
 * CSP loosened), so the splash appears on the very first paint and costs
 * nothing to show. Once React has mounted this fades it out — after a short
 * floor, so the logo reveal is not cut off half-drawn on a fast connection —
 * and removes it from the DOM. Under reduced motion it goes at once.
 */
export function Splash() {
  useEffect(() => {
    const node = document.getElementById('splash');
    if (!node) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // performance.now() counts from navigation start — when the splash first painted.
    const wait = reduce ? 0 : Math.max(0, MIN_VISIBLE_MS - performance.now());

    const timer = setTimeout(() => {
      node.classList.add('is-leaving');
      const remove = () => node.remove();
      node.addEventListener('transitionend', remove, { once: true });
      // transitionend never fires if transitions are off; do not rely on it.
      setTimeout(remove, reduce ? 0 : 700);
    }, wait);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

export default Splash;
