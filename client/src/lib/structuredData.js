import { navLinks } from '../data/routes';
import { cuisines, faqs, nearbyLandmarks } from '../data/content';
import { addressLines, telHref } from './format';

const DAY_URI = (day) => `https://schema.org/${day}`;

/** "Haldummulla 90180" → locality and postcode, where the last line ends in one. */
function splitLocality(lines) {
  const locality = lines.join(', ');
  const match = locality.match(/^(.*?)[,\s]*(\d{5})$/);
  return match
    ? { addressLocality: match[1] || undefined, postalCode: match[2] }
    : { addressLocality: locality || undefined };
}

/**
 * Machine-readable facts for search engines and answer engines, as a list of
 * schema.org graphs for one page.
 *
 * Pure, so it serves two callers: the build prerenders it into each route's
 * HTML from the published fallback facts, and <StructuredData> rebuilds it in
 * the browser from the live settings, so an edit in the admin reaches
 * JavaScript-running crawlers without a deploy.
 *
 *  - Restaurant, the entity itself — what a "restaurants near me" result is
 *    assembled from. Opening hours only for days with both times set:
 *    search engines ignore a half-filled hours block, and a wrong one is
 *    worse than none.
 *  - Menu, once the menu has loaded: sections and dishes, with an Offer only
 *    where a price is published and suitableForDiet only where it is true.
 *  - WebSite on the home page, which is where search engines take the site's
 *    display name from.
 *  - BreadcrumbList, so a result shows Home › Menu rather than a bare URL.
 *  - FAQPage and nearby attractions on the contact page.
 */
export function buildStructuredData({
  origin,
  pathname,
  settings,
  categories = [],
  menu = null,
  media = {},
  fallbackImage,
}) {
  const { restaurant, hours, social } = settings;
  const [street, ...rest] = addressLines(restaurant.address);
  const heroImage = media[settings.home.heroImageId];
  const image = new URL(heroImage?.url ?? fallbackImage, origin).href;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${origin}/#restaurant`,
    name: restaurant.name,
    description: restaurant.tagline,
    url: `${origin}/`,
    image,
    telephone: telHref(restaurant.phone).replace('tel:', ''),
    email: restaurant.email || undefined,
    servesCuisine: categories.length ? categories.map((c) => c.name) : cuisines.map((c) => c.title),
    priceRange: restaurant.priceRange || undefined,
    currenciesAccepted: restaurant.currency || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: street,
      ...splitLocality(rest),
      addressRegion: 'Badulla District',
      addressCountry: 'LK',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 6.7630768, longitude: 80.9053593 },
    hasMap: restaurant.mapsUrl || undefined,
    acceptsReservations: `${origin}/reservations`,
    menu: `${origin}/menu`,
    areaServed: [
      'Beragala',
      'Haputale',
      'Ella',
      'Bandarawela',
      'Koslanda',
      'Haldummulla',
      'Badulla District',
      'Uva Province',
    ].map((name) => ({ '@type': 'Place', name })),
    amenityFeature: [
      'On-site parking, including coaches',
      'Outdoor seating',
      'Valley views',
      'Vegetarian options',
      'Vegan options',
      'Group and set menus',
    ].map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true })),
    sameAs: Object.values(social ?? {}).filter(Boolean),
    publicAccess: true,
    smokingAllowed: false,
  };

  const openDays = (hours.days ?? []).filter((d) => !d.closed && d.opens && d.closes);
  if (openDays.length) {
    data.openingHoursSpecification = openDays.map((d) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_URI(d.day),
      opens: d.opens,
      closes: d.closes,
    }));
  }

  if (menu?.items?.length) {
    const { items, currency } = menu;
    data.hasMenu = {
      '@type': 'Menu',
      name: `${restaurant.name} menu`,
      url: `${origin}/menu`,
      hasMenuSection: menu.categories.map((category) => ({
        '@type': 'MenuSection',
        name: category.name,
        description: category.description || undefined,
        hasMenuItem: items
          .filter((item) => item.categoryId === category.id)
          .map((item) => {
            const entry = {
              '@type': 'MenuItem',
              name: item.name,
              description: item.description || undefined,
              url: `${origin}/menu?dish=${item.slug}`,
            };
            const diets = [];
            if (item.vegan) diets.push('https://schema.org/VeganDiet');
            if (item.vegetarian) diets.push('https://schema.org/VegetarianDiet');
            if (diets.length) entry.suitableForDiet = diets;
            const itemImage = media[item.imageId];
            if (itemImage) entry.image = new URL(itemImage.url, origin).href;
            if (item.price !== null && item.price !== undefined) {
              entry.offers = {
                '@type': 'Offer',
                price: item.price,
                priceCurrency: currency,
                availability:
                  item.availability === 'available'
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
              };
            }
            return entry;
          }),
      })),
    };
  }

  const graphs = [data];

  if (pathname === '/') {
    graphs.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: restaurant.name,
      url: `${origin}/`,
      publisher: { '@id': `${origin}/#restaurant` },
    });
  }

  const current = navLinks.find((link) => link.to === pathname);
  if (current && pathname !== '/') {
    graphs.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: current.label, item: `${origin}${current.to}` },
      ],
    });
  }

  if (pathname === '/contact') {
    graphs.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
    graphs.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Attractions near ${restaurant.name}`,
      itemListElement: nearbyLandmarks.map((landmark, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'TouristAttraction',
          name: landmark.name,
          description: `${landmark.text} ${landmark.distance} by road, ${landmark.time.toLowerCase()} from ${restaurant.name}.`,
        },
      })),
    });
  }

  return graphs;
}

/**
 * A graph as the text of a `<script type="application/ld+json">`. The escape
 * stops a "</script>" in the data closing the tag when this is written into
 * HTML by the prerender.
 */
export const serializeGraph = (graph) => JSON.stringify(graph).replace(/</g, '\\u003c');

export default buildStructuredData;
