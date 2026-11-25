/**
 * Where the site being built will be served from, for the files that need an
 * absolute URL baked in: sitemap.xml, robots.txt, llms.txt and each page's
 * canonical and share tags.
 *
 * In order:
 *   1. SITE_ORIGIN, when set — for any host, e.g. SITE_ORIGIN=https://example.com
 *   2. On Vercel, the project's production domain. That is the custom domain
 *      once one is attached and the *.vercel.app address until then, so the
 *      sitemap never advertises a domain that is not serving the site yet.
 *      Preview deployments get the production address too, which is right:
 *      a preview should name production as the canonical copy.
 *   3. PRODUCTION_ORIGIN in src/data/routes.js.
 */
import { PRODUCTION_ORIGIN } from '../src/data/routes.js';

const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : null;

export const SITE_ORIGIN = (process.env.SITE_ORIGIN || fromVercel || PRODUCTION_ORIGIN).replace(
  /\/+$/,
  ''
);

export default SITE_ORIGIN;
