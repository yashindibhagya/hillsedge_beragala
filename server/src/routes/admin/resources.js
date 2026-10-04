import { requirePermission } from '../../middleware/auth.js';
import {
  AVAILABILITY,
  categorySchema,
  menuItemSchema,
  promotionSchema,
  roomSchema,
  testimonialSchema,
  ROOM_BOOKING_STATUSES,
} from '../../validators/entities.js';
import { field } from '../../validators/schema.js';
import { logActivity, newId, now, slugify, write } from '../../services/store.js';
import { crudRouter, notFound, reorderRoute, updateRecord } from './crud.js';

/** A photo field must point at a photo and a video field at a video. */
function mediaKindErrors(data, value, fields) {
  const errors = {};
  for (const [key, kind] of Object.entries(fields)) {
    const ids = Array.isArray(value[key]) ? value[key] : value[key] ? [value[key]] : [];
    const wrong = ids.some((id) => {
      const media = data.media.find((m) => m.id === id);
      return media && media.kind !== kind;
    });
    if (wrong)
      errors[key] = kind === 'image' ? 'Choose a photograph here.' : 'Choose a video here.';
  }
  return errors;
}

/* ------------------------------------------------------------ categories */

export const categoriesRouter = crudRouter({
  collection: 'categories',
  schema: categorySchema,
  permission: 'menu:write',
  label: 'category',
  slugged: true,
  refs: { imageId: 'media' },
  extend: (router) =>
    reorderRoute(router, { collection: 'categories', permission: 'menu:write', label: 'category' }),
  onDelete(category, data) {
    // Refuse rather than orphan dishes: the admin moves or deletes them first.
    const count = data.menuItems.filter((item) => item.categoryId === category.id).length;
    if (count > 0) {
      const error = new Error(
        `${count} ${count === 1 ? 'dish is' : 'dishes are'} still in “${category.name}”. Move or delete ${count === 1 ? 'it' : 'them'} first.`
      );
      error.status = 409;
      throw error;
    }
  },
});

/* ------------------------------------------------------------ menu items */

const availabilitySchema = { availability: field.oneOf(AVAILABILITY), hidden: field.bool() };

export const menuItemsRouter = crudRouter({
  collection: 'menuItems',
  schema: menuItemSchema,
  permission: 'menu:write',
  label: 'dish',
  slugged: true,
  refs: { categoryId: 'categories', imageId: 'media', videoId: 'media' },
  defaults: { views: 0 },
  check(value, data) {
    const errors = {};
    // Vegan implies vegetarian; saying otherwise is a slip, not a choice.
    if (value.vegan && value.vegetarian === false)
      errors.vegetarian = 'A vegan dish is vegetarian too.';
    Object.assign(errors, mediaKindErrors(data, value, { imageId: 'image', videoId: 'video' }));
    return errors;
  },
  extend(router) {
    reorderRoute(router, { collection: 'menuItems', permission: 'menu:write', label: 'dish' });

    // Staff can switch availability without being able to edit the dish.
    router.patch('/:id/availability', requirePermission('menu:availability'), (req, res, next) =>
      updateRecord(req, res, next, {
        collection: 'menuItems',
        schema: availabilitySchema,
        label: 'dish',
        action: 'changed availability of',
      })
    );

    router.post('/:id/duplicate', requirePermission('menu:write'), async (req, res, next) => {
      try {
        const copy = await write((data) => {
          const source = data.menuItems.find((item) => item.id === req.params.id);
          if (!source) return null;
          const at = now();
          const name = `${source.name} (copy)`;
          const record = {
            ...structuredClone(source),
            id: newId(),
            name,
            slug: slugify(name, data.menuItems),
            // A copy starts hidden, so a half-edited duplicate is never live.
            hidden: true,
            featured: false,
            views: 0,
            order: source.order + 1,
            createdAt: at,
            updatedAt: at,
          };
          data.menuItems.push(record);
          logActivity(data, {
            user: req.user,
            action: 'duplicated',
            entity: 'dish',
            entityId: record.id,
            label: source.name,
          });
          return record;
        });
        return copy ? res.status(201).json({ item: copy }) : notFound(res, 'dish');
      } catch (error) {
        return next(error);
      }
    });
  },
});

/* ----------------------------------------------------------------- rooms */

const roomAvailabilitySchema = {
  available: field.bool(),
  bookingStatus: field.oneOf(ROOM_BOOKING_STATUSES),
};

export const roomsRouter = crudRouter({
  collection: 'rooms',
  schema: roomSchema,
  permission: 'rooms:write',
  label: 'room',
  slugged: true,
  refs: { imageIds: 'media', videoId: 'media' },
  check: (value, data) => mediaKindErrors(data, value, { imageIds: 'image', videoId: 'video' }),
  extend(router) {
    reorderRoute(router, { collection: 'rooms', permission: 'rooms:write', label: 'room' });
    router.patch('/:id/availability', requirePermission('rooms:availability'), (req, res, next) =>
      updateRecord(req, res, next, {
        collection: 'rooms',
        schema: roomAvailabilitySchema,
        label: 'room',
        action: 'changed availability of',
      })
    );
  },
  onDelete(room, data) {
    // Bookings keep their history; they just no longer name a room.
    for (const reservation of data.reservations) {
      if (reservation.roomId === room.id) reservation.roomId = null;
    }
  },
});

/* ------------------------------------------------------------ promotions */

export const promotionsRouter = crudRouter({
  collection: 'promotions',
  schema: promotionSchema,
  permission: 'promotions:write',
  label: 'promotion',
  titleField: 'title',
  refs: { imageId: 'media' },
  check(value) {
    if (value.startsOn && value.endsOn && value.endsOn < value.startsOn) {
      return { endsOn: 'The end date is before the start date.' };
    }
    return {};
  },
  extend: (router) =>
    reorderRoute(router, {
      collection: 'promotions',
      permission: 'promotions:write',
      label: 'promotion',
    }),
});

/* ---------------------------------------------------------- testimonials */

export const testimonialsRouter = crudRouter({
  collection: 'testimonials',
  schema: testimonialSchema,
  permission: 'testimonials:write',
  label: 'testimonial',
  titleField: 'author',
  extend: (router) =>
    reorderRoute(router, {
      collection: 'testimonials',
      permission: 'testimonials:write',
      label: 'testimonial',
    }),
});
