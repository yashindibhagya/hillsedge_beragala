/**
 * The admin's one route to the server.
 *
 * Every request carries `X-Requested-With: hillsedge-admin`: the server
 * refuses state-changing admin requests without it, which is the second line
 * (behind the SameSite session cookie) against a forged cross-site post. The
 * cookie itself is httpOnly, so nothing here ever sees it.
 */
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
export const APP_HEADER = { 'X-Requested-With': 'hillsedge-admin' };

export class ApiError extends Error {
  constructor(message, { status = 0, errors = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    /** Field-keyed messages when the server rejected the contents (422). */
    this.errors = errors;
  }
}

/*
 * Set by the auth provider. A 401 on anything but the auth endpoints means
 * the session expired mid-use; the provider drops the user and the router
 * sends them to the sign-in page with a note.
 */
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { ...APP_HEADER, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach the server. Check the connection and try again.');
  }

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // An HTML error page from a proxy, or an empty body.
  }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.();
    throw new ApiError(payload?.error ?? `The server answered ${response.status}.`, {
      status: response.status,
      errors: payload?.errors ?? null,
    });
  }
  return payload;
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body) => request(path, { method: 'POST', body: body ?? {} }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

/**
 * Uploads one file with progress. fetch cannot report upload progress, and a
 * 100 MB video with no progress bar looks exactly like a frozen page, so this
 * one uses XMLHttpRequest.
 *
 * @param {File} file
 * @param {object} fields  alt, caption, category, inGallery, featured
 * @param {(fraction: number) => void} [onProgress]
 * @returns {Promise<object>} the stored media record
 */
export function uploadMedia(file, fields = {}, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) form.append(key, String(value));
    }
    // The file goes last so the server has the fields before the bytes.
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/api/admin/media`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-Requested-With', APP_HEADER['X-Requested-With']);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new ApiError('The upload was interrupted. Try again.'));
    xhr.onload = () => {
      const payload = xhr.response;
      if (xhr.status >= 200 && xhr.status < 300) return resolve(payload.item);
      if (xhr.status === 401) onUnauthorized?.();
      return reject(
        new ApiError(payload?.error ?? `Upload failed (${xhr.status}).`, {
          status: xhr.status,
          errors: payload?.errors ?? null,
        })
      );
    };
    xhr.send(form);
  });
}

export default api;
