import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { withTempStore } from './helpers.js';

/*
 * On Vercel several copies of the API run at once against one Postgres row.
 * Each copy here is a fresh module registry — its own in-memory `state` —
 * sharing one in-process Postgres.
 */

let pg;
let cleanup;

beforeAll(async () => {
  ({ cleanup } = await withTempStore());
  pg = new PGlite();
});

afterAll(async () => {
  await pg.close();
  await cleanup();
});

const query = async (text, params) => (await pg.query(text, params)).rows;

async function copyOfTheApi() {
  vi.resetModules();
  const { useDatabase } = await import('../src/services/db.js');
  useDatabase(query);
  return import('../src/services/store.js');
}

describe('Postgres store', () => {
  let a;
  let b;

  beforeAll(async () => {
    a = await copyOfTheApi();
    await a.openStore({
      seed: (data) => {
        data.settings.name = 'Hillsedge';
      },
    });
    b = await copyOfTheApi();
    // The second copy finds the row and does not seed over it.
    await b.openStore({
      seed: () => {
        throw new Error('seeded twice');
      },
    });
  });

  it('shares what one copy writes with the others', async () => {
    await a.write((data) => data.sessions.push({ id: 's1' }));
    expect(b.read().sessions).toEqual([]);
    await b.refreshStore();
    expect(b.read().sessions.map((s) => s.id)).toEqual(['s1']);
  });

  it('keeps both edits when another copy writes mid-change', async () => {
    let runs = 0;
    // b saves while a's change is in progress, so a's save loses the race,
    // reloads and re-applies its change on top of b's.
    await a.write(async (data) => {
      runs++;
      if (runs === 1) await b.write((d) => d.menuItems.push({ id: 'from-b' }));
      data.menuItems.push({ id: 'from-a' });
    });
    expect(runs).toBe(2);
    await b.refreshStore();
    expect(b.read().menuItems.map((m) => m.id)).toEqual(['from-b', 'from-a']);
  });

  it('writes nothing when the change throws', async () => {
    const before = a.read().menuItems.length;
    await expect(
      a.write((data) => {
        data.menuItems.push({ id: 'half' });
        throw new Error('invalid');
      })
    ).rejects.toThrow('invalid');
    expect(a.read().menuItems).toHaveLength(before);
    await b.refreshStore();
    expect(b.read().menuItems).toHaveLength(before);
  });

  it('survives a restart', async () => {
    const c = await copyOfTheApi();
    await c.openStore();
    expect(c.read().settings.name).toBe('Hillsedge');
    expect(c.read().menuItems.map((m) => m.id)).toEqual(['from-b', 'from-a']);
  });
});
