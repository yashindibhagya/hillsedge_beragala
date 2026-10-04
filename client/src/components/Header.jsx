import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { navLinks } from '../data/routes';
import { useScrolled } from '../hooks/useScrolled';
import { useDialog } from '../hooks/useDialog';
import { useHeroState } from '../context/Hero';
import { useSite } from '../context/SiteData';
import { telHref } from '../lib/format';
import { BrandMark } from './BrandMark';
import { Button, TLink, TNavLink } from './Button';
import { Icon } from './Icon';
import { SocialLinks } from './SocialLinks';

const primary = navLinks.filter((link) => link.nav !== false);

/**
 * Sticky header. Over a page's hero it is transparent with light text; once
 * the page scrolls, or on a page with no hero, it turns solid white.
 *
 * Below the desktop breakpoint the links fold into a full-screen menu: a
 * modal dialog with its own focus trap, closed by Escape, by choosing a
 * link, or by the route changing underneath it.
 */
export function Header() {
  const scrolled = useScrolled(24);
  const overHero = useHeroState();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { settings } = useSite();
  const { restaurant } = settings;

  useEffect(() => setOpen(false), [pathname]);

  const sheetRef = useDialog(open, { onClose: () => setOpen(false) });
  const transparent = overHero && !scrolled && !open;

  return (
    <header
      className={`site-header ${transparent ? 'is-transparent' : 'is-solid'} ${open ? 'is-open' : ''}`}
    >
      <div className="site-header-inner">
        <TLink to="/" className="brand" aria-label={`${restaurant.name} — home`}>
          <BrandMark className="brand-mark" />
          <span className="brand-word">
            <span className="brand-name">Hillsedge</span>
            <span className="brand-place">Beragala</span>
          </span>
        </TLink>

        <nav className="nav-desktop" aria-label="Main">
          <ul>
            {primary.map(({ to, label }) => (
              <li key={to}>
                <TNavLink to={to} end={to === '/'} className="nav-link">
                  {label}
                </TNavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="header-actions">
          <Button to="/reservations" variant="gold" size="sm" className="header-reserve">
            Reserve
          </Button>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? 'close' : 'menu'} size={24} />
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          ref={sheetRef}
          tabIndex={-1}
        >
          <nav aria-label="Main" className="mobile-menu-nav">
            <ol>
              {navLinks.map(({ to, label, index }, position) => (
                <li key={to} style={{ '--i': position }}>
                  <TNavLink
                    to={to}
                    end={to === '/'}
                    className="mobile-link"
                    onClick={() => setOpen(false)}
                  >
                    <span className="mobile-link-index">{index}</span>
                    <span className="mobile-link-label">{label}</span>
                  </TNavLink>
                </li>
              ))}
            </ol>
          </nav>
          <div className="mobile-menu-foot">
            <Button to="/reservations" variant="gold" arrow onClick={() => setOpen(false)}>
              Reserve a table
            </Button>
            <div className="mobile-menu-contact">
              {restaurant.phone && (
                <a href={telHref(restaurant.phone)}>
                  <Icon name="phone" size={18} /> {restaurant.phone}
                </a>
              )}
              {restaurant.email && (
                <a href={`mailto:${restaurant.email}`}>
                  <Icon name="mail" size={18} /> {restaurant.email}
                </a>
              )}
            </div>
            <SocialLinks />
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
