# Phase E — Bookings

**Goal:** Confirmed quote becomes a booking with a status machine.

**Depends on:** [Phase C](./phase-c-quotes.md), [Phase D](./phase-d-fleet.md)  
**Services:** `apps/booking`, `apps/fleet`, `apps/gateway`  
**Progress:** 5 / 5

← [Backlog index](./TASKS.md) · Next → [Phase F](./phase-f-billing.md) · [Phase G](./phase-g-dispatch.md)

---

## Checklist

- [x] **E1** — Booking entity + status transitions
- [x] **E2** — Rental / transfer / chauffeur payloads
- [x] **E3** — Confirm → fleet calendar block
- [x] **E4** — Customer cancel + policy snapshot
- [x] **E5** — Cancellation policy hooks + staff override

---

## Tasks

### E1 — Booking status machine

- [x] Finished
- **Service:** booking
- **Acceptance:** illegal transitions return 409

**Prompt:**

```text
VIPCAR Phase E task E1: add Booking entity linked to Quote. Status machine from docs/domain/entities.md: quote_requested → quoted → awaiting_payment → confirmed → in_progress → completed, plus cancelled/no_show. Illegal transitions → 409 with error.code. NATS booking.confirm / status update. Mark E1 [x] in docs/backend/phase-e-bookings.md when done.
```

---

### E2 — Service-type payloads

- [x] Finished
- **Service:** booking
- **Acceptance:** type-specific validation (duration, flightNumber, endDate)

**Prompt:**

```text
VIPCAR Phase E task E2: validate booking/quote by service type — rental requires endDate; chauffeur requires duration hourly|half-day|full-day; transfer supports flightNumber. Reject invalid combos with VALIDATION_ERROR. Mark E2 [x] in docs/backend/phase-e-bookings.md when done.
```

---

### E3 — Confirm blocks fleet calendar

- [x] Finished
- **Service:** booking + fleet
- **Acceptance:** confirmed booking makes unit unavailable for those dates

**Prompt:**

```text
VIPCAR Phase E task E3: on booking.confirmed emit event; fleet creates CalendarBlock for unitId/dates. Failure must not leave inconsistent state (saga/outbox). Mark E3 [x] in docs/backend/phase-e-bookings.md when done.
```

**Notes:** Confirm saga calls `fleet.calendar.block` before committing `confirmed` + outbox; TX failure compensates via `fleet.calendar.release`. Fleet also consumes `booking.confirmed` idempotently (unique `bookingId` on CalendarBlock). Confirmed bookings require `unitId`.

---

### E4 — Customer cancel

- [x] Finished
- **Service:** booking + gateway
- **Acceptance:** `POST /v1/bookings/:id/cancel` by owner or staff

**Prompt:**

```text
VIPCAR Phase E task E4: POST /v1/bookings/:id/cancel for customer (own booking) or staff. Snapshot cancellation policy JSON on booking. Emit booking.cancelled so fleet releases block. Mark E4 [x] in docs/backend/phase-e-bookings.md when done.
```

**Notes:** `POST /v1/bookings/:id/cancel` (JWT) → NATS `booking.cancel`. Owner or `ops_agent`/`admin`. Snapshots CMS `cancellation-policy` (bilingual JSON; stub if CMS down). Emits `booking.cancelled`; fleet releases CalendarBlock (sync + event).

---

### E5 — Policy hooks + staff override

- [x] Finished
- **Service:** booking
- **Acceptance:** staff can override with reason; timing rules stubbed

**Prompt:**

```text
VIPCAR Phase E task E5: apply basic cancellation timing rules (stub from legal CMS later). Staff override requires reason field logged. Customer cancels outside window get 409 with clear code. Mark E5 [x] in docs/backend/phase-e-bookings.md when done.
```

**Notes:** Stub free-cancel = 24h before `startAt` for `confirmed` bookings (pre-confirm always allowed). Customer outside window → 409 `CANCELLATION_OUTSIDE_WINDOW`. Staff override requires `reason` (logged + stored on policy snapshot). Timing rules stay stubbed until CMS legal exposes structured fields.
