import { Router } from 'express';
import { config } from '../config/index.js';
import { reservationLimiter } from '../middleware/rateLimit.js';
import { validateReservation } from '../validators/reservation.js';
import { newId, now, read, write } from '../services/store.js';
import { localToday } from '../services/time.js';
import { sendMail } from '../services/mailer.js';

export const reservationsRouter = Router();

/**
 * Take a table booking.
 *
 * 422 rather than 400 for a well-formed request whose contents fail the
 * rules: the body parsed fine, the booking is the problem, and the client
 * renders `errors` against its fields.
 */
reservationsRouter.post('/reservations', reservationLimiter, async (req, res, next) => {
  const data = read();
  if (data.settings.reservations?.acceptingOnline === false) {
    return res.status(409).json({
      error: 'We are not taking bookings online right now. Please call or message us.',
    });
  }

  const result = validateReservation(req.body, { today: localToday(), rooms: data.rooms });

  if (!result.ok) {
    return res.status(422).json({
      error: 'Some details need checking.',
      errors: result.errors,
    });
  }

  try {
    const saved = await write((d) => {
      const at = now();
      const record = {
        id: newId(),
        receivedAt: at,
        ...result.value,
        exactTime: null,
        status: 'pending',
        notes: '',
        source: 'website',
        updatedAt: at,
      };
      // Not added to the activity log: that records what staff changed, and a
      // flood of public bookings must not be able to push it out.
      d.reservations.push(record);
      return record;
    });

    if (config.bookingAlertTo) {
      // Not awaited: the guest should not wait on our mail server.
      sendMail({
        to: config.bookingAlertTo,
        subject: `New booking: ${saved.name}, ${saved.date} ${saved.time}, ${saved.guests} guests`,
        text: [
          `Name: ${saved.name}`,
          `Date: ${saved.date} (${saved.time})`,
          `Guests: ${saved.guests}`,
          `Phone: ${saved.phone || '—'}`,
          `Email: ${saved.email || '—'}`,
          `Note: ${saved.message || '—'}`,
          '',
          'Confirm it from the admin panel.',
        ].join('\n'),
      });
    }

    return res.status(201).json({
      id: saved.id,
      receivedAt: saved.receivedAt,
      message: 'Thank you — we have your request and will confirm by message.',
    });
  } catch (error) {
    return next(error);
  }
});

export default reservationsRouter;
