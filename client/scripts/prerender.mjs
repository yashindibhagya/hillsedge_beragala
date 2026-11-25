/**
 * Gives every route its own HTML file, with its own title, description,
 * canonical URL, share tags, structured data and rendered content.
 *
 *   npm run build     (runs this last)
 *
 * Reads the client build in dist/ and the server-side render entry in
 * dist-ssr/ (src/entry-prerender.jsx, built by `vite build --ssr`), then
 * writes dist/index.html for the home page and dist/<route>/index.html for
 * the rest. A host serves /menu from dist/menu/index.html; anything without a
 * file of its own falls through to dist/404.html.
 *
 * It fails the build rather than ship a page it could not render: a route
 * silently falling back to the bare shell is exactly the bug this fixes.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { navLinks } from '../src/data/routes.js';
import { SITE_ORIGIN } from './origin.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');

const HEAD = /<!--seo-->[\s\S]*?<!--\/seo-->/;
const ROOT = '<div id="root"></div>';

const shell = await readFile(path.join(distDir, 'index.html'), 'utf8');
if (!HEAD.test(shell) || !shell.includes(ROOT)) {
  throw new Error(
    'dist/index.html has lost its <!--seo--> … <!--/seo--> block or its empty #root; ' +
      'the prerender has nowhere to write.'
  );
}

const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-prerender.js')).href);

/*
 * 404.html is the app with its not-found page rendered, marked noindex. It is
 * what every host falls back to for a URL that has no file of its own — if
 * that were index.html, an unknown address would answer with the home page's
 * content and tags. It is still the whole app, so the router takes over from
 * there as it would anywhere else.
 */
const pages = [
  ...navLinks.map(({ to }) => ({
    to,
    file: to === '/' ? 'index.html' : path.join(to.slice(1), 'index.html'),
  })),
  { to: '/404', file: '404.html' },
];

for (const { to, file: relative } of pages) {
  const { head, body } = await render(to, SITE_ORIGIN);
  if (!body.includes('<h1')) throw new Error(`${to} rendered without a heading.`);

  // Function replacements: the markup is full of `$`, which a string
  // replacement would read as a back-reference.
  const html = shell.replace(HEAD, () => head).replace(ROOT, () => `<div id="root">${body}</div>`);

  const file = path.join(distDir, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
}

await rm(ssrDir, { recursive: true, force: true });

console.log(`prerendered ${navLinks.length} routes and 404.html for ${SITE_ORIGIN}`);
