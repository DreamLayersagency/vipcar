# VIPCAR

Bilingual (EN/FR) car rental, airport transfer, and chauffeur platform for Tunisia.

- Public site: `apps/web` (Vite + React)
- HTTP API: `apps/gateway` → NATS → `apps/identity` (more services in later phases)
- Domain and backend plan: [docs/architecture/overview.md](docs/architecture/overview.md) · [docs/backend/TASKS.md](docs/backend/TASKS.md)

## Local development

```bash
cp .env.example .env
docker compose up -d postgres redis nats
npm install
npm run prisma:identity:deploy
npm run dev:identity
npm run dev:gateway
npm run dev:web
```

- Site: http://localhost:5173
- API: http://localhost:3000/v1/health
- Swagger: http://localhost:3000/v1/docs

Full stack (including Nest containers): `docker compose up --build` after `.env` exists.
