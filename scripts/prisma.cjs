const { spawn } = require('node:child_process');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const apps = new Set([
  'identity',
  'catalog',
  'cms',
  'booking',
  'notify',
  'fleet',
  'billing',
  'dispatch',
  'analytics',
]);

loadRootEnv();

const argv = process.argv.slice(2);
const appIndex = argv.indexOf('--app');
const app = appIndex >= 0 ? argv[appIndex + 1] : '';
const operation = argv.find((value) => !value.startsWith('-') && value !== app);
const extraArgs = argv.slice(operation ? argv.indexOf(operation) + 1 : argv.length);

if (!apps.has(app) || !operation) {
  console.error(
    'Usage: node scripts/prisma.cjs --app identity|catalog|cms|booking|notify|fleet|billing|dispatch|analytics generate|migrate|deploy|seed',
  );
  process.exit(1);
}

const mode = (
  process.env.DATABASE_PROVIDER ??
  (process.env.NODE_ENV === 'production' ? 'postgresql' : 'sqlite')
).toLowerCase();
if (mode !== 'sqlite' && mode !== 'postgresql') {
  console.error(`Unsupported DATABASE_PROVIDER: ${mode}. Use sqlite or postgresql.`);
  process.exit(1);
}
const isSqlite = mode === 'sqlite';
const appRoot = resolve(root, 'apps', app);
const dataDir = resolve(root, '.local-data');
const sqliteDbFilePath = resolve(dataDir, `${app}.db`);
const sqliteDbPath = sqliteDbFilePath.replace(/\\/g, '/');

if (isSqlite) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(sqliteDbFilePath, '', { flag: 'a' });
  process.env.DATABASE_URL = `file:${sqliteDbPath}`;
} else {
  resolvePostgresDatabaseUrl(app);
}

const schemaPath = isSqlite
  ? createSqliteSchema(app)
  : resolve(appRoot, 'prisma', 'schema.prisma');

const prismaArgs = ['prisma'];
if (operation === 'generate') {
  prismaArgs.push('generate');
} else if (operation === 'migrate' || operation === 'deploy') {
  prismaArgs.push(...(isSqlite ? ['db', 'push'] : ['migrate', operation === 'migrate' ? 'dev' : 'deploy']));
} else if (operation === 'seed') {
  prismaArgs.push('db', 'seed');
} else {
  console.error(`Unsupported Prisma operation: ${operation}`);
  process.exit(1);
}

if (operation !== 'seed') {
  prismaArgs.push('--schema', schemaPath);
}
prismaArgs.push(...extraArgs);

const npmCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const childOptions = {
  cwd: appRoot,
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
};
const nodeOptions = { ...childOptions, shell: false };

function finish(code, signal) {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 1);
}

function runSeed() {
  const child = spawn(process.execPath, ['prisma/seed.cjs', ...extraArgs], nodeOptions);
  child.on('exit', finish);
}

if (operation === 'seed') {
  // Always regenerate against the active provider before loading the seed.
  // This keeps local SQLite clients from retaining a PostgreSQL datasource.
  const generate = spawn(npmCommand, ['prisma', 'generate', '--schema', schemaPath], childOptions);
  generate.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    }
    if ((code ?? 1) !== 0) {
      process.exit(code ?? 1);
    }
    runSeed();
  });
} else {
  const child = spawn(npmCommand, prismaArgs, childOptions);
  child.on('exit', finish);
}

function createSqliteSchema(service) {
  const sourcePath = resolve(root, 'apps', service, 'prisma', 'schema.prisma');
  const generatedPath = resolve(
    root,
    'apps',
    service,
    'prisma',
    'schema.sqlite.generated.prisma',
  );
  let schema = readFileSync(sourcePath, 'utf8')
    .replace('provider = "postgresql"', 'provider = "sqlite"')
    .replace(/\s+@db\.Decimal\(\d+,\s*\d+\)/g, '');

  // SQLite does not support Prisma scalar lists. Keep this dev-only field
  // as JSON while preserving the PostgreSQL enum list in production.
  if (service === 'dispatch') {
    schema = schema.replace(/^(\s*languages)\s+Locale\[\]/m, '$1 Json');
  }

  writeFileSync(generatedPath, schema);
  return generatedPath;
}

function resolvePostgresDatabaseUrl(service) {
  const serviceKey = `${service.toUpperCase()}_DATABASE_URL`;
  if (process.env[serviceKey]) {
    process.env.DATABASE_URL = process.env[serviceKey];
    return;
  }

  const url = process.env.DATABASE_URL;
  if (url && service !== 'identity') {
    process.env.DATABASE_URL = url.replace(/schema=[^&]+/, `schema=${service}`);
  }
}

function loadRootEnv() {
  try {
    for (const line of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index < 0) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Environment variables may already be provided by the shell or CI.
  }
}
