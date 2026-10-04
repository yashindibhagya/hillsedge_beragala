import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { bootApp, withTempStore } from './helpers.js';

/*
 * Exercises the server as it runs in production, serving the real builds.
 * Skipped when they have not been built (run `npm run build` first).
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const clientDist = path.join(root, 'client', 'dist');
const adminDist = path.join(root, 'admin', 'dist');
const built =
  existsSync(path.join(clientDist, 'index.html')) && existsSync(path.join(adminDist, 'index.html'));

let app;
let cleanup;

describe.skipIf(!built)('serving the built apps', () => {
  beforeAll(async () => {
    ({ cleanup } = await withTempStore({
      SERVE_CLIENT: 'true',
      CLIENT_DIR: clientDist,
      ADMIN_DIR: adminDist,
    }));
    app = await bootApp();
  });

  afterAll(() => cleanup());

  it('answers every public route with the app shell', async () => {
    for (const route of [
      '/',
      '/menu',
      '/about',
      '/experiences',
      '/rooms',
      '/gallery',
      '/reservations',
      '/contact',
      '/menu/',
    ]) {
      const res = await request(app).get(route);
      expect(res.status, route).toBe(200);
      expect(res.text).toMatch(/<div id="root">/);
    }
  });

  it('answers an unknown page with the shell and a real 404', async () => {
    const res = await request(app).get('/no-such-page').expect(404);
    expect(res.text).toMatch(/<div id="root">/);
  });

  it('permanently redirects the old URLs, keeping the query', async () => {
    await request(app).get('/cuisine').expect(301).expect('Location', '/menu');
    await request(app).get('/visit?x=1').expect(301).expect('Location', '/contact?x=1');
    await request(app).get('/smokehouse').expect(301).expect('Location', '/experiences');
  });

  it('serves the admin panel at /admin without indexing it', async () => {
    for (const route of ['/admin', '/admin/', '/admin/menu']) {
      const res = await request(app).get(route);
      expect(res.status, route).toBe(200);
      expect(res.headers['x-robots-tag']).toMatch(/noindex/);
      expect(res.headers['cache-control']).toBe('no-store');
    }
  });

  it('keeps robots away from the admin and the API', async () => {
    const res = await request(app).get('/robots.txt').expect(200);
    expect(res.text).toMatch(/Disallow: \/admin/);
    expect(res.text).toMatch(/Disallow: \/api\//);
  });
});
