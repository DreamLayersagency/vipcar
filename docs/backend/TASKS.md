# Backend implementation backlog

Phased tickets for the NestJS microservice platform. Phase A is started by the monorepo skeleton in this repo. Later phases are not implemented yet.

Conventions: [overview](../architecture/overview.md) · [events](../architecture/events.md) · [API](../api/conventions.md) · [entities](../domain/entities.md)

---

## Phase A — Foundation

**Goal:** Monorepo runs locally. Gateway and identity authenticate a user.

| ID | Ticket | Service | Acceptance |
|---|---|---|---|
| A1 | npm workspaces: `apps/web`, `apps/gateway`, `apps/identity`, `libs/contracts` | repo | `npm install` at root; `npm run dev:web` still serves the SPA |
| A2 | docker-compose: Postgres, Redis, NATS (JetStream), gateway, identity | repo | `docker compose up` starts infra; schemas `identity` created |
| A3 | Gateway HTTP: health, CORS, ValidationPipe, Swagger `/v1/docs`, throttling | gateway | `GET /v1/health` returns `{ data: { status: "ok" } }` |
| A4 | Identity schema + Prisma: User, RefreshToken, Role enum | identity | migrate applies; password hashes stored |
| A5 | NATS patterns: register, login, refresh, logout, me | identity + gateway | register/login return tokens; `GET /v1/auth/me` with Bearer works |
| A6 | `.env.example` with no secrets; JWT expiry documented | repo | clone + copy env is enough to boot |
| A7 | Shared contracts: roles, auth DTOs, NATS pattern constants | contracts | both apps import `@vipcar/contracts` |

---

## Phase B — Catalog + CMS

**Goal:** Replace hardcoded fleet, locations, and content with APIs.

| ID | Ticket | Service | Acceptance |
|---|---|---|---|
| B1 | Scaffold `apps/catalog` + schema VehicleModel, Hub, Location | catalog | NATS `catalog.vehicles.list` |
| B2 | Seed 18 vehicle models and pickup/commercial locations from the SPA | catalog | all slugs from `features.md` F-07 / F-09 |
| B3 | `GET /v1/catalog/vehicles` and `/:slug` with category filter | gateway | EN/FR-ready; unpublished hidden |
| B4 | `GET /v1/catalog/locations` including chauffeur/transfer flags | gateway | Gabès has no transfer flag |
| B5 | Scaffold `apps/cms` + Article, FaqItem, LegalPage | cms | seed 6 articles, 4 FAQs, 3 legal pages |
| B6 | `GET /v1/cms/articles`, `/faq`, `/legal/:slug?locale=` | gateway | matches current slugs |
| B7 | Admin CRUD (ops/admin JWT) for vehicles and articles | gateway | unpublished draft works |
| B8 | Sync sitemap/prerender vehicle list with all 18 slugs | web | no missing models |

---

## Phase C — Quotes

**Goal:** Widget and wizard persist leads; WhatsApp is a side effect.

| ID | Ticket | Service | Acceptance |
|---|---|---|---|
| C1 | Scaffold `apps/booking` Quote model + status | booking | `booking.quote.create` |
| C2 | `POST /v1/quotes` validates payload in `conventions.md` | gateway | anonymous allowed |
| C3 | Scaffold `apps/notify` + outbox; subscribe `booking.quote.created` | notify | WhatsApp and/or email to ops; quote saved if WhatsApp fails |
| C4 | `POST /v1/contact` as a quote/lead with `channel=contact` | booking | same inbox |
| C5 | Staff inbox `GET /v1/ops/quotes` | gateway | ops_agent only |
| C6 | Analytics: emit server-side `quote_submit` equivalent | booking | payload includes service + locale |

---

## Phase D — Fleet availability

**Goal:** Real units and date overlap — not only 18 marketing models.

| ID | Ticket | Service | Acceptance |
|---|---|---|---|
| D1 | VehicleUnit + CalendarBlock schema | fleet | plate unique per hub |
| D2 | `fleet.availability.search` by model, hub, range | fleet | overlap excluded; maintenance excluded |
| D3 | `GET /v1/ops/fleet/availability` | gateway | staff |
| D4 | Hold lock in Redis during checkout (short TTL) | fleet | concurrent requests do not double-book |

---

## Phase E — Bookings

**Goal:** Confirmed quote becomes a booking with a status machine.

| ID | Ticket | Service | Acceptance |
|---|---|---|---|
| E1 | Booking entity + transitions from `entities.md` | booking | illegal transitions return 409 |
| E2 | Rental / transfer / chauffeur payloads (duration, flightNumber) | booking | type-specific validation |
| E3 | `booking.confirmed` emits; fleet blocks calendar | booking, fleet | unit not available on those dates |
| E4 | Customer cancel + policy snapshot | booking | `POST /v1/bookings/:id/cancel` |
| E5 | Cancellation policy hooks (timing from legal CMS later) | booking | staff can override with reason |

---

## Phase F — Billing

**Goal:** Deposits and payments via a provider port.

| ID | Ticket | Service | Acceptance |
|---|---|---|---|
| F1 | Payment + Invoice schema; provider interface | billing | `manual` provider works without a PSP |
| F2 | Adapter: Konnect or Flouci (Tunisia); Stripe optional | billing | secrets from env only |
| F3 | `POST /v1/billing/checkout` for deposit | gateway | `awaiting_payment` |
| F4 | Webhook `POST /v1/billing/webhooks/:provider` | gateway | signature verified; `billing.payment.captured` |
| F5 | Booking moves to `confirmed` on captured payment | booking | idempotent webhook |
| F6 | Deposit release on `booking.completed` | billing | `billing.deposit.released` |
| F7 | Corporate invoice generation | billing | PDF or line items stored |

---

## Phase G — Dispatch

**Goal:** Drivers, transfers, chauffeur jobs.

| ID | Ticket | Service | Acceptance |
|---|---|---|---|
| G1 | Driver + Assignment schema | dispatch | linked to identity `driver` role |
| G2 | Transfer job with `flightNumber` | dispatch | stored on assignment |
| G3 | Chauffeur duration pricing snapshot on booking | booking, dispatch | hourly / half-day / full-day |
| G4 | `POST /v1/ops/dispatch/assign` | gateway | emits `dispatch.assigned` |
| G5 | Driver trip status updates | dispatch | notify customer |

---

## Phase H — Accounts

**Goal:** Customer and corporate portals (APIs first).

| ID | Ticket | Service | Acceptance |
|---|---|---|---|
| H1 | `GET /v1/me/bookings` | gateway | only own bookings |
| H2 | Attach `customerId` on quote when logged in | booking | inbox still works for guests |
| H3 | CorporateAccount + membership | identity | `corporate_manager` |
| H4 | Corporate invoicing profile fields | billing | used in F7 |

---

## Phase I — Admin + frontend wiring

**Goal:** SPA stops using WhatsApp as the database.

| ID | Ticket | Service | Acceptance |
|---|---|---|---|
| I1 | `apps/web` API client to gateway | web | `VITE_API_URL` |
| I2 | Quote widget + BookingPage `POST /v1/quotes` | web | 4xx shown; WhatsApp optional after success |
| I3 | Fleet pages load `GET /v1/catalog/vehicles` | web | fallback if API down (document choice) |
| I4 | Staff dashboard APIs documented; thin admin UI or OpenAPI-only | gateway | ops can price and confirm |
| I5 | Customer “my bookings” page | web | auth required |
| I6 | Keep prerender/SEO; do not block SSG on auth | web | public routes still prerender |

---

## Suggested order inside a phase

Contracts → Prisma schema → NATS handlers → gateway HTTP → seed → tests for the happy path.

Do not start Phase F (real PSP) until E1–E3 exist. Do not wire the SPA (I2) until C2 exists.
