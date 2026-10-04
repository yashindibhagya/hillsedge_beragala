import { ensureBootstrapAdmin } from './auth.js';
import { seed } from './seed.js';
import { openStore } from './store.js';

/** Opens (or seeds) the store and makes sure somebody can sign in. */
export async function initStore() {
  await openStore({ seed });
  await ensureBootstrapAdmin();
}
