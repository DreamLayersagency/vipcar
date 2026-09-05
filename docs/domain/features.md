# VIPCAR Feature Catalog

Source of truth for product features extracted from the current Vite SPA (`apps/web`). Every public conversion path today ends in WhatsApp (`wa.me/21655771077`). The backend must persist these flows; WhatsApp stays a **channel**, not the database.

**Locales:** `en`, `fr`  
**Currency:** TND  
**Production origin:** `https://vipcar.com.tn`  
**Contact:** `+216 55 771 077` · `info@vipcar.com.tn` · Rue de la Feuille d'Érable, Lac 2, Tunis

---

## Route map

All public routes are prefixed with `/{lang}` where `lang` is `en` or `fr`. `/` redirects to `/en`.

| Route | Current page | Backend owner (target) |
|---|---|---|
| `/{lang}` | Home, compact quote, featured fleet, FAQ | catalog, cms, booking |
| `/{lang}/fleet` | Fleet catalog + category filters | catalog |
| `/{lang}/fleet/{slug}` | Vehicle detail + quote CTA | catalog, booking |
| `/{lang}/services/rental` | Self-drive rental | catalog, booking |
| `/{lang}/services/transfer` | Airport transfers | catalog, booking, dispatch |
| `/{lang}/services/chauffeur` | Private chauffeur | catalog, booking, dispatch |
| `/{lang}/booking` | 3-step quote wizard | booking |
| `/{lang}/booking?vehicle={slug}` | Quote with pre-selected vehicle | booking, catalog |
| `/{lang}/corporate` | B2B marketing | identity (corporate), billing |
| `/{lang}/contact` | Contact + message form | notify, booking |
| `/{lang}/faq` | FAQ | cms |
| `/{lang}/about` | About VIPCAR | cms |
| `/{lang}/destinations` | Location hub | catalog |
| `/{lang}/blog` | Travel journal index | cms |
| `/{lang}/blog/{slug}` | Article | cms |
| `/{lang}/car-rental/{slug}` | Local rental SEO | catalog, booking |
| `/{lang}/airport-transfers/{slug}` | Local transfer SEO | catalog, booking, dispatch |
| `/{lang}/chauffeur/{slug}` | Local chauffeur SEO | catalog, booking, dispatch |
| `/{lang}/legal/{slug}` | Terms, privacy, cancellation | cms |

---

## Public conversion

### F-01 Car rental (self-drive)

Visitor chooses a vehicle category or model, dates, pickup/return, and requests a fixed TND quote. Airport and hotel delivery can be arranged. Indicative daily prices are shown; final price is confirmed before commit. Short- and long-term rentals.

**Actors:** visitor, customer, ops_agent  
**Current:** static fleet + WhatsApp  
**Target APIs:** `POST /v1/quotes`, `GET /v1/catalog/vehicles`

### F-02 Airport transfers

Private transfer between Tunis-Carthage, Djerba-Zarzis, or Enfidha-Hammamet and a hotel/destination. Driver tracks the flight and meets the guest. Fixed quote before travel.

**Actors:** visitor, customer, driver, ops_agent  
**Current:** marketing page + quote widget  
**Target APIs:** quotes with `service=transfer`, dispatch jobs with `flightNumber`

### F-03 Private chauffeur

Hourly, half-day, or full-day professional driver. English- and French-speaking. Hubs: Tunis, Gabès, Djerba. Use cases: business, events, touring.

**Actors:** visitor, customer, driver, ops_agent  
**Current:** duration field in quote widget  
**Target APIs:** quotes with `service=chauffeur` and `duration`, dispatch assignments

### F-04 Compact quote widget

Fast quote on home, service, vehicle, location, and FAQ pages: service, pickup, date, optional name/passengers/notes/duration.

**Current:** builds a WhatsApp message  
**Target:** `POST /v1/quotes` then optional WhatsApp notification via `notify`

### F-05 Multi-step quote wizard

Three steps: (1) service, (2) pickup/return/dates/notes, (3) name, phone, email, review. Optional `?vehicle={slug}`.

**Current:** local React state → WhatsApp  
**Target:** same payload persisted as a `Quote`

### F-06 Contact form

Name, contact, message → WhatsApp. Also phone, email, and office cards.

**Target:** `POST /v1/contact` → `notify` + optional lead in booking/ops inbox

---

## Catalog and SEO content

### F-07 Fleet catalog

18 vehicle models with slug, name, category, tier, daily TND price, seats, bags, transmission, image, optional hub. Filters: All, Luxury, SUV, Sedan, Van & Group, Compact, Economy, Pick-up.

**Seed slugs:** `mercedes-v-class`, `mercedes-e-class`, `mercedes-a-class`, `toyota-prado`, `toyota-rav4`, `mercedes-e-350-e`, `volkswagen-t-cross`, `volkswagen-passat`, `toyota-corolla`, `volkswagen-golf-8`, `hyundai-i20`, `kia-picanto`, `suzuki-ciaz`, `toyota-hilux`, `peugeot-traveller`, `seat-ibiza`, `byd-song-plus`, `toyota-prado-2023`

Sitemap and prerender currently list 13 of 18 — catalog APIs must expose all 18.

### F-08 Vehicle detail

Specs, indicative price, related vehicles, booking CTA with `vehicle` query.

### F-09 Locations and hubs

**Pickup dropdown:** Tunis-Carthage Airport, Tunis, Enfidha-Hammamet Airport, Sousse, Hammamet, Gabès, Djerba-Zarzis Airport, Nabeul, Bizerte.

**Commercial cities:** `tunis`, `djerba`, `sousse`, `hammamet`, `gabes`.

**Chauffeur hubs:** `tunis`, `gabes`, `djerba`.

**Airport-transfer city pages:** `tunis`, `djerba`, `hammamet` (Gabès has no airport-transfer landing page).

**Ops hubs claimed:** Tunis, Gabès, Djerba (24/7).

### F-10 Local landing pages

SEO pages for rental / airport transfer / chauffeur by city. Same quote widget as global services.

### F-11 CMS content

- Blog (6 articles): `car-rental-tunisia-guide`, `tunis-carthage-airport-guide`, `choosing-a-car-in-tunisia`, `rental-documents-and-deposit`, `long-term-car-rental-tunisia`, `driving-in-tunisia-guide`
- FAQ (4 Q&A per language): documents, airport pickup, deposit, hotel delivery
- Legal: `terms-conditions`, `privacy-policy`, `cancellation-policy`
- About, destinations intro, corporate copy

All copy is bilingual EN/FR.

### F-12 i18n and SEO

Language switcher keeps the current path. Dynamic title/description, canonical, hreflang, Open Graph, schema.org (`AutoRental`, `LocalBusiness`, `Service`, `Vehicle`/`Product`, `FAQPage`, `BreadcrumbList`). Playwright prerender for static hosting.

---

## Operational (implied, not built in the SPA)

### F-13 Availability and inventory

Physical cars (units) per hub, date overlap, maintenance. “100+ vehicles” is marketing copy; catalog currently shows 18 **models**.

### F-14 Deposits and documents

Refundable deposit depends on vehicle. Renter needs licence (held 1+ year), passport/ID, bank card; IDP if licence is not Latin script. Additional driver, insurance, mileage, fuel policy mentioned in content only.

### F-15 Corporate accounts

Companies, hotels, travel agencies, events. One contact, invoicing, passenger schedules. Email is positioned for corporate/invoicing.

### F-16 Flight coordination

Share flight number; team coordinates pickup around actual arrival. No live flight API today.

### F-17 Analytics events (keep)

`phone_click`, `whatsapp_click`, `email_click`, `service_selected`, `quote_submit` (optional `VITE_GA_MEASUREMENT_ID`).

---

## Not in the current frontend (full platform)

These are in scope for the NestJS backend (see [TASKS.md](../backend/TASKS.md)):

| Feature | Actors | Service |
|---|---|---|
| F-18 Customer accounts (register, login, my bookings) | customer | identity, booking |
| F-19 Staff admin (quotes inbox, confirm, cancel) | ops_agent, admin | gateway, booking, fleet |
| F-20 Driver / chauffeur ops | driver, ops_agent | dispatch |
| F-21 Online payments and deposit hold/release | customer, billing | billing |
| F-22 Invoices (especially corporate) | corporate_manager, admin | billing |
| F-23 Notifications (WhatsApp Cloud + email) | all | notify |
| F-24 Cancellation / amendment per policy | customer, ops_agent | booking, billing |
| F-25 Visual admin backoffice (`/admin` in `apps/web`) | ops_agent, admin | same port as site; gateway `/v1/ops/*` (Phase J) |

---

## User journeys (target)

### A. Browse → quote

Home or service page → widget → `POST /v1/quotes` → ops notified on WhatsApp/email → staff confirms price → customer pays deposit → booking confirmed.

### B. Fleet → vehicle → wizard

`/fleet` → filter → `/fleet/{slug}` → `/booking?vehicle={slug}` → persisted quote with `vehicleModelId`.

### C. Local SEO landing

`/car-rental/tunis` (or transfer/chauffeur) → widget → same quote pipeline with location prefilled.

### D. Corporate

`/corporate` → booking or contact with `channel` / account type corporate → invoicing profile later.

### E. Content → conversion

Blog/FAQ → CTA → quote wizard.
