const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
let initialized = false;

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
  if (!measurementId || typeof window === 'undefined') return;
  window.gtag?.('event', name, params);
}
