import { mkdir, open, readFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { config } from '../config/index.js';
import { db, hasDatabase } from './db.js';

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
 *
 * Where a file cannot be kept (Vercel), the same document lives in one
 * Postgres row instead, with a version number. Many copies of the API run at
 * once there, each holding its own in-memory copy, so each request first
 * checks the version (`refreshStore`) and reloads if another copy has written
 * since; and a write only lands if the version is still the one it started
 * from, otherwise it reloads and re-applies the change. Two copies can
 * therefore never overwrite each other's edits, and a session created by one
 * is seen by all of them.
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
/** Postgres only: the row version `state` was loaded at. */
let version = 0;
let queue = Promise.resolve();

/** How many times a write re-applies itself after losing a race. */
const WRITE_ATTEMPTS = 5;

const TABLE = 'hillsedge_store';

function emptyState() {
  const data = { version: 1, settings: {} };
  for (const name of COLLECTIONS) data[name] = [];
  return data;
}

/** A collection added in a later release starts empty rather than undefined. */
function normalise(data) {
  for (const name of COLLECTIONS) data[name] ??= [];
  data.settings ??= {};
  return data;
}

/** Loads the document, or returns null if there is none yet. */
async function load() {
  try {
    const raw = await readFile(config.dataFile, 'utf8');
    return normalise(JSON.parse(raw));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/* ---- Postgres ---------------------------------------------------------- */

async function ensureTable() {
  await db()(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (
       id integer PRIMARY KEY,
       version integer NOT NULL,
       doc jsonb NOT NULL,
       updated_at timestamptz NOT NULL DEFAULT now()
     )`
  );
}

/** The stored row, or null. */
async function loadRow() {
  const rows = await db()(`SELECT version, doc FROM ${TABLE} WHERE id = 1`);
  if (!rows.length) return null;
  const doc = typeof rows[0].doc === 'string' ? JSON.parse(rows[0].doc) : rows[0].doc;
  return { version: Number(rows[0].version), doc: normalise(doc) };
}

function adopt(row) {
  state = row.doc;
  version = row.version;
}

/**
 * Brings the in-memory copy up to date if another copy of the API has
 * written since. A no-op for the file store, which has one writer.
 */
export async function refreshStore() {
  if (!hasDatabase() || !state) return;
  const rows = await db()(`SELECT version FROM ${TABLE} WHERE id = 1`);
  if (rows.length && Number(rows[0].version) !== version) {
    const row = await loadRow();
    if (row) adopt(row);
  }
}

/** Saves `state` if nobody else has since `version`. False if somebody had. */
async function persistRow() {
  const rows = await db()(
    `UPDATE ${TABLE} SET doc = $1::jsonb, version = version + 1, updated_at = now()
     WHERE id = 1 AND version = $2
     RETURNING version`,
    [JSON.stringify(state), version]
  );
  if (!rows.length) return false;
  version = Number(rows[0].version);
  return true;
}

async function openRow(seed) {
  await ensureTable();
  const existing = await loadRow();
  if (existing) return adopt(existing);

  state = emptyState();
  if (seed) await seed(state);
  // Two copies starting at once may both seed; the first insert wins and the
  // other adopts it.
  await db()(
    `INSERT INTO ${TABLE} (id, version, doc) VALUES (1, 1, $1::jsonb) ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(state)]
  );
  adopt(await loadRow());
}

/* ---- File -------------------------------------------------------------- */

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
  if (hasDatabase()) {
    await openRow(seed);
    return state;
  }
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
  version = 0;
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
  const run = queue.then(() => (hasDatabase() ? writeRow(mutate) : writeFile(mutate)));
  // A failed write must not wedge every write queued behind it.
  queue = run.catch(() => {});
  return run;
}

async function writeFile(mutate) {
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
}

/**
 * Applies the change to the latest version and saves it, re-applying it to
 * a fresh copy if another copy of the API wrote first. `mutate` only ever
 * changes the document, so running it again is safe.
 */
async function writeRow(mutate) {
  requireOpen();
  await refreshStore();
  for (let attempt = 1; ; attempt++) {
    const snapshot = JSON.stringify(state);
    let result;
    let saved;
    try {
      result = await mutate(state);
      saved = await persistRow();
    } catch (error) {
      state = JSON.parse(snapshot);
      throw error;
    }
    if (saved) return result;
    if (attempt >= WRITE_ATTEMPTS) {
      state = JSON.parse(snapshot);
      throw new Error('The store is busy. Try again.');
    }
    adopt(await loadRow());
  }
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

export default { openStore, closeStore, refreshStore, read, write, logActivity, slugify };
