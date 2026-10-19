import { useEffect } from 'react';
import { articles, commercialLocations } from './content/app1-content.js';
import { languageOption, t, text } from './i18n.js';
import { articleLocale, legalLocale } from './pages/Content.jsx';

/**
 * Document title, description, `lang` and `dir`, using App 1's wording.
 * View 2 is a demo and is marked `noindex` in index.html, so canonical,
 * hreflang and structured data are intentionally left to App 1.
 */
function routeTitle(lang, parts) {
  const path = parts.join('/');
  const location = parts[1] ? commercialLocations.find((item) => item.slug === parts[1]) : null;
  if (parts[0] === 'blog' && parts[1] && articles[parts[1]]) return `${articleLocale(parts[1], articles[parts[1]], lang)[0]} | VIPCAR`;
  if (parts[0] === 'legal' && parts[1] && legalLocale(parts[1], lang)) return `${legalLocale(parts[1], lang)[0]} | VIPCAR Tunisia`;
  if (parts[0] === 'car-rental' && location) return text(lang, `Car Rental in ${location.name[0]} | VIPCAR`, `Location Voiture ${location.name[1]} | VIPCAR`, `تأجير السيارات في ${location.name[2]} | VIPCAR`);
  if (parts[0] === 'airport-transfers' && location) return text(lang, `${location.airport} Transfer | VIPCAR`, `Transfert ${location.airport} | VIPCAR`, `نقل من ${location.airport} | VIPCAR`);
  if (parts[0] === 'chauffeur' && location) return text(lang, `Private Chauffeur in ${location.name[0]} | VIPCAR`, `Chauffeur Privé à ${location.name[1]} | VIPCAR`, `سائق خاص في ${location.name[2]} | VIPCAR`);
  const titles = {
    fleet: text(lang, 'Car Rental Fleet & Prices | VIPCAR Tunisia', 'Flotte & Prix Location Voiture | VIPCAR', 'أسطول وأسعار تأجير السيارات | VIPCAR تونس'),
    'services/transfer': text(lang, 'Airport Transfers in Tunisia | VIPCAR', 'Transfert Aéroport Tunisie | VIPCAR', 'خدمات النقل من المطار في تونس | VIPCAR'),
    'services/chauffeur': text(lang, 'Private Chauffeur in Tunisia | VIPCAR', 'Chauffeur Privé Tunisie | VIPCAR', 'سائق خاص في تونس | VIPCAR'),
    'services/rental': text(lang, 'Car Rental in Tunisia | VIPCAR', 'Location Voiture en Tunisie | VIPCAR', 'تأجير السيارات في تونس | VIPCAR'),
    booking: text(lang, 'Get a Fixed Quote | VIPCAR Tunisia', 'Demander un Devis | VIPCAR Tunisie', 'اطلب عرض سعر ثابت | VIPCAR تونس'),
    'my-bookings': text(lang, 'My Bookings | VIPCAR Tunisia', 'Mes réservations | VIPCAR Tunisie', 'حجوزاتي | VIPCAR تونس'),
    login: text(lang, 'Sign in | VIPCAR Tunisia', 'Connexion | VIPCAR Tunisie', 'تسجيل الدخول | VIPCAR تونس'),
    corporate: text(lang, 'Corporate Mobility in Tunisia | VIPCAR', 'Mobilité d’entreprise en Tunisie | VIPCAR', 'تنقل الشركات في تونس | VIPCAR'),
    about: text(lang, 'About VIPCAR Tunisia | Local Mobility Experts', 'À propos de VIPCAR Tunisie | Experts mobilité', 'عن VIPCAR تونس | خبراء التنقل المحلي'),
    destinations: text(lang, 'Tunisia Car Rental Destinations | VIPCAR', 'Destinations location voiture Tunisie | VIPCAR', 'وجهات تأجير السيارات في تونس | VIPCAR'),
    blog: text(lang, 'Tunisia Travel Journal | VIPCAR', 'Journal de voyage Tunisie | VIPCAR', 'مجلة السفر في تونس | VIPCAR'),
    contact: text(lang, 'Contact VIPCAR Tunisia | Quotes & Support', 'Contacter VIPCAR Tunisie | Devis & Assistance', 'تواصل مع VIPCAR تونس | عروض ودعم'),
    faq: text(lang, 'Car Rental & Transfer FAQ | VIPCAR Tunisia', 'FAQ Location & Transfert | VIPCAR Tunisie', 'الأسئلة الشائعة لتأجير السيارات والنقل | VIPCAR تونس'),
  };
  return titles[path] ?? text(lang, 'Car Rental in Tunisia | VIPCAR', 'Location Voiture Tunisie | VIPCAR', 'تأجير سيارات في تونس | VIPCAR');
}

export function useDocumentMeta(lang, parts) {
  const key = parts.join('/');
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = languageOption(lang).dir;
    if (!(parts[0] === 'fleet' && parts[1])) document.title = routeTitle(lang, parts);
    const description = document.head.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', t(lang).heroSub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, key]);
}

/** Vehicle pages set their title once the live model has loaded. */
export function vehicleTitle(lang, name) {
  return text(lang, `${name} Rental | VIPCAR Tunisia`, `${name} | Location Voiture | VIPCAR Tunisie`, `${name} | تأجير السيارات | VIPCAR تونس`);
}
