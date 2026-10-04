import { useEffect, useState } from 'react';
import { useSite } from '../context/SiteData';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Icon } from './Icon';

const ROTATE_MS = 7000;

/**
 * Guest reviews, one at a time.
 *
 * Only reviews the admin has entered are shown, and the section is absent
 * when there are none — the site never invents praise. Rotation pauses on
 * hover, on focus, off screen, when the guest presses pause, and entirely
 * under reduced motion; the arrows reach every review without any of that.
 */
export function Testimonials() {
  const { testimonials } = useSite();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const count = testimonials.length;
  const rotating = count > 1 && !paused && !held && !reduced && inView;

  useEffect(() => {
    if (!rotating) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(timer);
  }, [rotating, count]);

  if (count === 0) return null;
  const current = testimonials[Math.min(index, count - 1)];
  const go = (delta) => setIndex((i) => (i + delta + count) % count);

  return (
    <section
      className="section testimonials"
      aria-labelledby="testimonials-title"
      aria-roledescription="carousel"
      ref={ref}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <div className="wrap testimonials-inner">
        <p className="eyebrow">From our guests</p>
        <h2 className="sr-only" id="testimonials-title">
          Guest reviews
        </h2>
        <figure
          className="quote"
          key={current.id}
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${count}`}
        >
          {current.rating && (
            <p className="quote-rating" aria-label={`Rated ${current.rating} out of 5`}>
              {Array.from({ length: current.rating }, (_, i) => (
                <Icon key={i} name="star" size={16} />
              ))}
            </p>
          )}
          <blockquote>
            <p>{current.quote}</p>
          </blockquote>
          <figcaption>
            <span className="quote-author">{current.author}</span>
            {current.origin && <span className="quote-origin">{current.origin}</span>}
            {current.source &&
              (current.sourceUrl ? (
                <a
                  href={current.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quote-source"
                >
                  via {current.source}
                </a>
              ) : (
                <span className="quote-source">via {current.source}</span>
              ))}
          </figcaption>
        </figure>
        {count > 1 && (
          <div className="carousel-controls">
            <button type="button" className="icon-btn" onClick={() => go(-1)}>
              <Icon name="chevronLeft" />
              <span className="sr-only">Previous review</span>
            </button>
            <span className="carousel-count" aria-live={rotating ? 'off' : 'polite'}>
              {index + 1} / {count}
            </span>
            <button type="button" className="icon-btn" onClick={() => go(1)}>
              <Icon name="chevronRight" />
              <span className="sr-only">Next review</span>
            </button>
            {!reduced && (
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
              >
                <Icon name={paused ? 'play' : 'pause'} />
                <span className="sr-only">{paused ? 'Resume' : 'Pause'} rotation</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default Testimonials;
