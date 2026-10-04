import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
