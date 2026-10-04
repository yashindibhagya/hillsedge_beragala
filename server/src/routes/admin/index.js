import { Router } from 'express';
import { requireAppHeader, requireUser } from '../../middleware/auth.js';
import { dashboardRouter } from './dashboard.js';
import { mediaRouter } from './media.js';
import { reservationsAdminRouter } from './reservations.js';
import {
  categoriesRouter,
  menuItemsRouter,
  promotionsRouter,
  roomsRouter,
  testimonialsRouter,
} from './resources.js';
import { settingsRouter } from './settings.js';
import { usersRouter } from './users.js';

/** Everything under /api/admin: signed in, and permission-checked per route. */
export const adminRouter = Router();

adminRouter.use((req, res, next) => {
  // Admin responses are per-user and must never be cached by a proxy.
  res.set('Cache-Control', 'no-store');
  next();
});
adminRouter.use(requireAppHeader);
adminRouter.use(requireUser);

adminRouter.use(dashboardRouter);
adminRouter.use('/categories', categoriesRouter);
adminRouter.use('/menu-items', menuItemsRouter);
adminRouter.use('/rooms', roomsRouter);
adminRouter.use('/reservations', reservationsAdminRouter);
adminRouter.use('/media', mediaRouter);
adminRouter.use('/promotions', promotionsRouter);
adminRouter.use('/testimonials', testimonialsRouter);
adminRouter.use('/settings', settingsRouter);
adminRouter.use('/users', usersRouter);
