# Phase D — Fleet availability

**Goal:** Real units and date overlap — not only 18 marketing models.

**Depends on:** [Phase B](./phase-b-catalog-cms.md), [Phase A](./phase-a-foundation.md)  
**Services:** `apps/fleet`, `apps/gateway`, Redis  
**Progress:** 4 / 4

← [Backlog index](./TASKS.md) · Next → [Phase E](./phase-e-bookings.md)

---

## Checklist

- [x] **D1** — VehicleUnit + CalendarBlock schema
- [x] **D2** — `fleet.availability.search`
- [x] **D3** — `GET /v1/ops/fleet/availability`
- [x] **D4** — Redis hold lock during checkout

---

## Exclusive-end date rule

All fleet availability and `CalendarBlock` ranges are **half-open** intervals `[startAt, endAt)`:

- `startAt` is inclusive; `endAt` is exclusive.
- Overlap: `a.startAt < b.endAt AND b.startAt < a.endAt`.
- A unit free until `2026-09-10T12:00:00Z` can be booked starting at that same instant.
- Callers (gateway ops API, booking confirm) must pass ISO datetimes that follow this rule.

---

## Tasks

### D1 — Fleet schema

- [x] Finished
- **Service:** fleet
- **Acceptance:** plate unique per hub

**Prompt:**

```text
VIPCAR Phase D task D1: create apps/fleet with Prisma VehicleUnit (modelId reference, plate, hubId, status, depositAmountTnd) and CalendarBlock (unitId, bookingId?, startAt, endAt, reason). Unique plate per hub. Schema ownership fleet only — no SQL join to catalog. Add compose/workspaces/contracts. Mark D1 [x] in docs/backend/phase-d-fleet.md when done.
```

---

### D2 — Availability search

- [x] Finished
- **Service:** fleet
- **Acceptance:** overlapping bookings and maintenance excluded

**Prompt:**

```text
VIPCAR Phase D task D2: implement NATS fleet.availability.search(modelId, hubId, startAt, endAt) returning available units. Exclude CalendarBlock overlaps and units in maintenance/inactive. Document exclusive-end date rule. Mark D2 [x] in docs/backend/phase-d-fleet.md when done.
```

---

### D3 — Staff availability HTTP

- [x] Finished
- **Service:** gateway
- **Acceptance:** ops/admin only

**Prompt:**

```text
VIPCAR Phase D task D3: GET /v1/ops/fleet/availability with query modelId/hubId/start/end. JWT ops_agent|admin. Proxies fleet.availability.search. Mark D3 [x] in docs/backend/phase-d-fleet.md when done.
```

---

### D4 — Redis checkout hold

- [x] Finished
- **Service:** fleet
- **Acceptance:** concurrent checkouts cannot double-book the same unit

**Prompt:**

```text
VIPCAR Phase D task D4: short-TTL Redis lock/hold on unit during checkout (e.g. 5–15 min). Concurrent holds fail with 409. Release on confirm, cancel, or TTL. Use REDIS_URL from env. Mark D4 [x] in docs/backend/phase-d-fleet.md when done.
```

**Notes:** NATS `fleet.hold.acquire` / `fleet.hold.release`. Redis key `fleet:hold:unit:{unitId}` with `SET NX EX` (default TTL 600s, `FLEET_HOLD_TTL_SECONDS` clamped 300–900). Availability search excludes overlapping active holds.
