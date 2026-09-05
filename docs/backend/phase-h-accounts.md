# Phase H — Accounts

**Goal:** Customer and corporate portals (APIs first).

**Depends on:** [Phase E](./phase-e-bookings.md), [Phase A](./phase-a-foundation.md)  
**Services:** `apps/identity`, `apps/booking`, `apps/billing`, `apps/gateway`  
**Progress:** 1 / 4

← [Backlog index](./TASKS.md) · Next → [Phase I](./phase-i-admin-frontend.md)

---

## Checklist

- [ ] **H1** — `GET /v1/me/bookings`
- [ ] **H2** — Attach customerId on logged-in quotes
- [ ] **H3** — CorporateAccount + membership
- [x] **H4** — Corporate invoicing profile

---

## Tasks

### H1 — My bookings

- [ ] Finished
- **Service:** gateway + booking
- **Acceptance:** customer sees only own bookings

**Prompt:**

```text
VIPCAR Phase H task H1: GET /v1/me/bookings (JWT customer) lists bookings for current user only. Pagination. 401 if anonymous. Mark H1 [x] in docs/backend/phase-h-accounts.md when done.
```

---

### H2 — Link quote to customer

- [ ] Finished
- **Service:** booking + gateway
- **Acceptance:** guest quotes still work without auth

**Prompt:**

```text
VIPCAR Phase H task H2: when POST /v1/quotes is called with Bearer, set quote.customerId from JWT. Anonymous quotes remain allowed without customerId. Mark H2 [x] in docs/backend/phase-h-accounts.md when done.
```

---

### H3 — Corporate accounts

- [ ] Finished
- **Service:** identity
- **Acceptance:** corporate_manager role + membership

**Prompt:**

```text
VIPCAR Phase H task H3: add CorporateAccount to identity schema; link users via corporateAccountId; support role corporate_manager. Admin can create account and invite/link managers. Mark H3 [x] in docs/backend/phase-h-accounts.md when done.
```

---

### H4 — Corporate invoicing profile

- [x] Finished
- **Service:** billing
- **Acceptance:** fields usable by F7 invoice generation

**Prompt:**

```text
VIPCAR Phase H task H4: store corporate billing profile (billingEmail, company name, tax id optional, notes) for invoices. Used by billing.invoice.create (F7). Mark H4 [x] in docs/backend/phase-h-accounts.md when done.
```

**Notes:** `CorporateBillingProfile` in billing (keyed by identity `corporateAccountId`): `companyName`, `billingEmail`, optional `taxId`/`notes`. NATS `billing.corporateProfile.upsert` / `get`. `billing.invoice.create` requires the profile and snapshots buyer fields onto the Invoice.
