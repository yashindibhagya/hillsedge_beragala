import { Router } from 'express';
import { requirePermission } from '../../middleware/auth.js';
import { logActivity, newId, now, read, write } from '../../services/store.js';
import { localToday } from '../../services/time.js';
import { reservationAdminSchema } from '../../validators/entities.js';
import { validate } from '../../validators/schema.js';
import { checkRefs, invalid, notFound, updateRecord } from './crud.js';

const SITTING_ORDER = { Lunch: 0, Afternoon: 1, Sunset: 2, Dinner: 3 };

export const bySchedule = (a, b) =>
  a.date.localeCompare(b.date) ||
  (SITTING_ORDER[a.time] ?? 9) - (SITTING_ORDER[b.time] ?? 9) ||
  (a.exactTime ?? '').localeCompare(b.exactTime ?? '');

export const reservationsAdminRouter = Router();

/**
 * GET /?view=today|upcoming|past|all&status=pending&q=priya&from=&to=
 *
 * "Upcoming" is today onwards and not finished; "past" is before today or
 * already completed/cancelled.
 */
reservationsAdminRouter.get('/', requirePermission('reservations:read'), (req, res) => {
  const { view = 'all', status, q, from, to } = req.query;
  const today = localToday();
  const needle = typeof q === 'string' ? q.trim().toLowerCase() : '';

  let items = read().reservations.filter((r) => {
    if (status && r.status !== status) return false;
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (view === 'today' && r.date !== today) return false;
    if (view === 'upcoming' && (r.date < today || ['completed', 'cancelled'].includes(r.status)))
      return false;
    if (view === 'past' && r.date >= today && !['completed', 'cancelled'].includes(r.status))
      return false;
    if (needle) {
      const haystack = `${r.name} ${r.phone} ${r.email} ${r.message}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  items = items.sort(bySchedule);
  if (view === 'past') items.reverse();

  const counts = {};
  for (const r of read().reservations) counts[r.status] = (counts[r.status] ?? 0) + 1;

  res.json({ items, counts, today });
});

/** A booking taken by phone or at the door, entered by staff. */
reservationsAdminRouter.post(
  '/',
  requirePermission('reservations:write'),
  async (req, res, next) => {
    const result = validate(reservationAdminSchema, req.body);
    if (!result.ok) return invalid(res, result.errors);
    try {
      const outcome = await write((data) => {
        const errors = checkRefs(data, result.value, { roomId: 'rooms' });
        if (Object.keys(errors).length) return { errors };
        const at = now();
        const record = {
          id: newId(),
          receivedAt: at,
          ...result.value,
          source: 'admin',
          updatedAt: at,
        };
        data.reservations.push(record);
        logActivity(data, {
          user: req.user,
          action: 'created',
          entity: 'reservation',
          entityId: record.id,
          label: `${record.name}, ${record.date}`,
        });
        return { record };
      });
      if (outcome.errors) return invalid(res, outcome.errors);
      return res.status(201).json({ item: outcome.record });
    } catch (error) {
      return next(error);
    }
  }
);

reservationsAdminRouter.patch('/:id', requirePermission('reservations:write'), (req, res, next) =>
  updateRecord(req, res, next, {
    collection: 'reservations',
    schema: reservationAdminSchema,
    label: 'reservation',
    refs: { roomId: 'rooms' },
    action:
      req.body && Object.keys(req.body).length === 1 && 'status' in req.body
        ? `marked ${req.body.status}`
        : 'updated',
  })
);

reservationsAdminRouter.delete(
  '/:id',
  requirePermission('reservations:delete'),
  async (req, res, next) => {
    try {
      const removed = await write((data) => {
        const index = data.reservations.findIndex((r) => r.id === req.params.id);
        if (index === -1) return null;
        const [record] = data.reservations.splice(index, 1);
        logActivity(data, {
          user: req.user,
          action: 'deleted',
          entity: 'reservation',
          entityId: record.id,
          label: `${record.name}, ${record.date}`,
        });
        return record;
      });
      return removed ? res.status(204).end() : notFound(res, 'reservation');
    } catch (error) {
      return next(error);
    }
  }
);
