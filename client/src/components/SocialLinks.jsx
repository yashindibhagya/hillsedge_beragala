import { useSite } from '../context/SiteData';
import { Icon } from './Icon';

const PROFILES = [
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['tripadvisor', 'Tripadvisor'],
  ['tiktok', 'TikTok'],
  ['youtube', 'YouTube'],
];

/**
 * Social profiles from the admin's settings, plus WhatsApp from the phone
 * details. A profile with no URL is left out rather than linking nowhere.
 */
export function SocialLinks({ className = '' }) {
  const { settings } = useSite();
  const links = PROFILES.filter(([key]) => settings.social?.[key]).map(([key, label]) => ({
    key,
    label,
    href: settings.social[key],
  }));
  if (settings.restaurant.whatsapp) {
    links.push({
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/${settings.restaurant.whatsapp}`,
    });
  }
  if (links.length === 0) return null;

  return (
    <ul className={`social ${className}`.trim()}>
      {links.map(({ key, label, href }) => (
        <li key={key}>
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
            <Icon name={key} size={20} />
          </a>
        </li>
      ))}
    </ul>
  );
}

export default SocialLinks;
