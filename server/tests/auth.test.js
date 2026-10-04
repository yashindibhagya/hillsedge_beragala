import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ADMIN, APP_HEADER, bootApp, signIn, withTempStore } from './helpers.js';

let app;
let cleanup;

beforeAll(async () => {
  ({ cleanup } = await withTempStore());
  app = await bootApp();
});

afterAll(() => cleanup());

const login = (body) =>
  request(app)
    .post('/api/auth/login')
    .set(...APP_HEADER)
    .send(body);

describe('sign in', () => {
  it('creates the bootstrap super admin and signs them in with an httpOnly, strict cookie', async () => {
    const res = await login(ADMIN).expect(200);
    expect(res.body.user).toMatchObject({ email: ADMIN.email, role: 'super_admin' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.permissions).toContain('users:manage');

    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^hb_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api/);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await login({ ...ADMIN, password: 'nope-nope-nope' }).expect(401);
    const unknown = await login({ email: 'who@nowhere.test', password: 'whatever-123' }).expect(
      401
    );
    expect(wrong.body.error).toBe(unknown.body.error);
  });

  it('needs the app header, so a cross-site form cannot post here', async () => {
    await request(app).post('/api/auth/login').send(ADMIN).expect(403);
  });

  it('does not store the session token itself', async () => {
    const res = await login(ADMIN).expect(200);
    const raw = decodeURIComponent(res.headers['set-cookie'][0].split(';')[0].split('=')[1]);
    const { read } = await import('../src/services/store.js');
    expect(read().sessions.some((s) => s.id === raw)).toBe(false);
    expect(read().sessions.length).toBeGreaterThan(0);
  });
});

describe('sessions', () => {
  it('answers /me for a signed-in user and 401 otherwise', async () => {
    const session = await signIn(app);
    const res = await session.get('/api/auth/me').expect(200);
    expect(res.body.user.email).toBe(ADMIN.email);
    await request(app)
      .get('/api/auth/me')
      .set(...APP_HEADER)
      .expect(401);
  });

  it('signs out', async () => {
    const session = await signIn(app);
    await session.post('/api/auth/logout').expect(204);
    await session.get('/api/auth/me').expect(401);
  });

  it('refuses admin routes without a session', async () => {
    await request(app)
      .get('/api/admin/dashboard')
      .set(...APP_HEADER)
      .expect(401);
  });

  it('marks admin responses uncacheable', async () => {
    const session = await signIn(app);
    const res = await session.get('/api/admin/dashboard').expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('password reset', () => {
  it('answers identically whether or not the account exists', async () => {
    const known = await request(app)
      .post('/api/auth/forgot')
      .set(...APP_HEADER)
      .send({ email: ADMIN.email })
      .expect(202);
    const unknown = await request(app)
      .post('/api/auth/forgot')
      .set(...APP_HEADER)
      .send({ email: 'x@y.test' })
      .expect(202);
    expect(known.body).toEqual(unknown.body);
  });

  it('resets with a valid token exactly once, and signs out other sessions', async () => {
    const { createPasswordReset } = await import('../src/services/auth.js');
    const other = await signIn(app);
    const { token } = await createPasswordReset(ADMIN.email);

    const reset = (password) =>
      request(app)
        .post('/api/auth/reset')
        .set(...APP_HEADER)
        .send({ token, password });

    await reset('short').expect(422);
    await reset('a-brand-new-password').expect(200);
    await reset('another-new-password').expect(400);

    await other.get('/api/auth/me').expect(401);
    await login({ email: ADMIN.email, password: 'a-brand-new-password' }).expect(200);

    // Put it back for the rest of the file.
    const session = await signIn(app, { email: ADMIN.email, password: 'a-brand-new-password' });
    await session
      .post('/api/auth/password')
      .send({ current: 'a-brand-new-password', password: ADMIN.password })
      .expect(200);
  });

  it('refuses a password change with the wrong current password', async () => {
    const session = await signIn(app);
    const res = await session
      .post('/api/auth/password')
      .send({ current: 'wrong', password: 'whatever-long-enough' })
      .expect(422);
    expect(res.body.errors.current).toBeDefined();
  });
});

describe('roles', () => {
  let owner;
  const staff = { email: 'staff@hillsedge.test', password: 'staff-password-1' };
  const manager = { email: 'manager@hillsedge.test', password: 'manager-password-1' };

  beforeAll(async () => {
    owner = await signIn(app);
    await owner
      .post('/api/admin/users')
      .send({ name: 'Sam', role: 'staff', ...staff })
      .expect(201);
    await owner
      .post('/api/admin/users')
      .send({ name: 'Mani', role: 'manager', ...manager })
      .expect(201);
  });

  it('lets staff manage bookings and availability but not edit dishes', async () => {
    const s = await signIn(app, staff);
    const { body } = await s.get('/api/admin/menu-items').expect(200);
    const dish = body.items[0];

    await s
      .patch(`/api/admin/menu-items/${dish.id}/availability`)
      .send({ availability: 'sold_out' })
      .expect(200);
    await s.patch(`/api/admin/menu-items/${dish.id}`).send({ price: 1 }).expect(403);
    await s.get('/api/admin/reservations').expect(200);
    await s.get('/api/admin/users').expect(403);
    await s.patch('/api/admin/settings/home').send({ heroTitle: 'x' }).expect(403);
  });

  it('lets managers edit content but not users', async () => {
    const m = await signIn(app, manager);
    await m.patch('/api/admin/settings/home').send({ heroTitle: 'Slow smoke.' }).expect(200);
    await m.get('/api/admin/users').expect(403);
  });

  it('refuses a deactivated user', async () => {
    const { body } = await owner.get('/api/admin/users');
    const sam = body.items.find((u) => u.email === staff.email);
    const s = await signIn(app, staff);
    await owner.patch(`/api/admin/users/${sam.id}`).send({ active: false }).expect(200);
    await s.get('/api/auth/me').expect(401);
    await login(staff).expect(401);
  });

  it('never removes the last super admin', async () => {
    const { body } = await owner.get('/api/admin/users');
    const me = body.items.find((u) => u.email === ADMIN.email);
    const res = await owner
      .patch(`/api/admin/users/${me.id}`)
      .send({ role: 'manager' })
      .expect(422);
    expect(res.body.errors.role).toMatch(/last active super admin/i);
    await owner.delete(`/api/admin/users/${me.id}`).expect(409);
  });

  it('never lists password hashes', async () => {
    const { body } = await owner.get('/api/admin/users').expect(200);
    expect(body.items.every((u) => !('passwordHash' in u))).toBe(true);
  });
});

describe('review fixes', () => {
  it('never builds a reset link from the request Host', async () => {
    const { vi } = await import('vitest');
    const logs = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...a) => logs.push(a.join(' ')));
    await request(app)
      .post('/api/auth/forgot')
      .set(...APP_HEADER)
      .set('Host', 'evil.example')
      .send({ email: ADMIN.email })
      .expect(202);
    await new Promise((r) => setTimeout(r, 300));
    spy.mockRestore();
    const mail = logs.find((l) => l.includes('/admin/reset?token='));
    expect(mail).toBeDefined();
    expect(mail).not.toMatch(/evil\.example/);
  });

  it('voids outstanding reset links when the password changes another way', async () => {
    const { createPasswordReset } = await import('../src/services/auth.js');
    const { token } = await createPasswordReset(ADMIN.email);
    const session = await signIn(app);
    await session
      .post('/api/auth/password')
      .send({ current: ADMIN.password, password: 'temporary-password-9' })
      .expect(200);
    await request(app)
      .post('/api/auth/reset')
      .set(...APP_HEADER)
      .send({ token, password: 'attacker-password-1' })
      .expect(400);
    const again = await signIn(app, { email: ADMIN.email, password: 'temporary-password-9' });
    await again
      .post('/api/auth/password')
      .send({ current: 'temporary-password-9', password: ADMIN.password })
      .expect(200);
  });

  it('ends a session at its absolute limit however active it is', async () => {
    const { write } = await import('../src/services/store.js');
    const session = await signIn(app);
    await write((d) => {
      for (const s of d.sessions) s.createdAt = new Date(Date.now() - 8 * 86400000).toISOString();
    });
    await session.get('/api/auth/me').expect(401);
  });
});

// Last: it resets the module registry, which swaps out the store.
describe('login throttling', () => {
  it('counts failed attempts only', async () => {
    const { vi } = await import('vitest');
    process.env.LOGIN_RATE_LIMIT_MAX = '3';
    vi.resetModules();
    const { bootApp: boot } = await import('./helpers.js');
    const limited = await boot();
    const attempt = (password) =>
      request(limited)
        .post('/api/auth/login')
        .set(...APP_HEADER)
        .send({ email: ADMIN.email, password });

    for (let i = 0; i < 5; i++) await attempt(ADMIN.password).expect(200);
    for (let i = 0; i < 3; i++) await attempt('wrong-password').expect(401);
    await attempt('wrong-password').expect(429);
  });
});
