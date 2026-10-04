import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The admin app's base is /admin/, so its dev server rejects a bare /admin.
 * Production serves both; in development, send the bare path on to the slash.
 */
const adminRedirect = {
  name: 'admin-redirect',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/admin' || req.url.startsWith('/admin?')) {
        res.writeHead(302, { Location: `/admin/${req.url.slice('/admin'.length)}` });
        return res.end();
      }
      return next();
    });
  },
};

export default defineConfig({
  plugins: [react(), adminRedirect],
  // Absolute, not './': with client-side routing a relative base breaks as
  // soon as a URL has a trailing slash or another path segment.
  base: '/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    /*
     * In production the Express server serves this build, the API and the
     * uploaded media from one origin, so the app uses relative paths.
     * Proxying the same paths in development keeps that true and avoids
     * needing CORS.
     */
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
      // Photographs and video uploaded through the admin panel.
      '/media': {
        target: process.env.VITE_DEV_API_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
      /*
       * The admin panel, from its own dev server, so both apps live on one
       * address — localhost:5173 and localhost:5173/admin — as they do in
       * production. `ws` carries the admin's hot-reload socket through too.
       */
      '/admin': {
        target: process.env.VITE_DEV_ADMIN_TARGET ?? 'http://localhost:5174',
        ws: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
