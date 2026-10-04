import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { byOrder, read, write } from '../services/store.js';
import { localToday } from '../services/time.js';

/**
 * What the public site reads. Nothing here needs a session, and nothing
 * here leaks admin-only fields: every record is rebuilt from an allow-list.
 */
export const publicRouter = Router();

/* Content changes when somebody edits it, not per request. A short shared
 * cache keeps a burst of visitors off the process while an availability
 * change still shows within half a minute. */
const cacheBriefly = (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
  next();
};

const publicMedia = (m) => ({
  id: m.id,
  kind: m.kind,
  mime: m.mime,
  url: m.url,
  variants: m.variants,
  width: m.width ?? null,
  height: m.height ?? null,
  lqip: m.lqip ?? null,
  alt: m.alt,
  caption: m.caption,
  category: m.category,
  featured: m.featured,
  posterId: m.posterId ?? null,
});

/** The media a response refers to, keyed by id, so each is sent once. */
function mediaFor(ids) {
  const wanted = new Set(ids.filter(Boolean));
  const out = {};
  for (const m of read().media) {
    if (wanted.has(m.id)) {
      out[m.id] = publicMedia(m);
      if (m.posterId) wanted.add(m.posterId);
    }
  }
  // Posters found on the first pass.
  for (const m of read().media) if (wanted.has(m.id) && !out[m.id]) out[m.id] = publicMedia(m);
  return out;
}

const publicItem = (i) => ({
  id: i.id,
  slug: i.slug,
  name: i.name,
  description: i.description,
  price: i.price,
  categoryId: i.categoryId,
  subcategory: i.subcategory,
  imageId: i.imageId,
  videoId: i.videoId,
  ingredients: i.ingredients,
  dietary: i.dietary,
  allergens: i.allergens,
  vegetarian: i.vegetarian,
  vegan: i.vegan,
  spicy: i.spicy,
  featured: i.featured,
  bestseller: i.bestseller,
  special: i.special,
  availability: i.availability,
});

function visibleMenu() {
  const data = read();
  const hideUnavailable = Boolean(data.settings.menu?.hideUnavailable);
  const categories = data.categories.filter((c) => c.active).sort(byOrder);
  const live = new Set(categories.map((c) => c.id));
  const items = data.menuItems
    .filter((i) => live.has(i.categoryId) && !i.hidden)
    .filter((i) => !hideUnavailable || i.availability === 'available')
    .sort(byOrder);
  return { categories, items };
}

function livePromotions(today) {
  return read()
    .promotions.filter(
      (p) => p.active && (!p.startsOn || p.startsOn <= today) && (!p.endsOn || p.endsOn >= today)
    )
    .sort(byOrder);
}

publicRouter.get('/site', cacheBriefly, (req, res) => {
  const data = read();
  const today = localToday();
  const { categories, items } = visibleMenu();
  const rooms = data.rooms.filter((r) => r.active).sort(byOrder);
  const gallery = data.media.filter((m) => m.inGallery).sort(byOrder);
  const promotions = livePromotions(today);
  const featured = items.filter((i) => i.featured).slice(0, 8);
  const { settings } = data;

  res.json({
    settings: {
      restaurant: settings.restaurant,
      hours: settings.hours,
      social: settings.social,
      home: settings.home,
      about: settings.about,
      menu: settings.menu,
      reservations: settings.reservations,
    },
    categories: categories.map(({ id, slug, name, description, imageId }) => ({
      id,
      slug,
      name,
      description,
      imageId,
    })),
    featured: featured.map(publicItem),
    rooms: rooms.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      kind: r.kind,
      summary: r.summary,
      description: r.description,
      capacity: r.capacity,
      price: r.price,
      priceUnit: r.priceUnit,
      features: r.features,
      imageIds: r.imageIds,
      videoId: r.videoId,
      available: r.available,
      bookingStatus: r.bookingStatus,
    })),
    gallery: gallery.map((m) => m.id),
    promotions: promotions.map(
      ({ id, title, kind, description, imageId, startsOn, endsOn, ctaLabel, ctaHref }) => ({
        id,
        title,
        kind,
        description,
        imageId,
        startsOn,
        endsOn,
        ctaLabel,
        ctaHref,
      })
    ),
    testimonials: data.testimonials
      .filter((t) => t.active)
      .sort(byOrder)
      .map(({ id, author, origin, quote, rating, source, sourceUrl }) => ({
        id,
        author,
        origin,
        quote,
        rating,
        source,
        sourceUrl,
      })),
    media: mediaFor([
      settings.home?.heroImageId,
      settings.home?.heroVideoId,
      settings.about?.imageId,
      ...categories.map((c) => c.imageId),
      ...featured.flatMap((i) => [i.imageId, i.videoId]),
      ...rooms.flatMap((r) => [...r.imageIds, r.videoId]),
      ...gallery.map((m) => m.id),
      ...promotions.map((p) => p.imageId),
    ]),
  });
});

publicRouter.get('/menu', cacheBriefly, (req, res) => {
  const { categories, items } = visibleMenu();
  res.json({
    categories: categories.map(({ id, slug, name, description, imageId }) => ({
      id,
      slug,
      name,
      description,
      imageId,
    })),
    items: items.map(publicItem),
    currency: read().settings.restaurant?.currency ?? 'LKR',
    media: mediaFor([
      ...categories.map((c) => c.imageId),
      ...items.flatMap((i) => [i.imageId, i.videoId]),
    ]),
  });
});

/*
 * Counts a dish being opened, which is what "popular" on the dashboard means.
 * Rate-limited and anonymous; nothing about the visitor is stored. Writes are
 * coalesced: views accumulate in memory and are flushed at most every 30s.
 */
const viewLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const pendingViews = new Map();
let flushTimer = null;

function flushViews() {
  flushTimer = null;
  if (pendingViews.size === 0) return Promise.resolve();
  const batch = new Map(pendingViews);
  pendingViews.clear();
  return write((data) => {
    for (const item of data.menuItems) {
      if (batch.has(item.id)) item.views = (item.views ?? 0) + batch.get(item.id);
    }
  }).catch((error) => console.error('[views] flush failed:', error.message));
}

export { flushViews };

publicRouter.post('/menu/:id/view', viewLimiter, (req, res) => {
  const exists = read().menuItems.some((i) => i.id === req.params.id && !i.hidden);
  if (!exists) return res.status(404).json({ error: 'No such dish.' });
  pendingViews.set(req.params.id, (pendingViews.get(req.params.id) ?? 0) + 1);
  flushTimer ??= setTimeout(flushViews, 30_000);
  flushTimer.unref?.();
  return res.status(202).end();
});
