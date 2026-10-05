import { Router } from 'express';
import multer from 'multer';
import { handleUpload } from '@vercel/blob/client';
import { mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { config } from '../../config/index.js';
import { requirePermission } from '../../middleware/auth.js';
import {
  INCOMING_PREFIX,
  MediaError,
  processImage,
  processIncoming,
  removeMediaFiles,
  storeVideo,
  uploadTempDir,
  usesBlob,
} from '../../services/media.js';
import { byOrder, logActivity, now, read, write } from '../../services/store.js';
import { mediaSchema } from '../../validators/entities.js';
import { validate } from '../../validators/schema.js';
import { invalid, notFound, reorderRoute, updateRecord } from './crud.js';

const MB = 1024 * 1024;

/*
 * To disk, not memory: a hero video can be a hundred megabytes, and holding
 * that in the heap for every concurrent upload is how a small server falls
 * over. The ceiling here is the video one; images are checked against their
 * own, smaller, limit once the type is known.
 */
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      const dir = uploadTempDir();
      mkdirSync(dir, { recursive: true });
      callback(null, dir);
    },
  }),
  limits: { fileSize: config.maxVideoMb * MB, files: 1, fields: 10 },
});

export const mediaRouter = Router();

mediaRouter.get('/', requirePermission('dashboard'), (req, res) => {
  res.json({ items: [...read().media].sort(byOrder) });
});

reorderRoute(mediaRouter, { collection: 'media', permission: 'media:write', label: 'media item' });

/** Multer's own errors (too large, too many files) are the uploader's to fix. */
function receive(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? `That file is over ${config.maxVideoMb} MB.`
          : 'Upload one file at a time.';
      return res.status(413).json({ error: message });
    }
    return next(error);
  });
}

/** Records a processed upload, last in the order. */
function addMedia(user, processed, { originalName, size, isVideo, meta, body }) {
  return write((data) => {
    const item = {
      ...processed,
      originalName: String(originalName ?? '').slice(0, 200),
      size: processed.size ?? size,
      ...meta,
      alt: meta.alt,
      order: data.media.reduce((max, m) => Math.max(max, (m.order ?? 0) + 1), 0),
      createdAt: now(),
      createdBy: user.id,
    };
    // A video is not a gallery photograph unless the admin says so.
    if (isVideo && !('inGallery' in (body ?? {}))) item.inGallery = false;
    data.media.push(item);
    logActivity(data, {
      user,
      action: 'uploaded',
      entity: 'media',
      entityId: item.id,
      label: item.caption || item.originalName,
    });
    return item;
  });
}

mediaRouter.post('/', requirePermission('media:write'), receive, async (req, res, next) => {
  const file = req.file;
  if (!file) return invalid(res, { file: 'Choose a file to upload.' });

  const meta = validate(mediaSchema, req.body ?? {});
  if (!meta.ok) {
    await rm(file.path, { force: true });
    return invalid(res, meta.errors);
  }

  try {
    const isVideo = file.mimetype.startsWith('video/');
    if (!isVideo && file.size > config.maxImageMb * MB) {
      throw new MediaError(`Photographs must be under ${config.maxImageMb} MB.`);
    }
    const processed = isVideo ? await storeVideo(file.path) : await processImage(file.path);

    const record = await addMedia(req.user, processed, {
      originalName: file.originalname,
      size: file.size,
      isVideo,
      meta: meta.value,
      body: req.body,
    });
    return res.status(201).json({ item: record });
  } catch (error) {
    if (error instanceof MediaError)
      return res.status(422).json({ error: error.message, errors: { file: error.message } });
    return next(error);
  } finally {
    await rm(file.path, { force: true });
  }
});

/*
 * Direct-to-Blob uploads (Vercel only). A function cannot receive a body over
 * 4.5 MB, so the admin asks here for a short-lived token, uploads the
 * original straight to Blob under incoming/, then calls /import to have it
 * processed into the media library. 404 where uploads go to disk, which
 * tells the admin to post the file instead.
 */
const ACCEPTED_UPLOADS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/gif',
  'video/mp4',
  'video/webm',
];

/** Which way the admin should send files: straight to Blob, or posted here. */
mediaRouter.get('/upload-mode', requirePermission('media:write'), (req, res) => {
  res.json({ direct: usesBlob() });
});

mediaRouter.post('/upload-token', requirePermission('media:write'), async (req, res, next) => {
  if (!usesBlob()) return res.status(404).json({ error: 'Direct uploads are not enabled.' });
  try {
    const body = await handleUpload({
      body: req.body,
      request: req,
      token: config.blobToken,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(INCOMING_PREFIX) || pathname.includes('..')) {
          throw new MediaError('Uploads must go to incoming/.');
        }
        return {
          allowedContentTypes: ACCEPTED_UPLOADS,
          maximumSizeInBytes: config.maxVideoMb * MB,
          addRandomSuffix: true,
          validUntil: Date.now() + 30 * 60 * 1000,
        };
      },
    });
    return res.json(body);
  } catch (error) {
    if (error instanceof MediaError) return res.status(422).json({ error: error.message });
    return next(error);
  }
});

mediaRouter.post('/import', requirePermission('media:write'), async (req, res, next) => {
  if (!usesBlob()) return res.status(404).json({ error: 'Direct uploads are not enabled.' });
  const { url, originalName, mime, ...fields } = req.body ?? {};
  if (typeof url !== 'string' || !url) return invalid(res, { file: 'Choose a file to upload.' });

  const meta = validate(mediaSchema, fields);
  if (!meta.ok) return invalid(res, meta.errors);

  try {
    const isVideo = String(mime ?? '').startsWith('video/');
    const processed = await processIncoming(url, {
      isVideo,
      maxImageBytes: config.maxImageMb * MB,
    });
    const record = await addMedia(req.user, processed, {
      originalName,
      size: processed.size,
      isVideo,
      meta: meta.value,
      body: fields,
    });
    return res.status(201).json({ item: record });
  } catch (error) {
    if (error instanceof MediaError)
      return res.status(422).json({ error: error.message, errors: { file: error.message } });
    return next(error);
  }
});

mediaRouter.patch('/:id', requirePermission('media:write'), (req, res, next) =>
  updateRecord(req, res, next, {
    collection: 'media',
    schema: mediaSchema,
    label: 'media item',
    titleField: 'caption',
    refs: { posterId: 'media' },
    check(value, data) {
      const poster = value.posterId && data.media.find((m) => m.id === value.posterId);
      return poster && poster.kind !== 'image'
        ? { posterId: 'A poster must be a photograph.' }
        : {};
    },
  })
);

/** Every place a media id can be referenced, cleared when it is deleted. */
function detach(data, id) {
  const clear = (record, key) => {
    if (record[key] === id) record[key] = null;
  };
  data.categories.forEach((c) => clear(c, 'imageId'));
  data.menuItems.forEach((m) => {
    clear(m, 'imageId');
    clear(m, 'videoId');
  });
  data.rooms.forEach((r) => {
    r.imageIds = r.imageIds.filter((x) => x !== id);
    clear(r, 'videoId');
  });
  data.promotions.forEach((p) => clear(p, 'imageId'));
  data.media.forEach((m) => clear(m, 'posterId'));
  const { home, about } = data.settings;
  if (home) {
    clear(home, 'heroImageId');
    clear(home, 'heroVideoId');
  }
  if (about) clear(about, 'imageId');
}

mediaRouter.delete('/:id', requirePermission('media:write'), async (req, res, next) => {
  try {
    const removed = await write((data) => {
      const index = data.media.findIndex((m) => m.id === req.params.id);
      if (index === -1) return null;
      const [item] = data.media.splice(index, 1);
      detach(data, item.id);
      logActivity(data, {
        user: req.user,
        action: 'deleted',
        entity: 'media',
        entityId: item.id,
        label: item.caption || item.originalName,
      });
      return item;
    });
    if (!removed) return notFound(res, 'media item');
    // Files go after the record, so a failure here leaves an orphan folder
    // rather than a record pointing at nothing.
    await removeMediaFiles(removed.id);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});
