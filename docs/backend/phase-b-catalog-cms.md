# Phase B — Catalog + CMS

**Goal:** Replace hardcoded fleet, locations, and content with APIs.

**Depends on:** [Phase A](./phase-a-foundation.md)  
**Services:** `apps/catalog`, `apps/cms`, `apps/gateway`, `apps/web`  
**Progress:** 8 / 8

← [Backlog index](./TASKS.md) · Next → [Phase C](./phase-c-quotes.md)

---

## Checklist

- [x] **B1** — Scaffold catalog (VehicleModel, Hub, Location)
- [x] **B2** — Seed 18 vehicles + locations
- [x] **B3** — `GET /v1/catalog/vehicles` (+ slug, category)
- [x] **B4** — `GET /v1/catalog/locations`
- [x] **B5** — Scaffold CMS (Article, Faq, Legal)
- [x] **B6** — Public CMS HTTP routes
- [x] **B7** — Admin CRUD vehicles + articles
- [x] **B8** — Sync sitemap/prerender (18 slugs)

---

## Tasks

### B1 — Scaffold catalog service

- [x] Finished
- **Service:** catalog
- **Acceptance:** NATS `catalog.vehicles.list` returns published models

**Prompt:**

```text
VIPCAR Phase B task B1: create apps/catalog NestJS microservice (same patterns as apps/identity). Prisma schema catalog with VehicleModel, Hub, Location per docs/domain/entities.md. NATS pattern catalog.vehicles.list. Add to docker-compose and workspaces. Add NATS patterns to libs/contracts. Mark B1 [x] in docs/backend/phase-b-catalog-cms.md when done.
```

---

### B2 — Seed fleet and locations

- [x] Finished
- **Service:** catalog
- **Acceptance:** all 18 vehicle slugs + pickup/commercial locations from features.md F-07/F-09

**Prompt:**

```text
VIPCAR Phase B task B2: seed catalog from apps/web hardcoded fleet (18 vehicles) and locations/commercialLocations/chauffeurHubs. Include Tunis/Gabès/Djerba hubs, Gabès without transfer landing, chauffeur hubs tunis/gabes/djerba. Seed script runnable via npm. Mark B2 [x] in docs/backend/phase-b-catalog-cms.md when done.
```

---

### B3 — Public vehicles HTTP API

- [x] Finished
- **Service:** gateway
- **Acceptance:** `GET /v1/catalog/vehicles` and `/:slug`; category filter; unpublished hidden

**Prompt:**

```text
VIPCAR Phase B task B3: gateway routes GET /v1/catalog/vehicles?category=&page=&limit= and GET /v1/catalog/vehicles/:slug via NATS to catalog. Response envelope { data, meta }. Hide isPublished=false. Follow docs/api/conventions.md. Mark B3 [x] in docs/backend/phase-b-catalog-cms.md when done.
```

---

### B4 — Public locations HTTP API

- [x] Finished
- **Service:** gateway
- **Acceptance:** Gabès has no transfer flag; chauffeur hubs correct

**Prompt:**

```text
VIPCAR Phase B task B4: GET /v1/catalog/locations returning pickup and commercial locations with supportsRental, supportsTransfer, supportsChauffeur. Gabès: no transfer. Chauffeur: tunis, gabes, djerba only. Accept-Language en|fr for names. Mark B4 [x] in docs/backend/phase-b-catalog-cms.md when done.
```

---

### B5 — Scaffold CMS service

- [x] Finished
- **Service:** cms
- **Acceptance:** seed 6 articles, 4 FAQs, 3 legal pages EN/FR

**Prompt:**

```text
VIPCAR Phase B task B5: create apps/cms with Article, FaqItem, LegalPage (bilingual). Seed from apps/web articles/faqs/legalPages (6 articles, 4 FAQs, terms/privacy/cancellation). NATS cms.articles.list etc. Add contracts patterns. Mark B5 [x] in docs/backend/phase-b-catalog-cms.md when done.
```

---

### B6 — Public CMS HTTP routes

- [x] Finished
- **Service:** gateway
- **Acceptance:** slugs match current SPA routes

**Prompt:**

```text
VIPCAR Phase B task B6: gateway GET /v1/cms/articles, /v1/cms/articles/:slug, /v1/cms/faq, /v1/cms/legal/:slug with locale query or Accept-Language. Match SPA slugs exactly. Mark B6 [x] in docs/backend/phase-b-catalog-cms.md when done.
```

---

### B7 — Admin CRUD

- [x] Finished
- **Service:** gateway + catalog + cms
- **Acceptance:** ops/admin can draft unpublished vehicles/articles

**Prompt:**

```text
VIPCAR Phase B task B7: staff JWT roles ops_agent|admin can create/update vehicles and articles (including isPublished=false drafts). Guard on gateway. No public leak of drafts. Mark B7 [x] in docs/backend/phase-b-catalog-cms.md when done.
```

---

### B8 — Sync sitemap and prerender

- [x] Finished
- **Service:** web
- **Acceptance:** all 18 vehicle slugs in sitemap.xml and prerender.mjs

**Prompt:**

```text
VIPCAR Phase B task B8: update apps/web/public/sitemap.xml and apps/web/scripts/prerender.mjs vehicle lists to include all 18 slugs from the SPA fleet (currently some are missing). Keep EN/FR. Mark B8 [x] in docs/backend/phase-b-catalog-cms.md when done.
```
