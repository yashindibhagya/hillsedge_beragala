# Handover notes

For whoever picks this up next. `README.md` covers the layout and how to run
it; `docs/DEPLOYMENT.md` covers shipping it. This file is the context that is
not in either: what is decided, what is not, and where the sharp edges are.

## State

Not yet deployed anywhere. Everything below was verified on this commit.

- `npm test` — 156 passing (66 client, 11 admin, 79 server)
- `npm run lint` and `npm run format:check` — clean
- `npm audit --omit=dev` — 0 vulnerabilities
- Built, served by the real Express process, and driven in headless Chromium:
  - every public route at nine viewports, from a 280 px folded phone to a
    3440 px ultrawide: no console errors, no CSP violations, no horizontal
    overflow, one `h1` per page, no broken images or missing alt text
  - every admin screen at desktop, tablet and phone widths
  - end to end: a guest books on a phone → it appears in the admin; the admin
    marks a dish sold out → the public menu shows it; menu search, the dish
    dialog (deep link, Esc, focus return), the mobile menu's focus trap, old
    URL redirects, a real 404, visible focus rings, reduced motion
  - dual-screen foldables: the segment CSS applied with real hinge geometry,
    checking that no control or heading sits across the fold
  - throttled mobile (fast 4G, 4× CPU): first paint ≈ 0.4 s, largest paint
    0.7–1.3 s, layout shift ≤ 0.023 on every page
- An independent security review; every confirmed finding is fixed and has a
  regression test (see git log for the list).

Read `git log`. The commit messages carry the reasoning for most of what
looks unusual.

## Before launch — needs the restaurant

None of these are bugs. They are facts nobody has supplied, deliberately left
empty rather than guessed, because a confident wrong answer on a live site is
worse than a gap. All of them are now filled in from the admin panel, not code.

| What                               | Where in the admin                         | While unset                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Menu prices                        | Dishes                                     | No price is shown                                                                                                                                                                    |
| Opening times by day               | Website content → Opening hours            | Hours left out of the footer and of the structured data                                                                                                                              |
| Instagram / Facebook / TripAdvisor | Website content → Social                   | Icons hidden                                                                                                                                                                         |
| Room capacities and prices         | Rooms & spaces                             | Not shown                                                                                                                                                                            |
| Testimonials                       | Testimonials                               | Section hidden. Only genuine reviews, with permission                                                                                                                                |
| Hero video                         | Media library → Website content → Homepage | The hero uses the photograph                                                                                                                                                         |
| Dietary flags and allergens        | Dishes                                     | Set only where the dish itself settles it (e.g. naan is vegetarian)                                                                                                                  |
| Halal position                     | nothing claims it                          | Still a hard yes/no for Middle Eastern and Malaysian visitors                                                                                                                        |
| Privacy notice                     | no page yet                                | The booking form collects names, phones and emails. Someone should write and approve a privacy policy; the footer's "policies" links currently go to the reservation policy and FAQs |

**Landmark distances still need checking** — `client/src/data/content.js` →
`nearbyLandmarks`. Derived from mapping data, not driven.

## Sharp edges

**`DATA_FILE` and `UPLOADS_DIR` must be on a persistent volume, and backed up.**
They are the menu, the bookings, the users and every upload. The default is
`server/data/` inside the checkout, which a redeploy can wipe.

**Run one process.** The store is one JSON file with one writer. Two processes
would overwrite each other's changes. A restaurant site does not need two.

**Production refuses to start without `PUBLIC_ORIGIN`.** Password-reset links
are built from it — never from the request's Host header, which an attacker
controls.

**`TRUST_PROXY` must match reality.** `1` behind the documented nginx. At `0`
behind a proxy, every visitor shares one rate limit — ten failed sign-ins
would lock out every member of staff. The server logs a warning the first time
it sees a proxy header with this at `0`.

**The CSP will block any third-party script you add.** Analytics, a chat
widget, a booking embed — all blocked until the origin is added in _five_
places: `client/vercel.json`, `client/public/_headers`,
`client/public/.htaccess`, `server/src/middleware/security.js`, and the nginx
block in the deployment doc.

**Without SMTP, mail goes to the log.** Password resets then need a super admin
to set the password from Users. Set `SMTP_URL` and `BOOKING_ALERT_TO` so the
kitchen is emailed each new booking.

**"Today" is Colombo's.** Bookings, the dashboard and offer dates use
`TIMEZONE` (default `Asia/Colombo`), and the booking form uses the same zone,
so a guest planning from abroad is offered the day the server will accept.

**Images are generated, and the generator is slow.** `npm run build` runs it
first for the bundled photographs. Uploaded photographs are processed by the
server on upload instead.

**`sitemap.xml`, `robots.txt` and `llms.txt` are generated** from
`client/src/data/routes.js` and the page data. Edit those, not the files.

## Things that look odd and are not

- **A Vercel / Netlify static deploy of `client/dist` alone will not work** —
  the menu, rooms and content come from the API. The static configs remain
  for the headers and SPA fallback if a CDN fronts the Node process.
- **The server reads `client/src/data/routes.js`** to answer unknown URLs with
  a real 404 and old ones (`/cuisine`, `/smokehouse`, `/visit`) with a 301.
- **Fallback fonts have `size-adjust` overrides** in `shared/tokens.css`.
  Without them the narrow Cormorant swapping in for Georgia reflowed every
  heading (layout shift 0.23 on the gallery). The numbers are measured.
- **The webfont loads on `media="print"`** and is switched on by JS, so a
  slow Google Fonts cannot blank the page.
- **The booking form only says "received" when the reply carries a booking
  id.** A host that rewrites `/api` to `index.html` returns 200 with HTML; that
  must never read as a confirmed table.
- **Public bookings do not appear in the activity log.** The log records what
  staff changed; a flood of bookings must not be able to push that out.
- **A duplicated dish starts hidden**, so a half-edited copy is never live.
- **Deleting a category with dishes in it is refused**, not cascaded.
