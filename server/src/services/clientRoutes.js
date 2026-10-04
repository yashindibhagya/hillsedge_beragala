import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config/index.js';

/**
 * The public site's route list, read from the client's own definition so the
 * server can answer an unknown URL with a real 404 (search engines treat a
 * "not found" page served with 200 as a soft 404) and send old URLs on with a
 * permanent redirect rather than a client-side hop.
 *
 * client/src/data/routes.js is deliberately import-free for exactly this kind
 * of reuse. If it cannot be read — the API deployed without the client source
 * — every path is treated as known, which is the previous behaviour.
 */
let routes = null;
try {
  const file = path.resolve(config.clientDir, '..', 'src', 'data', 'routes.js');
  routes = await import(pathToFileURL(file).href);
} catch {
  routes = null;
}

const known = routes ? new Set(routes.navLinks.map((link) => link.to)) : null;
const moved = new Map((routes?.redirects ?? []).map((r) => [r.from, r.to]));

/** Strips a trailing slash, so /menu/ and /menu are the same page. */
const normalise = (pathname) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);

export function redirectFor(pathname) {
  return moved.get(normalise(pathname)) ?? null;
}

export function isKnownRoute(pathname) {
  return known ? known.has(normalise(pathname)) : true;
}
