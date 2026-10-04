import { config } from '../config/index.js';
import { SESSION_COOKIE, resolveSession } from '../services/auth.js';

/**
 * What each role may do. The admin panel reads the same list (via /auth/me)
 * to decide what to show, but this is the copy that is enforced.
 *
 *  - super_admin: everything, including users.
 *  - manager: menu, rooms, reservations, media, promotions, and all website
 *    content — which includes contact details, hours and whether online
 *    booking is open, since keeping those current is a manager's job.
 *  - staff: reservations, and switching dishes and rooms on and off.
 */
export const PERMISSIONS = {
  super_admin: ['*'],
  manager: [
    'dashboard',
    'menu:write',
    'menu:availability',
    'rooms:write',
    'rooms:availability',
    'reservations:read',
    'reservations:write',
    'reservations:delete',
    'media:write',
    'promotions:write',
    'testimonials:write',
    'content:write',
  ],
  staff: [
    'dashboard',
    'menu:availability',
    'rooms:availability',
    'reservations:read',
    'reservations:write',
  ],
};

export function can(user, permission) {
  const granted = PERMISSIONS[user?.role] ?? [];
  return granted.includes('*') || granted.includes(permission);
}

export function permissionsFor(user) {
  const granted = PERMISSIONS[user?.role] ?? [];
  if (!granted.includes('*')) return granted;
  return [
    ...new Set(
      Object.values(PERMISSIONS)
        .flat()
        .filter((p) => p !== '*')
    ),
    'users:manage',
  ];
}

export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // Strict: the cookie is never sent on a request started by another site,
    // which is what stops a forged form post acting as a signed-in admin.
    sameSite: 'strict',
    secure: config.isProduction,
    path: '/api',
    maxAge: config.sessionTtlMs,
  };
}

/** Attaches `req.user` when a valid session cookie is present. */
export async function loadUser(req, res, next) {
  try {
    req.sessionToken = readCookie(req, SESSION_COOKIE);
    req.user = await resolveSession(req.sessionToken);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  return next();
}

export const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  if (!can(req.user, permission)) {
    return res.status(403).json({ error: 'Your role does not allow that.' });
  }
  return next();
};

/**
 * A second line behind the SameSite cookie: state-changing admin requests
 * must carry a header no HTML form can set, so a cross-site form post is
 * refused even by a browser that ignores SameSite.
 */
export function requireAppHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'hillsedge-admin') {
    return res.status(403).json({ error: 'Missing request header.' });
  }
  return next();
}
