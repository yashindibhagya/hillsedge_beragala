/**
 * The one place the public site talks to the server.
 *
 * The API is served from the same origin as the app in production, and the
 * Vite dev server proxies /api (and /media) through to it, so a relative path
 * is correct in both. VITE_API_BASE_URL exists for the case where the two are
 * split across hosts.
 */
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** The server took longer than this, so stop waiting and say so. */
const TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    /** Field-keyed messages, when the server rejected the contents. */
    this.errors = errors ?? null;
  }
}

async function request(path, { method = 'GET', body, signal, fallbackError } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    // Offline, DNS failure, CORS, or our own timeout — indistinguishable
    // from here, and the guest needs the same answer for all of them.
    throw new ApiError(
      error.name === 'AbortError'
        ? 'That took too long. Please try again.'
        : 'We could not reach the restaurant. Please check your connection and try again.'
    );
  } finally {
    clearTimeout(timeout);
  }

  let payload = null;
  try {
    payload = response.status === 204 || response.status === 202 ? null : await response.json();
  } catch {
    // A proxy or error page returned something that is not JSON.
  }

  if (!response.ok) {
    throw new ApiError(payload?.error ?? fallbackError ?? 'Something went wrong.', {
      status: response.status,
      errors: payload?.errors,
    });
  }

  return payload;
}

/** Settings, rooms, gallery, promotions, testimonials and featured dishes. */
export const fetchSite = (options) => request('/api/public/site', options);

/** Every visible category and dish. */
export const fetchMenu = (options) => request('/api/public/menu', options);

/**
 * Counts a dish being opened. Fire-and-forget: a lost count is not worth
 * bothering the guest about.
 */
export function recordView(itemId) {
  return request(`/api/public/menu/${encodeURIComponent(itemId)}/view`, { method: 'POST' }).catch(
    () => {}
  );
}

export function createReservation(booking, { signal } = {}) {
  return request('/api/reservations', {
    method: 'POST',
    body: booking,
    signal,
    fallbackError: 'We could not save that booking.',
  })
    .then((payload) => {
      /*
       * Only a reply carrying the booking's id is a booking. A host that
       * rewrites /api to index.html, or a captive portal, answers 200 with
       * something else — and telling a guest "we have your table" when we do
       * not is the one failure this form must never have.
       */
      if (!payload?.id) {
        throw new ApiError('We could not confirm that booking was saved. Please try again.');
      }
      return payload;
    })
    .catch((error) => {
      // Network failures get the WhatsApp nudge; server answers keep their own words.
      if (!error.status) {
        error.message = `${error.message.replace(/ Please.*$/, '')} You can also send it on WhatsApp.`;
      }
      throw error;
    });
}

export default createReservation;
