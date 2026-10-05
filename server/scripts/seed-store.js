/**
 * Seeds an empty store — the restaurant's menu, rooms, copy and photographs —
 * without starting the server, then exits. Run once against a new database
 * before the first deploy, so that no copy of the API on Vercel has to seed
 * on a visitor's request (and two copies never seed at once):
 *
 *   DATABASE_URL=… BLOB_READ_WRITE_TOKEN=… npm run seed --workspace server
 *
 * Does nothing to a store that already exists. The first admin is not
 * created here: the server creates it from ADMIN_EMAIL / ADMIN_PASSWORD on
 * first boot.
 */
import { seed } from '../src/services/seed.js';
import { openStore, read } from '../src/services/store.js';

await openStore({ seed });
const data = read();
console.log(
  `[seed] Store ready: ${data.menuItems.length} dishes, ${data.rooms.length} rooms, ` +
    `${data.media.length} photographs, ${data.users.length} users.`
);
