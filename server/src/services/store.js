import { mkdir, open, readFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { config } from '../config/index.js';

/**
 * The whole restaurant in one JSON document.
 *
 * A restaurant's admin makes a few dozen edits a day and its guests make a
 * handful of bookings; the entire dataset is a few hundred kilobytes. Held in
 * memory and written whole on every change, it needs no database server to
 * install, back up or secure — backing up is copying one file.
 *
 * Writes are serialised through a single promise chain, so two requests can
 * never interleave a read-modify-write, and each write goes to a temporary
 * file that is then renamed over the real one. A rename is atomic on every
 * filesystem this will run on, so a crash mid-write leaves the previous
 * version intact rather than half a document.
 *
 * Nothing outside this module knows how records are stored. If the restaurant
 * ever outgrows it, this is the one file to replace.
 */

export const COLLECTIONS = [
  'categories',
  'menuItems',
  'rooms',
  'reservations',
  'media',
  'promotions',
  'testimonials',
  'users',
  'sessions',
  'passwordResets',
  'activity',
];

/** The activity log is for "what changed recently", not an audit archive. */
const ACTIVITY_LIMIT = 300;

let state = null;
let queue = Promise.resolve();

function emptyState() {
  const data = { version: 1, settings: {} };
  for (const name of COLLECTIONS) data[name] = [];
  return data;
}

/** Loads the document, or returns null if there is none yet. */
async function load() {
  try {
    const raw = await readFile(config.dataFile, 'utf8');
    const data = JSON.parse(raw);
    // A collection added in a later release starts empty rather than undefined.
    for (const name of COLLECTIONS) data[name] ??= [];
    data.settings ??= {};
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function persist() {
  await mkdir(path.dirname(config.dataFile), { recursive: true });
  const temp = `${config.dataFile}.${process.pid}.tmp`;
  // Flushed to disk before the rename, so a power cut cannot leave the
  // rename pointing at a file whose contents never reached the platter.
  const handle = await open(temp, 'w');
  try {
    await handle.writeFile(JSON.stringify(state, null, 2), 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temp, config.dataFile);
}

/**
 * Opens the store. `seed` is called with an empty document when there is no
 * file yet, and whatever it fills in is written as the first version.
 */
export async function openStore({ seed } = {}) {
  if (state) return state;
  const existing = await load();
  if (existing) {
    state = existing;
  } else {
    state = emptyState();
    if (seed) await seed(state);
    await persist();
  }
  return state;
}

/** For tests: forget the in-memory copy so the next open reads from disk. */
export function closeStore() {
  state = null;
  queue = Promise.resolve();
}

function requireOpen() {
  if (!state) throw new Error('The store has not been opened yet.');
  return state;
}

/** A read-only view. Callers must not mutate what they get back. */
export function read() {
  return requireOpen();
}

/**
 * Applies a change and persists it. `mutate` receives the live document and
 * may return a value, which `write` resolves with once the change is on disk.
 * If `mutate` throws, nothing is written.
 */
export function write(mutate) {
  const run = queue.then(async () => {
    const data = requireOpen();
    const snapshot = JSON.stringify(data);
    let result;
    try {
      result = await mutate(data);
      await persist();
    } catch (error) {
      // Roll the in-memory copy back so memory and disk never disagree.
      state = JSON.parse(snapshot);
      throw error;
    }
    return result;
  });
  // A failed write must not wedge every write queued behind it.
  queue = run.catch(() => {});
  return run;
}

export const newId = () => randomUUID();
export const now = () => new Date().toISOString();

/** Appends to the activity log, trimming the oldest entries. */
export function logActivity(data, { user, action, entity, entityId, label }) {
  data.activity.unshift({
    id: newId(),
    at: now(),
    userId: user?.id ?? null,
    userName: user?.name ?? 'Website',
    action,
    entity,
    entityId: entityId ?? null,
    label: label ?? '',
  });
  if (data.activity.length > ACTIVITY_LIMIT) data.activity.length = ACTIVITY_LIMIT;
}

/** Lower-case, hyphenated, ASCII — and unique within `existing`. */
export function slugify(text, existing = [], ownId = null) {
  const base =
    String(text ?? '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'item';
  const taken = new Set(existing.filter((r) => r.id !== ownId).map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

export default { openStore, closeStore, read, write, logActivity, slugify };
