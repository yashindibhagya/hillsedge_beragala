import { useLocation } from 'react-router-dom';
import { useScrolled } from '../hooks/useScrolled';
import { useSite } from '../context/SiteData';
import { telHref } from '../lib/format';
import { Button } from './Button';
import { Icon } from './Icon';

/**
 * On phones, a bar pinned to the bottom of the screen with the two things a
 * guest most often came to do: book, or call. It appears once the page has
 * scrolled past the first screen, and stays off the booking page itself.
 */
export function StickyReserve() {
  const { pathname } = useLocation();
  const scrolled = useScrolled(480);
  const { settings } = useSite();
  if (pathname === '/reservations') return null;

  return (
    <div className={`sticky-reserve ${scrolled ? 'is-visible' : ''}`} aria-hidden={!scrolled}>
      {settings.restaurant.phone && (
        <a
          className="sticky-reserve-call"
          href={telHref(settings.restaurant.phone)}
          tabIndex={scrolled ? 0 : -1}
        >
          <Icon name="phone" size={20} />
          <span className="sr-only">Call {settings.restaurant.phone}</span>
        </a>
      )}
      <Button
        to="/reservations"
        variant="gold"
        arrow
        tabIndex={scrolled ? 0 : -1}
        className="sticky-reserve-btn"
      >
        Reserve a table
      </Button>
    </div>
  );
}

export default StickyReserve;
