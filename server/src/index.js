import { createApp } from './app.js';
import { config, productionProblems } from './config/index.js';
import { initStore } from './services/bootstrap.js';
import { flushViews } from './routes/public.js';

const problems = productionProblems();
if (problems.length) {
  for (const problem of problems) console.error(`[server] ${problem}`);
  console.error('[server] Refusing to start in production until these are fixed.');
  process.exit(1);
}

await initStore();
const app = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(
    `[server] ${config.env} — listening on http://${config.host}:${config.port}` +
      `${config.serveClient ? ' (serving the front end)' : ' (API only)'}`
  );
});

/**
 * Finish in-flight requests before exiting. Without this a deploy or a
 * container restart cuts off whoever is mid-request, which on this site
 * means losing a booking that was already accepted.
 */
function shutdown(signal) {
  console.log(`[server] ${signal} received, closing`);
  server.close(async () => {
    await flushViews();
    console.log('[server] closed');
    process.exit(0);
  });

  // Something is holding a connection open; do not hang forever.
  setTimeout(() => {
    console.error('[server] forced exit after 10s');
    process.exit(1);
  }, 10_000).unref();
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => shutdown(signal));
}

export default server;
