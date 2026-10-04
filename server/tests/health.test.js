import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bootApp, withTempStore } from './helpers.js';

let app;
let cleanup;

beforeAll(async () => {
  ({ cleanup } = await withTempStore());
  app = await bootApp();
});

afterAll(() => cleanup());

describe('GET /api/health', () => {
  it('reports that the service is up', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(Date.parse(res.body.timestamp)).not.toBeNaN();
  });
});

describe('unknown API paths', () => {
  it('answers with JSON rather than falling through to the front end', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error).toMatch(/no such endpoint/i);
  });
});

describe('security headers', () => {
  it('sets a content security policy and the usual hardening headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
    expect(res.headers['content-security-policy']).toMatch(/media-src 'self' blob:/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    // Must match what the static hosting configs send, not helmet's default.
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('does not advertise what it runs on', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('uploaded media', () => {
  it('answers a missing file with a 404, not the app shell', async () => {
    await request(app).get('/media/nope/full.webp').expect(404);
  });

  it('refuses to serve dotfiles such as the upload staging folder', async () => {
    await request(app).get('/media/.incoming/x').expect(404);
  });
});
