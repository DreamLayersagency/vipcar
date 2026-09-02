# Architecture overview

VIPCAR is an npm-workspace monorepo: a public Vite site plus NestJS microservices behind an HTTP gateway.

```text
apps/web         Vite + React public site (SEO prerender)
apps/gateway     HTTP API, JWT, rate limit, OpenAPI, NATS client
apps/identity    Users, roles, sessions
apps/catalog     Vehicle models, hubs, locations   (later)
apps/cms         Articles, FAQ, legal              (later)
apps/booking     Quotes and bookings               (later)
apps/fleet       Physical units and calendar       (later)
apps/dispatch    Drivers and trip assignments      (later)
apps/billing     Payments, deposits, invoices      (later)
apps/notify      WhatsApp + email                  (later)
libs/contracts   DTOs, events, NATS patterns, roles
```

This pass ships **gateway + identity** as a runnable skeleton. Other apps are specified here and in [TASKS.md](../backend/TASKS.md).

---

## Runtime

```text
Browser  →  apps/web (static / Vite)
Browser  →  apps/gateway  :3000  /v1
gateway  →  NATS  →  identity (and later services)
identity →  PostgreSQL schema "identity"
gateway  →  Redis (rate-limit / cache)
```

| Component | Local default |
|---|---|
| PostgreSQL | `localhost:5432` · db `vipcar` · user `vipcar` |
| Redis | `localhost:6379` |
| NATS | `localhost:4222` (JetStream enabled) |
| Gateway | `http://localhost:3000` |
| Identity | NATS microservice + HTTP health `:3001` |
| Web | `http://localhost:5173` |

Public marketing HTML stays on `vipcar.com.tn`. The API must **not** be mixed into that static host in a way that breaks prerender. Use a dedicated origin (e.g. `https://api.vipcar.com.tn`) or a reverse-proxy path that is already disallowed in `robots.txt` (`Disallow: /api/`). Gateway routes are versioned as `/v1`.

---

## Data ownership

- One service **writes** one PostgreSQL schema (`identity`, `catalog`, `booking`, …).
- Start with **one Postgres cluster**, schema-per-service. Split to separate databases later without changing NATS contracts.
- **No cross-schema SQL joins.** Copy the IDs you need (e.g. `booking.vehicleModelId`) and fetch extra data via NATS request/response.
- Redis: throttling, short locks (availability holds), notify retries.
- NATS JetStream: domain events (`quote.created`, `booking.confirmed`, …). Request/response for commands (`identity.login`).

See [events.md](./events.md).

---

## Auth

1. Client calls `POST /v1/auth/login` on the gateway.
2. Gateway sends NATS `identity.login`.
3. Identity verifies password, returns access JWT (short) + refresh token.
4. Subsequent `/v1/*` requests send `Authorization: Bearer <access>`.
5. Gateway validates JWT (shared secret/JWKS from identity config) and attaches `user` to the request.
6. Public routes (catalog reads, `POST /v1/quotes`) stay anonymous.

Roles: `customer`, `corporate_manager`, `driver`, `ops_agent`, `admin`.

---

## Service rules

- NestJS standalone apps, each with its own `package.json`.
- Transport: `@nestjs/microservices` + NATS.
- Validation: `class-validator` DTOs at the gateway **and** at the service boundary.
- OpenAPI only on the gateway (`/v1/docs`).
- Payments: adapter interface in billing (`Konnect` / `Flouci` / `Stripe` / `manual`). Secrets only in env.
- WhatsApp: `notify` adapter. Creating a quote must succeed even if WhatsApp is down (outbox retry).

---

## Frontend integration

`apps/web` may call **only** `VITE_API_URL` (the gateway). Do not treat `wa.me` as persistence. After Phase I, quote submit is `POST /v1/quotes`; `notify` may still open or send WhatsApp as a side effect.

Indicative fleet prices remain display-only until a quote is confirmed.

Keep EN/FR routes and prerender. Catalog/CMS APIs will feed the SPA later; do not break SEO URLs.

---

## Local development

```bash
cp .env.example .env
docker compose up -d postgres redis nats
npm install
npm run prisma:identity:migrate
npm run dev:identity
npm run dev:gateway
npm run dev:web
```

Health: `GET http://localhost:3000/v1/health`  
Swagger: `http://localhost:3000/v1/docs`
