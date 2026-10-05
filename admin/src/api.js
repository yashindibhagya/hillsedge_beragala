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

/*
 * Where the server runs on Vercel, a request body over 4.5 MB never reaches
 * it, so files go straight to Vercel Blob and the server is then asked to
 * process them. Elsewhere they are posted to the server as before. Asked
 * once per page load.
 */
let directUploads = null;
function usesDirectUploads() {
  directUploads ??= request('/admin/media/upload-mode')
    .then((mode) => Boolean(mode?.direct))
    .catch((error) => {
      directUploads = null;
      throw error;
    });
  return directUploads;
}

/** A Blob pathname from the file's name: no slashes, no surprises. */
const incomingPath = (name) =>
  `incoming/${String(name || 'upload')
    .replace(/[^\w.-]+/g, '-')
    .slice(-100)}`;

async function uploadDirect(file, fields, onProgress) {
  let blob;
  try {
    // Loaded on first upload, not with every admin page.
    const { upload: uploadToBlob } = await import('@vercel/blob/client');
    blob = await uploadToBlob(incomingPath(file.name), file, {
      access: 'public',
      handleUploadUrl: `${BASE}/api/admin/media/upload-token`,
      headers: APP_HEADER,
      contentType: file.type || undefined,
      multipart: file.size > 20 * 1024 * 1024,
      // The last stretch is the server processing it.
      onUploadProgress: ({ percentage }) => onProgress?.((percentage / 100) * 0.95),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    if (/not allowed|content type/i.test(error.message)) {
      throw new ApiError(
        'Upload a JPEG, PNG, WebP, AVIF or HEIC photograph, or an MP4 or WebM video.'
      );
    }
    if (/too large|maximum/i.test(error.message)) {
      throw new ApiError('That file is too large.');
    }
    throw new ApiError('The upload was interrupted. Try again.');
  }

  const body = { url: blob.url, originalName: file.name, mime: file.type };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) body[key] = value;
  }
  const payload = await request('/admin/media/import', { method: 'POST', body });
  onProgress?.(1);
  return payload.item;
}

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
export async function uploadMedia(file, fields = {}, onProgress) {
  if (await usesDirectUploads()) return uploadDirect(file, fields, onProgress);
  return uploadToServer(file, fields, onProgress);
}

function uploadToServer(file, fields, onProgress) {
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
