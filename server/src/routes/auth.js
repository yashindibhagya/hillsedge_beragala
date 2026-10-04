import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import {
  loadUser,
  permissionsFor,
  requireAppHeader,
  requireUser,
  sessionCookieOptions,
} from '../middleware/auth.js';
import {
  SESSION_COOKIE,
  authenticate,
  consumePasswordReset,
  createPasswordReset,
  createSession,
  destroySession,
  destroyUserSessions,
  hashPassword,
  passwordProblem,
  publicUser,
  verifyPassword,
} from '../services/auth.js';
import { sendMail } from '../services/mailer.js';
import { logActivity, write } from '../services/store.js';

export const authRouter = Router();

/* Guessing passwords is the attack worth slowing down; ten tries per
 * address per window is plenty for somebody who has forgotten theirs. */
const limiter = (options = {}) =>
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.loginMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
    ...options,
  });

// Only failures count against a login: staff signing in on a shared
// restaurant connection must not lock each other out.
const loginLimiter = limiter({ skipSuccessfulRequests: true });
const resetLimiter = limiter();

authRouter.use(requireAppHeader);

const me = (user) => ({ user: publicUser(user), permissions: permissionsFor(user) });

authRouter.get('/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  return res.json(me(req.user));
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const user = await authenticate(req.body?.email, req.body?.password);
    if (!user) return res.status(401).json({ error: 'That email and password do not match.' });
    const token = await createSession(user);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    return res.json(me(user));
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    await destroySession(req.sessionToken);
    res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

/**
 * Always answers the same way, so it cannot be used to find out which
 * emails have accounts.
 */
authRouter.post('/forgot', resetLimiter, (req, res) => {
  // Answer before doing any work, so the response time cannot tell an
  // existing account from a missing one.
  res.status(202).json({ message: 'If that email has an account, a reset link is on its way.' });

  /*
   * The link's origin comes from configuration, never from the request: a
   * forged Host header would otherwise put a real reset token into a link to
   * the attacker's site. In development, where PUBLIC_ORIGIN is usually
   * unset, the admin dev server's address is the right one.
   */
  const origin = config.publicOrigin || (config.isProduction ? null : 'http://localhost:5173');
  if (!origin) return;
  const email = req.body?.email;
  createPasswordReset(email)
    .then((reset) => {
      if (!reset) return null;
      const link = `${origin}/admin/reset?token=${encodeURIComponent(reset.token)}`;
      return sendMail({
        to: reset.user.email,
        subject: 'Reset your Hillsedge admin password',
        text: `Hello ${reset.user.name},\n\nUse this link within the hour to choose a new password:\n\n${link}\n\nIf you did not ask for this, ignore this email — nothing has changed.`,
      });
    })
    .catch((error) => console.error('[auth] password reset failed:', error.message));
});

authRouter.post('/reset', resetLimiter, async (req, res, next) => {
  const problem = passwordProblem(req.body?.password);
  if (problem) return res.status(422).json({ error: problem, errors: { password: problem } });
  try {
    const user = await consumePasswordReset(req.body?.token, req.body.password);
    if (!user)
      return res
        .status(400)
        .json({ error: 'That reset link has expired or was already used. Ask for a new one.' });
    return res.json({ message: 'Password changed. You can sign in now.' });
  } catch (error) {
    return next(error);
  }
});

/** Change your own password; signs out every other session. */
authRouter.post('/password', requireUser, async (req, res, next) => {
  const { current, password } = req.body ?? {};
  const problem = passwordProblem(password);
  if (problem) return res.status(422).json({ error: problem, errors: { password: problem } });
  try {
    if (!(await verifyPassword(String(current ?? ''), req.user.passwordHash))) {
      return res
        .status(422)
        .json({ error: 'Your current password is not right.', errors: { current: 'Not right.' } });
    }
    const passwordHash = await hashPassword(password);
    await write((data) => {
      const user = data.users.find((u) => u.id === req.user.id);
      user.passwordHash = passwordHash;
      destroyUserSessions(data, user.id, req.sessionToken);
      logActivity(data, {
        user,
        action: 'changed password',
        entity: 'user',
        entityId: user.id,
        label: user.name,
      });
    });
    return res.json({ message: 'Password changed.' });
  } catch (error) {
    return next(error);
  }
});

export { loadUser };
