import { Router } from 'express';
import { loadUser } from '../middleware/auth.js';
import { healthRouter } from './health.js';
import { reservationsRouter } from './reservations.js';
import { publicRouter } from './public.js';
import { authRouter } from './auth.js';
import { adminRouter } from './admin/index.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(reservationsRouter);
apiRouter.use('/public', publicRouter);
apiRouter.use('/auth', loadUser, authRouter);
apiRouter.use('/admin', loadUser, adminRouter);

export default apiRouter;
