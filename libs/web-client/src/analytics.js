import { getClientConfig } from './config.js';

/**
 * First-party analytics (`POST /v1/analytics/events`) plus optional GA, same
 * events as App 1. The page path already carries the view base (e.g. `/v2/…`),
 * so demo traffic stays distinguishable in the back-office analytics.
 */
const SESSION_KEY = 'vipcar_analytics_session';
let gaInitialized = false;

function sessionId() {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const created = window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return '';
  }
}

function deviceType() {
  const width = window.innerWidth || 1280;
  return width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
}

function sendFirstPartyEvent(event, params = {}) {
  const { apiBaseUrl } = getClientConfig();
  if (!apiBaseUrl || typeof window === 'undefined') return;
  const payload = JSON.stringify({
    event,
    path: params.path || window.location.pathname,
    sessionId: sessionId(),
    locale: document.documentElement.lang || 'en',
    referrer: document.referrer || undefined,
    device: deviceType(),
  });
  const endpoint = `${apiBaseUrl}/v1/analytics/events`;
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
      return;
    }
    void fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
  } catch {
    /* Analytics is intentionally non-blocking. */
  }
}

export function initAnalytics() {
  const { gaMeasurementId } = getClientConfig();
  if (gaInitialized || !gaMeasurementId || typeof document === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', gaMeasurementId, { send_page_view: false, anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
  document.head.appendChild(script);
  gaInitialized = true;
}

export function trackEvent(name, params = {}) {
  if (getClientConfig().gaMeasurementId && typeof window !== 'undefined') window.gtag?.('event', name, params);
  sendFirstPartyEvent(name, params);
}

export function trackPageView(path = window.location.pathname) {
  if (getClientConfig().gaMeasurementId && typeof window !== 'undefined') window.gtag?.('event', 'page_view', { page_path: path });
  sendFirstPartyEvent('page_view', { path });
}
