# Phase I — Admin + frontend wiring

**Goal:** SPA stops using WhatsApp as the database.

**Depends on:** [Phase C](./phase-c-quotes.md) (I2), [Phase B](./phase-b-catalog-cms.md) (I3), [Phase H](./phase-h-accounts.md) (I5)  
**Services:** `apps/web`, `apps/gateway`  
**Progress:** 6 / 6

← [Backlog index](./TASKS.md) · Next → [Phase J — Visual admin](./phase-j-admin-backoffice.md)

---

## Checklist

- [x] **I1** — Web API client (`VITE_API_URL`)
- [x] **I2** — Quote widget + BookingPage → `POST /v1/quotes`
- [x] **I3** — Fleet pages from catalog API
- [x] **I4** — Staff ops APIs documented in OpenAPI (visual UI → Phase J)
- [x] **I5** — Customer my bookings page
- [x] **I6** — Keep prerender/SEO without auth

---

## Tasks

### I1 — API client

- [x] Finished
- **Service:** web
- **Acceptance:** uses `VITE_API_URL` only (gateway)

**Prompt:**

```text
VIPCAR Phase I task I1: in apps/web add a small API client reading VITE_API_URL from env. Only call the gateway — never microservices directly. Follow .cursor/rules/frontend-integration.mdc. Mark I1 [x] in docs/backend/phase-i-admin-frontend.md when done.
```

---

### I2 — Persist quotes from SPA

- [x] Finished
- **Service:** web
- **Acceptance:** 4xx shown; WhatsApp optional after successful persist (requires C2)

**Prompt:**

```text
VIPCAR Phase I task I2: change QuoteWidget and BookingPage to POST /v1/quotes first. On success optionally open WhatsApp as channel; on API error show message (do not lose the form). Keep analytics quote_submit. Requires Phase C C2. Mark I2 [x] in docs/backend/phase-i-admin-frontend.md when done.
```

---

### I3 — Fleet from API

- [x] Finished
- **Service:** web
- **Acceptance:** document fallback if API down (requires B3)

**Fallback strategy (API down):**

1. **Primary:** `FleetPage` and `VehiclePage` load from gateway `GET /v1/catalog/vehicles` and `GET /v1/catalog/vehicles/:slug` via `apps/web/src/catalog.js` (`VITE_API_URL` only).
2. **If the catalog is unreachable** (missing `VITE_API_URL`, network error, timeout, 5xx): render the bundled **cached seed** in `apps/web/src/fleet-seed.js` (same SEO slugs as catalog B2 / sitemap `/fleet/:slug`) and show a soft offline notice — not a hard empty error page. Prices stay indicative.
3. **If a healthy API returns 404** for a slug: show the existing NotFound UI (do not invent the vehicle from seed — unpublished models stay hidden).
4. Home / Booking / Seo may still use the seed for featured cards until a later pass; public fleet URLs remain `/en|fr/fleet` and `/en|fr/fleet/:slug`.

**Prompt:**

```text
VIPCAR Phase I task I3: FleetPage and VehiclePage load vehicles from GET /v1/catalog/vehicles. Document fallback strategy if API is down (cached seed or error UI). Keep SEO slugs. Mark I3 [x] in docs/backend/phase-i-admin-frontend.md when done.
```

---

### I4 — Staff ops APIs (OpenAPI)

- [x] Finished
- **Service:** gateway
- **Acceptance:** ops can list, price, and confirm quotes via documented OpenAPI; visual UI is [Phase J](./phase-j-admin-backoffice.md)

**Prompt:**

```text
VIPCAR Phase I task I4: ensure ops APIs are complete and documented in OpenAPI (list quotes, set price, confirm, catalog/CMS/fleet/dispatch as already built). Do NOT build the visual admin UI here — that is Phase J as `/admin` routes inside apps/web (same port). OpenAPI-only is the acceptance for I4. Mark I4 [x] in docs/backend/phase-i-admin-frontend.md when done.
```

**Notes:** Staff contract at `/v1/docs` (`ops` tag). Quotes: `GET /v1/ops/quotes`, `PATCH /v1/ops/quotes/:id` (price), `POST /v1/ops/quotes/:id/confirm`. Bookings: `POST /v1/ops/bookings/:id/confirm`. Catalog/CMS/fleet/dispatch/corporate ops routes annotated with `ApiOperation`. Confirm requires `unitId` (body or existing booking) for fleet calendar block.

---

### I5 — My bookings UI

- [x] Finished
- **Service:** web
- **Acceptance:** auth required (requires H1)

**Prompt:**

```text
VIPCAR Phase I task I5: add customer “my bookings” page in apps/web calling GET /v1/me/bookings with Bearer token. Redirect to login if anonymous. EN/FR copy. Mark I5 [x] in docs/backend/phase-i-admin-frontend.md when done.
```

---

### I6 — Prerender / SEO safety

- [x] Finished
- **Service:** web
- **Acceptance:** public routes still prerender; auth not required for SSG

**Choice: static seed for prerender (not live API at build).**

1. Playwright SSG (`apps/web/scripts/prerender.mjs`) sets `window.__VIPCAR_PRERENDER__` and **aborts** any `/v1/` (gateway) requests so `networkidle` never waits on catalog, CMS, or auth.
2. `loadFleet` / `loadVehiclePage` short-circuit to `apps/web/src/fleet-seed.js` when that flag is set (`source: 'prerender'`). Vehicle slugs for SSG are taken from the same seed (keeps sitemap / B8 alignment).
3. Blog, legal, FAQ, and destination SEO copy stay **inlined** in the SPA for SSG — no CMS fetch at build.
4. Auth routes (`/login`, `/my-bookings`) are **not** in the prerender route list; public SEO stays `/{en|fr}/...` without Bearer tokens.
5. At runtime in the browser, fleet still prefers live `GET /v1/catalog/vehicles` with the I3 seed fallback when the API is down.

**Prompt:**

```text
VIPCAR Phase I task I6: ensure Playwright prerender and public SEO routes still work without auth. Do not block SSG on API auth. Fleet/CMS fetch at build or keep static seed for prerender — document choice. Mark I6 [x] in docs/backend/phase-i-admin-frontend.md when done.
```
