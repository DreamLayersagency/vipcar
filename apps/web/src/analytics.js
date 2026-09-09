const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
const apiUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
const SESSION_KEY = 'vipcar_analytics_session';
let initialized = false;

function sessionId() {
  if (typeof window === 'undefined') return '';
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
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth || 1280;
  return width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
}

function sendFirstPartyEvent(event, params = {}) {
  if (!apiUrl || typeof window === 'undefined') return;
  const payload = JSON.stringify({
    event,
    path: params.path || window.location.pathname,
    sessionId: sessionId(),
    locale: document.documentElement.lang || 'en',
    referrer: document.referrer || undefined,
    device: deviceType(),
  });
  const endpoint = `${apiUrl}/v1/analytics/events`;
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
      return;
    }
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* Analytics is intentionally non-blocking. */
  }
}

export function initAnalytics() {
  if (initialized || !measurementId || typeof document === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false, anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
  initialized = true;
}

export function trackEvent(name, params = {}) {
  if (measurementId && typeof window !== 'undefined') window.gtag?.('event', name, params);
  sendFirstPartyEvent(name, params);
}

export function trackPageView(path = window.location.pathname) {
  if (measurementId && typeof window !== 'undefined') window.gtag?.('event', 'page_view', { page_path: path });
  sendFirstPartyEvent('page_view', { path });
}
