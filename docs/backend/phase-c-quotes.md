# Phase C — Quotes

**Goal:** Widget and wizard persist leads; WhatsApp is a side effect.

**Depends on:** [Phase A](./phase-a-foundation.md) (B recommended for vehicleSlug)  
**Services:** `apps/booking`, `apps/notify`, `apps/gateway`  
**Progress:** 6 / 6

← [Backlog index](./TASKS.md) · Next → [Phase D](./phase-d-fleet.md)

---

## Checklist

- [x] **C1** — Scaffold booking Quote model
- [x] **C2** — `POST /v1/quotes`
- [x] **C3** — Notify + outbox on quote.created
- [x] **C4** — `POST /v1/contact`
- [x] **C5** — Staff inbox `GET /v1/ops/quotes`
- [x] **C6** — Server-side quote_submit analytics

---

## Tasks

### C1 — Scaffold booking Quote

- [x] Finished
- **Service:** booking
- **Acceptance:** NATS `booking.quote.create` persists a Quote

**Prompt:**

```text
VIPCAR Phase C task C1: create apps/booking with Prisma Quote model (service, status, vehicleModelId, pickup/dropoff, dates, passengers, duration, flightNumber, notes, customer contact, locale, channel) per docs/domain/entities.md. NATS booking.quote.create. Emit booking.quote.created after commit (outbox ok). Add to compose/workspaces/contracts. Mark C1 [x] in docs/backend/phase-c-quotes.md when done.
```

---

### C2 — Public create quote HTTP

- [x] Finished
- **Service:** gateway
- **Acceptance:** anonymous `POST /v1/quotes` validates conventions.md payload

**Prompt:**

```text
VIPCAR Phase C task C2: gateway POST /v1/quotes (public) validates payload from docs/api/conventions.md (service rental|transfer|chauffeur, pickup, dates, contact, optional vehicleSlug, duration for chauffeur, flightNumber for transfer). Forward to booking.quote.create. Return { data: quote }. Mark C2 [x] in docs/backend/phase-c-quotes.md when done.
```

---

### C3 — Notify on quote created

- [x] Finished
- **Service:** notify
- **Acceptance:** WhatsApp/email to ops; quote still saved if WhatsApp fails

**Prompt:**

```text
VIPCAR Phase C task C3: create apps/notify with outbox/delivery log. Subscribe to booking.quote.created. Send ops WhatsApp and/or email (adapters; mock/manual ok first). Must not fail the quote create path — enqueue and retry. Mark C3 [x] in docs/backend/phase-c-quotes.md when done.
```

---

### C4 — Contact as lead

- [x] Finished
- **Service:** booking + gateway
- **Acceptance:** same ops inbox as quotes; channel=contact

**Prompt:**

```text
VIPCAR Phase C task C4: POST /v1/contact creates a lead/quote with channel=contact (name, contact, message). Appears in same ops quotes inbox. Emit event for notify. Mark C4 [x] in docs/backend/phase-c-quotes.md when done.
```

---

### C5 — Staff quotes inbox

- [x] Finished
- **Service:** gateway
- **Acceptance:** only ops_agent or admin

**Prompt:**

```text
VIPCAR Phase C task C5: GET /v1/ops/quotes with pagination and status filter. JWT required; roles ops_agent|admin only (403 otherwise). Mark C5 [x] in docs/backend/phase-c-quotes.md when done.
```

---

### C6 — Server-side analytics

- [x] Finished
- **Service:** booking
- **Acceptance:** event/payload includes service + locale (quote_submit equivalent)

**Prompt:**

```text
VIPCAR Phase C task C6: on quote create emit analytics-friendly event or structured log with service, locale, channel (server-side quote_submit). Keep compatible with existing GA event names where useful. Mark C6 [x] in docs/backend/phase-c-quotes.md when done.
```
