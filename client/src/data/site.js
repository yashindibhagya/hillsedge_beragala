import { images } from './images';
import { navLinks } from './routes';

export const site = {
  name: 'Hillsedge Beragala',
  tagline:
    'A mountain smokehouse and dining destination in Beragala, Sri Lanka — smoke, flavour and nature, in one place.',
  region: 'Beragala · Sri Lanka Hill Country',
  coordinates: '6.7631° N, 80.9054° E',
  hours: 'Lunch & dinner, daily',
  phone: { label: '074 237 3394', href: 'tel:+94742373394' },
  whatsapp: '94742373394',
  email: 'hello@hillsedgeberagala.com',
  address: 'Bathgoda, Kalupahana Waththa,\nHaldummulla 90180',
  mapsUrl: 'https://maps.app.goo.gl/22pMrv7L8VWsPGweA',
  mapEmbedUrl: 'https://maps.google.com/maps?q=6.7630768,80.9053593&z=15&output=embed',

  /*
   * Service times as 24-hour `HH:MM`, used for the Restaurant structured
   * data. Both must be filled in for search engines to show opening hours —
   * while either is null the block is left out altogether, which is better
   * than publishing times that turn out to be wrong.
   */
  serviceHours: { opens: null, closes: null },
};

/** Re-exported so components keep importing navigation from one module. */
export { navLinks };

/**
 * What the site shows before the live settings arrive, or if the server
 * cannot be reached. The same shape as the admin's settings document
 * (server/src/validators/entities.js); only facts already published are here.
 */
export const fallbackSettings = {
  restaurant: {
    name: site.name,
    tagline: site.tagline,
    description:
      'Slow smoke, handcrafted flavour and hill-country views, on the road between Ella and Haputale.',
    region: site.region,
    address: site.address,
    phone: site.phone.label,
    whatsapp: site.whatsapp,
    email: site.email,
    mapsUrl: site.mapsUrl,
    currency: 'LKR',
    priceRange: '$$',
  },
  hours: {
    summary: site.hours,
    days: [],
    note: 'Reservations recommended for the sunset sitting, weekends and groups over four.',
  },
  social: { instagram: '', facebook: '', tripadvisor: '', tiktok: '', youtube: '' },
  home: {
    heroEyebrow: 'Beragala · Sri Lanka Hill Country',
    heroTitle: 'Slow smoke, mountain air.',
    heroSubtitle:
      'A smokehouse and dining destination 1,000 m above the sea, on the hill road between Ella and Haputale.',
    heroImageId: null,
    heroVideoId: null,
    introTitle: 'A table at the edge of the hills.',
    introBody:
      'Timber, stone and thatch, open on the valley side. Hardwood smoke from a hand-built smoker, nine kitchens on one menu, and a view that changes from daylight to sunset to lantern-light in a single visit.',
    experienceTitle: 'Come for lunch. Stay for the light.',
    experienceBody:
      'Arrive late afternoon: the valley in daylight, the sunset over the hills, then the lit pathways after dark — three versions of the place in one sitting.',
    reserveTitle: 'Reserve the sunset sitting.',
    reserveBody:
      'Walk-ins are welcome, but the deck at sunset, weekends and groups over four are worth booking ahead.',
  },
  about: {
    title: 'A destination first. A smokehouse at its heart.',
    body: 'Hillsedge Beragala is built in the hill-country tradition — timber, stone and thatch, open-sided and level with the treeline. Inside it is Hillsedge Smoke Lovers: hardwood smoke, charcoal grills, and the flavour that carries the name.',
    story:
      'Around the smokehouse sits the full range of the kitchen: Sri Lankan heritage and fusion, continental grills, Italian, Indian, Chinese, appetizers and desserts — enough for every member of a family or a tour group to find their plate.',
    imageId: null,
  },
  menu: {
    intro:
      'Smokehouse and BBQ at the heart of it, with Sri Lankan, Italian, Indian, Chinese and continental kitchens around it. Start with the smoke; finish with watalappan.',
    hideUnavailable: false,
    note: 'Tell us about allergies or dietary needs when you book and the kitchen will plan around them.',
  },
  reservations: {
    intro: 'Tell us when you are coming and how many you are, and we will confirm by message.',
    policy:
      'Nothing is charged and nothing is held until we confirm. For groups over 15, or set menus, message us and we will plan it with you.',
    acceptingOnline: true,
  },
};

/**
 * Every photograph used anywhere on the site, with its caption and gallery
 * category. Pages pick from this list by key rather than re-declaring alt
 * text and captions of their own.
 */
export const photos = {
  pathDusk: {
    ...images.pathDusk,
    alt: 'Lantern-lit garden path leading up to the Hillsedge Beragala lodge at dusk, framed by hills',
    caption: 'The walk up, at dusk',
    category: 'place',
  },
  smoker: {
    ...images.smoker,
    alt: 'The hand-built offset smoker at Hillsedge Beragala, set against timber posts and clay walls',
    caption: 'The smoker',
    category: 'smoke',
  },
  sunsetValley: {
    ...images.sunsetValley,
    alt: 'Sunset over the layered hills and valleys seen from Hillsedge Beragala',
    caption: 'Sunset over the valley',
    category: 'views',
  },
  diningHall: {
    ...images.diningHall,
    alt: 'Guests dining beneath the tall timber roof of the dining hall',
    caption: 'The dining hall',
    category: 'place',
  },
  goldenHourTable: {
    ...images.goldenHourTable,
    alt: 'Smokehouse plates set on a table overlooking the valley at golden hour',
    caption: 'Golden hour at the table',
    category: 'table',
  },
  underTheStars: {
    ...images.underTheStars,
    alt: 'The Hillsedge lodge lit up beneath a starry night sky',
    caption: 'Under the stars',
    category: 'place',
  },
  sundowners: {
    ...images.sundowners,
    alt: 'A chilled cocktail on the deck as the sun sets over the valley',
    caption: 'Sundowners on the deck',
    category: 'table',
  },
  waterfallRoad: {
    ...images.waterfallRoad,
    alt: 'Waterfall on the mountain road to Beragala',
    caption: 'On the road up',
    category: 'views',
  },
  timberThatch: {
    ...images.timberThatch,
    alt: 'The thatched roof and timber frame of the Hillsedge lodge against a clear hill-country sky',
    caption: 'Timber, stone and thatch',
    category: 'place',
  },
  deckDinner: {
    ...images.deckDinner,
    alt: 'A plated smokehouse dish and drinks on the open deck as the sun sets over the valley',
    caption: 'Dinner as the valley turns gold',
    category: 'table',
  },
  litPathway: {
    ...images.litPathway,
    alt: 'Lit stone pathway climbing towards the Hillsedge lodge at dusk',
    caption: 'Pathways lit from dusk',
    category: 'place',
  },
  afterDark: {
    ...images.afterDark,
    alt: 'The Hillsedge lodge glowing under warm lights after dark',
    caption: 'After dark',
    category: 'place',
  },
  signboard: {
    ...images.signboard,
    alt: 'The thatched Hillsedge Beragala signboard on the hill road',
    caption: "You'll know it when you see it",
    category: 'views',
  },
};

/** The studio credit in the footer's bottom bar. */
export const credit = {
  prefix: 'Creative web concept by',
  name: 'EVO ART (PVT) LTD',
  href: 'https://www.evoart.lk',
};

/**
 * The image social platforms show when a link to the site is shared. Any
 * photograph works; this one reads clearly at card size.
 */
export const shareImage = {
  src: photos.sunsetValley.src,
  alt: photos.sunsetValley.alt,
};

export default site;
