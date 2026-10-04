import { parseDate } from './schema.js';
import { SITTINGS } from './entities.js';
import { addDays } from '../services/time.js';

export const SITTING_OPTIONS = SITTINGS;
export const MAX_GUESTS = 200;
export const MAX_DAYS_AHEAD = 365;

const MAX = { name: 120, message: 2000, phone: 40, email: 200 };

/**
 * Validates a booking from the public form and returns the clean version.
 *
 * Never trust the browser: the front end checks the same rules so the guest
 * gets a fast answer, but anything can POST here, so the rules are enforced
 * again and the stored record is built field by field from known keys rather
 * than from whatever the request happened to contain.
 *
 * `today` is the restaurant's local date, passed in so "today" means the
 * same thing in Beragala whatever timezone the server runs in.
 */
export function validateReservation(input, { today, rooms = [] } = {}) {
  const errors = {};
  const body = input && typeof input === 'object' ? input : {};
  const text = (key) => (typeof body[key] === 'string' ? body[key].trim() : '');

  const name = text('name');
  if (!name) errors.name = 'Please tell us who the table is for.';
  else if (name.length > MAX.name)
    errors.name = `Please keep the name under ${MAX.name} characters.`;

  // We confirm by message, so we need one way to reach the guest.
  const phone = text('phone');
  const email = text('email').toLowerCase();
  const phoneDigits = phone.replace(/\D/g, '').length;
  if (
    phone &&
    (phone.length > MAX.phone ||
      !/^[+\d][\d\s()-]{5,}$/.test(phone) ||
      phoneDigits < 6 ||
      phoneDigits > 15)
  ) {
    errors.phone = 'That phone number does not look right.';
  }
  if (email && (email.length > MAX.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    errors.email = 'That email address does not look right.';
  }
  if (!phone && !email) errors.phone = 'Please leave a phone number or email so we can confirm.';

  const date = parseDate(body.date);
  if (!body.date) errors.date = 'Please choose a date.';
  else if (!date) errors.date = 'That date is not valid.';
  else if (today && body.date < today) errors.date = 'Please choose today or a later date.';
  else if (today && body.date > addDays(today, MAX_DAYS_AHEAD)) {
    errors.date = 'We take bookings up to a year ahead. For later dates, please message us.';
  }

  // A number, or a string of digits from a form — not true, [3] or "3e1".
  const rawGuests = body.guests;
  const guests =
    typeof rawGuests === 'number' || (typeof rawGuests === 'string' && /^\d{1,4}$/.test(rawGuests))
      ? Number(rawGuests)
      : NaN;
  if (!Number.isInteger(guests) || guests < 1)
    errors.guests = 'Please tell us how many are coming.';
  else if (guests > MAX_GUESTS)
    errors.guests = `For more than ${MAX_GUESTS}, please message us directly.`;

  const time = typeof body.time === 'string' ? body.time : '';
  if (!SITTING_OPTIONS.includes(time)) errors.time = 'Please choose a sitting.';

  let roomId = null;
  if (body.roomId) {
    const room = rooms.find((r) => r.id === body.roomId);
    if (!room || !room.active || !room.available || room.bookingStatus !== 'open') {
      errors.roomId = 'That space cannot be booked at the moment.';
    } else {
      roomId = room.id;
    }
  }

  const message = text('message');
  if (message.length > MAX.message) {
    errors.message = `Please keep the note under ${MAX.message} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: { name, phone, email, date: body.date, time, guests, roomId, message },
  };
}

export default validateReservation;
