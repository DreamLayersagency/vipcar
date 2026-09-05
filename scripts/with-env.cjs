const { spawn } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');

try {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
} catch {
  // Root .env is optional when variables are already exported.
}

const argv = process.argv.slice(2);
let app = 'identity';
let commandArgs = argv;

if (argv[0] === '--app' && argv[1]) {
  app = argv[1];
  commandArgs = argv.slice(2);
}

if (app === 'catalog') {
  const catalogUrl =
    process.env.CATALOG_DATABASE_URL ??
    (process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/schema=[^&]+/, 'schema=catalog')
      : 'postgresql://vipcar:vipcar@localhost:5432/vipcar?schema=catalog');
  process.env.DATABASE_URL = catalogUrl;
}

if (app === 'cms') {
  const cmsUrl =
    process.env.CMS_DATABASE_URL ??
    (process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/schema=[^&]+/, 'schema=cms')
      : 'postgresql://vipcar:vipcar@localhost:5432/vipcar?schema=cms');
  process.env.DATABASE_URL = cmsUrl;
}

if (app === 'booking') {
  const bookingUrl =
    process.env.BOOKING_DATABASE_URL ??
    (process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/schema=[^&]+/, 'schema=booking')
      : 'postgresql://vipcar:vipcar@localhost:5432/vipcar?schema=booking');
  process.env.DATABASE_URL = bookingUrl;
}

if (app === 'notify') {
  const notifyUrl =
    process.env.NOTIFY_DATABASE_URL ??
    (process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/schema=[^&]+/, 'schema=notify')
      : 'postgresql://vipcar:vipcar@localhost:5432/vipcar?schema=notify');
  process.env.DATABASE_URL = notifyUrl;
}

if (app === 'fleet') {
  const fleetUrl =
    process.env.FLEET_DATABASE_URL ??
    (process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/schema=[^&]+/, 'schema=fleet')
      : 'postgresql://vipcar:vipcar@localhost:5432/vipcar?schema=fleet');
  process.env.DATABASE_URL = fleetUrl;
}

if (app === 'billing') {
  const billingUrl =
    process.env.BILLING_DATABASE_URL ??
    (process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/schema=[^&]+/, 'schema=billing')
      : 'postgresql://vipcar:vipcar@localhost:5432/vipcar?schema=billing');
  process.env.DATABASE_URL = billingUrl;
}

if (app === 'dispatch') {
  const dispatchUrl =
    process.env.DISPATCH_DATABASE_URL ??
    (process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/schema=[^&]+/, 'schema=dispatch')
      : 'postgresql://vipcar:vipcar@localhost:5432/vipcar?schema=dispatch');
  process.env.DATABASE_URL = dispatchUrl;
}

const [command, ...args] = commandArgs;
if (!command) {
  console.error(
    'Usage: node scripts/with-env.cjs [--app identity|catalog|cms|booking|notify|fleet|billing|dispatch] <command> [...args]',
  );
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
  cwd: resolve(root, `apps/${app}`),
});

child.on('exit', (code) => process.exit(code ?? 0));
