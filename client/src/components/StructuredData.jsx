import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { shareImage } from '../data/site';
import { navLinks } from '../data/routes';
import { cuisines, faqs, nearbyLandmarks } from '../data/content';
import { useSite } from '../context/SiteData';
import { addressLines, telHref } from '../lib/format';

const DAY_URI = (day) => `https://schema.org/${day}`;

/**
 * Machine-readable facts for search engines and answer engines, built from
 * the live settings so an edit in the admin reaches them without a deploy.
 *
 *  - Restaurant, the entity itself — what a "restaurants near me" result is
 *    assembled from. Opening hours only for days with both times set:
 *    search engines ignore a half-filled hours block, and a wrong one is
 *    worse than none.
 *  - Menu, once the menu has loaded: sections and dishes, with an Offer only
 *    where a price is published and suitableForDiet only where it is true.
 *  - BreadcrumbList, so a result shows Home › Menu rather than a bare URL.
 *  - FAQPage and nearby attractions on the contact page.
 */
export function StructuredData() {
  const { pathname } = useLocation();
  const { settings, categories, menu, media } = useSite();

  useEffect(() => {
    const origin = window.location.origin;
    const { restaurant, hours, social } = settings;
    const [street, ...rest] = addressLines(restaurant.address);
    const heroImage = media[settings.home.heroImageId];
    const image = new URL(heroImage?.url ?? shareImage.src, origin).href;

    const data = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      '@id': `${origin}/#restaurant`,
      name: restaurant.name,
      description: restaurant.tagline,
      url: origin,
      image,
      telephone: telHref(restaurant.phone).replace('tel:', ''),
      email: restaurant.email || undefined,
      servesCuisine: categories.length
        ? categories.map((c) => c.name)
        : cuisines.map((c) => c.title),
      priceRange: restaurant.priceRange || undefined,
      currenciesAccepted: restaurant.currency || undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: street,
        addressLocality: rest.join(', ') || undefined,
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

    if (menu.data?.items?.length) {
      const { items, currency } = menu.data;
      data.hasMenu = {
        '@type': 'Menu',
        name: `${restaurant.name} menu`,
        url: `${origin}/menu`,
        hasMenuSection: menu.data.categories.map((category) => ({
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
              const image = media[item.imageId];
              if (image) entry.image = new URL(image.url, origin).href;
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

    const current = navLinks.find((link) => link.to === pathname);
    if (current && pathname !== '/') {
      graphs.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
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

    const nodes = graphs.map((graph) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.hillsedge = graph['@type'].toLowerCase();
      /*
       * Setting textContent on a detached element does not go through the
       * HTML parser, so a "</script>" in the data cannot break out here. The
       * escape is belt-and-braces for the day this is server-rendered.
       */
      script.textContent = JSON.stringify(graph).replace(/</g, '\\u003c');
      document.head.appendChild(script);
      return script;
    });

    return () => nodes.forEach((node) => node.remove());
  }, [pathname, settings, categories, menu.data, media]);

  return null;
}

export default StructuredData;
