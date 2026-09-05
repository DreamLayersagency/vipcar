# Phase F — Billing

**Goal:** Deposits and payments via a provider port.

**Depends on:** [Phase E](./phase-e-bookings.md) (E1–E3 before real PSP)  
**Services:** `apps/billing`, `apps/booking`, `apps/gateway`  
**Progress:** 7 / 7

← [Backlog index](./TASKS.md) · Next → [Phase H](./phase-h-accounts.md)

---

## Checklist

- [x] **F1** — Payment + Invoice + provider interface
- [x] **F2** — Konnect/Flouci adapter (Stripe optional)
- [x] **F3** — `POST /v1/billing/checkout`
- [x] **F4** — Provider webhooks
- [x] **F5** — Capture → booking confirmed
- [x] **F6** — Deposit release on completed
- [x] **F7** — Corporate invoices

---

## Tasks

### F1 — Billing schema + port

- [x] Finished
- **Service:** billing
- **Acceptance:** `manual` provider works without PSP

**Prompt:**

```text
VIPCAR Phase F task F1: create apps/billing with Payment and Invoice models per docs/domain/entities.md. PaymentProvider interface with ManualProvider (staff marks paid). NATS billing.checkout.create / billing.payment.get. Secrets never in git. Mark F1 [x] in docs/backend/phase-f-billing.md when done.
```

---

### F2 — Tunisia PSP adapter

- [x] Finished
- **Service:** billing
- **Acceptance:** secrets only from env; one of Konnect or Flouci; Stripe optional stub

**Prompt:**

```text
VIPCAR Phase F task F2: implement PaymentProvider adapter for Konnect or Flouci (Tunisia). Optional Stripe stub. Config via env (.env.example placeholders only). No secrets committed. Mark F2 [x] in docs/backend/phase-f-billing.md when done.
```

---

### F3 — Checkout HTTP

- [x] Finished
- **Service:** gateway + billing + booking
- **Acceptance:** booking moves to awaiting_payment

**Prompt:**

```text
VIPCAR Phase F task F3: POST /v1/billing/checkout (auth customer) starts deposit payment for a booking; sets booking status awaiting_payment. Return checkout URL or manual instructions. Mark F3 [x] in docs/backend/phase-f-billing.md when done.
```

---

### F4 — Webhooks

- [x] Finished
- **Service:** gateway + billing
- **Acceptance:** signature verified; emit billing.payment.captured

**Prompt:**

```text
VIPCAR Phase F task F4: POST /v1/billing/webhooks/:provider verifies signature, updates Payment, emits billing.payment.captured. Idempotent on providerRef. Mark F4 [x] in docs/backend/phase-f-billing.md when done.
```

---

### F5 — Capture confirms booking

- [x] Finished
- **Service:** booking
- **Acceptance:** idempotent; awaiting_payment → confirmed

**Prompt:**

```text
VIPCAR Phase F task F5: booking consumes billing.payment.captured and transitions awaiting_payment → confirmed (idempotent). Then trigger fleet calendar block if not already. Mark F5 [x] in docs/backend/phase-f-billing.md when done.
```

**Notes:** Booking `@EventPattern(billing.payment.captured)` → `awaiting_payment` → `confirmed` via existing confirm saga (`fleet.calendar.block` then outbox `booking.confirmed`). Already `confirmed` → ensure calendar block (idempotent). Other statuses skipped; errors logged (never thrown to NATS).

---

### F6 — Deposit release

- [x] Finished
- **Service:** billing
- **Acceptance:** emit billing.deposit.released on booking.completed

**Prompt:**

```text
VIPCAR Phase F task F6: on booking.completed, billing releases deposit (PaymentStatus released) and emits billing.deposit.released; notify may message customer. Mark F6 [x] in docs/backend/phase-f-billing.md when done.
```

**Notes:** Billing `@EventPattern(booking.completed)` → captured `deposit` Payment(s) → `released` (outbox `billing.deposit.released`). Already released → no-op. Notify enqueues EN/FR customer WhatsApp/email when phone/email are present on the event (via `identity.me`).

---

### F7 — Corporate invoices

- [x] Finished
- **Service:** billing
- **Acceptance:** invoice lines/PDF key stored for corporate accounts

**Prompt:**

```text
VIPCAR Phase F task F7: create Invoice for corporate bookings (line items, tax, status, optional PDF key). NATS billing.invoice.create. Mark F7 [x] in docs/backend/phase-f-billing.md when done.
```
