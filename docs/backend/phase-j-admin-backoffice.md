# Phase J — Visual admin backoffice

**Goal:** Ship a modern staff backoffice **inside `apps/web`**, under path-based routing (`/admin/...`), on the **same origin and port** as the public site. No second Vite app, no second port.

**Depends on:** [Phase I](./phase-i-admin-frontend.md) (I4 ops APIs), [Phase C](./phase-c-quotes.md), [Phase B](./phase-b-catalog-cms.md), [Phase G](./phase-g-dispatch.md) recommended  
**Services:** `apps/web` (admin routes), `apps/gateway`  
**Progress:** 8 / 8

← [Backlog index](./TASKS.md)

---

## Checklist

- [x] **J1** — Admin route shell in `apps/web` (`/admin`, same port)
- [x] **J2** — Staff login + JWT session + role gate (`ops_agent` | `admin`)
- [x] **J3** — Quotes inbox (list, filter, price, confirm)
- [x] **J4** — Catalog admin (vehicles draft/publish)
- [x] **J5** — CMS admin (articles draft/publish)
- [x] **J6** — Fleet availability + dispatch assign / trip status
- [x] **J7** — Corporate accounts admin
- [x] **J8** — Modern shell polish, EN/FR, SEO exclude `/admin`

---

## Routing (required)

| Route | Purpose |
|---|---|
| `/admin/login` | Staff login |
| `/admin` | Dashboard / redirect to quotes |
| `/admin/quotes` | Quotes inbox |
| `/admin/quotes/:id` | Quote detail / price / confirm |
| `/admin/vehicles` | Catalog upsert |
| `/admin/articles` | CMS articles |
| `/admin/fleet` | Availability |
| `/admin/dispatch` | Assign + trip status |
| `/admin/corporate` | Corporate accounts |

- Same Vite process as public site: `npm run dev:web` → e.g. `http://localhost:5173/admin`
- **Do not** run a separate `apps/admin` on another port. If a leftover `apps/admin` package exists, remove or fold it into `apps/web` during J1.
- Public marketing routes stay `/{en|fr}/...`. Admin is **not** under `/en` or `/fr` (staff UI; locale toggle inside admin shell).
- Exclude `/admin` from prerender sitemap / public SEO.

---

## UX / UI design (required)

Backoffice must feel **modern, calm, and operational** — not a clone of the marketing landing page, and not a generic purple dashboard.

**Principles**
- Clear information hierarchy: primary action obvious, secondary actions quiet
- Dense but readable tables for ops (quotes, vehicles) with filters, empty states, and loading skeletons
- Consistent spacing, type scale, and status chips (quote/booking/assignment statuses)
- Keyboard-friendly forms; inline validation; toast or banner for success/error (never silent fail)
- Mobile-usable sidebar or drawer; desktop: persistent nav + content
- Dark sidebar optional; prefer light content surface with one brand accent (VIPCAR green/gold from the site — not purple gradients)
- Respect reduced motion; no decorative noise (glow, emoji piles, card spam)

**Components**
- App shell: top bar (user, locale EN/FR, logout) + side nav
- Data table + detail panel or dedicated detail route
- Confirm dialogs for destructive / money-adjacent actions
- Status badges mapped to domain enums from [entities.md](../domain/entities.md)

**API**
- Call only `VITE_API_URL` gateway (`/v1/ops/*`, `/v1/auth/*`). Never hit microservices directly.

**Roles:** `ops_agent`, `admin` only. Others redirect to `/admin/login` with a clear message.

---

## Tasks

### J1 — Admin route shell (same port)

- [x] Finished
- **Service:** web
- **Acceptance:** `/admin` loads on the **same** `dev:web` port; no second Vite server; leftover `apps/admin` removed or migrated

**Prompt:**

```text
VIPCAR Phase J task J1: implement staff backoffice as CLIENT ROUTES inside apps/web (NOT a separate apps/admin port). Routes under /admin (login shell stub). Same npm run dev:web / same origin as the public site. Reuse VITE_API_URL. If apps/admin exists as a second package/port, migrate useful code into apps/web and remove the separate app + any :5174 / ADMIN_ORIGIN config. Exclude /admin from sitemap/prerender. Modern empty shell only (nav stub). Mark J1 [x] in docs/backend/phase-j-admin-backoffice.md when done.
```

---

### J2 — Staff auth

- [x] Finished
- **Service:** web
- **Acceptance:** `/admin/login` → JWT; only `ops_agent`|`admin`; protected `/admin/*`; logout

**Prompt:**

```text
VIPCAR Phase J task J2: apps/web /admin/login with POST /v1/auth/login, store tokens, GET /v1/auth/me, allow only ops_agent|admin. Guard all /admin/* except login. Clean modern login UI (focused form, clear errors). Refresh on 401 if possible. Mark J2 [x] in docs/backend/phase-j-admin-backoffice.md when done.
```

---

### J3 — Quotes inbox UI

- [x] Finished
- **Service:** web
- **Acceptance:** list/filter/price/confirm with polished table + detail UX

**Prompt:**

```text
VIPCAR Phase J task J3: apps/web /admin/quotes — GET /v1/ops/quotes (pagination + status filter), detail at /admin/quotes/:id, PATCH price, confirm booking if API exists. Modern ops UX: table, filters, status chips, loading/empty/error states, EN/FR labels. Mark J3 [x] in docs/backend/phase-j-admin-backoffice.md when done.
```

---

### J4 — Catalog admin UI

- [x] Finished
- **Service:** web
- **Acceptance:** upsert vehicles including drafts; clear draft/publish UX

**Prompt:**

```text
VIPCAR Phase J task J4: apps/web /admin/vehicles — list + form upsert via ops catalog API (PUT /v1/ops/catalog/vehicles/:slug). Draft/publish toggle (isPublished). Modern form layout, validation feedback. Fields from docs/domain/entities.md VehicleModel. Mark J4 [x] in docs/backend/phase-j-admin-backoffice.md when done.
```

---

### J5 — CMS admin UI

- [x] Finished
- **Service:** web
- **Acceptance:** bilingual article edit with drafts

**Prompt:**

```text
VIPCAR Phase J task J5: apps/web /admin/articles — list + upsert via PUT /v1/ops/cms/articles/:slug. EN/FR fields, isPublished. Clean editor UX (tabs or side-by-side locales). FAQ/legal optional if APIs exist. Mark J5 [x] in docs/backend/phase-j-admin-backoffice.md when done.
```

---

### J6 — Fleet + dispatch UI

- [x] Finished
- **Service:** web
- **Acceptance:** availability search + assign + trip status with clear workflow UI

**Prompt:**

```text
VIPCAR Phase J task J6: apps/web /admin/fleet and /admin/dispatch — GET /v1/ops/fleet/availability, POST /v1/ops/dispatch/assign, POST /v1/ops/dispatch/trip/status. Status chips for en_route|arrived|completed. Guided ops UX (select booking → driver → confirm). Mark J6 [x] in docs/backend/phase-j-admin-backoffice.md when done.
```

**Notes:** `/admin/fleet` searches availability (model from ops catalog, hub + half-open window). `/admin/dispatch` guided wizard booking → driver → confirm assign, then trip status chips/actions (`en_route` | `arrived` | `completed`).

---

### J7 — Corporate admin UI

- [x] Finished
- **Service:** web
- **Acceptance:** create account + link managers (needs H3)

**Prompt:**

```text
VIPCAR Phase J task J7: apps/web /admin/corporate — ops corporate-accounts APIs to create CorporateAccount and link corporate_manager users. Clear list + create/link forms. Requires Phase H H3. Mark J7 [x] in docs/backend/phase-j-admin-backoffice.md when done.
```

**Notes:** `/admin/corporate` lists accounts (`GET /v1/ops/corporate-accounts`), creates accounts, and links/invites `corporate_manager` users. Admin-only ops APIs.

---

### J8 — Shell polish + docs

- [x] Finished
- **Service:** web + docs
- **Acceptance:** cohesive modern shell; EN/FR; README documents `/admin` on same port; no second-origin CORS needed

**Prompt:**

```text
VIPCAR Phase J task J8: polish apps/web /admin shell — sticky side nav (Quotes, Vehicles, Articles, Fleet, Dispatch, Corporate), top bar (user, EN/FR, logout), consistent design tokens (VIPCAR brand accent, not purple). Document in README: open http://localhost:5173/admin (same as public site). Update docs/architecture/overview.md: admin is path routing in apps/web, not a second port. Mark J8 [x] in docs/backend/phase-j-admin-backoffice.md when done.
```

**Notes:** Sticky sidebar + top bar; mobile drawer nav; VIPCAR green/accent tokens from the public site; login EN/FR toggle; `/admin` remains `noindex` and out of prerender.

---

## Suggested order

```text
J1 → J2 → J3 → J4 → J5 → J6 → J7 → J8
```

J3 is highest ops value after auth. J7 waits on H3.
