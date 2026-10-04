import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_DEV_API_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  // Served by Express under /admin, beside the public site.
  base: '/admin/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    // Fixed, because the public site's dev server forwards /admin here.
    port: 5174,
    strictPort: true,
    // Same-origin in development as in production, so the session cookie
    // and the CSP behave the same and no CORS is involved.
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/media': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
