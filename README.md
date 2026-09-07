# VIPCAR

Bilingual (EN/FR) car rental, airport transfer, and chauffeur platform for Tunisia.

- Public site: `apps/web` (Vite + React) — staff backoffice at `/admin` (same app/port, Phase J)
- HTTP API: `apps/gateway` → NATS → `apps/identity`, `apps/catalog`, `apps/cms`, `apps/booking`, `apps/notify`, `apps/fleet`, `apps/billing`, `apps/dispatch` (more services in later phases)
- Domain and backend plan: [docs/architecture/overview.md](docs/architecture/overview.md) · [docs/backend/TASKS.md](docs/backend/TASKS.md)

## Local development

By default, local development uses SQLite, so PostgreSQL is not required on the
developer machine. Each service gets its own database under `.local-data/`.
The existing PostgreSQL schemas, migrations, and Docker setup remain the
production path.

```bash
cp .env.example .env
npm install
npm run prisma:identity:deploy
npm run prisma:identity:seed
npm run prisma:catalog:deploy
npm run prisma:catalog:seed
npm run prisma:cms:deploy
npm run prisma:cms:seed
npm run prisma:booking:deploy
npm run prisma:notify:deploy
npm run prisma:fleet:deploy
npm run prisma:billing:deploy
npm run prisma:dispatch:deploy
npm run dev:identity
npm run dev:catalog
npm run dev:cms
npm run dev:booking
npm run dev:notify
npm run dev:fleet
npm run dev:billing
npm run dev:dispatch
npm run dev:gateway
npm run dev:web
```

The `prisma:*:deploy` commands map to `prisma db push` in SQLite mode. To use
PostgreSQL locally or in production, set `DATABASE_PROVIDER=postgresql` and
provide the existing PostgreSQL connection variables before running the same
commands. Docker Compose continues to use PostgreSQL.

Redis and NATS are still required by the gateway and notification services;
start them with your preferred local installation when running the full stack.

- Site: http://localhost:5173
- Admin (staff): http://localhost:5173/admin — **same Vite app and port** as the public site (`npm run dev:web`). Path routing under `/admin/*`, not a second origin or CORS setup.
- API: http://localhost:3000/v1/health
- Swagger: http://localhost:3000/v1/docs

Full stack (including Nest containers): `docker compose up --build` after `.env` exists.

## Auth e2e test

Integration test for `POST /v1/auth/register` → `POST /v1/auth/login` → `GET /v1/auth/me` (Bearer). It hits a **running** gateway (which talks to identity over NATS + the selected database provider).

```bash
cp .env.example .env   # if needed; SQLite is the default local database
npm install
npm run prisma:identity:deploy
npm run dev:identity   # separate terminal
npm run dev:gateway    # separate terminal
npm run test:e2e:auth
```

Optional: `GATEWAY_URL=http://127.0.0.1:3000 npm run test:e2e:auth` (default is that URL).

With PostgreSQL and Nest containers instead of `dev:*`, set
`DATABASE_PROVIDER=postgresql` in `.env` first:

```bash
docker compose up --build -d
npm run test:e2e:auth
```

If migrate/identity fail with Postgres auth errors while Docker Postgres is up, another process may already own host port `5432` — stop it or publish Compose Postgres on a free port and point `DATABASE_URL` at that port.
