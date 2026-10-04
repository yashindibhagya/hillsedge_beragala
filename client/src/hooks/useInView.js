import { useEffect, useState } from 'react';

/**
 * Whether an element is on screen, continuously — unlike useReveal, which
 * latches on first sight. Used to pause videos and carousels nobody can see.
 *
 * Returns a callback ref, so it keeps working when the element mounts later
 * than the component (a section that renders only once data arrives).
 */
export function useInView({ rootMargin = '0px', threshold = 0.2 } = {}) {
  const [node, setNode] = useState(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin,
      threshold,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, rootMargin, threshold]);

  return [setNode, inView];
}

export default useInView;
