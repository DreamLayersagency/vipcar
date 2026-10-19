import React, { useEffect } from 'react';
import { trackPageView } from '../../../libs/web-client/src/index.js';
import { text } from './i18n.js';
import { href, navigate, parseLocation, usePathname } from './router.jsx';
import { useDocumentMeta } from './seo.js';
import { CurrencyProvider } from './state.jsx';
import { FloatingWhatsApp, Footer, Header, MobileBookBar, UtilityBar } from './components/Layout.jsx';
import { Home } from './pages/Home.jsx';
import { BookingPage, FleetPage, VehiclePage } from './pages/Fleet.jsx';
import { ContactPage, CorporatePage, FaqPage, ServicePage } from './pages/Business.jsx';
import { LoginPage, MyBookingsPage } from './pages/Account.jsx';
import { ArticlePage, ChauffeurLocationPage, ContentPage, LegalPage, LocationPage, NotFound } from './pages/Content.jsx';

/** Same route table as App 1 (`apps/web/src/main.jsx`), under the `/v2` base. */
function routePage(lang, parts) {
  const [first, second] = parts;
  if (!parts.length) return <Home lang={lang} />;
  if (first === 'fleet' && second) return <VehiclePage key={second} lang={lang} slug={second} />;
  if (first === 'fleet') return <FleetPage lang={lang} />;
  if (first === 'services') return <ServicePage key={second} lang={lang} type={second || 'rental'} />;
  if (first === 'booking') return <BookingPage lang={lang} />;
  if (first === 'my-bookings') return <MyBookingsPage lang={lang} />;
  if (first === 'login') return <LoginPage lang={lang} />;
  if (first === 'corporate') return <CorporatePage lang={lang} />;
  if (first === 'contact') return <ContactPage lang={lang} />;
  if (first === 'faq') return <FaqPage lang={lang} />;
  if (first === 'car-rental' && second) return <LocationPage key={second} lang={lang} slug={second} />;
  if (first === 'airport-transfers' && second) return <LocationPage key={`a-${second}`} lang={lang} slug={second} airport />;
  if (first === 'chauffeur' && second) return <ChauffeurLocationPage key={second} lang={lang} slug={second} />;
  if (first === 'blog' && second) return <ArticlePage key={second} lang={lang} slug={second} />;
  if (['about', 'destinations', 'blog'].includes(first) && !second) return <ContentPage key={first} lang={lang} type={first} />;
  if (first === 'legal' && second) return <LegalPage key={second} lang={lang} slug={second} />;
  return <NotFound lang={lang} />;
}

export function App() {
  const { pathname, search } = usePathname();
  const { lang, hasLang, parts } = parseLocation(pathname);
  useDocumentMeta(lang, parts);

  useEffect(() => {
    // `/v2` and `/v2/` land on the English home, like `/` → `/en` for App 1.
    if (!hasLang && !parts.length) navigate(href('en') + search, { replace: true, scroll: false });
  }, [hasLang, parts.length, search]);

  useEffect(() => { trackPageView(pathname); }, [pathname]);

  const routeKey = `${lang}/${parts.join('/')}`;
  return (
    <CurrencyProvider>
      <a className="skip-link" href="#main-content">{text(lang, 'Skip to main content', 'Aller au contenu principal', 'انتقل إلى المحتوى الرئيسي')}</a>
      <UtilityBar lang={lang} />
      <Header lang={lang} parts={parts} />
      <div id="main-content" key={routeKey} className="route">{routePage(lang, parts)}</div>
      <Footer lang={lang} />
      <FloatingWhatsApp lang={lang} />
      <MobileBookBar lang={lang} />
    </CurrencyProvider>
  );
}
