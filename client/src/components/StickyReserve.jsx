import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useInView } from '../hooks/useInView';
import { useScrolled } from '../hooks/useScrolled';
import { useSite } from '../context/SiteData';
import { telHref } from '../lib/format';
import { TLink } from './Button';
import { Icon } from './Icon';

/**
 * On phones, a dock floating over the bottom of the screen with the two
 * things a guest most often came to do: book, or call. It rises once the
 * page has scrolled past the first screen, steps aside when the footer comes
 * into view (which has the same links), and stays off the booking page.
 */
export function StickyReserve() {
  const { pathname } = useLocation();
  const scrolled = useScrolled(480);
  const { settings } = useSite();
  const [watchFooter, footerInView] = useInView({ threshold: 0 });

  // The footer is a sibling in the layout, rendered in the same pass.
  useEffect(() => {
    watchFooter(document.querySelector('.site-footer'));
  }, [watchFooter]);

  if (pathname === '/reservations') return null;

  const { phone } = settings.restaurant;
  const visible = scrolled && !footerInView;
  const tabIndex = visible ? 0 : -1;

  return (
    <div className={`sticky-reserve ${visible ? 'is-visible' : ''}`} aria-hidden={!visible}>
      {phone && (
        <a className="sticky-reserve-call" href={telHref(phone)} tabIndex={tabIndex}>
          <span className="sticky-reserve-call-icon">
            <Icon name="phone" size={20} />
          </span>
          <span className="sr-only">Call {phone}</span>
        </a>
      )}
      <TLink to="/reservations" className="sticky-reserve-btn" tabIndex={tabIndex}>
        <span className="sticky-reserve-text">
          <span className="sticky-reserve-eyebrow">Book online</span>
          <span className="sticky-reserve-label">Reserve a table</span>
        </span>
        <span className="sticky-reserve-arrow">
          <Icon name="arrow" size={18} />
        </span>
      </TLink>
    </div>
  );
}

export default StickyReserve;
