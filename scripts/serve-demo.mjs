#!/usr/bin/env node
/**
 * Zero-dependency static server for dist/demo-site, applying its `_redirects` the way
 * Netlify / Cloudflare Pages do (existing files win; `200` = rewrite; `301`/`302` = redirect;
 * `*` and `:splat` supported). Local preview only.
 *
 * Usage: npm run serve:demo            (http://127.0.0.1:4300)
 *        npm run serve:demo -- 4400    (custom port)
 * The gateway must allow this origin: include it in WEB_ORIGIN.
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'demo-site');
const port = Number(process.argv[2] || process.env.DEMO_PORT || 4300);
const host = '127.0.0.1';

if (!existsSync(root)) {
  console.error('dist/demo-site not found. Run `npm run build:demo` first.');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.woff2': 'font/woff2',
};

function loadRules() {
  const file = path.join(root, '_redirects');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [from, to, status = '301'] = line.split(/\s+/);
      return { from, to, status: Number(status) };
    });
}
const rules = loadRules();

/** Resolve a URL path to a file inside `root`, or null (never escapes the folder). */
function resolveFile(urlPath) {
  const candidate = path.normalize(path.join(root, decodeURIComponent(urlPath)));
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  const index = path.join(candidate, 'index.html');
  if (existsSync(index)) return index;
  return null;
}

function matchRule(rule, urlPath) {
  if (rule.from.endsWith('/*')) {
    const prefix = rule.from.slice(0, -2);
    if (urlPath === prefix || urlPath.startsWith(`${prefix}/`)) {
      const splat = urlPath.slice(prefix.length + 1);
      return rule.to.replace(':splat', splat);
    }
    return null;
  }
  return urlPath === rule.from ? rule.to : null;
}

function send(res, status, file) {
  res.writeHead(status, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  const url = new URL(req.url, `http://${host}:${port}`);
  const direct = resolveFile(url.pathname);
  if (direct) return send(res, 200, direct);
  for (const rule of rules) {
    const target = matchRule(rule, url.pathname);
    if (target === null) continue;
    if (rule.status === 200) {
      const file = resolveFile(target);
      if (file) return send(res, 200, file);
      continue;
    }
    res.writeHead(rule.status, { Location: `${target}${url.search}` }).end();
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
}).listen(port, host, () => {
  console.log(`Demo site: http://127.0.0.1:${port}/en (View 1) · http://127.0.0.1:${port}/v2/en (View 2)`);
});
