# Hillsedge Beragala

A mountain smokehouse and dining destination in Beragala, Sri Lanka, on the
hill road between Ella and Haputale.

Three parts in one npm workspace: the public site, a separate admin panel the
restaurant runs the site from, and the Express API both of them use.

```
.
├── client/              Public site — React 18 + Vite, served at /
│   ├── public/          static files copied verbatim into the build
│   ├── scripts/         image and SEO generation, run before dev/build
│   └── src/
│       ├── api/         the one place that talks to the server
│       ├── components/  presentational pieces
│       ├── context/     the live site data (settings, menu, rooms…)
│       ├── data/        fallback facts, route list, SEO copy
│       ├── pages/       one per route
│       └── styles/      layered CSS on the shared tokens
├── admin/               Admin panel — a separate React app, served at /admin
│   └── src/             pages per section, shared UI, api + auth
├── server/              Node 20 + Express
│   ├── src/
│   │   ├── config/      every environment-dependent value, read once
│   │   ├── middleware/  security headers, auth & roles, rate limits, errors
│   │   ├── routes/      public, reservations, auth, admin/*
│   │   ├── services/    the store, auth, media processing, mail, seed
│   │   └── validators/  record schemas, independent of either front end
│   └── tests/
├── shared/tokens.css    The design system's tokens — white, olive, gold —
│                        imported by both the site and the admin
└── docs/DEPLOYMENT.md   host setup, backups and the launch checklist
```

## Running it

Node 20.12 or newer (`.nvmrc` pins it).

```bash
npm install          # installs all three workspaces
cp .env.example .env
npm run dev          # site localhost:5173, admin localhost:5173/admin, API :4000
```

`npm run dev` starts all three. The site's dev server forwards `/admin` to the
admin's (which runs on :5174 behind it), and both forward `/api` and `/media`
to Express — so everything is on one address, with relative paths, exactly
as in production, and no CORS is involved.

On first start the server creates `server/data/store.json`, seeded from the
restaurant's existing copy and photographs, and a super admin. With
`ADMIN_EMAIL` / `ADMIN_PASSWORD` unset it creates `admin@hillsedge.local` and
prints a generated password in the log. Sign in at
<http://localhost:5173/admin>.

### Production

```bash
npm run build        # client/dist and admin/dist
npm start            # Express serves both, /api and /media, on :4000
```

## What the admin manages

Everything on the public site that changes — the menu (categories, dishes,
prices, availability, dietary and allergen labels), rooms and spaces,
reservations, the photo and video library, offers and events, testimonials,
homepage and about copy, contact details, opening hours and social links. A
change shows on the site within about fifteen seconds (the public endpoints
are cached that long).

| Role        | Can                                                                     |
| ----------- | ----------------------------------------------------------------------- |
| Super admin | Everything, including users                                             |
| Manager     | Menu, rooms, reservations, media, offers, testimonials, website content |
| Staff       | Reservations, and switching dishes and rooms available / unavailable    |

## Commands

| Command                                              | What it does                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                                        | All three workspaces, watching                                    |
| `npm run build`                                      | Production builds of the site and the admin                       |
| `npm start`                                          | Run the server (serves `client/dist` and `admin/dist` if present) |
| `npm test`                                           | Every test in both workspaces                                     |
| `npm run test:client` / `test:admin` / `test:server` | One workspace                                                     |
| `npm run lint` / `lint:fix`                          | ESLint across the repo                                            |
| `npm run format` / `format:check`                    | Prettier                                                          |

## The API

| Path                             | Who       | Purpose                                                         |
| -------------------------------- | --------- | --------------------------------------------------------------- |
| `GET /api/health`                | anyone    | Status and uptime, for monitors                                 |
| `GET /api/public/site`           | anyone    | Settings, rooms, gallery, offers, testimonials, featured dishes |
| `GET /api/public/menu`           | anyone    | Active categories and visible dishes                            |
| `POST /api/public/menu/:id/view` | anyone    | Counts a dish being opened (the dashboard's "popular")          |
| `POST /api/reservations`         | anyone    | Take a booking — rate-limited                                   |
| `/api/auth/*`                    | —         | Sign in / out, `me`, forgot / reset / change password           |
| `/api/admin/*`                   | signed in | Every admin resource, permission-checked per route              |

Every write is validated on the server against the schemas in
`server/src/validators/`, field by field, so nothing the browser did not
have to send reaches the store. A rejected record answers `422` with
per-field `errors`, which both front ends render against their inputs.

Everything is stored in one JSON document (`DATA_FILE`), held in memory,
written atomically (temp file + rename) and serialised through a single
queue, with a rollback if a change fails part-way. A restaurant's whole
dataset is a few hundred kilobytes; a database would be something to
install, back up and secure in exchange for nothing. Only
`services/store.js` knows how records are stored. Uploads go to
`UPLOADS_DIR`: photographs are re-encoded to a WebP ladder plus a blurred
placeholder (which also strips EXIF/GPS); videos must be MP4 or WebM,
checked by their bytes.

## Decisions worth knowing

**Nothing is invented.** The seed carries no prices, no room capacities, no
opening times and no reviews, because none were supplied. The site shows
nothing in their place rather than something wrong; the admin fills them in.

**Bookings go to the API, with WhatsApp as a second route.** The form posts to
the server first, so the kitchen has a record whether or not the guest does
anything else. WhatsApp stays on the page because it is how most people here
prefer to reach a restaurant, and because it is the way through if the server
is unreachable.

**The webfont stylesheet does not block first paint.** A plain
`rel="stylesheet"` holds the render tree until Google Fonts answers; measured
against a host that hangs rather than fails, that was over twelve seconds of
blank page. It now loads on `media="print"` and is switched on once it
arrives.

**AVIF is only emitted where it wins.** Each variant is encoded, scored
against the WebP it would replace, and kept only if it matches on SSIM and is
smaller — per photograph, never per width, because `<picture>` commits to one
source type and will not fall back for a missing size.

**Content-Security-Policy is strict and `script-src` is `'self'`.** No inline
scripts anywhere. Any third-party script added later — analytics, a chat
widget, a booking embed — will be blocked until its origin is added to the
policy in every config that carries it.

## Configuration

Copy `.env.example` to `.env`; every variable is explained there. The ones
that matter before going live:

- `DATA_FILE` and `UPLOADS_DIR` — on a volume that survives a redeploy. They
  are the whole backup.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — the first super admin, read only when
  there are no users. Remove the password once you have signed in.
- `TRUST_PROXY` — the number of proxies in front of the process. Trusting a
  forwarded header nobody set lets a client spoof its address and walk around
  the rate limiters.
- `SMTP_URL` and `BOOKING_ALERT_TO` — password-reset mail and new-booking
  alerts. Without SMTP they are written to the log.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The front end can be served by
this Express process or by any static host — configs for Apache, nginx,
Netlify, Cloudflare Pages and Vercel all ship with it.

---

Creative web concept by [EVO ART (PVT) LTD](https://www.evoart.lk).
# hillsedge_beragala
# hillsedge_beragala
