# Domain events and NATS patterns

Events are facts that already happened (past tense). Commands are requests (imperative). Both travel on NATS. Use JetStream for events so consumers can replay.

Subject convention:

- Commands (request/response): `{service}.{action}` e.g. `identity.login`
- Events: `{domain}.{entity}.{verb}` e.g. `booking.quote.created`

Payloads live in `libs/contracts`. Include `eventId`, `occurredAt`, `correlationId`.

---

## Commands (request / response)

### identity

| Pattern | Payload | Response |
|---|---|---|
| `identity.register` | email, password, name, phone?, locale? | user + tokens |
| `identity.login` | email, password | user + tokens |
| `identity.refresh` | refreshToken | tokens |
| `identity.logout` | refreshToken | `{ ok: true }` |
| `identity.me` | userId | public user |
| `identity.validate` | accessToken | `{ sub, email, role }` |

### catalog (later)

| Pattern | Purpose |
|---|---|
| `catalog.vehicles.list` | published models, optional category |
| `catalog.vehicles.get` | by slug |
| `catalog.locations.list` | pickup + commercial locations |
| `catalog.admin.vehicle.upsert` | ops/admin create/update (drafts ok) |

### cms

| Pattern | Purpose |
|---|---|
| `cms.articles.list` | published articles |
| `cms.articles.get` | by slug |
| `cms.faq.list` | published FAQ |
| `cms.legal.get` | by slug |
| `cms.admin.articles.list` | ops/admin list (drafts ok) |
| `cms.admin.article.get` | ops/admin get by slug (drafts ok) |
| `cms.admin.article.upsert` | ops/admin create/update (drafts ok) |

### booking (later)

| Pattern | Purpose |
|---|---|
| `booking.quote.create` | widget / wizard / contact |
| `booking.quote.get` | by id (owner or staff) |
| `booking.quote.list` | staff inbox |
| `booking.quote.price` | ops sets confirmedPriceTnd |
| `booking.get` | by id (gateway enforces owner/staff) |
| `booking.confirm` | after payment or manual (`awaiting_payment` → `confirmed`) |
| `booking.status.update` | status machine transition (409 `ILLEGAL_TRANSITION` if invalid) |
| `booking.cancel` | customer or staff |

### fleet

| Pattern | Purpose |
|---|---|
| `fleet.availability.search` | model + hub + `[startAt, endAt)` → available units |
| `fleet.hold.acquire` | short-TTL Redis checkout lock on a unit (409 if held) |
| `fleet.hold.release` | free hold on confirm/cancel (TTL also expires it) |
| `fleet.unit.assign` | bind unit to booking |
| `fleet.calendar.block` | maintenance / hold |

`fleet.availability.search` uses exclusive-end intervals: overlap iff `block.startAt < endAt AND block.endAt > startAt`. Units in `maintenance` or `inactive` are never returned. Active Redis checkout holds that overlap the requested range are also excluded.

Checkout holds use Redis (`REDIS_URL`) with TTL 5–15 minutes (default 10 via `FLEET_HOLD_TTL_SECONDS`). Concurrent `fleet.hold.acquire` on the same unit returns 409. Release on booking confirm/cancel or when TTL elapses.

### dispatch

| Pattern | Purpose |
|---|---|
| `dispatch.health` | liveness |
| `dispatch.driver.list` | by hub (G4+) |
| `dispatch.assign` | booking → driver (G4) |
| `dispatch.trip.status` | en_route / arrived / completed (G5) |

### billing

| Pattern | Purpose |
|---|---|
| `billing.health` | liveness |
| `billing.checkout.create` | deposit or balance (`manual` provider returns instructions) |
| `billing.payment.get` | by booking |
| `billing.webhook.handle` | PSP webhook (signature / provider API verify) |
| `billing.invoice.create` | corporate (F7); requires CorporateBillingProfile (H4) |
| `billing.corporateProfile.upsert` | create/update corporate invoicing profile (H4) |
| `billing.corporateProfile.get` | load profile by corporateAccountId |

### notify

| Pattern | Purpose |
|---|---|
| `notify.health` | liveness |
| `notify.send` | explicit send (rare; prefer events) |

---

## Events (pub / sub)

| Event | Emitted by | Typical consumers |
|---|---|---|
| `identity.user.registered` | identity | notify (welcome), analytics |
| `booking.quote.created` | booking | notify (WhatsApp + email to ops), analytics `quote_submit` |
| `booking.quote.priced` | booking | notify (customer) |
| `booking.confirmed` | booking | fleet (calendar), dispatch, notify, billing |
| `booking.cancelled` | booking | fleet (release block), billing (refund/release), notify, dispatch |
| `booking.started` | booking | dispatch |
| `booking.completed` | booking | fleet (unit available), billing (deposit release) |
| `fleet.unit.assigned` | fleet | booking, notify |
| `dispatch.assigned` | dispatch | notify (customer + driver) |
| `dispatch.trip.status.changed` | dispatch | notify (customer WhatsApp/email) |
| `dispatch.trip.completed` | dispatch | booking (started/completed as needed) |
| `billing.payment.captured` | billing | booking (`awaiting_payment` → `confirmed`) |
| `billing.payment.failed` | billing | notify, booking |
| `billing.deposit.released` | billing | notify |
| `cms.content.published` | cms | web cache / ISR later |

---

## Rules

1. The producer of the write model emits the event **after** the transaction commits (outbox if needed).
2. Consumers are idempotent (`eventId`).
3. `notify` never blocks the producer: enqueue, retry, dead-letter.
4. Do not put secrets or raw card data in payloads.
5. Keep payloads small; include IDs plus the fields a consumer cannot fetch (locale, phone, price snapshot).
