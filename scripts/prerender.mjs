import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const langs = ['en', 'fr'];
const baseRoutes = ['', '/fleet', '/services/rental', '/services/transfer', '/services/chauffeur', '/corporate', '/about', '/contact', '/faq', '/blog', '/destinations', '/booking', '/legal/terms-conditions', '/legal/privacy-policy', '/legal/cancellation-policy'];
const vehicles = ['mercedes-v-class', 'mercedes-e-class', 'mercedes-a-class', 'toyota-prado', 'toyota-rav4', 'volkswagen-t-cross', 'volkswagen-passat', 'toyota-corolla', 'volkswagen-golf-8', 'hyundai-i20', 'suzuki-ciaz', 'toyota-hilux', 'peugeot-traveller'];
const locations = ['tunis', 'djerba', 'sousse', 'hammamet', 'gabes'];
const airportLocations = ['tunis', 'djerba', 'hammamet'];
const chauffeurLocations = ['tunis', 'gabes', 'djerba'];
const articles = ['car-rental-tunisia-guide', 'tunis-carthage-airport-guide', 'choosing-a-car-in-tunisia', 'rental-documents-and-deposit', 'long-term-car-rental-tunisia', 'driving-in-tunisia-guide'];
const routes = langs.flatMap(lang => [...baseRoutes.map(route => `/${lang}${route}`), ...vehicles.map(vehicle => `/${lang}/fleet/${vehicle}`), ...locations.map(place => `/${lang}/car-rental/${place}`), ...airportLocations.map(place => `/${lang}/airport-transfers/${place}`), ...chauffeurLocations.map(place => `/${lang}/chauffeur/${place}`), ...articles.map(article => `/${lang}/blog/${article}`)]);
const server = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], { stdio: 'ignore', shell: process.platform === 'win32' });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch('http://127.0.0.1:4173/en')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Preview server did not start');
}

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  for (const route of routes) {
    await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: 'networkidle' });
    const html = await page.content();
    const directory = `dist${route}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/index.html`, html);
  }
  await browser.close();
  console.log(`Prerendered ${routes.length} routes.`);
} finally {
  server.kill();
}
