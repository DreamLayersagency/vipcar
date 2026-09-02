# HTTP API conventions

All public HTTP traffic hits **apps/gateway**. Microservices are not exposed to the browser.

Base URL (local): `http://localhost:3000/v1`  
OpenAPI: `http://localhost:3000/v1/docs`

---

## Versioning and headers

| Header | Required | Notes |
|---|---|---|
| `Authorization` | authenticated routes | `Bearer <access-token>` |
| `Accept-Language` | optional | `en` (default) or `fr` |
| `Content-Type` | JSON bodies | `application/json` |
| `X-Request-Id` | optional | gateway generates one if missing |
| `Idempotency-Key` | mutating money/quote | UUID; replay returns the original result |

Success envelope for single resources:

```json
{ "data": { } }
```

Lists:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0 }
}
```

Error:

```json
{
  "error": {
    "code": "QUOTE_NOT_FOUND",
    "message": "Quote not found",
    "details": []
  }
}
```

HTTP mapping: `400` validation, `401` missing/invalid token, `403` role, `404` missing, `409` conflict (double booking), `429` rate limit, `502` downstream NATS timeout.

---

## Auth routes (identity via gateway)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/v1/auth/register` | public | customer register |
| POST | `/v1/auth/login` | public | email + password |
| POST | `/v1/auth/refresh` | public | rotate refresh token |
| POST | `/v1/auth/logout` | refresh body | revoke refresh token |
| GET | `/v1/auth/me` | Bearer | current user |
| GET | `/v1/health` | public | gateway + NATS ping |

Register / login body:

```json
{
  "email": "guest@example.com",
  "password": "min-8-chars",
  "name": "Full name",
  "phone": "+21655771077",
  "locale": "fr"
}
```

Token response:

```json
{
  "data": {
    "user": { "id": "", "email": "", "name": "", "role": "customer", "locale": "en" },
    "accessToken": "",
    "refreshToken": ""
  }
}
```

Passwords: min 8 characters. Emails stored lowercase. Never return `passwordHash`.

---

## Target public routes (later phases)

| Method | Path | Auth |
|---|---|---|
| GET | `/v1/catalog/vehicles` | public |
| GET | `/v1/catalog/vehicles/:slug` | public |
| GET | `/v1/catalog/locations` | public |
| GET | `/v1/cms/articles` | public |
| GET | `/v1/cms/articles/:slug` | public |
| GET | `/v1/cms/faq` | public |
| POST | `/v1/quotes` | public (optional Bearer) |
| GET | `/v1/quotes/:id` | owner or staff |
| POST | `/v1/contact` | public |
| GET | `/v1/me/bookings` | customer |
| POST | `/v1/bookings/:id/cancel` | customer or staff |
| POST | `/v1/billing/checkout` | customer |
| POST | `/v1/billing/webhooks/:provider` | signature |

Staff (`ops_agent`, `admin`):

| Method | Path |
|---|---|
| GET | `/v1/ops/quotes` |
| PATCH | `/v1/ops/quotes/:id` |
| POST | `/v1/ops/bookings/:id/confirm` |
| GET | `/v1/ops/fleet/availability` |
| POST | `/v1/ops/dispatch/assign` |

---

## Quote payload (widget + wizard)

Maps from the current SPA forms. `POST /v1/quotes`:

```json
{
  "service": "rental",
  "vehicleSlug": "mercedes-v-class",
  "pickup": "Tunis-Carthage Airport",
  "dropoff": "Tunis",
  "startDate": "2026-09-10",
  "endDate": "2026-09-15",
  "passengers": 2,
  "duration": "full-day",
  "flightNumber": "TU218",
  "notes": "Hotel name",
  "name": "Guest Name",
  "phone": "+21655771077",
  "email": "guest@example.com",
  "locale": "en",
  "channel": "web"
}
```

`duration` is required for `chauffeur`. `endDate` is required for `rental`. Transfer may omit `endDate` and send `flightNumber`.

Until booking is live, the SPA still opens WhatsApp; the documented contract is the replacement for that message.

---

## Pagination and filtering

Query: `page` (1-based), `limit` (max 100, default 20), `sort`.  
Fleet: `?category=SUV`. CMS: `?locale=fr`.

---

## Gateway implementation notes

- Validate DTOs with `ValidationPipe({ whitelist: true, transform: true })`.
- Timeouts on NATS requests (e.g. 5s) → `502`.
- CORS: `web` origin + admin origin.
- Rate-limit auth routes more strictly than public GETs.
- Never proxy raw microservice errors; map to `error.code`.
