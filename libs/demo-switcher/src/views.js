/**
 * Registry of public demo frontends ("views") that share the VIPCAR backend.
 *
 * Adding a view (App 3, App 4…):
 *   1. Create the frontend (e.g. `apps/web-v3`) with Vite `base` equal to `basePath`.
 *   2. Add one entry below. Both switchers and `scripts/build-demo-site.mjs`
 *      pick it up; no backend change is needed.
 *
 * Field reference:
 *   id          stable identifier passed to `mountDemoSwitcher({ currentViewId })`
 *   label       short name shown in the switcher menu
 *   description one line shown under the label
 *   basePath    where the view is served on the demo origin (must end with `/`)
 *   devOrigin   origin of the view's own dev server (`npm run dev` of that app)
 *   appDir      workspace folder, used by `scripts/build-demo-site.mjs`
 *               (it runs `vite build --mode demo` there, straight into the demo site folder)
 *   languages   locale prefixes the view understands; the first one is the fallback
 *   routes      locale-relative path patterns the view implements (`:param` = one segment)
 *   hiddenPrefixes locale-free path prefixes where the switcher must never appear
 *   enabled     set to false to remove a view from the switcher and the demo build
 */

/** Paths implemented with the same meaning by every current view. */
const PUBLIC_ROUTES = Object.freeze([
  '/',
  '/fleet',
  '/fleet/:slug',
  '/services/:type',
  '/booking',
  '/my-bookings',
  '/login',
  '/corporate',
  '/contact',
  '/faq',
  '/car-rental/:slug',
  '/airport-transfers/:slug',
  '/chauffeur/:slug',
  '/blog',
  '/blog/:slug',
  '/about',
  '/destinations',
  '/legal/:slug',
]);

/**
 * Query parameters that are safe to carry between views. They describe the
 * trip only; names, phone numbers and emails are never put in a URL.
 */
export const PRESERVED_QUERY_KEYS = Object.freeze([
  'vehicle',
  'category',
  'service',
  'pickup',
  'dropoff',
  'start',
  'end',
  'duration',
  'passengers',
]);

export const DEMO_VIEWS = Object.freeze([
  Object.freeze({
    id: 'view-1',
    label: 'View 1',
    description: 'Current VIPCAR website',
    basePath: '/',
    devOrigin: 'http://localhost:5173',
    appDir: 'apps/web',
    languages: Object.freeze(['en', 'fr', 'ar']),
    routes: PUBLIC_ROUTES,
    hiddenPrefixes: Object.freeze(['/admin']),
    enabled: true,
  }),
  Object.freeze({
    id: 'view-2',
    label: 'View 2',
    description: 'Bold premium design',
    basePath: '/v2/',
    devOrigin: 'http://localhost:5174',
    appDir: 'apps/web-v2',
    languages: Object.freeze(['en', 'fr', 'ar']),
    routes: PUBLIC_ROUTES,
    hiddenPrefixes: Object.freeze([]),
    enabled: true,
  }),
]);

/** @param {readonly object[]} [views] */
export function enabledViews(views = DEMO_VIEWS) {
  return views.filter((view) => view.enabled);
}

/**
 * @param {string} id
 * @param {readonly object[]} [views]
 */
export function findView(id, views = DEMO_VIEWS) {
  return views.find((view) => view.id === id) ?? null;
}
