import { PRESERVED_QUERY_KEYS } from './views.js';

/**
 * Pure helpers that translate the current URL of one view into the
 * equivalent URL of another view. No DOM access, so they run under `node --test`.
 */

/** @param {string} basePath */
function normalizeBase(basePath) {
  const trimmed = `/${String(basePath || '/').replace(/^\/+|\/+$/g, '')}`;
  return trimmed === '/' ? '' : trimmed;
}

/**
 * Split a pathname served by `view` into its locale and locale-relative path.
 * @param {string} pathname e.g. `/v2/fr/fleet/toyota-rav4`
 * @param {{ basePath: string, languages: readonly string[] }} view
 * @returns {{ lang: string | null, rest: string, insideView: boolean }}
 */
export function splitViewPath(pathname, view) {
  const base = normalizeBase(view.basePath);
  let path = String(pathname || '/');
  let insideView = true;
  if (base) {
    if (path === base || path.startsWith(`${base}/`)) {
      path = path.slice(base.length) || '/';
    } else {
      insideView = false;
    }
  }
  const parts = path.split('/').filter(Boolean);
  const lang = view.languages.includes(parts[0]) ? parts[0] : null;
  const restParts = lang ? parts.slice(1) : parts;
  return { lang, rest: `/${restParts.join('/')}`, insideView };
}

/**
 * @param {string} pattern e.g. `/fleet/:slug`
 * @param {string} path e.g. `/fleet/toyota-rav4`
 */
export function matchRoute(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
}

/**
 * True when the switcher must stay hidden on this page (e.g. the back office).
 * @param {string} pathname
 * @param {{ basePath: string, languages: readonly string[], hiddenPrefixes?: readonly string[] }} view
 */
export function isHiddenPath(pathname, view) {
  const prefixes = view.hiddenPrefixes ?? [];
  if (!prefixes.length) return false;
  const { rest } = splitViewPath(pathname, view);
  return prefixes.some((prefix) => rest === prefix || rest.startsWith(`${prefix}/`));
}

/**
 * @param {string} search e.g. `?vehicle=x&name=y`
 * @param {readonly string[]} keys
 */
export function filterQuery(search, keys = PRESERVED_QUERY_KEYS) {
  const source = new URLSearchParams(search || '');
  const kept = new URLSearchParams();
  for (const key of keys) {
    const value = source.get(key);
    if (value !== null && value !== '') kept.set(key, value);
  }
  const query = kept.toString();
  return query ? `?${query}` : '';
}

/**
 * Build the URL of `toView` that corresponds to `location` in `fromView`.
 * Falls back to the target's home page in the same language when the target
 * does not implement the current page.
 * @param {{
 *   fromView: { basePath: string, languages: readonly string[] },
 *   toView: { basePath: string, languages: readonly string[], routes: readonly string[], devOrigin?: string },
 *   location: { pathname: string, search?: string },
 *   dev?: boolean,
 * }} options
 * @returns {{ url: string, matched: boolean }}
 */
export function buildTargetUrl({ fromView, toView, location, dev = false }) {
  const { lang, rest } = splitViewPath(location.pathname, fromView);
  const targetLang = lang && toView.languages.includes(lang) ? lang : toView.languages[0];
  const matched = toView.routes.some((pattern) => matchRoute(pattern, rest));
  const localePath = `/${targetLang}${matched && rest !== '/' ? rest : ''}`;
  const query = matched ? filterQuery(location.search) : '';
  const origin = dev && toView.devOrigin ? toView.devOrigin.replace(/\/$/, '') : '';
  return { url: `${origin}${normalizeBase(toView.basePath)}${localePath}${query}`, matched };
}
