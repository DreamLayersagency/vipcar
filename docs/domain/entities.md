# VIPCAR Domain Entities

Bounded-context ownership: one NestJS app writes its own PostgreSQL schema. Other services read via NATS, never by joining foreign tables.

Prices shown on the website are **indicative** (`baseDailyPriceTnd`) until `booking` + `billing` confirm a quote.

Localizable fields use `*En` / `*Fr` or a `translations` JSON map. Public APIs accept `Accept-Language: en | fr`.

---

## Enums

```text
Locale            en | fr
ServiceType       rental | transfer | chauffeur
Channel           web | whatsapp | staff | contact
Role              customer | corporate_manager | driver | ops_agent | admin
VehicleCategory   Luxury | SUV | Sedan | Van & Group | Compact | Economy | Pick-up
VehicleTier       Luxury | Premium | Standard | Economy
Transmission      Automatic | Manual
LocationType      city | airport | hotel | other
ChauffeurDuration hourly | half-day | full-day
UnitStatus        available | reserved | rented | maintenance | inactive
DriverStatus      available | on_trip | off_duty | inactive
QuoteStatus       received | quoted | expired | converted | cancelled
BookingStatus     quote_requested | quoted | awaiting_payment | confirmed
                  | in_progress | completed | cancelled | no_show
PaymentKind       deposit | rental | transfer | chauffeur | invoice
PaymentStatus     pending | authorized | captured | failed | refunded | released
AssignmentStatus  pending | assigned | en_route | arrived | completed | cancelled
```

Booking status machine (rental, transfer, and chauffeur):

```text
quote_requested → quoted → awaiting_payment → confirmed → in_progress → completed
                 ↘ cancelled
quoted / awaiting_payment / confirmed → cancelled
confirmed / in_progress → no_show
```

---

## identity schema

### User

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| email | string | unique, lowercase |
| passwordHash | string | never exposed |
| name | string | |
| phone | string? | E.164 preferred (`+216…`) |
| locale | Locale | default `en` |
| role | Role | default `customer` |
| corporateAccountId | uuid? | membership; account lives in identity |
| isActive | boolean | |
| createdAt, updatedAt | datetime | |

### RefreshToken

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| userId | uuid | |
| tokenHash | string | store hash only |
| expiresAt | datetime | |
| revokedAt | datetime? | |

### CorporateAccount

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| name | string | company, hotel, agency |
| billingEmail | string | |
| notes | string? | invoicing requirements |
| isActive | boolean | |

---

## catalog schema

Catalog owns **sellable models** and geography, not physical number plates.

### VehicleModel

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| slug | string | unique, URL key |
| name | string | |
| category | VehicleCategory | |
| tier | VehicleTier | |
| seats | int | |
| bags | int | |
| transmission | Transmission | |
| imageKey | string | filename or object-storage key |
| baseDailyPriceTnd | decimal | indicative |
| defaultHubId | uuid? | optional default delivery hub |
| isPublished | boolean | hide from public API if false |

### Location

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| slug | string | unique (`tunis`, `djerba`, …) |
| nameEn, nameFr | string | |
| type | LocationType | |
| airportName | string? | e.g. Tunis-Carthage Airport |
| hubId | uuid? | |
| supportsRental | boolean | |
| supportsTransfer | boolean | Gabès city page: no transfer landing |
| supportsChauffeur | boolean | only Tunis, Gabès, Djerba hubs |
| isPublished | boolean | |

### Hub

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| slug | string | `tunis` \| `gabes` \| `djerba` |
| name | string | |
| timezone | string | `Africa/Tunis` |

---

## cms schema

### Article / FaqItem / LegalPage / PageCopy

Localized title, summary, body (or Q&A), slug, image, `publishedAt`. Legal slugs: `terms-conditions`, `privacy-policy`, `cancellation-policy`.

---

## booking schema

### Quote

Lead created from the widget, wizard, or staff.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| service | ServiceType | |
| status | QuoteStatus | |
| vehicleModelId | uuid? | from catalog; copied id, not a FK across DBs |
| pickupLocationId | uuid? | or free-text `pickupLabel` |
| dropoffLocationId | uuid? | |
| startAt | date/datetime | wizard uses dates; transfer may need time |
| endAt | date/datetime? | rental return; chauffeur may use duration instead |
| passengers | int? | |
| duration | ChauffeurDuration? | chauffeur only |
| flightNumber | string? | transfer |
| notes | string? | hotel, destination, extras |
| customerName | string | |
| customerPhone | string | |
| customerEmail | string? | |
| customerId | uuid? | set when logged in |
| language | Locale | |
| channel | Channel | |
| indicativePriceTnd | decimal? | snapshot from catalog |
| confirmedPriceTnd | decimal? | set by ops |
| createdAt | datetime | |

### Booking

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| quoteId | uuid | |
| customerId | uuid | |
| type | ServiceType | |
| status | BookingStatus | |
| vehicleModelId | uuid? | |
| unitId | uuid? | fleet unit assigned |
| driverId | uuid? | dispatch driver assigned |
| pickupLabel | string | |
| dropoffLabel | string? | |
| startAt, endAt | datetime | |
| priceTnd | decimal | confirmed |
| depositTnd | decimal | |
| cancellationPolicySnapshot | json? | |
| createdAt, updatedAt | datetime | |

Do not join `booking.unitId` to `fleet` in SQL. Resolve units through fleet NATS commands.

---

## fleet schema

### VehicleUnit

Physical asset.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| modelId | uuid | catalog VehicleModel id (reference) |
| plate | string | unique |
| hubId | uuid | |
| status | UnitStatus | |
| depositAmountTnd | decimal | per-unit or inherited from model |

### CalendarBlock

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| unitId | uuid | |
| bookingId | uuid? | reference only |
| startAt, endAt | datetime | exclusive end recommended |
| reason | string | booking \| maintenance \| hold |

Availability = no overlapping `CalendarBlock` for the requested range at the requested hub/model.

---

## dispatch schema

### Driver

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| userId | uuid? | identity user with role `driver` |
| name | string | |
| languages | Locale[] | |
| hubId | uuid | |
| status | DriverStatus | |
| phone | string | |

### Assignment (transfer or chauffeur job)

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| bookingId | uuid | |
| driverId | uuid? | |
| type | transfer \| chauffeur | |
| flightNumber | string? | |
| duration | ChauffeurDuration? | |
| status | AssignmentStatus | |
| scheduledAt | datetime | |

---

## billing schema

### Payment

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| bookingId | uuid | |
| kind | PaymentKind | |
| amountTnd | decimal | |
| provider | string | `konnect` \| `flouci` \| `stripe` \| `manual` |
| providerRef | string? | |
| status | PaymentStatus | |

### Invoice

Corporate and post-paid rentals: number, customer/account, lines, tax, PDF key, status.

Deposit **release** after vehicle return in good condition is a billing state transition (`released`), triggered by fleet/ops events — not a silent WhatsApp message.

---

## notify (stateless + outbox)

No domain tables required beyond an **outbox** / delivery log:

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| eventName | string | |
| channel | whatsapp \| email | |
| to | string | |
| template | string | |
| payload | json | |
| status | queued \| sent \| failed | |
| error | string? | |

Templates must exist in EN and FR.

---

## Seed mapping from the SPA

| SPA constant | Entity |
|---|---|
| `fleet[]` | VehicleModel |
| `locations[]` | Location (pickup points) |
| `commercialLocations[]` | Location (city landing pages) |
| `chauffeurHubs` | Hub flags / Location.supportsChauffeur |
| `articles` | Article |
| `faqs` | FaqItem |
| `legalPages` | LegalPage |
| Booking wizard state | Quote |
