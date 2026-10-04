import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/index.js';
import { processImage } from './media.js';
import { newId, now, slugify } from './store.js';
import { localToday } from './time.js';
import { parseDate } from '../validators/schema.js';

/**
 * The first version of the store, built from what the site already said.
 *
 * Everything here is drawn from copy the restaurant has signed off on. Where
 * a fact is not known — a price, a room's capacity, opening times, a guest
 * review — it is left empty rather than invented: the admin fills it in, and
 * until then the site shows nothing in its place instead of something wrong.
 */

const photos = [
  [
    'path-dusk',
    'Lantern-lit garden path leading up to the Hillsedge Beragala lodge at dusk, framed by hills',
    'The walk up, at dusk',
    'place',
  ],
  [
    'smoker',
    'The hand-built offset smoker at Hillsedge Beragala, set against timber posts and clay walls',
    'The smoker',
    'smoke',
  ],
  [
    'sunset-valley',
    'Sunset over the layered hills and valleys seen from Hillsedge Beragala',
    'Sunset over the valley',
    'views',
  ],
  [
    'dining-hall',
    'Guests dining beneath the tall timber roof of the dining hall',
    'The dining hall',
    'place',
  ],
  [
    'golden-hour-table',
    'Smokehouse plates set on a table overlooking the valley at golden hour',
    'Golden hour at the table',
    'table',
  ],
  [
    'under-the-stars',
    'The Hillsedge lodge lit up beneath a starry night sky',
    'Under the stars',
    'place',
  ],
  [
    'sundowners',
    'A chilled cocktail on the deck as the sun sets over the valley',
    'Sundowners on the deck',
    'table',
  ],
  ['waterfall-road', 'Waterfall on the mountain road to Beragala', 'On the road up', 'views'],
  [
    'timber-thatch',
    'The thatched roof and timber frame of the Hillsedge lodge against a clear hill-country sky',
    'Timber, stone and thatch',
    'place',
  ],
  [
    'deck-dinner',
    'A plated smokehouse dish and drinks on the open deck as the sun sets over the valley',
    'Dinner as the valley turns gold',
    'table',
  ],
  [
    'lit-pathway',
    'Lit stone pathway climbing towards the Hillsedge lodge at dusk',
    'Pathways lit from dusk',
    'place',
  ],
  ['after-dark', 'The Hillsedge lodge glowing under warm lights after dark', 'After dark', 'place'],
  [
    'signboard',
    'The thatched Hillsedge Beragala signboard on the hill road',
    "You'll know it when you see it",
    'views',
  ],
];

const categories = [
  [
    'Smokehouse & BBQ',
    'Slow-smoked meats sliced to order, charcoal-grilled cuts and seafood, and sharing platters built for a full table. The section to order from on a first visit.',
    'golden-hour-table',
  ],
  [
    'Sri Lankan',
    'Authentic rice & curry, seafood, meats, sambals and traditional hill-country specialties.',
    null,
  ],
  [
    'Sri Lankan Fusion',
    'Contemporary plates built on local ingredients and flavours, presented for a modern table.',
    null,
  ],
  [
    'Appetizers & Soups',
    'Smoked starters, seafood appetizers and both traditional and international soups.',
    null,
  ],
  [
    'Continental',
    'Steaks, grilled meats, seafood, burgers and sandwiches — familiar comfort after a long drive.',
    null,
  ],
  ['Italian', 'Pizza, pasta, lasagne, gnocchi and other Italian favourites, made to order.', null],
  ['Indian', 'Tandoori, biriyani, curries and freshly baked naan from the clay oven.', null],
  ['Chinese', 'Fried rice, noodles, satay, seafood and meat dishes from the wok.', null],
  [
    'Desserts',
    'Watalappan, tiramisu, panna cotta, gelato, cakes and more to finish the evening.',
    null,
  ],
  [
    'Drinks',
    'Cocktails, mocktails, beer and wine, fresh juices and Ceylon tea from the surrounding hills.',
    'sundowners',
  ],
];

/*
 * Dishes the site's copy already names, by section. No prices: none have
 * been supplied, and the menu shows none rather than a guess. Dietary flags
 * are only set where the dish itself settles it.
 */
const dishes = {
  'Smokehouse & BBQ': [
    {
      name: 'Smokehouse Sharing Platter',
      description:
        'Slow-smoked meats sliced to order, with house rubs, sauces and sides — built for a full table.',
      featured: true,
      bestseller: true,
      imageKey: 'golden-hour-table',
      subcategory: 'Sharing',
    },
    {
      name: 'Charcoal-Grilled Cuts',
      description:
        'Finished to order over charcoal: colour, crust and char outside, the smoke already deep inside.',
      featured: true,
      imageKey: 'deck-dinner',
      subcategory: 'From the grill',
    },
    {
      name: 'Charcoal-Grilled Seafood',
      description: 'Seafood straight to the charcoal grill, with house-made sauces.',
      subcategory: 'From the grill',
    },
    {
      name: 'Smoked Starters',
      description: 'A plate of smoked bites to open the table while the main event finishes.',
      subcategory: 'To start',
    },
  ],
  'Sri Lankan': [
    {
      name: 'Rice & Curry',
      description:
        'Rice with a spread of curries, sambals and accompaniments, the way the hill country eats it.',
      featured: true,
      spicy: 2,
    },
    {
      name: 'Vegetable Rice & Curry',
      description: 'The full rice and curry spread, made with vegetables and pulses only.',
      vegetarian: true,
      spicy: 2,
    },
    {
      name: 'Seafood Curry',
      description: 'A Sri Lankan seafood curry, served with rice.',
      spicy: 2,
    },
  ],
  'Sri Lankan Fusion': [
    {
      name: "Chef's Fusion Plate",
      description:
        'A contemporary plate built on local ingredients — ask what the kitchen is cooking today.',
      special: true,
    },
  ],
  'Appetizers & Soups': [
    { name: 'Seafood Appetizer', description: 'A seafood starter from the day’s catch.' },
    {
      name: 'Soup of the Day',
      description: 'Traditional or international — whatever is warming in the kitchen.',
    },
  ],
  Continental: [
    { name: 'Grilled Steak', description: 'A steak from the grill, with sides.' },
    {
      name: 'Smokehouse Burger',
      description: 'A burger off the grill — comfort after a long drive.',
    },
    { name: 'Club Sandwich', description: 'A stacked sandwich for a lighter lunch stop.' },
  ],
  Italian: [
    { name: 'Pizza', description: 'Made to order — ask for today’s toppings.' },
    { name: 'Pasta', description: 'An Italian favourite, made to order.' },
    { name: 'Lasagne', description: 'Layered, baked and served hot.' },
    { name: 'Gnocchi', description: 'Soft potato gnocchi with a house sauce.' },
  ],
  Indian: [
    { name: 'Tandoori', description: 'From the clay oven.', spicy: 1 },
    { name: 'Biriyani', description: 'Fragrant rice, slow-cooked with spice.', spicy: 1 },
    { name: 'Naan', description: 'Freshly baked in the clay oven.', vegetarian: true },
  ],
  Chinese: [
    { name: 'Fried Rice', description: 'Wok-fried rice.' },
    { name: 'Noodles', description: 'Wok-tossed noodles.' },
    { name: 'Satay', description: 'Skewers with a peanut sauce.', allergens: ['Peanuts'] },
  ],
  Desserts: [
    {
      name: 'Watalappan',
      description: 'The Sri Lankan classic: a spiced jaggery and coconut custard.',
      featured: true,
      vegetarian: true,
      allergens: ['Eggs'],
    },
    { name: 'Tiramisu', description: 'Coffee, mascarpone and cocoa.', vegetarian: true },
    { name: 'Panna Cotta', description: 'Set cream with a seasonal topping.' },
    { name: 'Gelato', description: 'Ask for today’s flavours.', vegetarian: true },
  ],
  Drinks: [
    {
      name: 'Sundowner Cocktails',
      description: 'Cocktails for the deck as the sun drops behind the hills.',
      featured: true,
      imageKey: 'sundowners',
      subcategory: 'Cocktails',
    },
    {
      name: 'Mocktails',
      description: 'Alcohol-free, made fresh.',
      vegetarian: true,
      vegan: true,
      subcategory: 'Soft',
    },
    {
      name: 'Fresh Juice',
      description: 'Pressed to order.',
      vegetarian: true,
      vegan: true,
      subcategory: 'Soft',
    },
    {
      name: 'Ceylon Tea',
      description: 'From the estates on the surrounding hills.',
      vegetarian: true,
      vegan: true,
      subcategory: 'Hot',
    },
    { name: 'Beer', description: 'Chilled.', vegetarian: true, subcategory: 'Beer & wine' },
    {
      name: 'Wine',
      description: 'By the glass or bottle.',
      vegetarian: true,
      subcategory: 'Beer & wine',
    },
  ],
};

const rooms = [
  {
    name: 'The Dining Hall',
    kind: 'table_area',
    summary: 'Beneath the tall timber roof, open-sided and level with the treeline.',
    description:
      'The main room: timber, stone and thatch, open on the valley side. Suits families, tour groups and long lunches. Tell us the size of your party and we will set the tables accordingly.',
    features: ['Valley views', 'Open-sided', 'Groups welcome', 'Near the smoker'],
    imageKeys: ['dining-hall', 'timber-thatch'],
    bookingStatus: 'open',
  },
  {
    name: 'The Sunset Deck',
    kind: 'table_area',
    summary: 'Open-air tables facing west over the valley — the sunset sitting.',
    description:
      'The deck is where the sunset sitting happens. It is the most requested seat in the house, so book ahead for late afternoons, weekends and in season.',
    features: ['Open-air', 'Sunset views', 'Sundowners'],
    imageKeys: ['deck-dinner', 'sundowners', 'sunset-valley'],
    bookingStatus: 'open',
  },
  {
    name: 'Group & Private Dining',
    kind: 'private_dining',
    summary: 'Set and group menus for tour parties, coaches and celebrations.',
    description:
      'For tour groups, coach stops and private occasions, set or group menus are arranged in advance around the smokehouse. Message us with numbers and timing.',
    features: ['Set menus', 'Coach parking', 'Arranged in advance'],
    imageKeys: ['golden-hour-table'],
    bookingStatus: 'open',
  },
  {
    name: 'Hillside Chalets',
    kind: 'chalet',
    summary: 'Overnight stays are being prepared.',
    description:
      'Chalets are being prepared on the hillside and will be announced here once they open.',
    features: ['Coming soon'],
    imageKeys: ['under-the-stars'],
    bookingStatus: 'coming_soon',
    available: false,
  },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const defaultSettings = {
  restaurant: {
    name: 'Hillsedge Beragala',
    tagline:
      'A mountain smokehouse and dining destination in Beragala, Sri Lanka — smoke, flavour and nature, in one place.',
    description:
      'Slow smoke, handcrafted flavour and hill-country views, on the road between Ella and Haputale.',
    region: 'Beragala · Sri Lanka Hill Country',
    address: 'Bathgoda, Kalupahana Waththa,\nHaldummulla 90180',
    phone: '074 237 3394',
    whatsapp: '94742373394',
    email: 'hello@hillsedgeberagala.com',
    mapsUrl: 'https://maps.app.goo.gl/22pMrv7L8VWsPGweA',
    currency: 'LKR',
    priceRange: '$$',
  },
  hours: {
    summary: 'Lunch & dinner, daily',
    // Times unknown: left blank so nothing wrong is published.
    days: days.map((day) => ({ day, closed: false, opens: null, closes: null })),
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

/** Fills an empty store. */
export async function seed(data) {
  const at = now();
  data.settings = structuredClone(defaultSettings);

  // Photographs first, so everything else can point at them.
  const mediaByKey = {};
  const dir = config.seedMediaDir;
  if (dir && existsSync(dir)) {
    let order = 0;
    for (const [key, alt, caption, category] of photos) {
      const file = path.join(dir, `${key}.jpg`);
      if (!existsSync(file)) continue;
      try {
        await readFile(file); // surface permission problems with a clear path
        const processed = await processImage(file);
        const record = {
          ...processed,
          originalName: `${key}.jpg`,
          alt,
          caption,
          category,
          featured: ['sunset-valley', 'path-dusk', 'deck-dinner', 'under-the-stars'].includes(key),
          inGallery: true,
          posterId: null,
          order: order++,
          createdAt: at,
          createdBy: null,
        };
        data.media.push(record);
        mediaByKey[key] = record.id;
      } catch (error) {
        console.warn(`[seed] skipped ${key}.jpg: ${error.message}`);
      }
    }
  }
  const mediaId = (key) => (key ? (mediaByKey[key] ?? null) : null);

  data.settings.home.heroImageId = mediaId('path-dusk') ?? mediaId('sunset-valley');
  data.settings.about.imageId = mediaId('timber-thatch');

  categories.forEach(([name, description, imageKey], index) => {
    const category = {
      id: newId(),
      slug: slugify(name, data.categories),
      name,
      description,
      imageId: mediaId(imageKey),
      order: index,
      active: true,
      createdAt: at,
      updatedAt: at,
    };
    data.categories.push(category);

    (dishes[name] ?? []).forEach((dish, dishIndex) => {
      data.menuItems.push({
        id: newId(),
        slug: slugify(dish.name, data.menuItems),
        name: dish.name,
        description: dish.description,
        price: null,
        categoryId: category.id,
        subcategory: dish.subcategory ?? '',
        imageId: mediaId(dish.imageKey),
        videoId: null,
        ingredients: [],
        dietary: [],
        allergens: dish.allergens ?? [],
        vegetarian: Boolean(dish.vegetarian),
        vegan: Boolean(dish.vegan),
        spicy: dish.spicy ?? 0,
        featured: Boolean(dish.featured),
        bestseller: Boolean(dish.bestseller),
        special: Boolean(dish.special),
        availability: 'available',
        hidden: false,
        order: dishIndex,
        views: 0,
        createdAt: at,
        updatedAt: at,
      });
    });
  });

  rooms.forEach((room, index) => {
    data.rooms.push({
      id: newId(),
      slug: slugify(room.name, data.rooms),
      name: room.name,
      kind: room.kind,
      summary: room.summary,
      description: room.description,
      capacity: null,
      price: null,
      priceUnit: '',
      features: room.features,
      imageIds: room.imageKeys.map(mediaId).filter(Boolean),
      videoId: null,
      available: room.available ?? true,
      bookingStatus: room.bookingStatus,
      active: true,
      order: index,
      createdAt: at,
      updatedAt: at,
    });
  });

  await importLegacyReservations(data);
}

/** Bookings from before the store existed, kept rather than stranded. */
async function importLegacyReservations(data) {
  const file = config.legacyReservationsFile;
  if (!file || !existsSync(file)) return;
  const raw = await readFile(file, 'utf8');
  const sizes = { '1–2': 2, '3–4': 4, '5–8': 8, '9–15': 15, '16+ (group)': 16 };
  for (const line of raw.split('\n').filter(Boolean)) {
    try {
      const old = JSON.parse(line);
      // A line without a real date cannot be scheduled; skip it.
      if (!parseDate(old.date)) continue;
      const past = old.date < localToday();
      data.reservations.push({
        id: old.id ?? newId(),
        receivedAt: old.receivedAt ?? now(),
        name: old.name ?? '',
        phone: '',
        email: '',
        date: old.date,
        time: old.time ?? 'Dinner',
        exactTime: null,
        guests: sizes[old.guests] ?? 2,
        roomId: null,
        message: old.message ?? '',
        // Past bookings from the old system are history, not a to-do list.
        status: past ? 'completed' : 'pending',
        notes: old.guests ? `Imported booking; party size was given as "${old.guests}".` : '',
        source: 'website',
        updatedAt: now(),
      });
    } catch {
      // A damaged line is skipped; the rest still import.
    }
  }
}
