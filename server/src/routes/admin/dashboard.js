import { Router } from 'express';
import { requirePermission } from '../../middleware/auth.js';
import { read } from '../../services/store.js';
import { addDays, localToday } from '../../services/time.js';
import { bySchedule } from './reservations.js';

export const dashboardRouter = Router();

/** Everything the overview screen shows, in one request. */
dashboardRouter.get('/dashboard', requirePermission('dashboard'), (req, res) => {
  const data = read();
  const today = localToday();
  const horizon = addDays(today, 13);

  const items = data.menuItems;
  const live = (r) => r.status === 'pending' || r.status === 'confirmed';
  const upcoming = data.reservations.filter((r) => r.date >= today && live(r)).sort(bySchedule);

  // Bookings and covers per day for the next two weeks, gaps included, so
  // the chart's x-axis is continuous.
  const days = [];
  for (let date = today; date <= horizon; date = addDays(date, 1)) {
    const onDay = data.reservations.filter((r) => r.date === date && live(r));
    days.push({
      date,
      bookings: onDay.length,
      guests: onDay.reduce((sum, r) => sum + (r.guests ?? 0), 0),
    });
  }

  const categoryName = new Map(data.categories.map((c) => [c.id, c.name]));

  res.json({
    today,
    menu: {
      total: items.length,
      available: items.filter((i) => i.availability === 'available' && !i.hidden).length,
      unavailable: items.filter((i) => i.availability === 'unavailable').length,
      soldOut: items.filter((i) => i.availability === 'sold_out').length,
      hidden: items.filter((i) => i.hidden).length,
      noPrice: items.filter((i) => i.price === null).length,
      categories: data.categories.length,
    },
    reservations: {
      total: data.reservations.length,
      pending: data.reservations.filter((r) => r.status === 'pending').length,
      today: data.reservations.filter((r) => r.date === today && live(r)).length,
      guestsToday: data.reservations
        .filter((r) => r.date === today && live(r))
        .reduce((s, r) => s + (r.guests ?? 0), 0),
      upcoming: upcoming.length,
    },
    rooms: {
      total: data.rooms.filter((r) => r.active).length,
      available: data.rooms.filter((r) => r.active && r.available && r.bookingStatus === 'open')
        .length,
      occupied: data.rooms.filter((r) => r.active && r.bookingStatus === 'booked').length,
      unavailable: data.rooms.filter(
        (r) => r.active && (!r.available || ['closed', 'coming_soon'].includes(r.bookingStatus))
      ).length,
    },
    upcoming: upcoming.slice(0, 8),
    days,
    popular: [...items]
      .filter((i) => (i.views ?? 0) > 0)
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 6)
      .map((i) => ({
        id: i.id,
        name: i.name,
        views: i.views,
        category: categoryName.get(i.categoryId) ?? '',
      })),
    activity: data.activity.slice(0, 12),
  });
});

dashboardRouter.get('/activity', requirePermission('dashboard'), (req, res) => {
  res.json({ items: read().activity });
});
