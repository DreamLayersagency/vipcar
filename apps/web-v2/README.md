# VIPCAR View 2 (`apps/web-v2`)

An independent public frontend for client demos. It shows the existing VIPCAR features with a bold,
premium design and uses the **same gateway, data, rules and back office** as the current website
(`apps/web`, "View 1"). It has no backend, pricing, availability or booking logic of its own.

| | View 1 (`apps/web`) | View 2 (`apps/web-v2`) |
|---|---|---|
| Served at | `/` (`/en`, `/fr`, `/ar`) | `/v2/` (`/v2/en`, `/v2/fr`, `/v2/ar`) |
| Dev server | `npm run dev:web` → :5173 | `npm run dev:web-v2` → :5174 |
| Back office | `/admin` (unchanged) | none (uses View 1's `/admin`) |
| API client | `apps/web/src/*.js` | `libs/web-client` (same endpoints) |
| Content | inline in `main.jsx` | `src/content/app1-content.js`, generated from View 1 |
| SEO | indexed, prerendered | `noindex`, demo only |

## Run locally

```bash
npm run dev:web-v2        # View 2 at http://localhost:5174/v2/en (switcher always on)
npm run dev:demo          # View 1 at http://localhost:5173/en with the switcher
npm run dev:web           # View 1 exactly as before (no switcher)
```

The gateway must allow the dev origin: add `http://localhost:5174` to `WEB_ORIGIN` in the root `.env`.

## Demo site (both views on one origin)

```bash
npm run build:demo        # → dist/demo-site (View 1 at /, View 2 at /v2/), robots: Disallow all
npm run serve:demo        # → http://127.0.0.1:4300 (add this origin to WEB_ORIGIN)
```

Deploy `dist/demo-site/` as one static site (Netlify / Cloudflare Pages read the generated
`_redirects`). Production keeps deploying `apps/web/dist` from `npm run build:web`, which never
contains the switcher.

## Design switcher

`libs/demo-switcher` contains the registry of views, the route mapper and a small Shadow-DOM element.
- It appears only in Vite `--mode demo` builds. It is hidden on `/admin` and skipped during prerender.
- It keeps the page, locale and trip query (`vehicle`, `service`, `pickup`, `dropoff`, `start`,
  `end`, `duration`, `passengers`, `category`). It never puts names, phones or emails in a URL.
  Unknown pages fall back to the target view's home page.
- If a form has unsent input, it asks before leaving. View 2 also keeps its request draft in
  `sessionStorage`, so returning to View 2 restores it.

## Adding View 3

1. Create `apps/web-v3`, a Vite app with `base: '/v3/'` and its own dev port, using `libs/web-client`.
2. Add one entry to `DEMO_VIEWS` in `libs/demo-switcher/src/views.js`.
3. Call `mountDemoSwitcher({ currentViewId: 'view-3' })` in its entry file in demo mode.

The backend, View 1 and View 2 need no changes, and `npm run build:demo` picks the new view up.

## Content

View 1's copy is extracted into `src/content/app1-content.js` so both views read identically.
After changing View 1's texts, run `npm run extract-content` in this folder.
