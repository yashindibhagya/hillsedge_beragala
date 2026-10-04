import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';

export const ADMIN = { email: 'owner@hillsedge.test', password: 'correct-horse-battery' };
export const APP_HEADER = ['X-Requested-With', 'hillsedge-admin'];

/**
 * Points the store, uploads and legacy bookings at a throwaway directory and
 * seeds without photographs (processing them takes seconds).
 *
 * Config reads the environment once at import time, so this must run before
 * anything imports it — hence the dynamic imports in the tests.
 */
export async function withTempStore(env = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'hillsedge-'));
  Object.assign(process.env, {
    DATA_FILE: path.join(dir, 'store.json'),
    UPLOADS_DIR: path.join(dir, 'uploads'),
    RESERVATIONS_FILE: path.join(dir, 'reservations.jsonl'),
    SEED_MEDIA_DIR: '',
    SERVE_CLIENT: 'false',
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
    ...env,
  });
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

/** Opens the store and builds an app, from a fresh module registry. */
export async function bootApp() {
  const [{ createApp }, { initStore }] = await Promise.all([
    import('../src/app.js'),
    import('../src/services/bootstrap.js'),
  ]);
  await initStore();
  return createApp();
}

/** A supertest agent signed in as `credentials`, sending the app header. */
export async function signIn(app, credentials = ADMIN) {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/login')
    .set(...APP_HEADER)
    .send(credentials)
    .expect(200);
  const wrap = (method) => (url) => agent[method](url).set(...APP_HEADER);
  return {
    agent,
    get: wrap('get'),
    post: wrap('post'),
    patch: wrap('patch'),
    put: wrap('put'),
    delete: wrap('delete'),
  };
}

/** A local date `days` from today, `YYYY-MM-DD`. */
export function dayFromToday(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** A booking that should always be accepted. */
export function validBooking(overrides = {}) {
  return {
    name: 'Priya',
    phone: '+94 77 123 4567',
    email: '',
    guests: 4,
    date: dayFromToday(3),
    time: 'Sunset',
    message: '',
    ...overrides,
  };
}
