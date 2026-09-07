# Reservation system → backoffice plan

## Objective

Create one operational reservation workspace for the staff team. A request
submitted from the public website must be visible in the backoffice, enriched
with a price and an available fleet unit, then tracked through confirmation,
dispatch and completion without copying data manually or bypassing the
booking service.

## What is already connected

The first link is already live:

1. The frontend rental, transfer and chauffeur forms call `POST /v1/quotes`.
2. The gateway resolves a selected vehicle slug and sends a
   `booking.quote.create` command.
3. The booking service stores the request as a `Quote` with `channel=web` and
   emits the quote event.
4. Staff can open `/admin/quotes`, call `GET /v1/ops/quotes`, set a confirmed
   TND price, and confirm the quote.
5. Confirmation creates or updates the `Booking` and reserves the selected
   fleet unit through the existing booking/fleet flow.

The current implementation is therefore quote-first. It is not yet a full
reservation workspace.

## Current gaps

- The backoffice has no paginated staff list of `Booking` records.
- Quote detail is resolved by scanning the quotes list instead of a direct
  resource endpoint.
- Staff cannot search by customer, phone, booking ID, vehicle, date range or
  channel.
- The UI does not present the quote → booking → unit → driver relationship as
  one timeline.
- Booking status updates exist in the booking service, but the gateway has no
  complete staff reservation lifecycle surface.
- There is no consistent audit trail for who changed price, assigned a unit,
  confirmed a booking or overrode a cancellation window.

## Target information architecture

```text
Dashboard
  ├─ Reservation inbox      all frontend requests and bookings
  ├─ Reservation detail     customer + trip + quote + booking timeline
  ├─ Fleet availability      units available for the selected dates
  ├─ Dispatch                driver assignment and trip status
  ├─ Vehicles                catalog and publication
  ├─ Articles                CMS content
  └─ Corporate accounts
```

The existing `/admin/quotes` route remains backward-compatible during the
transition. It becomes the first view of the future reservation inbox, then
can be renamed in the navigation once the booking list is available.

## Delivery phases

### R1 — Stabilise the visual foundation

- Use the public VIPCAR ink, paper, green and terracotta tokens in the staff
  shell.
- Establish a calmer editorial heading scale, rounded operational cards,
  consistent controls and clearer primary actions.
- Keep the drawer navigation usable on mobile and preserve EN/FR.
- Add loading, empty, error and confirmation patterns consistently.

### R2 — Complete the staff reservation API

Add gateway routes that call the booking service; the web app must continue to
call the gateway only:

```text
GET   /v1/ops/reservations
GET   /v1/ops/reservations/:id
PATCH /v1/ops/reservations/:id/price
POST  /v1/ops/reservations/:id/confirm
PATCH /v1/ops/reservations/:id/status
POST  /v1/ops/reservations/:id/assign
```

The list query should support `status`, `service`, `channel`, `from`, `to`,
`search`, `page` and `limit`. The detail response should return a stable
view model containing:

```text
quote → customer → trip → vehicle model → booking → fleet unit → driver
```

The booking service remains the owner of state transitions and validation.
The UI must not reproduce the transition rules.

### R3 — Link the frontend request lifecycle

- Keep `POST /v1/quotes` as the public entry point.
- Preserve `quoteId` as the correlation key when a booking is created.
- Return a safe reference to the customer after login, while keeping guest
  requests searchable by name, phone and email.
- Add a user-visible request reference and clear status messaging after a
  successful submission.
- Keep WhatsApp as an optional notification channel, never as storage.

### R4 — Build the reservation workspace

- Replace the quote-only mental model with inbox tabs for `New`, `Quoted`,
  `Awaiting payment`, `Confirmed`, `In progress`, `Completed` and
  `Cancelled`.
- Add search and date filters, compact reservation rows, and a responsive
  detail view.
- Make the next valid action obvious: price, select unit, confirm, assign
  driver or update trip status.
- Show the full event timeline and the actor for staff changes.

### R5 — Fleet and dispatch handoff

- From reservation detail, query availability for the exact vehicle/hub/time
  window.
- Assign a unit only after availability is confirmed.
- Assign a driver and update `en_route`, `arrived` and `completed` through the
  existing dispatch service.
- Release the fleet calendar block on cancellation using the existing durable
  event path.

### R6 — Hardening and launch

- Enforce `ops_agent` versus `admin` permissions at the gateway and service
  boundary.
- Add idempotency keys for confirm, assign and status actions.
- Record actor, timestamp, previous value and new value for money/status
  actions.
- Test guest and authenticated frontend submissions, retries, duplicate
  events, cancellation edge cases and mobile layouts.
- Add API contract tests and an end-to-end path from public form to staff
  confirmation.

## Decisions needed before R2

1. Should every frontend quote become a visible reservation immediately, or
   only after an agent sets a price?
2. Is payment required before staff confirmation, or may staff confirm manual
   payments and cash bookings?
3. Which roles may change price, assign fleet, cancel or override a policy?
4. Should guests receive a public reference link, or only email/WhatsApp
   confirmation?
5. Which fields must be searchable first: phone, email, name, vehicle, date or
   airport flight number?

## Acceptance criteria

- A frontend request appears in the staff inbox within one request cycle.
- Staff can locate it by reference, customer phone or date.
- Price, unit assignment, confirmation and status changes use gateway APIs and
  are reflected in the detail view without a page reload.
- The customer portal and staff view show the same booking status.
- No direct browser call reaches a microservice or database.
- The workflow remains usable at mobile widths and in both EN and FR.
