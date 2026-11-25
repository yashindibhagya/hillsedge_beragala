/**
 * Each page's search title and description, in one place.
 *
 * The pages read these through `usePageSeo`, and the build prerenders them
 * into each route's own HTML file (scripts/prerender.mjs), so what a crawler
 * that runs no JavaScript sees — a link preview in WhatsApp, an answer engine
 * — is what the browser tab shows.
 *
 * Search engines cut a title around sixty characters and a description around
 * 160; seo.test.js holds every entry to that.
 *
 * `brandSuffix: false` hands the whole title to the page. " — Hillsedge
 * Beragala" eats a third of the sixty, which leaves no room to say where we
 * are or what we cook, so pages with a title worth spending the space on opt
 * out and carry the brand name themselves where it fits.
 */
export const SITE_NAME = 'Hillsedge Beragala';

export const DEFAULT_TITLE = `${SITE_NAME} — Mountain Smokehouse & Restaurant, Haputale`;

export const pageSeo = {
  '/': {
    title: null,
    description:
      'A mountain smokehouse and BBQ restaurant in Beragala, on the hill road between Ella and Haputale. Slow-smoked meats, nine kitchens and views over the valley.',
  },
  '/menu': {
    title: 'Menu — Sri Lankan, BBQ, Italian, Indian & Continental',
    description:
      'Nine kitchens: Sri Lankan rice and curry, slow-smoked BBQ, Italian, Indian tandoori, Chinese and continental grills, plus vegetarian and vegan throughout.',
    brandSuffix: false,
  },
  '/about': {
    title: 'About — Mountain Dining Destination, Beragala',
    description:
      "A dining destination on the Beragala–Haputale hill road in Sri Lanka's tea country. How the smokehouse, the setting and nine kitchens fit together.",
    brandSuffix: false,
  },
  '/experiences': {
    title: 'Smokehouse & Experiences — Slow-Smoked BBQ, Sri Lanka',
    description:
      "Sri Lanka's mountain smokehouse: hardwood and charcoal in hand-built offset smokers, 1,000 m up at Beragala — plus the sunset sitting and group dining.",
    brandSuffix: false,
  },
  '/rooms': {
    title: 'Rooms & Private Dining',
    description:
      'The dining hall, the sunset deck, group and private dining at Hillsedge Beragala — and what is coming next on the hillside.',
  },
  '/gallery': {
    title: 'Gallery — A Restaurant With A View, Haputale Road',
    description:
      'The lodge, the smoker, the table and the light over the valley — photographs of Hillsedge Beragala on the Beragala–Haputale hill road.',
    brandSuffix: false,
  },
  '/contact': {
    title: 'Restaurant near Diyaluma Falls & Haputale — Hillsedge',
    description:
      'Where to eat between Ella and Haputale — on the A4 at Beragala, about 21 km from Diyaluma Falls. Directions, hours, coach parking and table reservations.',
    brandSuffix: false,
  },
  '/reservations': {
    title: 'Reserve a Table',
    description:
      'Book a table at Hillsedge Beragala — the sunset sitting, lunch on the drive between Ella and Haputale, or a group or coach stop.',
  },
};

/** The title as it appears in the tab and in a search result. */
export function fullTitle(title, brandSuffix = true) {
  if (!title) return DEFAULT_TITLE;
  return brandSuffix ? `${title} — ${SITE_NAME}` : title;
}

export default pageSeo;
