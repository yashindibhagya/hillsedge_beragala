import { mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { copy, del, head, list, put } from '@vercel/blob';
import { config } from '../config/index.js';
import { newId } from './store.js';

/**
 * Turns an upload into something the site can serve well.
 *
 * Photographs are re-encoded to a WebP ladder (480 / 960 / 1600 / full, never
 * wider than the original), plus a 20px blurred placeholder inlined as a data
 * URI. Re-encoding also strips EXIF, which on a phone photo includes the GPS
 * position it was taken at.
 *
 * Videos are stored as uploaded — transcoding needs ffmpeg, which is more to
 * install than this is worth — but only MP4 and WebM are accepted, checked by
 * their leading bytes rather than by the browser's say-so, because those are
 * the two every browser plays. Keep hero videos short and under ~10 MB; the
 * admin panel says so at upload.
 *
 * Each upload gets its own directory, uploads/<id>/, so deleting one is
 * removing a folder.
 *
 * With BLOB_READ_WRITE_TOKEN set (Vercel, where there is no disk to keep),
 * the same files go to Vercel Blob under media/<id>/ instead, and the
 * records point at their Blob URLs. The admin uploads the original straight
 * to Blob under incoming/ — a Vercel function cannot receive a body over
 * 4.5 MB — and the server processes it from there.
 */

export const usesBlob = () => Boolean(config.blobToken);

/** Pathnames the admin may upload originals to before they are processed. */
export const INCOMING_PREFIX = 'incoming/';

const CACHE_FOREVER = 60 * 60 * 24 * 365;

export const IMAGE_WIDTHS = [480, 960, 1600];
const FULL_MAX = 2400;
/* About 60 megapixels — beyond any camera the restaurant will use, and the
 * cap keeps a hostile 16000×16000 image from eating the server's memory. */
const MAX_PIXELS = 60_000_000;
const ACCEPTED_IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'tiff', 'heif', 'gif']);

export class MediaError extends Error {
  constructor(message) {
    super(message);
    this.status = 422;
  }
}

const mediaUrl = (id, file) => `/media/${id}/${file}`;

/** Stores one finished file and returns the URL it is served at. */
async function saveFile(id, file, buffer, contentType) {
  if (usesBlob()) {
    const blob = await put(`media/${id}/${file}`, buffer, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
      // Never rewritten in place — a replacement is a new upload.
      cacheControlMaxAge: CACHE_FOREVER,
      token: config.blobToken,
    });
    return blob.url;
  }
  const dir = path.join(config.uploadsDir, id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, file), buffer);
  return mediaUrl(id, file);
}

async function leadingBytes(file, length = 16) {
  const handle = await open(file, 'r');
  try {
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, 0);
    return buffer;
  } finally {
    await handle.close();
  }
}

/** MP4 carries "ftyp" at byte 4; WebM opens with the EBML magic number. */
export async function sniffVideo(file) {
  const bytes = await leadingBytes(file);
  if (bytes.subarray(4, 8).toString('latin1') === 'ftyp') return 'video/mp4';
  if (bytes.readUInt32BE(0) === 0x1a45dfa3) return 'video/webm';
  return null;
}

/** `sourceFile` is a file path or a Buffer. */
export async function processImage(sourceFile, { id = newId() } = {}) {
  let meta;
  try {
    meta = await sharp(sourceFile, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new MediaError('That file is not an image we can read.');
  }
  // SVG in particular is refused: it can carry script.
  if (!ACCEPTED_IMAGE_FORMATS.has(meta.format)) {
    throw new MediaError('Upload a JPEG, PNG, WebP, AVIF or HEIC photograph.');
  }
  if ((meta.width ?? 0) * (meta.height ?? 0) > MAX_PIXELS) {
    throw new MediaError('That photograph is too large. Export it at under 60 megapixels.');
  }

  // Orientation from EXIF is applied first, so the stored dimensions are the
  // ones the photo is displayed at.
  const base = () => sharp(sourceFile, { failOn: 'none', limitInputPixels: MAX_PIXELS }).rotate();
  const oriented = await base().toBuffer({ resolveWithObject: true });
  const width = oriented.info.width;
  const height = oriented.info.height;

  const variants = [];
  for (const target of IMAGE_WIDTHS) {
    if (target >= width) break;
    const buffer = await sharp(oriented.data)
      .resize({ width: target })
      .webp({ quality: 78 })
      .toBuffer();
    variants.push({
      width: target,
      url: await saveFile(id, `${target}.webp`, buffer, 'image/webp'),
    });
  }

  const fullWidth = Math.min(width, FULL_MAX);
  const full = await sharp(oriented.data)
    .resize({ width: fullWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const fullUrl = await saveFile(id, 'full.webp', full, 'image/webp');
  variants.push({ width: fullWidth, url: fullUrl });

  const lqipBuffer = await sharp(oriented.data)
    .resize({ width: 20 })
    .blur(1)
    .webp({ quality: 40 })
    .toBuffer();

  return {
    id,
    kind: 'image',
    mime: 'image/webp',
    url: fullUrl,
    variants,
    width: fullWidth,
    height: Math.round((height * fullWidth) / width),
    lqip: `data:image/webp;base64,${lqipBuffer.toString('base64')}`,
  };
}

export async function storeVideo(sourceFile, { id = newId() } = {}) {
  const mime = await sniffVideo(sourceFile);
  if (!mime) throw new MediaError('Upload an MP4 (H.264) or WebM video.');
  const file = mime === 'video/mp4' ? 'video.mp4' : 'video.webm';
  if (usesBlob()) {
    const buffer = await readFile(sourceFile);
    const url = await saveFile(id, file, buffer, mime);
    return { id, kind: 'video', mime, url, variants: [], size: buffer.length };
  }
  const dir = path.join(config.uploadsDir, id);
  await mkdir(dir, { recursive: true });
  await rename(sourceFile, path.join(dir, file));
  const { size } = await stat(path.join(dir, file));
  return { id, kind: 'video', mime, url: mediaUrl(id, file), variants: [], size };
}

/** Sniffs the type from the first bytes of a video already in Blob. */
async function sniffBlobVideo(url) {
  const response = await fetch(url, { headers: { Range: 'bytes=0-15' } });
  if (!response.ok) throw new MediaError('That upload could not be found. Try again.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 8) return null;
  if (bytes.subarray(4, 8).toString('latin1') === 'ftyp') return 'video/mp4';
  if (bytes.readUInt32BE(0) === 0x1a45dfa3) return 'video/webm';
  return null;
}

/**
 * Processes an original the admin uploaded straight to Blob under incoming/,
 * then deletes the original. Images are fetched and re-encoded like any
 * other upload; videos are checked by their leading bytes and copied into
 * place without being downloaded.
 */
export async function processIncoming(url, { isVideo, maxImageBytes }) {
  const token = config.blobToken;
  const meta = await head(url, { token }).catch(() => null);
  if (!meta || !meta.pathname.startsWith(INCOMING_PREFIX)) {
    throw new MediaError('That upload could not be found. Try again.');
  }
  try {
    const id = newId();
    if (isVideo) {
      const mime = await sniffBlobVideo(meta.url);
      if (!mime) throw new MediaError('Upload an MP4 (H.264) or WebM video.');
      const file = mime === 'video/mp4' ? 'video.mp4' : 'video.webm';
      const blob = await copy(meta.url, `media/${id}/${file}`, {
        access: 'public',
        addRandomSuffix: false,
        contentType: mime,
        cacheControlMaxAge: CACHE_FOREVER,
        token,
      });
      return { id, kind: 'video', mime, url: blob.url, variants: [], size: meta.size };
    }
    if (meta.size > maxImageBytes) {
      throw new MediaError(
        `Photographs must be under ${Math.round(maxImageBytes / 1024 / 1024)} MB.`
      );
    }
    const response = await fetch(meta.url);
    if (!response.ok) throw new MediaError('That upload could not be found. Try again.');
    const processed = await processImage(Buffer.from(await response.arrayBuffer()), { id });
    return { ...processed, size: meta.size };
  } finally {
    await del(meta.url, { token }).catch(() => {});
  }
}

export async function removeMediaFiles(id) {
  if (!/^[\w-]+$/.test(id)) return;
  if (usesBlob()) {
    const token = config.blobToken;
    const { blobs } = await list({ prefix: `media/${id}/`, token });
    if (blobs.length)
      await del(
        blobs.map((b) => b.url),
        { token }
      );
    return;
  }
  await rm(path.join(config.uploadsDir, id), { recursive: true, force: true });
}

export const uploadTempDir = () => path.join(config.uploadsDir, '.incoming');
