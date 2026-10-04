import { useEffect, useRef } from 'react';

/**
 * Gentle vertical drift on an image as it crosses the viewport. Writes a
 * transform only — never layout — and only while the element is near the
 * screen. Disabled for reduced-motion users and on coarse pointers, where it
 * costs battery and fights native scrolling.
 */
export function useParallax(strength = 40, { scale = 1.12 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduce || coarse) return undefined;

    let ticking = false;
    const frame = () => {
      ticking = false;
      const vh = window.innerHeight;
      const rect = node.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      node.style.transform = `translate3d(0, ${(progress * strength).toFixed(2)}px, 0) scale(${scale})`;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(frame);
    };

    frame();
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [strength, scale]);

  return ref;
}

export default useParallax;
