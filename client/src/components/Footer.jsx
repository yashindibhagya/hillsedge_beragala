import { useState } from 'react';
import { navLinks } from '../data/routes';
import { credit } from '../data/site';
import { useSite } from '../context/SiteData';
import { telHref } from '../lib/format';
import { TLink } from './Button';
import { Icon } from './Icon';
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

/**
 * With no mailing-list service behind the site, signing up hands the address
 * to the guest's mail app, addressed to the restaurant, so nothing is lost.
 */
function LoopForm({ to, name }) {
  const [email, setEmail] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const subject = encodeURIComponent(`Keep me in the loop — ${name}`);
    const body = encodeURIComponent(
      `Please add ${email} to the ${name} mailing list for news, menus and events.`,
    );
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

}

export function Footer() {
  const { settings } = useSite();
  const { restaurant } = settings;
  const social = useSocialProfiles();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <svg className="footer-arc" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 120V112C360 0 1080 0 1440 112V120Z" />
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

          {restaurant.email && <LoopForm to={restaurant.email} name={restaurant.name} />}
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
