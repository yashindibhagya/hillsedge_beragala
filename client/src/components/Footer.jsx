import { navLinks } from '../data/routes';
import { designById } from '../../../shared/themes.js';
import { credit } from '../data/site';
import { useSite } from '../context/SiteData';
import { useTheme } from '../context/Theme';
import { telHref } from '../lib/format';
import { TLink } from './Button';
import { useSocialProfiles } from './SocialLinks';

/** The name set across the foot of the page, cropped at the bottom edge. */
const WORDMARK = 'Hillsedge';

const explore = navLinks.filter((link) => link.nav !== false);
const half = Math.ceil(explore.length / 2);

const guestLinks = [
  { to: '/reservations', label: 'Reserve a table' },
  { to: '/contact#faq', label: 'Booking & dietary FAQs' },
  { to: '/reservations#policy', label: 'Reservation policy' },
];

export function Footer() {
  const { settings } = useSite();
  const { restaurant } = settings;
  const social = useSocialProfiles();
  const { design } = useTheme();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <svg
        className="footer-arc"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={designById(design).footer} />
      </svg>

      <div className="footer-body">
        <div className="footer-grid wrap">
          <nav className="footer-info" aria-label="Footer">
            <h2 className="footer-heading">Info</h2>
            <div className="footer-cols">
              <ul>
                {explore.slice(0, half).map(({ to, label }) => (
                  <li key={to}>
                    <TLink to={to}>{label}</TLink>
                  </li>
                ))}
              </ul>
              <ul>
                {explore.slice(half).map(({ to, label }) => (
                  <li key={to}>
                    <TLink to={to}>{label}</TLink>
                  </li>
                ))}
              </ul>
              <ul>
                {guestLinks.map(({ to, label }) => (
                  <li key={to}>
                    <TLink to={to}>{label}</TLink>
                  </li>
                ))}
              </ul>
              <ul className="footer-contact">
                {restaurant.phone && (
                  <li>
                    <a href={telHref(restaurant.phone)}>{restaurant.phone}</a>
                  </li>
                )}
                {restaurant.email && (
                  <li>
                    <a href={`mailto:${restaurant.email}`}>{restaurant.email}</a>
                  </li>
                )}
                {restaurant.mapsUrl && (
                  <li>
                    <a href={restaurant.mapsUrl} target="_blank" rel="noopener noreferrer">
                      Get directions
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </nav>

          {social.length > 0 && (
            <div className="footer-follow">
              <h2 className="footer-heading">Follow Hillsedge</h2>
              <ul>
                {social.map(({ key, label, href }) => (
                  <li key={key}>
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="footer-bottom wrap">
          <p>
            © {year} {restaurant.name}. All rights reserved.
          </p>
          <p className="credit">
            {credit.prefix}{' '}
            <a href={credit.href} target="_blank" rel="noopener noreferrer">
              {credit.name}
            </a>
          </p>
        </div>

        <svg className="footer-wordmark" viewBox="0 0 1000 150" aria-hidden="true">
          <text x="0" y="168" textLength="1000" lengthAdjust="spacingAndGlyphs">
            {WORDMARK.toUpperCase()}
          </text>
        </svg>
      </div>
    </footer>
  );
}

export default Footer;
