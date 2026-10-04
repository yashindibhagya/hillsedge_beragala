/**
 * A small declarative validator for the admin's records.
 *
 * Every field is described once — its type, limits and default — and the
 * same description serves both a create (missing fields take their default)
 * and a partial update (only the fields sent are checked and changed). The
 * value that comes out is rebuilt key by key from the schema, so a field the
 * schema does not name can never reach the store.
 *
 * Each field is `{ parse(raw) → { value } | { error }, default }`.
 */

const fail = (error) => ({ error });
const ok = (value) => ({ value });

export const field = {
  text({ max = 200, required = false, fallback = '' } = {}) {
    return {
      default: fallback,
      parse(raw) {
        if (raw === null || raw === undefined) raw = '';
        if (typeof raw !== 'string' && typeof raw !== 'number') return fail('Must be text.');
        const value = String(raw).trim();
        if (required && !value) return fail('This is required.');
        if (value.length > max) return fail(`Keep this under ${max} characters.`);
        return ok(value);
      },
    };
  },

  /** A number, or null when left blank and `nullable`. */
  number({ min = 0, max = 1e9, integer = false, nullable = true, fallback = null } = {}) {
    return {
      default: fallback,
      parse(raw) {
        if (raw === '' || raw === null || raw === undefined) {
          return nullable ? ok(null) : fail('This is required.');
        }
        const value = Number(raw);
        if (!Number.isFinite(value)) return fail('Must be a number.');
        if (integer && !Number.isInteger(value)) return fail('Must be a whole number.');
        if (value < min) return fail(`Must be at least ${min}.`);
        if (value > max) return fail(`Must be at most ${max}.`);
        return ok(integer ? value : Math.round(value * 100) / 100);
      },
    };
  },

  bool({ fallback = false } = {}) {
    return {
      default: fallback,
      parse(raw) {
        if (typeof raw === 'boolean') return ok(raw);
        if (raw === 'true' || raw === 1 || raw === '1') return ok(true);
        if (raw === 'false' || raw === 0 || raw === '0') return ok(false);
        return fail('Must be true or false.');
      },
    };
  },

  oneOf(options, { fallback = options[0] } = {}) {
    return {
      default: fallback,
      parse(raw) {
        return options.includes(raw) ? ok(raw) : fail(`Must be one of: ${options.join(', ')}.`);
      },
    };
  },

  /** A list of short strings — tags, features, allergens. */
  list({ maxItems = 30, maxLength = 60 } = {}) {
    return {
      default: [],
      parse(raw) {
        if (raw === null || raw === undefined) return ok([]);
        if (typeof raw === 'string') raw = raw.split(',');
        if (!Array.isArray(raw)) return fail('Must be a list.');
        const value = [...new Set(raw.map((item) => String(item ?? '').trim()).filter(Boolean))];
        if (value.length > maxItems) return fail(`At most ${maxItems} entries.`);
        if (value.some((item) => item.length > maxLength)) {
          return fail(`Keep each entry under ${maxLength} characters.`);
        }
        return ok(value);
      },
    };
  },

  /** A record id, or null. Whether it exists is checked by the route. */
  ref({ nullable = true } = {}) {
    return {
      default: null,
      parse(raw) {
        if (raw === '' || raw === null || raw === undefined) {
          return nullable ? ok(null) : fail('This is required.');
        }
        return typeof raw === 'string' && raw.length <= 64 ? ok(raw) : fail('Not a valid id.');
      },
    };
  },

  refs({ maxItems = 30 } = {}) {
    return {
      default: [],
      parse(raw) {
        if (raw === null || raw === undefined) return ok([]);
        if (!Array.isArray(raw)) return fail('Must be a list.');
        if (raw.length > maxItems) return fail(`At most ${maxItems} entries.`);
        if (raw.some((id) => typeof id !== 'string' || id.length > 64)) {
          return fail('Not a valid id.');
        }
        return ok([...new Set(raw)]);
      },
    };
  },

  /** `YYYY-MM-DD`, a real calendar date, or null. */
  date({ nullable = true } = {}) {
    return {
      default: null,
      parse(raw) {
        if (raw === '' || raw === null || raw === undefined) {
          return nullable ? ok(null) : fail('Please choose a date.');
        }
        return parseDate(raw) ? ok(raw) : fail('That date is not valid.');
      },
    };
  },

  /** `HH:MM`, 24-hour, or null. */
  time() {
    return {
      default: null,
      parse(raw) {
        if (raw === '' || raw === null || raw === undefined) return ok(null);
        return typeof raw === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw)
          ? ok(raw)
          : fail('Use 24-hour time, like 18:30.');
      },
    };
  },

  /** An http(s) URL, a site-relative path, or blank. */
  url({ max = 500 } = {}) {
    return {
      default: '',
      parse(raw) {
        if (raw === null || raw === undefined || raw === '') return ok('');
        if (typeof raw !== 'string') return fail('Must be a link.');
        const value = raw.trim();
        if (value.length > max) return fail(`Keep this under ${max} characters.`);
        // Backslashes and control characters are how "/\\evil.com" and
        // "/<tab>/evil.com" pass for site paths while browsers send them away.
        // eslint-disable-next-line no-control-regex -- matching them is the point
        if (/[\\\u0000-\u001f\u007f]/.test(value))
          return fail('That link contains characters it should not.');
        if (value.startsWith('/')) {
          const base = 'https://site.invalid';
          return new URL(value, base).origin === base
            ? ok(value)
            : fail('A path must stay on this site, like /menu.');
        }
        if (/^(mailto:|tel:)/i.test(value)) return ok(value);
        try {
          const parsed = new URL(value);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return ok(value);
        } catch {
          // fall through
        }
        return fail('Must be a full link starting https://, or a path starting /.');
      },
    };
  },

  email({ required = false } = {}) {
    return {
      default: '',
      parse(raw) {
        const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
        if (!value) return required ? fail('This is required.') : ok('');
        if (value.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return fail('That email address does not look right.');
        }
        return ok(value);
      },
    };
  },

  /** A fixed-shape object, validated recursively. */
  object(schema) {
    return {
      get default() {
        return defaults(schema);
      },
      parse(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
          return fail('Must be an object.');
        const result = validate(schema, raw, { partial: true });
        return result.ok
          ? ok(result.value)
          : { error: 'Some details need checking.', errors: result.errors };
      },
    };
  },

  /** A list of fixed-shape objects. */
  objects(schema, { maxItems = 50 } = {}) {
    return {
      default: [],
      parse(raw) {
        if (!Array.isArray(raw)) return fail('Must be a list.');
        if (raw.length > maxItems) return fail(`At most ${maxItems} entries.`);
        const value = [];
        for (const item of raw) {
          const result = validate(schema, item ?? {});
          if (!result.ok) return { error: 'Some entries need checking.', errors: result.errors };
          value.push(result.value);
        }
        return ok(value);
      },
    };
  },
};

/** `YYYY-MM-DD` and a real day — 2026-02-31 parses but is not one. */
export function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function defaults(schema) {
  const value = {};
  for (const [key, spec] of Object.entries(schema)) {
    const fallback = spec.default;
    value[key] = Array.isArray(fallback) ? [...fallback] : fallback;
  }
  return value;
}

/**
 * Checks `input` against `schema`.
 *
 * `partial: false` (a create) returns every field, defaulting the missing
 * ones — but a missing field that its parser would reject when blank, a
 * required name say, is still an error. `partial: true` (an update) returns
 * only the fields that were sent.
 */
export function validate(schema, input, { partial = false } = {}) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const value = {};
  const errors = {};

  for (const [key, spec] of Object.entries(schema)) {
    const present = Object.prototype.hasOwnProperty.call(body, key);
    if (!present) {
      if (partial) continue;
      // Run the parser on "nothing" so required fields still complain.
      const blank = spec.parse(undefined);
      if (blank.error) {
        const fallback = spec.default;
        if (fallback === '' || fallback === null || fallback === undefined) {
          errors[key] = blank.error;
          continue;
        }
      }
      const fallback = spec.default;
      value[key] = Array.isArray(fallback) ? [...fallback] : fallback;
      continue;
    }
    const result = spec.parse(body[key]);
    if (result.error) errors[key] = result.errors ?? result.error;
    else value[key] = result.value;
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export default validate;
