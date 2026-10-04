import helmet from 'helmet';
import { config } from '../config/index.js';

/*
 * The same policy the static hosting configs carry, so the site behaves
 * identically whether it is served by this process, Apache, Netlify or
 * Vercel. Keep these in step with client/public/_headers and
 * client/public/.htaccess.
 */
const directives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  formAction: ["'self'"],
  scriptSrc: ["'self'"],
  // React writes inline style attributes, which style-src-attr covers; the
  // webfont stylesheet comes from Google.
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  // blob: lets the admin preview a photo before it finishes uploading.
  imgSrc: ["'self'", 'data:', 'blob:'],
  mediaSrc: ["'self'", 'blob:'],
  frameSrc: ['https://maps.google.com', 'https://www.google.com'],
  connectSrc: ["'self'"],
  manifestSrc: ["'self'"],
};

if (config.isProduction) directives.upgradeInsecureRequests = [];

export const security = helmet({
  contentSecurityPolicy: { useDefaults: false, directives },
  // Served cross-origin by a CDN in some setups; the default would block it.
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // helmet defaults to SAMEORIGIN; the static configs send DENY, and so does
  // frame-ancestors above. Match the stricter one rather than disagree.
  frameguard: { action: 'deny' },
  hsts: config.isProduction ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
});

export default security;
