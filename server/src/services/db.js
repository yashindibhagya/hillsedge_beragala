import { neon } from '@neondatabase/serverless';
import { config } from '../config/index.js';

/**
 * The Postgres connection, when there is one.
 *
 * On Vercel the API runs as many short-lived copies at once, none of which
 * can keep a file, so the store lives in Postgres there. Everywhere else —
 * a VPS, local development, the tests — DATABASE_URL is unset and the store
 * stays a file on disk.
 *
 * Callers get one function, `query(text, params) → rows`, so the store does
 * not care whether it is talking to Neon over HTTP or to an in-process
 * Postgres in a test.
 */

let query = null;

export function hasDatabase() {
  return query !== null || Boolean(config.databaseUrl);
}

export function db() {
  if (!query) {
    if (!config.databaseUrl) throw new Error('DATABASE_URL is not set.');
    const sql = neon(config.databaseUrl);
    query = (text, params = []) => sql.query(text, params);
  }
  return query;
}

/** For tests: talk to a different Postgres, or (with null) go back to none. */
export function useDatabase(fn) {
  query = fn;
}
