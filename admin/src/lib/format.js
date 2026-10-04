/** Labels and formatting shared across screens. Mirrors server/src/validators/entities.js. */

export const AVAILABILITY = [
  { value: 'available', label: 'Available', tone: 'ok' },
  { value: 'unavailable', label: 'Temporarily unavailable', short: 'Unavailable', tone: 'warn' },
  { value: 'sold_out', label: 'Sold out', tone: 'danger' },
];

export const RESERVATION_STATUSES = [
  { value: 'pending', label: 'Pending', tone: 'warn' },
  { value: 'confirmed', label: 'Confirmed', tone: 'ok' },
  { value: 'completed', label: 'Completed', tone: 'info' },
  { value: 'cancelled', label: 'Cancelled', tone: 'danger' },
];

export const ROOM_KINDS = [
  { value: 'private_dining', label: 'Private dining' },
  { value: 'event_space', label: 'Event space' },
  { value: 'chalet', label: 'Chalet / stay' },
  { value: 'table_area', label: 'Dining area' },
];

export const ROOM_BOOKING_STATUSES = [
  { value: 'open', label: 'Open for booking', tone: 'ok' },
  { value: 'booked', label: 'Booked / occupied', tone: 'info' },
  { value: 'coming_soon', label: 'Coming soon', tone: 'warn' },
  { value: 'closed', label: 'Closed', tone: 'danger' },
];

export const PROMOTION_KINDS = [
  { value: 'offer', label: 'Special offer' },
  { value: 'seasonal_menu', label: 'Seasonal menu' },
  { value: 'event', label: 'Event' },
  { value: 'discount', label: 'Discount' },
  { value: 'limited_dish', label: 'Limited-time dish' },
  { value: 'holiday', label: 'Holiday' },
];

export const MEDIA_CATEGORIES = [
  { value: 'place', label: 'The place' },
  { value: 'smoke', label: 'Smokehouse' },
  { value: 'table', label: 'The table' },
  { value: 'views', label: 'Views & nature' },
  { value: 'rooms', label: 'Rooms' },
  { value: 'menu', label: 'Menu' },
  { value: 'events', label: 'Events' },
  { value: 'other', label: 'Other' },
];

export const ROLES = [
  { value: 'super_admin', label: 'Super admin', hint: 'Everything, including users.' },
  { value: 'manager', label: 'Manager', hint: 'Menu, rooms, reservations, media and content.' },
  {
    value: 'staff',
    label: 'Staff',
    hint: 'Reservations, and switching dishes and rooms on and off.',
  },
];

export const SITTINGS = ['Lunch', 'Afternoon', 'Sunset', 'Dinner'];

export const labelOf = (list, value) => list.find((x) => x.value === value)?.label ?? value;
export const toneOf = (list, value) => list.find((x) => x.value === value)?.tone ?? 'neutral';

/** "Sat 4 Oct" — day names matter more than years for a booking list. */
export function formatDate(iso, { weekday = true, year = false } = {}) {
  if (!iso) return '—';
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    weekday: weekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: year ? 'numeric' : undefined,
  });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "3 min ago", "yesterday", then a date. */
export function timeAgo(iso) {
  const seconds = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(iso.slice(0, 10), { weekday: false });
}

export function formatPrice(value, currency = 'LKR') {
  if (value === null || value === undefined || value === '') return 'No price';
  try {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

export function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Local `YYYY-MM-DD`. */
export function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** A WhatsApp link for a guest's number, assuming Sri Lanka for local numbers. */
export function whatsappLink(phone) {
  let digits = String(phone ?? '').replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('0')) digits = `94${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

/** The smallest variant at least `width` wide, for thumbnails. */
export function mediaSrc(media, width = 480) {
  if (!media) return null;
  if (media.kind === 'video') return null;
  const variant = (media.variants ?? []).find((v) => v.width >= width);
  return variant?.url ?? media.url;
}

/** The record minus fields the server owns, ready to send back as an update. */
export function editable(
  record,
  keys = ['id', 'slug', 'createdAt', 'updatedAt', 'views', 'order']
) {
  const copy = { ...record };
  for (const key of keys) delete copy[key];
  return copy;
}
