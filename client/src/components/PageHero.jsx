import { useDeclareHero } from '../context/Hero';
import { useParallax } from '../hooks/useParallax';
import { Media } from './Media';
import { Picture } from './Picture';

/**
 * The opening of an inner page: a full-bleed image (live media from the
 * admin, else a bundled photograph) with the page's title laid over it.
 * Shorter than the home hero — enough to set the scene, not to make anybody
 * scroll for the content.
 */
export function PageHero({ eyebrow, title, intro, media, photo, children, align = 'start' }) {
  useDeclareHero();
  const parallax = useParallax(50);

  return (
    <section className={`page-hero page-hero-${align}`}>
      <div className="page-hero-media" aria-hidden="true">
        <div className="page-hero-parallax" ref={parallax}>
          <Media
            media={media}
            priority
            className="page-hero-img"
            fallback={
              photo ? <Picture photo={photo} priority className="page-hero-img" alt="" /> : null
            }
          />
        </div>
      </div>
      <div className="page-hero-content wrap">
        {eyebrow && (
          <p className="eyebrow eyebrow-light hero-in" style={{ '--i': 0 }}>
            {eyebrow}
          </p>
        )}
        <h1 className="page-hero-title hero-in" style={{ '--i': 1 }}>
          {title}
        </h1>
        {intro && (
          <p className="page-hero-intro hero-in" style={{ '--i': 2 }}>
            {intro}
          </p>
        )}
        {children && (
          <div className="page-hero-actions hero-in" style={{ '--i': 3 }}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

/** A quieter opening for pages that lead with content rather than a picture. */
export function PageIntro({ eyebrow, title, intro, children }) {
  return (
    <section className="page-intro wrap">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="page-intro-title">{title}</h1>
      {intro && <p className="page-intro-lede">{intro}</p>}
      {children}
    </section>
  );
}

export default PageHero;
