const measurementId = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? '').trim();
const apiUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
const SESSION_KEY = 'vipcar_analytics_session_v2';
const CONSENT_KEY = 'vipcar_analytics_consent_v1';
const ATTRIBUTION_KEY = 'vipcar_analytics_attribution_v1';
let initialized = false;

export function getAnalyticsConsent() {
  if (typeof window === 'undefined') return 'denied';
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function setAnalyticsConsent(value) {
  if (value !== 'granted' && value !== 'denied') return;
  try { window.localStorage.setItem(CONSENT_KEY, value); } catch { /* optional storage */ }
}

function sessionId() {
  if (typeof window === 'undefined') return '';
  try {
    const storage = window.sessionStorage;
    const stored = storage.getItem(SESSION_KEY);
    if (stored) return stored;
    const created = window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    storage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return '';
  }
}

function clean(value, max) {
  const text = String(value ?? '').trim().slice(0, max);
  return text || undefined;
}

function attribution() {
  if (typeof window === 'undefined') return {};
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) || '{}');
    if (stored && typeof stored === 'object' && Object.keys(stored).length) return stored;
    const params = new URLSearchParams(window.location.search);
    const result = {
      source: clean(params.get('utm_source'), 128),
      medium: clean(params.get('utm_medium'), 128),
      campaign: clean(params.get('utm_campaign'), 128),
      landingPage: clean(window.location.pathname, 256),
    };
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(result));
    return result;
  } catch {
    return { landingPage: clean(window.location.pathname, 256) };
  }
}

function deviceType() {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth || 1280;
  return width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
}

function safeContext(params) {
  const source = params.context && typeof params.context === 'object' ? params.context : params;
  const allowed = ['service', 'location', 'vehicle', 'form', 'step', 'channel'];
  return Object.fromEntries(allowed
    .filter((key) => source[key] !== undefined && source[key] !== null)
    .map((key) => [key, typeof source[key] === 'boolean' || typeof source[key] === 'number' ? source[key] : clean(source[key], 128)])
    .filter(([, value]) => value !== undefined));
}

function eventPayload(event, params = {}) {
  const source = attribution();
  return {
    event,
    path: clean(params.path || window.location.pathname, 256),
    sessionId: sessionId(),
    locale: document.documentElement.lang || 'en',
    referrer: clean(document.referrer, 512),
    device: deviceType(),
    source: clean(params.source || source.source, 128),
    medium: clean(params.medium || source.medium, 128),
    campaign: clean(params.campaign || source.campaign, 128),
    landingPage: clean(params.landingPage || source.landingPage, 256),
    funnelStep: clean(params.funnelStep, 64),
    context: safeContext(params),
  };
}

function sendFirstPartyEvent(event, params = {}) {
  if (!apiUrl || typeof window === 'undefined' || getAnalyticsConsent() !== 'granted') return;
  const payload = JSON.stringify(eventPayload(event, params));
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
  if (initialized || !measurementId || typeof document === 'undefined' || getAnalyticsConsent() !== 'granted') return;
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
  if (getAnalyticsConsent() !== 'granted') return;
  if (measurementId && typeof window !== 'undefined') window.gtag?.('event', name, params);
  sendFirstPartyEvent(name, params);
}

export function trackPageView(path = window.location.pathname) {
  if (getAnalyticsConsent() !== 'granted') return;
  if (measurementId && typeof window !== 'undefined') window.gtag?.('event', 'page_view', { page_path: path });
  sendFirstPartyEvent('page_view', { path });
}
