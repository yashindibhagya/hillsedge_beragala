import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Scroll-driven storytelling: the section pins, and scrolling down moves a
 * row of panels sideways, so the page reads like turning through a book.
 *
 * Only on a wide, fine-pointer screen with motion allowed. Everywhere else —
 * phones, tablets, reduced motion — it is an ordinary horizontal row that
 * swipes and snaps, which is the better gesture on touch anyway and keeps
 * every panel reachable by keyboard and screen reader in both modes.
 *
 * The pinned mode writes one transform per frame from the section's scroll
 * progress, nothing else; the section's height is set so that the vertical
 * distance scrolled matches the horizontal distance travelled.
 */
export function HorizontalStory({ children, label, className = '' }) {
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (reduced) {
      setPinned(false);
      return undefined;
    }
    const media = window.matchMedia(
      '(min-width: 64rem) and (pointer: fine) and (min-height: 36rem)'
    );
    const update = () => setPinned(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, [reduced]);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!pinned || !section || !track) {
      if (track) track.style.transform = '';
      if (section) section.style.height = '';
      return undefined;
    }

    let distance = 0;
    const measure = () => {
      distance = Math.max(0, track.scrollWidth - window.innerWidth);
      section.style.height = `${window.innerHeight + distance}px`;
    };
    let ticking = false;
    const frame = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, distance)));
      track.style.transform = `translate3d(${(-progress * distance).toFixed(1)}px, 0, 0)`;
      section.style.setProperty('--progress', progress.toFixed(3));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(frame);
    };
    const onResize = () => {
      measure();
      frame();
    };

    measure();
    frame();
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(track);
    return () => {
      document.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      track.style.transform = '';
      section.style.height = '';
    };
  }, [pinned]);

  return (
    <section
      ref={sectionRef}
      className={`hstory ${pinned ? 'is-pinned' : 'is-free'} ${className}`.trim()}
      aria-label={label}
    >
      <div className="hstory-sticky">
        <div className="hstory-track" ref={trackRef}>
          {children}
        </div>
        {pinned && (
          <div className="hstory-progress" aria-hidden="true">
            <span />
          </div>
        )}
      </div>
    </section>
  );
}

export default HorizontalStory;
