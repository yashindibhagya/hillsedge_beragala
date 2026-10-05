import express from 'express';
import compression from 'compression';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from './config/index.js';
import { security } from './middleware/security.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, apiNotFound } from './middleware/errorHandler.js';
import { isKnownRoute, redirectFor } from './services/clientRoutes.js';
import { refreshStore } from './services/store.js';

/**
 * Builds the Express app without starting it, so the tests can drive it
 * through supertest without binding a port.
 */
export function createApp() {
  const app = express();

  // Behind a proxy, req.ip is the proxy unless we say how many to look past.
  // Left at 0 by default: trusting a header nobody set lets a client spoof
  // its address and walk around the rate limiter.
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  /*
   * A forwarded-for header with TRUST_PROXY=0 means a proxy is in front that
   * Express has not been told about, so every visitor shares one rate-limit
   * allowance. Said once, loudly, rather than discovered when staff are
   * locked out.
   */
  if (!config.trustProxy) {
    let warned = false;
    app.use((req, res, next) => {
      if (!warned && req.headers['x-forwarded-for']) {
        warned = true;
        console.warn(
          '[server] Requests arrive with X-Forwarded-For but TRUST_PROXY=0. Every visitor ' +
            'will share one rate limit. Set TRUST_PROXY to the number of proxies in front.'
        );
      }
      next();
    });
  }

  app.use(security);
  app.use(compression());
  // The largest legitimate body is a page of site copy; the cap is to stop a
  // large body being parsed before anything else gets a chance to reject it.
  // Uploads are multipart and never pass through here.
  app.use(express.json({ limit: '256kb' }));

  // Another copy of the API may have written since this one last looked
  // (Postgres only; a no-op for the file store).
  app.use('/api', (req, res, next) => {
    refreshStore().then(() => next(), next);
  });
  app.use('/api', apiRouter);
  app.use('/api', apiNotFound);

  // Uploaded media. Each upload lives under its own random id and is never
  // rewritten in place — a replacement is a new upload — so it can be cached
  // as hard as the hashed build assets.
  app.use(
    '/media',
    express.static(config.uploadsDir, {
      immutable: true,
      maxAge: '1y',
      index: false,
      dotfiles: 'ignore',
      fallthrough: false,
    })
  );

  if (config.serveClient && existsSync(config.adminDir)) {
    const adminDir = config.adminDir;
    app.use('/admin', (req, res, next) => {
      res.set('X-Robots-Tag', 'noindex, nofollow');
      next();
    });
    app.use(
      '/admin/assets',
      express.static(path.join(adminDir, 'assets'), { immutable: true, maxAge: '1y' })
    );
    app.use('/admin', express.static(adminDir, { index: false, redirect: false, maxAge: '1h' }));
    app.get(['/admin', '/admin/*'], (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.sendFile(path.join(adminDir, 'index.html'));
    });
  }

  if (config.serveClient) {
    const clientDir = config.clientDir;

    if (existsSync(clientDir)) {
      // Hashed filenames, so these can be cached indefinitely. index.html is
      // served separately below and must not be, or a deploy strands people
      // on asset URLs that no longer exist.
      app.use(
        '/assets',
        express.static(path.join(clientDir, 'assets'), {
          immutable: true,
          maxAge: '1y',
        })
      );

      app.use(express.static(clientDir, { index: false, maxAge: '1h' }));

      // Client-side routing: anything not matched above is a route in the
      // app, so the shell answers with 200 rather than a 404.
      app.get('*', (req, res) => {
        const target = redirectFor(req.path);
        if (target) {
          const query = req.originalUrl.slice(req.path.length);
          return res.redirect(301, target + query);
        }
        res.set('Cache-Control', 'public, max-age=0, must-revalidate');
        // The app renders its own not-found page; the status tells crawlers.
        if (!isKnownRoute(req.path)) res.status(404);
        return res.sendFile(path.join(clientDir, 'index.html'));
      });
    } else {
      console.warn(
        `[server] SERVE_CLIENT is on but ${clientDir} does not exist. ` +
          'Run "npm run build" first, or set SERVE_CLIENT=false to run the API alone.'
      );
    }
  }

  app.use(errorHandler);

  return app;
}

export default createApp;
