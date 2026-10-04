/**
 * The site's routes, in navigation order.
 *
 * Deliberately free of imports so the build scripts can read it directly —
 * `scripts/generate-seo.mjs` derives sitemap.xml from this list, which is what
 * stops the sitemap drifting out of step with the router.
 *
 * `nav: false` keeps a page out of the header (it is reached another way)
 * while still listing it in the sitemap.
 */
export const navLinks = [
  { to: '/', label: 'Home', index: '01', priority: '1.0' },
  { to: '/menu', label: 'Menu', index: '02', priority: '0.9' },
  { to: '/about', label: 'About', index: '03', priority: '0.7' },
  { to: '/experiences', label: 'Experiences', index: '04', priority: '0.8' },
  { to: '/rooms', label: 'Rooms', index: '05', priority: '0.7' },
  { to: '/gallery', label: 'Gallery', index: '06', priority: '0.6' },
  { to: '/contact', label: 'Contact', index: '07', priority: '0.8' },
  { to: '/reservations', label: 'Reservations', index: '08', priority: '0.9', nav: false },
];

/** Old URLs that now live elsewhere. The router redirects them. */
export const redirects = [
  { from: '/cuisine', to: '/menu' },
  { from: '/smokehouse', to: '/experiences' },
  { from: '/visit', to: '/contact' },
];

/**
 * Where the site is served from in production. This is the one place to
 * change it — the sitemap and robots.txt are generated from it, and
 * everything in the app derives absolute URLs from the live origin instead.
 */
export const PRODUCTION_ORIGIN = 'https://hillsedgeberagala.com';

export default navLinks;
