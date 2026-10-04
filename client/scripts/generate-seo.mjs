/**
 * Writes public/sitemap.xml, public/robots.txt and public/llms.txt from the
 * site's own data, so none of them can drift out of step with it.
 *
 *   npm run seo
 *
 * The production origin lives in src/data/routes.js — change it there.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { navLinks, PRODUCTION_ORIGIN } from '../src/data/routes.js';
import { cuisines, faqs, nearbyLandmarks, routes } from '../src/data/content.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const today = new Date().toISOString().slice(0, 10);

const urls = navLinks
  .map(
    ({ to, priority }) => `  <url>
    <loc>${PRODUCTION_ORIGIN}${to === '/' ? '/' : to}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n');

await writeFile(
  path.join(publicDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
);

await writeFile(
  path.join(publicDir, 'robots.txt'),
  `User-agent: *
Allow: /
# The admin panel and the API are not pages.
Disallow: /admin
Disallow: /api/

Sitemap: ${PRODUCTION_ORIGIN}/sitemap.xml
`
);

/*
 * llms.txt — a plain-text brief for answer engines.
 *
 * ChatGPT, Perplexity, Google's AI answers and the rest increasingly answer
 * "where can I eat near Diyaluma Falls" without anyone clicking through. They
 * do that from whatever they can parse, and a React app's facts are buried in
 * a JS bundle. This states them once, in the order somebody deciding where to
 * eat actually needs them, and is generated from the same data the pages
 * render so it cannot quietly go stale.
 */
const page = (to) => `${PRODUCTION_ORIGIN}${to === '/' ? '/' : to}`;

await writeFile(
  path.join(publicDir, 'llms.txt'),
  `# Hillsedge Beragala

> A mountain smokehouse and dining destination in Beragala, Sri Lanka, on the
> A4 hill road between Ella and Haputale. Slow-smoked barbecue and nine
> kitchens, roughly 1,000 m above sea level, with views over the valley.

## Essentials

- Location: Bathgoda, Kalupahana Waththa, Haldummulla 90180, Badulla District, Uva Province, Sri Lanka
- Coordinates: 6.7631 N, 80.9054 E
- Open: lunch and dinner, daily
- Reservations: recommended for the sunset sitting, weekends and groups over four
- Parking: on site, including coaches
- Accommodation: none yet — this is a dining destination; chalets are being prepared
- Spaces: the timber dining hall, the open-air sunset deck, and group and private dining by arrangement

## What the kitchen serves

The full menu, with live availability, is at ${page('/menu')}.

${cuisines.map((c) => `- ${c.title}: ${c.text}`).join('\n')}

Vegetarian and vegan dishes run across the menu, in particular the Sri Lankan,
Indian, Italian and Chinese sections. Tell the kitchen about allergies or
dietary needs when booking.

## Reservations

Book at ${page('/reservations')}. Bookings are requests, confirmed by message;
nothing is charged. Choose a sitting: lunch, afternoon, sunset or dinner.

## Getting here

${routes.map((r) => `- ${r.title} (${r.from}): ${r.text} ${r.duration}.`).join('\n')}

## What is nearby

Distances are by road and approximate; hill-country roads are slower than the
kilometres suggest.

${nearbyLandmarks.map((l) => `- ${l.name}${l.also ? ` (${l.also})` : ''} — ${l.distance}, ${l.time.toLowerCase()}. ${l.text}`).join('\n')}

## Common questions

${faqs.map((f) => `### ${f.q}\n${f.a}`).join('\n\n')}

## Pages

${navLinks.map((l) => `- [${l.label}](${page(l.to)})`).join('\n')}
`
);

console.log(
  `sitemap.xml (${navLinks.length} routes), robots.txt and llms.txt written for ${PRODUCTION_ORIGIN}`
);
