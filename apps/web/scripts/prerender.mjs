/**
 * Playwright SSG for public SEO routes.
 *
 * Choice (Phase I / I6): keep the **bundled static seed** for fleet HTML at build time.
 * Do NOT fetch catalog/CMS from the gateway during prerender — no auth, no API uptime
 * required for `npm run build`. Runtime browsers still prefer live `GET /v1/catalog/*`
 * (see `src/catalog.js` + I3 fallback). Blog/legal/FAQ content remains inlined in the SPA.
 *
 * Auth-gated routes (`/login`, `/my-bookings`) and staff `/admin/*` are intentionally
 * omitted from this list (noindex; not public SEO).
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { FLEET_SEED } from '../src/fleet-seed.js';

const PREVIEW_ORIGIN = 'http://127.0.0.1:4173';
const langs = ['en', 'fr', 'ar'];
const baseRoutes = [
  '',
  '/fleet',
  '/services/rental',
  '/services/transfer',
  '/services/chauffeur',
  '/corporate',
  '/about',
  '/contact',
  '/faq',
  '/blog',
  '/destinations',
  '/booking',
  '/legal/terms-conditions',
  '/legal/privacy-policy',
  '/legal/cancellation-policy',
];
const vehicles = FLEET_SEED.map((v) => v.slug);
const locations = ['tunis', 'djerba', 'sousse', 'hammamet', 'gabes'];
const airportLocations = ['tunis', 'djerba', 'hammamet'];
const chauffeurLocations = ['tunis', 'gabes', 'djerba'];
const articles = [
  'car-rental-tunisia-guide',
  'tunis-carthage-airport-guide',
  'choosing-a-car-in-tunisia',
  'rental-documents-and-deposit',
  'long-term-car-rental-tunisia',
  'driving-in-tunisia-guide',
];
const routes = langs.flatMap((lang) => [
  ...baseRoutes.map((route) => `/${lang}${route}`),
  ...vehicles.map((vehicle) => `/${lang}/fleet/${vehicle}`),
  ...locations.map((place) => `/${lang}/car-rental/${place}`),
  ...airportLocations.map((place) => `/${lang}/airport-transfers/${place}`),
  ...chauffeurLocations.map((place) => `/${lang}/chauffeur/${place}`),
  ...articles.map((article) => `/${lang}/blog/${article}`),
]);

const server = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'],
  { stdio: 'ignore', shell: process.platform === 'win32' },
);

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      if ((await fetch(`${PREVIEW_ORIGIN}/en`)).ok) return;
    } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Preview server did not start');
}

/** Abort gateway/API calls so SSG never waits on auth or a live catalog. */
function isGatewayApiRequest(url) {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes('/v1/')) return true;
    // Common local gateway port from VITE_API_URL
    if (parsed.port === '3000') return true;
  } catch { /* ignore */ }
  return false;
}

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.addInitScript(() => {
    window.__VIPCAR_PRERENDER__ = true;
  });

  await page.route('**/*', (route) => {
    if (isGatewayApiRequest(route.request().url())) {
      return route.abort();
    }
    return route.continue();
  });

  for (const route of routes) {
    await page.goto(`${PREVIEW_ORIGIN}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0, undefined, { timeout: 10_000 });
    const html = await page.content();
    const directory = `dist${route}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/index.html`, html);
  }
  await browser.close();
  console.log(`Prerendered ${routes.length} public SEO routes (static fleet seed; no API auth).`);
} finally {
  server.kill();
}
