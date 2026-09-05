# Backend implementation backlog

Phased tickets for the NestJS microservice platform.

**How to use:** open a phase file → find the next unchecked task → copy its **Prompt** into Cursor → when done, mark `[x]`.

**Conventions:** [architecture](../architecture/overview.md) · [events](../architecture/events.md) · [API](../api/conventions.md) · [entities](../domain/entities.md)

---

## Phases

| Phase | Goal | Progress | File |
|---|---|---|---|
| **A** | Monorepo, gateway, identity, auth | 9/9 | [phase-a-foundation.md](./phase-a-foundation.md) |
| **B** | Catalog + CMS | 8/8 | [phase-b-catalog-cms.md](./phase-b-catalog-cms.md) |
| **C** | Quotes + notify | 6/6 | [phase-c-quotes.md](./phase-c-quotes.md) |
| **D** | Fleet availability | 4/4 | [phase-d-fleet.md](./phase-d-fleet.md) |
| **E** | Bookings | 5/5 | [phase-e-bookings.md](./phase-e-bookings.md) |
| **F** | Billing | 6/7 | [phase-f-billing.md](./phase-f-billing.md) |
| **G** | Dispatch | 5/5 | [phase-g-dispatch.md](./phase-g-dispatch.md) |
| **H** | Accounts | 1/4 | [phase-h-accounts.md](./phase-h-accounts.md) |
| **I** | Public frontend wiring | 6/6 | [phase-i-admin-frontend.md](./phase-i-admin-frontend.md) |
| **J** | Visual admin backoffice (`/admin` routes) | 8/8 | [phase-j-admin-backoffice.md](./phase-j-admin-backoffice.md) |

---

## Dependency order

```text
A → B → C → D → E → F
         ↘ G (after E)
         ↘ H (after E, parallel with F/G)
         ↘ I (after C for quotes; after B for fleet; after H for my bookings)
         ↘ J (visual /admin UI inside apps/web, same port; after I4)
```

**Rules:**
- Mark `[x]` only when acceptance criteria pass.
- Do not start Phase F (real PSP) until E1–E3 are done.
- Do not wire SPA quotes (I2) until C2 is done.
- Phase **I4** = ops APIs + OpenAPI; Phase **J** = visual `/admin` UI in `apps/web` (path routing, **not** a new port / not Swagger-only).
- Inside a phase: contracts → Prisma → NATS → gateway HTTP → seed → tests.
