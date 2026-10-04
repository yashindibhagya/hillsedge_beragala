# Deploying Hillsedge Beragala

One Node process serves all three parts:

| Path     | What                                             | Built into    |
| -------- | ------------------------------------------------ | ------------- |
| `/`      | The public site                                  | `client/dist` |
| `/admin` | The admin panel                                  | `admin/dist`  |
| `/api`   | The API both of them use                         | —             |
| `/media` | Photographs and video uploaded through the admin | `UPLOADS_DIR` |

The menu, rooms, gallery, promotions, opening hours and homepage copy all come
from the API now, so **the site needs the Node process**. A static host on its
own can serve the shell, but the pages that read live data will show their
error state. (The static configs below are still shipped and still correct
for the headers and SPA fallback, for anyone fronting Node with a CDN.)

## Running it

Needs a host that runs Node 20.12+ with a persistent disk: a VPS, Railway,
Render or Fly with a volume, a cPanel Node app.

```bash
npm install
npm run build          # client/dist and admin/dist
cp .env.example .env   # then edit it — see below
npm start              # Express serves both apps, /api and /media on PORT
```

On first boot with an empty `DATA_FILE`, the server seeds the store from the
restaurant's existing copy and photographs and creates the first super admin
from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Sign in at `/admin`, change the
password, then remove `ADMIN_PASSWORD` from the environment.

Settings that matter:

- **`DATA_FILE` and `UPLOADS_DIR`** — the menu, rooms, bookings, content,
  users and every upload. **Both must be on a volume that survives a
  redeploy**, or each deploy resets the restaurant to the seed. These two
  paths are the whole backup: copy them nightly.
- **`TRUST_PROXY`** — the number of proxies in front of the process. `1`
  behind a single nginx or Cloudflare, `0` if directly exposed. Wrong here
  and the rate limiters either see every visitor as one client, or trust a
  header a client can forge.
- **`ADMIN_EMAIL` / `ADMIN_PASSWORD`** — only read when there are no users.
- **`SMTP_URL`, `MAIL_FROM`, `BOOKING_ALERT_TO`** — password-reset mail and
  new-booking alerts. Without SMTP, mail is written to the log instead, and a
  forgotten password is reset by a super admin from the Users screen.
- **`TIMEZONE`** — defaults to `Asia/Colombo`. It decides what "today" is for
  bookings, the dashboard and promotion dates.

Keep the process alive with systemd, pm2, or your platform's own supervisor.
It handles `SIGTERM` and finishes in-flight requests before exiting, so a
restart does not drop a booking that was already accepted. Run **one**
process: the store is a single file owned by one writer.

Point your monitor at `GET /api/health`.

### nginx in front of Node

```nginx
server {
    server_name hillsedgeberagala.com;

    # Hero videos can be large.
    client_max_body_size 130m;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

With this, set `TRUST_PROXY=1`. Express sends the security headers itself, so
do not add them here as well — you would get duplicates. Set
`client_max_body_size` at least as large as `MAX_VIDEO_MB`, or uploads fail
with a 413 from nginx before they reach the app.

### Backups

```bash
cp "$DATA_FILE" "backup/store-$(date +%F).json"
rsync -a "$UPLOADS_DIR/" backup/uploads/
```

Restoring is putting both back and restarting. The store is plain JSON; it
can be read, and in an emergency edited, by hand while the process is stopped.

## Static hosts and CDNs

## Two things every host must get right

**1. SPA fallback.** Routes like `/menu` are handled in the browser, so any
path that is not a real file must serve `index.html` with a **200** — not a
redirect and not a 404. Without this, deep links and refreshes break.

**2. Security headers.** The build ships config for the common hosts; use
whichever matches. All three carry the same policy, so if you change one,
change the others.

| Host                       | File                                 | Notes                                  |
| -------------------------- | ------------------------------------ | -------------------------------------- |
| Vercel                     | `client/vercel.json`                 | Picked up automatically.               |
| Netlify / Cloudflare Pages | `client/dist/_headers`, `_redirects` | Picked up automatically.               |
| Apache / cPanel            | `client/dist/.htaccess`              | Needs `mod_headers` and `mod_rewrite`. |
| nginx                      | see below                            | Paste into your server block.          |

### nginx

```nginx
server {
    root /var/www/hillsedge/client/dist;
    index index.html;

    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; frame-src https://maps.google.com https://www.google.com; connect-src 'self'; manifest-src 'self'; upgrade-insecure-requests" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "DENY" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Hashed filenames — safe to cache forever.
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # The shell must revalidate, or a deploy strands visitors on asset URLs
    # that no longer exist.
    location = /index.html {
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    # Client-side routing.
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
```

> nginx's `add_header` does not inherit into a `location` block that declares
> its own. If you add headers inside `location /assets/`, repeat the security
> headers there too.

## What the build produces

| File                        | Purpose                                                                    |
| --------------------------- | -------------------------------------------------------------------------- |
| `index.html`, `assets/`     | The app. Asset filenames are content-hashed.                               |
| `sitemap.xml`, `robots.txt` | Generated from the router's route list.                                    |
| `llms.txt`                  | Plain-text brief for AI answer engines, generated from the same page data. |
| `_headers`, `_redirects`    | Netlify / Cloudflare Pages.                                                |
| `.htaccess`                 | Apache / cPanel. **Hidden file — make sure your upload tool copies it.**   |

## Before going live

- **HTTPS is required.** `upgrade-insecure-requests` and HSTS assume it, and
  HSTS with `preload` is hard to undo — serve HTTPS correctly first.
- **Set the domain.** `PRODUCTION_ORIGIN` in `client/src/data/routes.js` feeds
  `sitemap.xml` and `robots.txt`. It is currently
  `https://hillsedgeberagala.com`.
- **Fill in the blanks from the admin panel** (Website content):
  - Social links — icons stay hidden until a URL is set.
  - Opening hours by day — left out of the structured data until times are
    set, because search engines ignore an hours block with no times on it.
  - Menu prices — the seed has none, and the menu shows no price rather than
    a guessed one.
- **Change the seeded admin password**, and remove `ADMIN_PASSWORD` from the
  environment.

## Verifying a deploy

```bash
curl -I https://your-domain/                                        # security headers present
curl -o /dev/null -w '%{http_code}\n' https://your-domain/menu      # expect 200, not 404
curl -o /dev/null -w '%{http_code}\n' https://your-domain/admin     # expect 200
curl -s https://your-domain/api/public/site | head -c 200          # live content
curl -o /dev/null -w '%{http_code}\n' https://your-domain/llms.txt  # expect 200
```

Then load the site and check the browser console is free of CSP violations.
If you add a third-party script, analytics or embed later, it will be blocked
until you add its origin to the CSP in all five places (`client/vercel.json`, `client/public/_headers`, `client/public/.htaccess`, the
nginx block above, and `server/src/middleware/security.js`).

Worth checking once the domain is live:

- **Rich Results Test** (`search.google.com/test/rich-results`) — the visit
  page should report Restaurant, Breadcrumb and FAQ.
- **Search Console** — submit `sitemap.xml`, then read the search-terms report
  after a few weeks. It beats any keyword guess.
- **Security headers** (`securityheaders.com`) — expect an A grade with the
  shipped config.

## SEO facts that live in the code

These are generated, not hand-written, so edit the source and rebuild:

- **Page titles and descriptions** — the `useDocumentTitle` call at the top of
  each file in `client/src/pages/`. Keep titles under 60 characters and descriptions
  under 160, or search engines truncate them.
- **Nearby landmarks and distances** — `nearbyLandmarks` in
  `client/src/data/content.js`. These feed the visit page, the structured data and
  `llms.txt` at once. **The distances are derived from mapping data, not
  driven — have someone who knows the roads check them.**
- **FAQs** — `faqs` in `client/src/data/content.js`, published as FAQPage structured
  data that search and AI answers quote directly.

Two positions are deliberately unstated and cost traffic while they stay that
way:

- **Halal.** Nothing on the site claims it either way. It is a hard yes/no
  filter for Middle Eastern and Malaysian visitors — if they cannot confirm
  it, they do not come.
- **Named cuts.** The smokehouse pages never name a cut. If brisket, ribs or
  pulled pork are actually on the menu, saying so is the cheapest search win
  available.
