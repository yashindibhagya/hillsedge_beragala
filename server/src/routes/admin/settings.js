import { Router } from 'express';
import { requirePermission } from '../../middleware/auth.js';
import { logActivity, read, write } from '../../services/store.js';
import { settingsSchema } from '../../validators/entities.js';
import { checkRefs, invalid } from './crud.js';

export const settingsRouter = Router();

const SECTION_REFS = {
  home: { heroImageId: 'media', heroVideoId: 'media' },
  about: { imageId: 'media' },
};

const MEDIA_KINDS = { heroImageId: 'image', heroVideoId: 'video', imageId: 'image' };

settingsRouter.get('/', requirePermission('dashboard'), (req, res) => {
  res.json({ settings: read().settings });
});

/** PATCH /:section — merges the fields sent into that one group. */
settingsRouter.patch('/:section', requirePermission('content:write'), async (req, res, next) => {
  const { section } = req.params;
  const spec = Object.prototype.hasOwnProperty.call(settingsSchema, section)
    ? settingsSchema[section]
    : null;
  if (!spec) return res.status(404).json({ error: `No settings section called “${section}”.` });

  const result = spec.parse(req.body);
  if (result.error) return invalid(res, result.errors ?? { _: result.error });

  try {
    const outcome = await write((data) => {
      const errors = checkRefs(data, result.value, SECTION_REFS[section] ?? {});
      // A hero photo must be a photo and a hero video a video.
      for (const [key, kind] of Object.entries(MEDIA_KINDS)) {
        const media = result.value[key] && data.media.find((m) => m.id === result.value[key]);
        if (media && media.kind !== kind)
          errors[key] = kind === 'image' ? 'Choose a photograph here.' : 'Choose a video here.';
      }
      if (Object.keys(errors).length) return { errors };
      data.settings[section] = { ...(data.settings[section] ?? {}), ...result.value };
      logActivity(data, { user: req.user, action: 'updated', entity: 'settings', label: section });
      return { settings: data.settings };
    });
    if (outcome.errors) return invalid(res, outcome.errors);
    return res.json({ settings: outcome.settings });
  } catch (error) {
    return next(error);
  }
});
