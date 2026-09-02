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
| `catalog.admin.vehicle.upsert` | ops/admin |

### booking (later)

| Pattern | Purpose |
|---|---|
| `booking.quote.create` | widget / wizard / contact |
| `booking.quote.get` | by id (owner or staff) |
| `booking.quote.list` | staff inbox |
| `booking.quote.price` | ops sets confirmedPriceTnd |
| `booking.confirm` | after payment or manual |
| `booking.cancel` | customer or staff |

### fleet (later)

| Pattern | Purpose |
|---|---|
| `fleet.availability.search` | model + hub + date range |
| `fleet.unit.assign` | bind unit to booking |
| `fleet.calendar.block` | maintenance / hold |

### dispatch (later)

| Pattern | Purpose |
|---|---|
| `dispatch.driver.list` | by hub |
| `dispatch.assign` | booking → driver |
| `dispatch.trip.status` | en_route / arrived / completed |

### billing (later)

| Pattern | Purpose |
|---|---|
| `billing.checkout.create` | deposit or balance |
| `billing.payment.get` | by booking |
| `billing.invoice.create` | corporate |

### notify (later)

| Pattern | Purpose |
|---|---|
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
| `dispatch.trip.completed` | dispatch | booking |
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
