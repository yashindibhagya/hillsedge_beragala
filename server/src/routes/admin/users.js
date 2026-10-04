import { Router } from 'express';
import { requirePermission } from '../../middleware/auth.js';
import {
  destroyUserSessions,
  hashPassword,
  passwordProblem,
  publicUser,
} from '../../services/auth.js';
import { logActivity, newId, now, read, write } from '../../services/store.js';
import { userSchema } from '../../validators/entities.js';
import { validate } from '../../validators/schema.js';
import { invalid, notFound } from './crud.js';

export const usersRouter = Router();
usersRouter.use(requirePermission('users:manage'));

const activeSuperAdmins = (data, exceptId) =>
  data.users.filter((u) => u.role === 'super_admin' && u.active && u.id !== exceptId).length;

usersRouter.get('/', (req, res) => {
  res.json({ items: read().users.map(publicUser) });
});

usersRouter.post('/', async (req, res, next) => {
  const result = validate(userSchema, req.body);
  const problem = passwordProblem(req.body?.password);
  const errors = { ...(result.ok ? {} : result.errors), ...(problem ? { password: problem } : {}) };
  if (Object.keys(errors).length) return invalid(res, errors);
  try {
    const passwordHash = await hashPassword(req.body.password);
    const outcome = await write((data) => {
      if (data.users.some((u) => u.email === result.value.email)) {
        return { errors: { email: 'Somebody already uses that email.' } };
      }
      const user = {
        id: newId(),
        ...result.value,
        passwordHash,
        createdAt: now(),
        lastLoginAt: null,
      };
      data.users.push(user);
      logActivity(data, {
        user: req.user,
        action: 'created',
        entity: 'user',
        entityId: user.id,
        label: user.name,
      });
      return { user };
    });
    if (outcome.errors) return invalid(res, outcome.errors);
    return res.status(201).json({ item: publicUser(outcome.user) });
  } catch (error) {
    return next(error);
  }
});

usersRouter.patch('/:id', async (req, res, next) => {
  const result = validate(userSchema, req.body, { partial: true });
  const wantsPassword = typeof req.body?.password === 'string' && req.body.password !== '';
  const problem = wantsPassword ? passwordProblem(req.body.password) : null;
  const errors = { ...(result.ok ? {} : result.errors), ...(problem ? { password: problem } : {}) };
  if (Object.keys(errors).length) return invalid(res, errors);

  try {
    const passwordHash = wantsPassword ? await hashPassword(req.body.password) : null;
    const outcome = await write((data) => {
      const user = data.users.find((u) => u.id === req.params.id);
      if (!user) return { missing: true };
      const next = { ...user, ...result.value };
      // Never leave the restaurant with nobody who can manage users.
      if (
        user.role === 'super_admin' &&
        (next.role !== 'super_admin' || !next.active) &&
        activeSuperAdmins(data, user.id) === 0
      ) {
        return {
          errors: { role: 'This is the last active super admin. Promote somebody else first.' },
        };
      }
      if (
        result.value.email &&
        data.users.some((u) => u.email === result.value.email && u.id !== user.id)
      ) {
        return { errors: { email: 'Somebody already uses that email.' } };
      }
      Object.assign(user, result.value);
      if (passwordHash) user.passwordHash = passwordHash;
      // A new password or a deactivation signs them out everywhere.
      if (passwordHash || user.active === false)
        destroyUserSessions(data, user.id, user.id === req.user.id ? req.sessionToken : null);
      logActivity(data, {
        user: req.user,
        action: 'updated',
        entity: 'user',
        entityId: user.id,
        label: user.name,
      });
      return { user };
    });
    if (outcome.missing) return notFound(res, 'user');
    if (outcome.errors) return invalid(res, outcome.errors);
    return res.json({ item: publicUser(outcome.user) });
  } catch (error) {
    return next(error);
  }
});

usersRouter.delete('/:id', async (req, res, next) => {
  if (req.params.id === req.user.id) {
    return res.status(409).json({ error: 'You cannot delete your own account.' });
  }
  try {
    const outcome = await write((data) => {
      const user = data.users.find((u) => u.id === req.params.id);
      if (!user) return { missing: true };
      if (user.role === 'super_admin' && activeSuperAdmins(data, user.id) === 0) {
        return { conflict: 'This is the last active super admin.' };
      }
      data.users = data.users.filter((u) => u.id !== user.id);
      destroyUserSessions(data, user.id);
      logActivity(data, {
        user: req.user,
        action: 'deleted',
        entity: 'user',
        entityId: user.id,
        label: user.name,
      });
      return {};
    });
    if (outcome.missing) return notFound(res, 'user');
    if (outcome.conflict) return res.status(409).json({ error: outcome.conflict });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});
