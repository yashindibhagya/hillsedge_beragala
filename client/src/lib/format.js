/**
 * Formatting shared by the menu, rooms and booking screens. Everything here
 * returns null or '' for missing data, so callers render nothing rather than
 * a placeholder that looks like a fact.
 */

export function formatPrice(amount, currency = 'LKR') {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  try {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(Number(amount)) ? 0 : 2,
    }).format(amount);
  } catch {
    // An unknown currency code from the admin should not take the menu down.
    return `${currency} ${Number(amount).toLocaleString('en-LK')}`;
  }
}

export const AVAILABILITY = {
  available: { label: 'Available', tone: 'ok' },
  unavailable: { label: 'Temporarily unavailable', tone: 'warn' },
  sold_out: { label: 'Sold out', tone: 'danger' },
};

export const ROOM_KIND = {
  private_dining: 'Private dining',
  event_space: 'Event space',
  chalet: 'Stay',
  table_area: 'Dining space',
};

export const ROOM_STATUS = {
  open: { label: 'Taking bookings', tone: 'ok' },
  booked: { label: 'Fully booked', tone: 'warn' },
  coming_soon: { label: 'Coming soon', tone: 'info' },
  closed: { label: 'Closed for now', tone: 'danger' },
};

export const SPICE = ['', 'Mild', 'Medium', 'Hot'];

export const isBookable = (room) => room.bookingStatus === 'open' && room.available;

/** "18:30" → "6:30 pm". */
export function formatTime(value) {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
}

/**
 * Groups consecutive days with identical hours: "Monday – Friday 12 pm – 10 pm".
 * Days with no times set are left out entirely — the summary line covers them.
 */
export function groupHours(days = []) {
  const rows = [];
  for (const day of days) {
    const value = day.closed
      ? 'Closed'
      : day.opens && day.closes
        ? `${formatTime(day.opens)} – ${formatTime(day.closes)}`
        : null;
    if (!value) continue;
    const last = rows[rows.length - 1];
    if (last && last.value === value && last.endIndex === days.indexOf(day) - 1) {
      last.to = day.day;
      last.endIndex = days.indexOf(day);
    } else {
      rows.push({ from: day.day, to: day.day, value, endIndex: days.indexOf(day) });
    }
  }
  return rows.map(({ from, to, value }) => ({
    label: from === to ? from : `${from} – ${to}`,
    value,
  }));
}

/** The restaurant's timezone. The server judges "today" in it, so the form must too. */
export const RESTAURANT_TIMEZONE = 'Asia/Colombo';

/**
 * Today's date in Beragala as `YYYY-MM-DD` — not the visitor's. A guest
 * planning from London or Sydney must be offered the same first bookable day
 * the server will accept.
 */
export function today(at = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RESTAURANT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** The last date the server accepts a booking for: a year ahead. */
export function lastBookableDay(from = today()) {
  const date = new Date(`${from}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 365);
  return date.toISOString().slice(0, 10);
}

export function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** The address as lines, from the admin's multi-line field. */
export const addressLines = (address = '') =>
  address
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

export const telHref = (phone = '') => `tel:${phone.replace(/[^\d+]/g, '').replace(/^0/, '+94')}`;
