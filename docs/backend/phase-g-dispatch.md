# Phase G — Dispatch

**Goal:** Drivers, transfers, chauffeur jobs.

**Depends on:** [Phase E](./phase-e-bookings.md)  
**Services:** `apps/dispatch`, `apps/booking`, `apps/notify`, `apps/gateway`, `apps/identity`  
**Progress:** 5 / 5

← [Backlog index](./TASKS.md) · Next → [Phase I](./phase-i-admin-frontend.md)

---

## Checklist

- [x] **G1** — Driver + Assignment schema
- [x] **G2** — Transfer job + flightNumber
- [x] **G3** — Chauffeur duration pricing snapshot
- [x] **G4** — `POST /v1/ops/dispatch/assign`
- [x] **G5** — Trip status updates + notify

---

## Tasks

### G1 — Driver + Assignment

- [x] Finished
- **Service:** dispatch
- **Acceptance:** linked to identity user with role driver

**Prompt:**

```text
VIPCAR Phase G task G1: create apps/dispatch with Driver (userId?, name, languages[], hubId, status, phone) and Assignment (bookingId, driverId?, type transfer|chauffeur, status, scheduledAt). Reference identity driver role by userId only. Mark G1 [x] in docs/backend/phase-g-dispatch.md when done.
```

**Notes:** `apps/dispatch` Nest + Prisma schema `dispatch`. Driver.userId is optional unique identity User.id (role `driver`) — no SQL FK. Assignment.type is transfer|chauffeur only; optional flightNumber/duration columns reserved for G2/G3.
---

### G2 — Transfer flight number

- [x] Finished
- **Service:** dispatch
- **Acceptance:** flightNumber stored on assignment

**Prompt:**

```text
VIPCAR Phase G task G2: transfer assignments store flightNumber from booking/quote. Validate when type=transfer. Mark G2 [x] in docs/backend/phase-g-dispatch.md when done.
```

**Notes:** Booking snapshots `flightNumber` from Quote on create. On `booking.confirmed`, dispatch creates a pending Assignment (unique `bookingId`) and copies flightNumber when `type=transfer`. `assertAssignmentTypePayload` allows optional flightNumber for transfer and rejects it for chauffeur.
---

### G3 — Chauffeur duration pricing

- [x] Finished
- **Service:** booking + dispatch
- **Acceptance:** hourly / half-day / full-day snapshot on booking

**Prompt:**

```text
VIPCAR Phase G task G3: for chauffeur bookings persist duration and price snapshot used for billing. Ops can set confirmed price before payment. Mark G3 [x] in docs/backend/phase-g-dispatch.md when done.
```

**Notes:** Booking.duration snapshotted from chauffeur Quote on create. Ops `PATCH /v1/ops/quotes/:id` → NATS `booking.quote.price` sets `confirmedPriceTnd`, moves quote to `quoted`, syncs `Booking.priceTnd` pre-payment, emits `booking.quote.priced`. Assignment.duration column + `assertAssignmentTypePayload` (chauffeur requires duration).

---

### G4 — Assign driver HTTP

- [x] Finished
- **Service:** gateway + dispatch
- **Acceptance:** emits dispatch.assigned

**Prompt:**

```text
VIPCAR Phase G task G4: POST /v1/ops/dispatch/assign { bookingId, driverId } for ops/admin. Updates Assignment, emits dispatch.assigned for notify. Mark G4 [x] in docs/backend/phase-g-dispatch.md when done.
```

**Notes:** `POST /v1/ops/dispatch/assign` (ops_agent|admin) → NATS `dispatch.assign`. Sets Assignment.driverId + status=`assigned` (pending|assigned only; rejects inactive drivers). Outbox + emit `dispatch.assigned` for notify (G5 consumes).

---

### G5 — Trip status + notify

- [x] Finished
- **Service:** dispatch + notify
- **Acceptance:** customer notified on key status changes

**Prompt:**

```text
VIPCAR Phase G task G5: driver/ops can set assignment status en_route|arrived|completed. Emit events; notify customer (WhatsApp/email). On completed, signal booking.started/completed as appropriate. Mark G5 [x] in docs/backend/phase-g-dispatch.md when done.
```

**Notes:** `POST /v1/ops/dispatch/trip/status` (driver|ops_agent|admin) → NATS `dispatch.trip.status`. Transitions `assigned → en_route → arrived|completed`. Emits `dispatch.trip.status.changed` (notify EN/FR WhatsApp/email when contact known) and on `completed` also `dispatch.trip.completed` → booking applies `confirmed→in_progress→completed` (or `in_progress→completed`). Notify also consumes `dispatch.assigned`.
