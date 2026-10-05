import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '../..');
const repoRoot = path.resolve(serverRoot, '..');

/*
 * Load .env before anything reads the environment. Variables already set by
 * the platform (Railway, Render, systemd) win over the file. The repo-root
 * file is the documented one; server/.env is honoured for API-only deploys.
 * Skipped under the test runner, whose environment the tests set themselves.
 */
if (!process.env.VITEST) {
  for (const file of [path.join(repoRoot, '.env'), path.join(serverRoot, '.env')]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
}

const bool = (value, fallback) =>
  value === undefined ? fallback : /^(1|true|yes|on)$/i.test(value);

const int = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Every environment-dependent value, read once.
 *
 * Reading `process.env` at import time rather than at the call site means a
 * missing or malformed variable surfaces when the process starts, not on the
 * first request that happens to need it.
 */
export const config = {
  env: process.env.NODE_ENV ?? 'development',
  get isProduction() {
    return this.env === 'production';
  },

  port: int(process.env.PORT, 4000),
  host: process.env.HOST ?? '0.0.0.0',

  /** Where `npm run build` leaves the front end. */
  clientDir: process.env.CLIENT_DIR ?? path.join(repoRoot, 'client', 'dist'),

  /** Serve the built front end as well as the API. Off, you have an API only. */
  serveClient: bool(process.env.SERVE_CLIENT, true),

  /** Where the built admin panel lives. Served at /admin when present. */
  adminDir: process.env.ADMIN_DIR ?? path.join(repoRoot, 'admin', 'dist'),

  /**
   * Everything the admin panel manages — menu, rooms, reservations, content,
   * users — in one JSON document. Must be on a volume that survives a redeploy.
   */
  dataFile: process.env.DATA_FILE ?? path.join(serverRoot, 'data', 'store.json'),

  /**
   * Postgres, for hosts that cannot keep a file (Vercel). When set, the store
   * lives in the database and DATA_FILE is ignored.
   */
  databaseUrl: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? '',

  /**
   * Vercel Blob, for hosts that cannot keep uploads on disk. When set,
   * uploads go to the Blob store and UPLOADS_DIR is ignored.
   */
  blobToken: process.env.BLOB_READ_WRITE_TOKEN ?? '',

  /** Uploaded photographs and video, and the variants derived from them. */
  uploadsDir: process.env.UPLOADS_DIR ?? path.join(serverRoot, 'data', 'uploads'),

  /**
   * Bookings taken before the store existed, as JSON Lines. Imported once on
   * first boot if the file is there; never written to again.
   */
  legacyReservationsFile:
    process.env.RESERVATIONS_FILE ?? path.join(serverRoot, 'data', 'reservations.jsonl'),

  /**
   * The photographs a fresh store is seeded with. Set SEED_MEDIA_DIR to an
   * empty string to seed without them (the tests do, for speed).
   */
  seedMediaDir:
    process.env.SEED_MEDIA_DIR ?? path.join(repoRoot, 'client', 'src', 'assets', 'images'),

  /** The first super admin, created on first boot if no users exist. */
  bootstrapAdmin: {
    email: process.env.ADMIN_EMAIL ?? '',
    password: process.env.ADMIN_PASSWORD ?? '',
    name: process.env.ADMIN_NAME ?? 'Administrator',
  },

  /** How long an admin stays signed in without activity… */
  sessionTtlMs: int(process.env.SESSION_TTL_HOURS, 12) * 60 * 60 * 1000,
  /** …and the most a session can last however active it is. */
  sessionMaxMs: int(process.env.SESSION_MAX_DAYS, 7) * 24 * 60 * 60 * 1000,

  /** The restaurant's timezone: what "today" means for bookings and offers. */
  timezone: process.env.TIMEZONE ?? 'Asia/Colombo',

  /**
   * Outgoing mail, for password resets and new-booking alerts. An SMTP URL
   * like smtps://user:pass@smtp.example.com:465. Unset, mail is written to
   * the log instead of sent.
   */
  smtpUrl: process.env.SMTP_URL ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'Hillsedge Beragala <no-reply@hillsedgeberagala.com>',
  /** Where new-booking alerts go. Blank: no alert. */
  bookingAlertTo: process.env.BOOKING_ALERT_TO ?? '',

  /** Upload ceilings, in megabytes. */
  maxImageMb: int(process.env.MAX_IMAGE_MB, 15),
  maxVideoMb: int(process.env.MAX_VIDEO_MB, 120),

  /**
   * Where password-reset links point. Falls back to the request's own origin,
   * which is right unless the admin is served from a different host.
   */
  publicOrigin: process.env.PUBLIC_ORIGIN ?? '',

  rateLimit: {
    windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: int(process.env.RATE_LIMIT_MAX, 10),
    loginMax: int(process.env.LOGIN_RATE_LIMIT_MAX, 10),
  },

  /*
   * Behind a proxy (nginx, a platform router, Cloudflare) Express sees the
   * proxy's address on every request, which would make the rate limiter
   * treat all visitors as one client. Set TRUST_PROXY to the number of
   * proxies in front of this process.
   */
  trustProxy: int(process.env.TRUST_PROXY, 0),
};

/**
 * Settings a production deploy cannot run safely without. Checked once at
 * startup so a misconfigured server refuses to start rather than quietly
 * serving something insecure.
 */
export function productionProblems() {
  if (!config.isProduction) return [];
  const problems = [];
  if (!/^https:\/\/[^/]+$/.test(config.publicOrigin)) {
    problems.push(
      "PUBLIC_ORIGIN must be set to the site's https origin (e.g. https://hillsedgeberagala.com). " +
        'Password-reset links are built from it, never from the request.'
    );
  }
  return problems;
}

export default config;
