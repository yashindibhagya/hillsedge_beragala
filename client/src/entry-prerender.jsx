/**
 * The build's view of the app: renders one route to HTML, with the head that
 * belongs to it. scripts/prerender.mjs writes the result into that route's
 * own index.html.
 *
 * Why it exists: the site is a client-rendered app, so without this every URL
 * answers with the same empty shell and the home page's title. Google runs
 * the JavaScript and copes; WhatsApp, Facebook, and the crawlers behind
 * ChatGPT and Perplexity do not — they saw one page, with nothing on it.
 *
 * Effects do not run here, so nothing is fetched: the pages render from the
 * published fallback facts in data/, and sections that only exist in the
 * admin's data (dishes, rooms) render their loading state. The browser does
 * not hydrate this markup — main.jsx renders afresh over it — so a difference
 * between the two can never surface as a hydration error.
 */
import { StrictMode } from 'react';
import { Writable } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouterProvider, createStaticHandler, createStaticRouter } from 'react-router-dom';
import { routes } from './App';
import { images } from './data/images';
import { fullTitle, pageSeo, SITE_NAME } from './data/seo';
import { fallbackSettings, shareImage } from './data/site';
import { buildStructuredData, serializeGraph } from './lib/structuredData';

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Waits for every lazy route chunk, then returns the finished markup. */
function renderToString(element) {
  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new Writable({
      write(chunk, _encoding, done) {
        html += chunk;
        done();
      },
      final(done) {
        resolve(html);
        done();
      },
    });
    const { pipe } = renderToPipeableStream(element, {
      onAllReady: () => pipe(sink),
      onShellError: reject,
      onError: reject,
    });
  });
}

function renderHead(pathname, origin) {
  // Not one of the site's pages: this is the not-found shell, which must
  // never be indexed and has no address of its own to be canonical.
  if (!pageSeo[pathname]) {
    return [
      `<title>${escapeHtml(fullTitle('Page not found'))}</title>`,
      `<meta name="robots" content="noindex, follow" />`,
    ].join('\n    ');
  }

  const { title, description, brandSuffix } = pageSeo[pathname];
  const pageTitle = fullTitle(title, brandSuffix);
  const url = `${origin}${pathname}`;
  const image = new URL(shareImage.src, origin).href;
  const { width, height } = images.sunsetValley;

  const graphs = buildStructuredData({
    origin,
    pathname,
    settings: fallbackSettings,
    fallbackImage: shareImage.src,
  });

  return [
    `<title>${escapeHtml(pageTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:width" content="${width}" />`,
    `<meta property="og:image:height" content="${height}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(shareImage.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    ...graphs.map(
      (graph) =>
        `<script type="application/ld+json" data-prerendered>${serializeGraph(graph)}</script>`
    ),
  ].join('\n    ');
}

/**
 * @param {string} pathname  a route in data/routes.js; anything else renders the not-found page
 * @param {string} origin    where the site is served from, no trailing slash
 * @returns {Promise<{ head: string, body: string }>}
 */
export async function render(pathname, origin) {
  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(`${origin}${pathname}`));
  if (context instanceof Response) {
    throw new Error(`${pathname} answered with a ${context.status} instead of a page.`);
  }
  const router = createStaticRouter(handler.dataRoutes, context);

  const body = await renderToString(
    <StrictMode>
      {/* hydrate={false}: no inline bootstrap script — the CSP would refuse it,
          and the browser renders afresh rather than hydrating. */}
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </StrictMode>
  );

  return { head: renderHead(pathname, origin), body };
}
