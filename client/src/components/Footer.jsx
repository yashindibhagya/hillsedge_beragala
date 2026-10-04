import { navLinks } from '../data/routes';
import { credit } from '../data/site';
import { useSite } from '../context/SiteData';
import { addressLines, groupHours, telHref } from '../lib/format';
import { BrandMark } from './BrandMark';
import { Button, TLink } from './Button';
import { SocialLinks } from './SocialLinks';

export function Footer() {
  const { settings } = useSite();
  const { restaurant, hours } = settings;
  const rows = groupHours(hours.days);
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-grid wrap">
        <div className="footer-brand">
          <BrandMark variant="full" className="footer-mark" />
          <p>{restaurant.tagline}</p>
          <Button to="/reservations" variant="gold" size="sm" arrow>
            Reserve a table
          </Button>
          <SocialLinks className="social-light" />
        </div>

        <nav className="footer-col" aria-label="Footer">
          <h2 className="footer-heading">Explore</h2>
          <ul>
            {navLinks.map(({ to, label }) => (
              <li key={to}>
                <TLink to={to}>{label}</TLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-col">
          <h2 className="footer-heading">Visit</h2>
          <address>
            {addressLines(restaurant.address).map((line) => (
              <span key={line}>{line}</span>
            ))}
            <span>{restaurant.region}</span>
          </address>
          {restaurant.mapsUrl && (
            <a
              href={restaurant.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Open in Google Maps
            </a>
          )}
        </div>

        <div className="footer-col">
          <h2 className="footer-heading">Hours</h2>
          {hours.summary && <p>{hours.summary}</p>}
          {rows.length > 0 && (
            <dl className="footer-hours">
              {rows.map(({ label, value }) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <h2 className="footer-heading footer-heading-gap">Contact</h2>
          <ul>
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
          </ul>
        </div>
      </div>

      <div className="footer-bottom wrap">
        <p>
          © {year} {restaurant.name}. All rights reserved.
        </p>
        <ul className="footer-policies">
          <li>
            <TLink to="/contact#faq">Booking & dietary FAQs</TLink>
          </li>
          <li>
            <TLink to="/reservations#policy">Reservation policy</TLink>
          </li>
        </ul>
        <p className="credit">
          {credit.prefix}{' '}
          <a href={credit.href} target="_blank" rel="noopener noreferrer">
            {credit.name}
          </a>
        </p>
      </div>
    </footer>
  );
}

export default Footer;
