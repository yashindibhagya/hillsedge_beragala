import { field } from './schema.js';

/**
 * The shape of every record the admin manages. The admin panel and the
 * public site both read these field names; change one here and in both.
 */

export const AVAILABILITY = ['available', 'unavailable', 'sold_out'];
export const RESERVATION_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
export const ROOM_KINDS = ['private_dining', 'event_space', 'chalet', 'table_area'];
export const ROOM_BOOKING_STATUSES = ['open', 'booked', 'coming_soon', 'closed'];
export const PROMOTION_KINDS = [
  'offer',
  'seasonal_menu',
  'event',
  'discount',
  'limited_dish',
  'holiday',
];
export const MEDIA_CATEGORIES = [
  'place',
  'smoke',
  'table',
  'views',
  'rooms',
  'menu',
  'events',
  'other',
];
export const ROLES = ['super_admin', 'manager', 'staff'];
export const SITTINGS = ['Lunch', 'Afternoon', 'Sunset', 'Dinner'];

export const categorySchema = {
  name: field.text({ max: 80, required: true }),
  description: field.text({ max: 600 }),
  imageId: field.ref(),
  order: field.number({ integer: true, min: 0, max: 10000, nullable: false, fallback: 0 }),
  active: field.bool({ fallback: true }),
};

export const menuItemSchema = {
  name: field.text({ max: 120, required: true }),
  description: field.text({ max: 1000 }),
  // Null means "not published" — the site shows no price rather than a wrong one.
  price: field.number({ min: 0, max: 10_000_000 }),
  categoryId: field.ref({ nullable: false }),
  subcategory: field.text({ max: 80 }),
  imageId: field.ref(),
  videoId: field.ref(),
  ingredients: field.list({ maxItems: 40 }),
  dietary: field.list({ maxItems: 20 }),
  allergens: field.list({ maxItems: 20 }),
  vegetarian: field.bool(),
  vegan: field.bool(),
  spicy: field.number({ integer: true, min: 0, max: 3, nullable: false, fallback: 0 }),
  featured: field.bool(),
  bestseller: field.bool(),
  special: field.bool(),
  availability: field.oneOf(AVAILABILITY),
  // Hidden items never reach the public site, whatever their availability.
  hidden: field.bool(),
  order: field.number({ integer: true, min: 0, max: 100000, nullable: false, fallback: 0 }),
};

export const roomSchema = {
  name: field.text({ max: 100, required: true }),
  kind: field.oneOf(ROOM_KINDS),
  summary: field.text({ max: 240 }),
  description: field.text({ max: 3000 }),
  capacity: field.number({ integer: true, min: 1, max: 2000 }),
  price: field.number({ min: 0, max: 100_000_000 }),
  priceUnit: field.text({ max: 40 }),
  features: field.list({ maxItems: 30, maxLength: 80 }),
  imageIds: field.refs({ maxItems: 20 }),
  videoId: field.ref(),
  available: field.bool({ fallback: true }),
  bookingStatus: field.oneOf(ROOM_BOOKING_STATUSES),
  active: field.bool({ fallback: true }),
  order: field.number({ integer: true, min: 0, max: 10000, nullable: false, fallback: 0 }),
};

export const promotionSchema = {
  title: field.text({ max: 120, required: true }),
  kind: field.oneOf(PROMOTION_KINDS),
  description: field.text({ max: 1200 }),
  imageId: field.ref(),
  startsOn: field.date(),
  endsOn: field.date(),
  ctaLabel: field.text({ max: 40 }),
  ctaHref: field.url(),
  active: field.bool({ fallback: true }),
  order: field.number({ integer: true, min: 0, max: 10000, nullable: false, fallback: 0 }),
};

export const testimonialSchema = {
  author: field.text({ max: 80, required: true }),
  origin: field.text({ max: 80 }),
  quote: field.text({ max: 800, required: true }),
  rating: field.number({ integer: true, min: 1, max: 5 }),
  source: field.text({ max: 60 }),
  sourceUrl: field.url(),
  active: field.bool({ fallback: true }),
  order: field.number({ integer: true, min: 0, max: 10000, nullable: false, fallback: 0 }),
};

/** Only these are editable after upload; the file itself is replaced, not edited. */
export const mediaSchema = {
  alt: field.text({ max: 300 }),
  caption: field.text({ max: 200 }),
  category: field.oneOf(MEDIA_CATEGORIES, { fallback: 'other' }),
  featured: field.bool(),
  inGallery: field.bool({ fallback: true }),
  posterId: field.ref(),
  order: field.number({ integer: true, min: 0, max: 100000, nullable: false, fallback: 0 }),
};

export const reservationAdminSchema = {
  name: field.text({ max: 120, required: true }),
  phone: field.text({ max: 40 }),
  email: field.email(),
  date: field.date({ nullable: false }),
  time: field.oneOf(SITTINGS),
  exactTime: field.time(),
  guests: field.number({ integer: true, min: 1, max: 500, nullable: false, fallback: 2 }),
  roomId: field.ref(),
  message: field.text({ max: 2000 }),
  status: field.oneOf(RESERVATION_STATUSES),
  notes: field.text({ max: 2000 }),
};

export const userSchema = {
  name: field.text({ max: 80, required: true }),
  email: field.email({ required: true }),
  role: field.oneOf(ROLES, { fallback: 'staff' }),
  active: field.bool({ fallback: true }),
};

const hoursSchema = {
  day: field.oneOf(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  closed: field.bool(),
  opens: field.time(),
  closes: field.time(),
};

/**
 * Site settings and editable copy, grouped by where they appear. Each group
 * is saved independently, so the admin can update the hours without
 * resending the homepage.
 */
export const settingsSchema = {
  restaurant: field.object({
    name: field.text({ max: 80, required: true }),
    tagline: field.text({ max: 240 }),
    description: field.text({ max: 1200 }),
    region: field.text({ max: 120 }),
    address: field.text({ max: 300 }),
    phone: field.text({ max: 40 }),
    whatsapp: field.text({ max: 20 }),
    email: field.email(),
    mapsUrl: field.url(),
    currency: field.text({ max: 8, fallback: 'LKR' }),
    priceRange: field.text({ max: 8, fallback: '$$' }),
  }),
  hours: field.object({
    summary: field.text({ max: 120 }),
    days: field.objects(hoursSchema, { maxItems: 7 }),
    note: field.text({ max: 300 }),
  }),
  social: field.object({
    instagram: field.url(),
    facebook: field.url(),
    tripadvisor: field.url(),
    tiktok: field.url(),
    youtube: field.url(),
  }),
  home: field.object({
    heroEyebrow: field.text({ max: 80 }),
    heroTitle: field.text({ max: 120 }),
    heroSubtitle: field.text({ max: 300 }),
    heroImageId: field.ref(),
    heroVideoId: field.ref(),
    introTitle: field.text({ max: 160 }),
    introBody: field.text({ max: 1500 }),
    experienceTitle: field.text({ max: 160 }),
    experienceBody: field.text({ max: 1500 }),
    reserveTitle: field.text({ max: 160 }),
    reserveBody: field.text({ max: 600 }),
  }),
  about: field.object({
    title: field.text({ max: 160 }),
    body: field.text({ max: 4000 }),
    story: field.text({ max: 4000 }),
    imageId: field.ref(),
  }),
  menu: field.object({
    intro: field.text({ max: 600 }),
    // Off: unavailable dishes stay listed with their status. On: they vanish.
    hideUnavailable: field.bool(),
    note: field.text({ max: 600 }),
  }),
  reservations: field.object({
    intro: field.text({ max: 600 }),
    policy: field.text({ max: 1200 }),
    acceptingOnline: field.bool({ fallback: true }),
  }),
};
