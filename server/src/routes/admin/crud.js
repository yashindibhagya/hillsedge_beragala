import { Router } from 'express';
import { validate } from '../../validators/schema.js';
import { byOrder, logActivity, newId, now, read, slugify, write } from '../../services/store.js';
import { requirePermission } from '../../middleware/auth.js';

export const invalid = (res, errors) =>
  res.status(422).json({ error: 'Some details need checking.', errors });

export const notFound = (res, what = 'record') =>
  res.status(404).json({ error: `That ${what} no longer exists.` });

/**
 * Checks that every id a record points at exists in the right collection.
 * `refs` maps a field to the collection it points into.
 */
export function checkRefs(data, value, refs) {
  const errors = {};
  for (const [key, collection] of Object.entries(refs)) {
    if (!(key in value)) continue;
    const ids = Array.isArray(value[key]) ? value[key] : value[key] ? [value[key]] : [];
    const known = new Set(data[collection].map((r) => r.id));
    if (ids.some((id) => !known.has(id))) errors[key] = 'That no longer exists.';
  }
  return errors;
}

/**
 * The list / create / update / delete / reorder routes every simple
 * collection needs, so each resource only states what is particular to it.
 *
 * @param {object} options
 * @param {string} options.collection  key in the store
 * @param {object} options.schema      field schema (validators/entities.js)
 * @param {string} options.permission  required for writes; reads need `readPermission`
 * @param {string} options.label       what the activity log calls one record
 * @param {string} [options.titleField] the field a record is named by
 * @param {object} [options.refs]      field → collection, checked on save
 * @param {boolean} [options.slugged]  keep a unique `slug` from the title
 * @param {Function} [options.check]   extra cross-field rules → errors object
 * @param {Function} [options.onDelete] tidy up references before removal
 * @param {object} [options.defaults] server-owned fields a new record starts with
 */
export function crudRouter({
  collection,
  schema,
  permission,
  readPermission = 'dashboard',
  label,
  titleField = 'name',
  refs = {},
  slugged = false,
  check,
  onDelete,
  extend,
  defaults = {},
}) {
  const router = Router();

  // Before the /:id routes, so a literal path like /reorder is not read as an id.
  if (extend) extend(router);

  router.get('/', requirePermission(readPermission), (req, res) => {
    res.json({ items: [...read()[collection]].sort(byOrder) });
  });

  router.get('/:id', requirePermission(readPermission), (req, res) => {
    const record = read()[collection].find((r) => r.id === req.params.id);
    return record ? res.json({ item: record }) : notFound(res, label);
  });

  router.post('/', requirePermission(permission), async (req, res, next) => {
    const result = validate(schema, req.body);
    if (!result.ok) return invalid(res, result.errors);
    try {
      const outcome = await write((data) => {
        const errors = {
          ...checkRefs(data, result.value, refs),
          ...(check?.(result.value, data) ?? {}),
        };
        if (Object.keys(errors).length) return { errors };
        const at = now();
        const record = { id: newId(), ...defaults, ...result.value, createdAt: at, updatedAt: at };
        if (slugged) record.slug = slugify(record[titleField], data[collection]);
        // New records go to the end unless an order was given.
        if ('order' in schema && !('order' in (req.body ?? {}))) {
          record.order = data[collection].reduce((max, r) => Math.max(max, (r.order ?? 0) + 1), 0);
        }
        data[collection].push(record);
        logActivity(data, {
          user: req.user,
          action: 'created',
          entity: label,
          entityId: record.id,
          label: record[titleField],
        });
        return { record };
      });
      if (outcome.errors) return invalid(res, outcome.errors);
      return res.status(201).json({ item: outcome.record });
    } catch (error) {
      return next(error);
    }
  });

  router.patch('/:id', requirePermission(permission), (req, res, next) =>
    updateRecord(req, res, next, { collection, schema, label, titleField, refs, slugged, check })
  );

  router.delete('/:id', requirePermission(permission), async (req, res, next) => {
    try {
      const removed = await write(async (data) => {
        const index = data[collection].findIndex((r) => r.id === req.params.id);
        if (index === -1) return null;
        const [record] = data[collection].splice(index, 1);
        await onDelete?.(record, data);
        logActivity(data, {
          user: req.user,
          action: 'deleted',
          entity: label,
          entityId: record.id,
          label: record[titleField],
        });
        return record;
      });
      return removed ? res.status(204).end() : notFound(res, label);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

/** A partial update, shared by the generic router and the special cases. */
export async function updateRecord(
  req,
  res,
  next,
  { collection, schema, label, titleField = 'name', refs = {}, slugged, check, action = 'updated' }
) {
  const result = validate(schema, req.body, { partial: true });
  if (!result.ok) return invalid(res, result.errors);
  try {
    const outcome = await write((data) => {
      const record = data[collection].find((r) => r.id === req.params.id);
      if (!record) return { missing: true };
      const merged = { ...record, ...result.value };
      const errors = { ...checkRefs(data, result.value, refs), ...(check?.(merged, data) ?? {}) };
      if (Object.keys(errors).length) return { errors };
      Object.assign(record, result.value, { updatedAt: now() });
      if (slugged && titleField in result.value) {
        record.slug = slugify(record[titleField], data[collection], record.id);
      }
      logActivity(data, {
        user: req.user,
        action,
        entity: label,
        entityId: record.id,
        label: record[titleField],
      });
      return { record };
    });
    if (outcome.missing) return notFound(res, label);
    if (outcome.errors) return invalid(res, outcome.errors);
    return res.json({ item: outcome.record });
  } catch (error) {
    return next(error);
  }
}

/** PUT /reorder with `{ ids: [...] }` — sets `order` to each id's position. */
export function reorderRoute(router, { collection, permission, label }) {
  router.put('/reorder', requirePermission(permission), async (req, res, next) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      return invalid(res, { ids: 'Send the ids in their new order.' });
    }
    try {
      await write((data) => {
        const position = new Map(ids.map((id, index) => [id, index]));
        for (const record of data[collection]) {
          if (position.has(record.id)) record.order = position.get(record.id);
        }
        logActivity(data, {
          user: req.user,
          action: 'reordered',
          entity: label,
          label: `${ids.length} ${label}s`,
        });
      });
      return res.json({ items: [...read()[collection]].sort(byOrder) });
    } catch (error) {
      return next(error);
    }
  });
}
