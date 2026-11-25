import { useEffect, useState } from 'react';
import { useSite } from '../context/SiteData';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Icon } from './Icon';

const ROTATE_MS = 7000;

/**
 * Guest reviews, one at a time, turning on their own.
 *
 * Only reviews the admin has entered are shown, and the section is absent
 * when there are none — the site never invents praise. There are no buttons:
 * a row of hairlines under the quote fills while each review is read, and the
 * next one follows when its line is full. Hovering, focusing or scrolling
 * away holds the current review. The fill's animationend drives the turn, so
 * a hold freezes line and timer together; under reduced motion the fill is
 * not animated and a plain interval turns the reviews instead.
 */
export function Testimonials() {
  const { testimonials } = useSite();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const count = testimonials.length;
  const running = count > 1 && !held && inView;

  useEffect(() => {
    if (!running || !reduced) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(timer);
  }, [running, reduced, count]);

  if (count === 0) return null;
  const current = testimonials[Math.min(index, count - 1)];
  const next = () => setIndex((i) => (i + 1) % count);

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
          <div
            className={`quote-progress${running ? '' : ' is-held'}`}
            style={{ '--rotate-ms': `${ROTATE_MS}ms` }}
            aria-hidden="true"
          >
            {testimonials.map((t, i) => (
              <span
                key={t.id}
                className={i < index ? 'is-done' : i === index ? 'is-active' : undefined}
              >
                {i === index && !reduced && <i key={current.id} onAnimationEnd={next} />}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Testimonials;
