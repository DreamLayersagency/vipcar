import React, { useEffect, useState } from 'react';
import { LANGUAGE_CODES } from './i18n.js';

/**
 * History-API router for View 2. Paths are `/v2/:lang/...` (base from Vite).
 * Navigation dispatches `popstate` like App 1, so the shared demo switcher
 * and form tracking observe route changes the same way in both views.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function parseLocation(pathname = window.location.pathname) {
  let path = pathname;
  if (BASE && (path === BASE || path.startsWith(`${BASE}/`))) path = path.slice(BASE.length);
  const parts = path.split('/').filter(Boolean);
  const hasLang = LANGUAGE_CODES.includes(parts[0]);
  const lang = hasLang ? parts[0] : 'en';
  return { lang, hasLang, parts: hasLang ? parts.slice(1) : parts };
}

/** Current path without base and locale, plus the query (used by the language picker). */
export function localeRelativePath() {
  const { parts } = parseLocation();
  return `${parts.length ? `/${parts.join('/')}` : ''}${window.location.search}`;
}

/** @param {string} lang @param {string} [path] locale-relative path, may include a query */
export function href(lang, path = '') {
  return `${BASE}/${lang}${path}`;
}

export function navigate(to, { replace = false, scroll = true } = {}) {
  if (replace) window.history.replaceState({}, '', to);
  else window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
}

export function usePathname() {
  const [location, setLocation] = useState(() => ({ pathname: window.location.pathname, search: window.location.search }));
  useEffect(() => {
    const onChange = () => setLocation({ pathname: window.location.pathname, search: window.location.search });
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return location;
}

export function useQuery() {
  const { search } = usePathname();
  return new URLSearchParams(search);
}

function isExternal(to) {
  return /^(https?:|tel:|mailto:)/.test(to);
}

/** Anchor that routes internally and leaves external links untouched. */
export function Link({ to, children, onClick, ...props }) {
  const external = isExternal(to);
  const handleClick = (event) => {
    onClick?.(event);
    if (external || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handleClick} {...props}>{children}</a>;
}
