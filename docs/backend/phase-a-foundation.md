# Phase A — Foundation

**Goal:** Monorepo runs locally. Gateway and identity authenticate a user.

**Depends on:** nothing  
**Services:** `apps/gateway`, `apps/identity`, `libs/contracts`, `apps/web`  
**Progress:** 9 / 9

← [Backlog index](./TASKS.md) · Next → [Phase B](./phase-b-catalog-cms.md)

---

## Checklist

- [x] **A1** — npm workspaces monorepo
- [x] **A2** — docker-compose (Postgres, Redis, NATS, gateway, identity)
- [x] **A3** — Gateway HTTP (health, CORS, ValidationPipe, Swagger, throttle)
- [x] **A4** — Identity Prisma schema (User, RefreshToken, Role)
- [x] **A5** — Auth NATS + HTTP (register, login, refresh, logout, me)
- [x] **A6** — `.env.example` + JWT docs
- [x] **A7** — Shared `@vipcar/contracts`
- [x] **A8** — CI lint + build
- [x] **A9** — Integration test register → login → me

---

## Tasks

### A1 — npm workspaces monorepo

- [x] Finished
- **Service:** repo
- **Acceptance:** `npm install` at root; `npm run dev:web` serves the SPA

**Prompt:**

```text
VIPCAR monorepo: ensure npm workspaces root has apps/web, apps/gateway, apps/identity, libs/contracts. Root package.json scripts: dev:web, dev:gateway, dev:identity, prisma:identity:*. apps/web must still run Vite (dev/build/prerender). Follow docs/architecture/overview.md and .cursor/rules. Do not break SEO routes.
```

---

### A2 — docker-compose infra

- [x] Finished
- **Service:** repo
- **Acceptance:** `docker compose up` starts Postgres/Redis/NATS; schema `identity` creatable

**Prompt:**

```text
VIPCAR: verify/fix docker-compose.yml for postgres:16, redis:7, nats with JetStream, optional gateway + identity services. Init SQL must create schemas identity, catalog, cms, booking, fleet, dispatch, billing, notify. Use .env.example values. Document boot steps in README.
```

---

### A3 — Gateway HTTP foundation

- [x] Finished
- **Service:** gateway
- **Acceptance:** `GET /v1/health` returns `{ data: { status: "ok" } }`; Swagger at `/v1/docs`

**Prompt:**

```text
VIPCAR apps/gateway: ensure NestJS gateway has global prefix /v1, ValidationPipe(whitelist+transform), CORS from WEB_ORIGIN, Throttler, Swagger at /v1/docs, GET /v1/health that pings identity over NATS. Error shape { error: { code, message, details } }. Follow docs/api/conventions.md.
```

---

### A4 — Identity Prisma schema

- [x] Finished
- **Service:** identity
- **Acceptance:** migrate applies; password hashes stored (never plain text)

**Prompt:**

```text
VIPCAR apps/identity: Prisma schema in schema identity with User (email unique, passwordHash, name, phone, locale, role enum, isActive) and RefreshToken (tokenHash, expiresAt, revokedAt). Roles: customer|corporate_manager|driver|ops_agent|admin. Migrations under prisma/migrations. Follow docs/domain/entities.md identity section.
```

---

### A5 — Auth NATS + HTTP

- [x] Finished
- **Service:** identity + gateway
- **Acceptance:** register/login return tokens; `GET /v1/auth/me` with Bearer works

**Prompt:**

```text
VIPCAR: identity NATS handlers identity.register|login|refresh|logout|me; gateway routes POST /v1/auth/register|login|refresh|logout and GET /v1/auth/me (JWT). Access JWT short-lived; refresh stored hashed. bcrypt passwords. Map RpcException to HTTP codes. Use @vipcar/contracts DTOs. Follow docs/api/conventions.md auth section.
```

---

### A6 — Env template

- [x] Finished
- **Service:** repo
- **Acceptance:** clone + copy `.env.example` is enough to boot (no secrets in git)

**Prompt:**

```text
VIPCAR: keep .env.example with JWT_SECRET placeholder, DATABASE_URL (schema=identity), NATS_URL, REDIS_URL, GATEWAY_PORT, IDENTITY_HTTP_PORT, WEB_ORIGIN, VITE_API_URL. Document JWT_ACCESS_EXPIRES and JWT_REFRESH_EXPIRES_DAYS. Never commit real .env.
```

---

### A7 — Shared contracts

- [x] Finished
- **Service:** contracts
- **Acceptance:** gateway and identity import `@vipcar/contracts`

**Prompt:**

```text
VIPCAR libs/contracts: export Role/ROLES, NATS_PATTERNS.identity.*, RegisterDto/LoginDto/RefreshDto/LogoutDto, AuthResultDto, JwtPayload, DOMAIN_EVENTS. Build with tsc. Both Nest apps depend on workspace package @vipcar/contracts.
```

---

### A8 — CI lint + build

- [x] Finished
- **Service:** repo
- **Acceptance:** CI passes on PR for contracts, identity, gateway builds

**Prompt:**

```text
VIPCAR Phase A task A8: add GitHub Actions workflow that on push/PR runs npm ci, builds @vipcar/contracts, generates Prisma client, builds @vipcar/identity and @vipcar/gateway. Fail on TypeScript errors. Do not require Docker in CI for this ticket. Update docs/backend/phase-a-foundation.md checkbox when done.
```

---

### A9 — Integration test auth happy path

- [x] Finished
- **Service:** gateway + identity
- **Acceptance:** automated test: register → login → me succeeds

**Prompt:**

```text
VIPCAR Phase A task A9: add an integration/e2e test (Jest or similar) that boots or hits running gateway+identity+postgres+nats and asserts POST /v1/auth/register, POST /v1/auth/login, GET /v1/auth/me with Bearer. Document how to run it in README. Mark A9 [x] in docs/backend/phase-a-foundation.md when green.
```
