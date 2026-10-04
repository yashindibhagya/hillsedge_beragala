import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { config } from '../config/index.js';
import { newId, now, read, write } from './store.js';

const scrypt = promisify(scryptCallback);

/**
 * Passwords, sessions and reset tokens.
 *
 * Passwords are hashed with scrypt from Node's own crypto — no native
 * dependency to compile. Session ids and reset tokens are random 32-byte
 * values; only their SHA-256 is stored, so a leaked copy of the data file
 * cannot be used to sign in as anybody.
 */

export const SESSION_COOKIE = 'hb_session';
const RESET_TTL_MS = 60 * 60 * 1000;
export const MIN_PASSWORD = 10;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltB64, keyB64] = String(stored ?? '').split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(expected, actual);
}

export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return `Use at least ${MIN_PASSWORD} characters.`;
  }
  if (password.length > 200) return 'Keep it under 200 characters.';
  return null;
}

/** What is safe to send to the browser about a user. */
export function publicUser(user) {
  if (!user) return null;
  const { id, name, email, role, active, createdAt, lastLoginAt } = user;
  return { id, name, email, role, active, createdAt, lastLoginAt };
}

/* A hash to compare against when the email is unknown, so a failed login
 * takes the same time whether or not the account exists. */
let decoyHash = null;

export async function authenticate(email, password) {
  const normalised = String(email ?? '')
    .trim()
    .toLowerCase();
  const user = read().users.find((u) => u.email === normalised);
  decoyHash ??= await hashPassword(randomBytes(16).toString('hex'));
  const valid = await verifyPassword(String(password ?? ''), user?.passwordHash ?? decoyHash);
  if (!user || !valid || !user.active) return null;
  return user;
}

export async function createSession(user) {
  const raw = token();
  const at = now();
  await write((data) => {
    // Sweep expired sessions while we are here.
    const cutoff = Date.now();
    data.sessions = data.sessions.filter((s) => Date.parse(s.expiresAt) > cutoff);
    data.sessions.push({
      id: sha256(raw),
      userId: user.id,
      createdAt: at,
      expiresAt: new Date(Date.now() + config.sessionTtlMs).toISOString(),
    });
    const stored = data.users.find((u) => u.id === user.id);
    if (stored) stored.lastLoginAt = at;
  });
  return raw;
}

/**
 * Resolves a session cookie to its user, sliding the expiry forward. The
 * slide is written at most once a minute, so browsing the admin does not
 * rewrite the data file on every request.
 */
export async function resolveSession(raw) {
  if (!raw) return null;
  const id = sha256(raw);
  const data = read();
  const session = data.sessions.find((s) => s.id === id);
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null;
  // However active, a session ends after SESSION_MAX_DAYS and must sign in again.
  if (Date.parse(session.createdAt) + config.sessionMaxMs <= Date.now()) return null;
  const user = data.users.find((u) => u.id === session.userId);
  if (!user || !user.active) return null;

  const next = Math.min(
    Date.now() + config.sessionTtlMs,
    Date.parse(session.createdAt) + config.sessionMaxMs
  );
  if (next - Date.parse(session.expiresAt) > 60_000) {
    await write((d) => {
      const s = d.sessions.find((x) => x.id === id);
      if (s) s.expiresAt = new Date(next).toISOString();
    });
  }
  return user;
}

export async function destroySession(raw) {
  if (!raw) return;
  const id = sha256(raw);
  await write((data) => {
    data.sessions = data.sessions.filter((s) => s.id !== id);
  });
}

/** Signs a user out everywhere — after a password change or deactivation. */
export function destroyUserSessions(data, userId, exceptRaw = null) {
  const keep = exceptRaw ? sha256(exceptRaw) : null;
  data.sessions = data.sessions.filter((s) => s.userId !== userId || s.id === keep);
  // Any outstanding reset link is void once the password changes some other way.
  data.passwordResets = data.passwordResets.filter((r) => r.userId !== userId);
}

/** Returns the raw token to email, or null if there is no such active user. */
export async function createPasswordReset(email) {
  const normalised = String(email ?? '')
    .trim()
    .toLowerCase();
  const user = read().users.find((u) => u.email === normalised && u.active);
  if (!user) return null;
  const raw = token();
  await write((data) => {
    const cutoff = Date.now();
    data.passwordResets = data.passwordResets.filter(
      (r) => r.userId !== user.id && Date.parse(r.expiresAt) > cutoff
    );
    data.passwordResets.push({
      id: sha256(raw),
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
    });
  });
  return { user, token: raw };
}

/** Uses a reset token once. Returns the user, or null if it is not valid. */
export async function consumePasswordReset(raw, password) {
  const id = sha256(String(raw ?? ''));
  const passwordHash = await hashPassword(password);
  return write((data) => {
    const reset = data.passwordResets.find((r) => r.id === id);
    data.passwordResets = data.passwordResets.filter((r) => r.id !== id);
    if (!reset || Date.parse(reset.expiresAt) <= Date.now()) return null;
    const user = data.users.find((u) => u.id === reset.userId && u.active);
    if (!user) return null;
    user.passwordHash = passwordHash;
    destroyUserSessions(data, user.id);
    return user;
  });
}

/**
 * Makes sure somebody can sign in. On a fresh store, creates a super admin
 * from ADMIN_EMAIL / ADMIN_PASSWORD; failing that, outside production,
 * creates one with a generated password and prints it once.
 */
export async function ensureBootstrapAdmin() {
  if (read().users.length > 0) return;
  const { email, password, name } = config.bootstrapAdmin;

  let credentials = null;
  if (email && password) {
    const problem = passwordProblem(password);
    if (problem) {
      console.warn(`[auth] ADMIN_PASSWORD rejected: ${problem} No admin was created.`);
      return;
    }
    credentials = { email: email.toLowerCase(), password, generated: false };
  } else if (!config.isProduction) {
    credentials = {
      email: 'admin@hillsedge.local',
      password: randomBytes(9).toString('base64url'),
      generated: true,
    };
  } else {
    console.warn(
      '[auth] No admin users exist. Set ADMIN_EMAIL and ADMIN_PASSWORD and restart to create one.'
    );
    return;
  }

  const passwordHash = await hashPassword(credentials.password);
  await write((data) => {
    data.users.push({
      id: newId(),
      name,
      email: credentials.email,
      role: 'super_admin',
      active: true,
      passwordHash,
      createdAt: now(),
      lastLoginAt: null,
    });
  });

  if (credentials.generated) {
    console.log(
      `[auth] Created a development super admin:\n` +
        `         email:    ${credentials.email}\n` +
        `         password: ${credentials.password}\n` +
        `       Change it from the admin panel, or set ADMIN_EMAIL / ADMIN_PASSWORD.`
    );
  } else {
    console.log(`[auth] Created super admin ${credentials.email}.`);
  }
}
