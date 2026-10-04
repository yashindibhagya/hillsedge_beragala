/**
 * What the API would send, trimmed to what the tests need. Shapes match
 * server/src/routes/public.js.
 */
const image = (id, caption, category = 'place') => ({
  id,
  kind: 'image',
  mime: 'image/webp',
  url: `/media/${id}/full.webp`,
  variants: [
    { width: 480, url: `/media/${id}/480.webp` },
    { width: 1200, url: `/media/${id}/full.webp` },
  ],
  width: 1200,
  height: 800,
  lqip: null,
  alt: `${caption} — alt`,
  caption,
  category,
  featured: false,
  posterId: null,
});

export const media = {
  m1: image('m1', 'The walk up', 'place'),
  m2: image('m2', 'The smoker', 'smoke'),
  m3: image('m3', 'Golden hour', 'table'),
  m4: image('m4', 'Sundowners', 'table'),
};

export const categories = [
  {
    id: 'c1',
    slug: 'smokehouse-bbq',
    name: 'Smokehouse & BBQ',
    description: 'Slow smoke.',
    imageId: null,
  },
  { id: 'c2', slug: 'desserts', name: 'Desserts', description: 'To finish.', imageId: null },
];

export const items = [
  {
    id: 'i1',
    slug: 'sharing-platter',
    name: 'Sharing Platter',
    description: 'Smoked meats for the table.',
    price: 6500,
    categoryId: 'c1',
    subcategory: 'Sharing',
    imageId: 'm3',
    videoId: null,
    ingredients: ['Brisket', 'Pickles'],
    dietary: [],
    allergens: ['Mustard'],
    vegetarian: false,
    vegan: false,
    spicy: 1,
    featured: true,
    bestseller: true,
    special: false,
    availability: 'available',
  },
  {
    id: 'i2',
    slug: 'grilled-corn',
    name: 'Grilled Corn',
    description: 'Charred over coals.',
    price: null,
    categoryId: 'c1',
    subcategory: '',
    imageId: null,
    videoId: null,
    ingredients: [],
    dietary: [],
    allergens: [],
    vegetarian: true,
    vegan: true,
    spicy: 0,
    featured: false,
    bestseller: false,
    special: false,
    availability: 'sold_out',
  },
  {
    id: 'i3',
    slug: 'watalappan',
    name: 'Watalappan',
    description: 'Jaggery and coconut custard.',
    price: 1200,
    categoryId: 'c2',
    subcategory: '',
    imageId: null,
    videoId: null,
    ingredients: [],
    dietary: [],
    allergens: ['Eggs'],
    vegetarian: true,
    vegan: false,
    spicy: 0,
    featured: true,
    bestseller: false,
    special: false,
    availability: 'available',
  },
];

export const rooms = [
  {
    id: 'r1',
    slug: 'the-deck',
    name: 'The Deck',
    kind: 'table_area',
    summary: 'Sunset seats.',
    description: '',
    capacity: 40,
    price: null,
    priceUnit: '',
    features: ['Open-air'],
    imageIds: ['m4'],
    videoId: null,
    available: true,
    bookingStatus: 'open',
  },
  {
    id: 'r2',
    slug: 'chalets',
    name: 'Chalets',
    kind: 'chalet',
    summary: 'Coming soon.',
    description: '',
    capacity: null,
    price: null,
    priceUnit: '',
    features: [],
    imageIds: [],
    videoId: null,
    available: false,
    bookingStatus: 'coming_soon',
  },
];

export function siteFixture({ settings, ...overrides } = {}) {
  return {
    settings: {
      restaurant: {
        name: 'Hillsedge Beragala',
        phone: '074 237 3394',
        whatsapp: '94742373394',
        email: 'hello@example.com',
        currency: 'LKR',
      },
      hours: { summary: 'Lunch & dinner, daily', days: [] },
      social: { instagram: 'https://instagram.com/hillsedge' },
      home: {},
      about: {},
      menu: {},
      reservations: { acceptingOnline: true },
      ...settings,
    },
    categories,
    featured: items.filter((i) => i.featured),
    rooms,
    gallery: ['m1', 'm2', 'm3', 'm4'],
    promotions: [],
    testimonials: [],
    media,
    ...overrides,
  };
}

export const menuFixture = () => ({ categories, items, currency: 'LKR', media });
