import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight, BriefcaseBusiness, CalendarDays, Car, Check, ChevronDown,
  Clock3, Fuel, Headphones, Languages, MapPin, Menu, MessageCircle,
  Plane, ShieldCheck, SlidersHorizontal, Sparkles, Users, X
} from 'lucide-react';
import './styles.css';
import './premium.css';
import { initAnalytics, trackEvent } from './analytics';
import {
  buildWhatsAppQuoteMessage,
  createQuote,
  formatQuoteReference,
  openWhatsAppQuote,
  quoteErrorMessage,
} from './quotes';
import {
  clearSession,
  getAccessToken,
  getStoredUser,
  login,
  loginErrorMessage,
} from './auth';
import {
  bookingServiceLabel,
  bookingStatusLabel,
  bookingsErrorMessage,
  formatBookingDate,
  listMyBookings,
} from './bookings';
import { FLEET_SEED as fleet, FLEET_CATEGORIES } from './fleet-seed';
import { fleetOfflineMessage, loadFleet, loadVehiclePage } from './catalog';
import { CURRENCIES, CURRENCY_STORAGE_KEY, formatCurrency, getCurrency, getInitialCurrency } from './currency';
import { AdminApp, isAdminPathname } from './admin';
import './admin/admin.css';

gsap.registerPlugin(ScrollTrigger);

const ORIGIN = 'https://vipcar.com.tn';
const PHONE = '+216 55 771 077';
const WA = 'https://wa.me/21655771077';
const ASSET = `${ORIGIN}/images`;
const LOGO = '/images/vipcar-logo.svg';
const LOGO_LIGHT = '/images/vipcar-logo-light.svg';
const CURRENCY = 'TND';
const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', dir: 'ltr' },
  { code: 'fr', name: 'French', native: 'Français', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', native: 'العربية', dir: 'rtl' },
];

function languageIndex(lang) { return lang === 'en' ? 0 : lang === 'fr' ? 1 : 2; }
function text(lang, english, french, arabic) { return lang === 'ar' ? arabic : lang === 'fr' ? french : english; }
function languageOption(lang) { return LANGUAGES.find((item) => item.code === lang) ?? LANGUAGES[0]; }

const locationLabels = {
  'Tunis-Carthage Airport': 'مطار تونس قرطاج',
  Tunis: 'تونس',
  'Enfidha-Hammamet Airport': 'مطار النفيضة الحمامات',
  Sousse: 'سوسة',
  Hammamet: 'الحمامات',
  Gabès: 'قابس',
  'Djerba-Zarzis Airport': 'مطار جربة جرجيس',
  Nabeul: 'نابل',
  Bizerte: 'بنزرت',
};
function locationLabel(name, lang) { return lang === 'ar' ? locationLabels[name] ?? name : name; }
function categoryLabel(category, lang) {
  if (lang !== 'ar') return category;
  return { All: 'الكل', Luxury: 'فاخرة', SUV: 'دفع رباعي', Sedan: 'سيدان', 'Van & Group': 'فان ومجموعات', Compact: 'مدمجة', Economy: 'اقتصادية', 'Pick-up': 'بيك أب' }[category] ?? category;
}
function tierLabel(tier, lang) {
  if (lang !== 'ar') return tier;
  return { Luxury: 'فاخرة', Premium: 'مميزة', Standard: 'قياسية', Economy: 'اقتصادية' }[tier] ?? tier;
}
function transmissionLabel(transmission, lang) {
  if (lang === 'ar') return transmission === 'Automatic' ? 'أوتوماتيكية' : 'يدوية';
  if (lang === 'fr') return transmission === 'Automatic' ? 'Automatique' : 'Manuelle';
  return transmission;
}

const currencyNames = Object.fromEntries(CURRENCIES.map((currency) => [currency.code, currency.name]));
const CurrencyContext = React.createContext({ currency: 'TND', setCurrency: () => {} });
function useCurrency() { return React.useContext(CurrencyContext); }

const copy = {
  en: {
    nav: ['Car rental', 'Airport transfers', 'Chauffeur', 'Fleet', 'Corporate', 'Destinations', 'About'],
    book: 'Get a quote', explore: 'Explore the fleet', whatsapp: 'WhatsApp us',
    hero: 'Premium mobility, wherever Tunisia takes you.',
    heroSub: 'Car rental, private chauffeurs and airport transfers, coordinated around your arrival and confirmed by a real local team.',
    eyebrow: 'Tunisia, on your terms', serviceTitle: 'One team. Every journey.',
    serviceSub: 'Choose the service that fits your trip. We confirm the details and fixed quote directly with you.',
    fleetTitle: 'The right vehicle for every journey.', fleetSub: 'Agile city cars, family SUVs, executive saloons and spacious options for groups.',
    allFleet: 'View the full fleet', from: 'From', day: '/ day', seats: 'seats', auto: 'Automatic', manual: 'Manual',
    why: 'Local knowledge, international standards.', whySub: 'Travel plans change. Flights arrive late. Our team stays close from your first message to vehicle return or final drop-off.',
    guide: 'Plan Tunisia with confidence.', quoteTitle: 'Tell us where Tunisia is taking you.', quoteSub: 'Share your trip in a few steps. No immediate payment; our team confirms availability and your quote directly.',
    faq: 'Practical answers, before you travel.', footer: 'Premium car rental, private chauffeur and airport transfers across Tunisia. Available 24/7.',
    servicesLabel: 'Services', exploreLabel: 'Explore', contactLabel: 'Contact', myBookings: 'My bookings', journal: 'Travel journal', currencyLabel: 'Currency', currencyNote: 'Displayed prices are indicative; rentals are billed in Tunisian dinar (TND).',
    terms: 'Terms', privacy: 'Privacy', cancellation: 'Cancellation', serviceEyebrow: 'VIPCAR services', travelJournal: 'Travel journal',
    discover: 'Discover service', readGuide: 'Read guide', homeStandard: 'The VIPCAR standard', meetVipcar: 'Meet VIPCAR', directAssistance: 'Direct assistance',
    clearQuotes: 'Clear quotes', confirmedBeforeTravel: 'Confirmed before travel', localTeam: 'Local team', airportPickup: 'major airport pickup',
    vehiclesFleet: 'vehicles in the fleet', assistanceEveryDay: 'assistance every day', hubsTunisia: 'hubs across Tunisia',
    startTrip: 'Start with your trip', whatArranging: 'What are you arranging?', quoteIntro: 'Share the essentials and we will confirm the right vehicle, timing and fixed quote with you.', noPayment: 'No payment now', whereMeet: 'Where should we meet?',
    when: 'When?', returnDate: 'Return date', dropoff: 'Destination / return location', flightNumber: 'Flight number', yourName: 'Your name', fullName: 'Full name', phoneWhatsapp: 'Phone / WhatsApp', email: 'Email address',
    tripStep: 'Trip details', contactStep: 'Your details', reviewTrip: 'Review your trip', continueToContact: 'Continue', addDetails: 'Add details (optional)', serviceDuration: 'Service duration', passengers: 'Passengers', notesDestination: 'Notes / destination',
    hotelFlightPlaceholder: 'Hotel, destination, flight number…', saveThenWhatsapp: 'We save your request first, then you can continue on WhatsApp for confirmation.',
    getFixedQuote: 'Get my fixed quote', sending: 'Sending…', requestReceived: 'Request received', successTitle: 'Your trip request is safely with the VIPCAR team.',
    successCopy: 'We will confirm availability and your fixed quote directly. Keep this reference for any follow-up.', requestReference: 'Request reference',
    continueWhatsapp: 'Continue on WhatsApp', anotherRequest: 'Make another request', serviceSelfDrive: 'Self-drive', serviceAirport: 'Airport pickup', serviceHourly: 'By the hour or day',
    designedAroundTrip: 'Designed around your trip', mobilityTitle: 'Professional mobility without the uncertainty.', back: 'Back', continue: 'Continue',
    selectedVehicle: 'Selected vehicle', reviewRequest: 'Review your request', noImmediatePayment: 'No immediate payment',
    requestSavedWhatsapp: 'We save your request first, then open WhatsApp so the VIPCAR team can confirm with you.',
    whatsappTitle: 'Message VIPCAR', whatsappPlaceholder: 'Write your message…', whatsappSend: 'Open WhatsApp', whatsappClose: 'Close',
    whatsappHint: 'Your message will open in WhatsApp.', whatsappDefault: 'Hello VIPCAR, I would like more information about your services.',
  },
  fr: {
    nav: ['Location', 'Transferts aéroport', 'Chauffeur', 'Flotte', 'Entreprises', 'Destinations', 'À propos'],
    book: 'Demander un devis', explore: 'Voir la flotte', whatsapp: 'Nous écrire',
    hero: 'La mobilité premium, partout en Tunisie.',
    heroSub: 'Location de voiture, chauffeur privé et transferts aéroport, organisés selon votre arrivée par une équipe locale disponible.',
    eyebrow: 'La Tunisie, à votre rythme', serviceTitle: 'Une équipe. Tous vos trajets.',
    serviceSub: 'Choisissez le service adapté à votre séjour. Nous confirmons chaque détail et votre tarif directement avec vous.',
    fleetTitle: 'Le bon véhicule pour chaque voyage.', fleetSub: 'Citadines agiles, SUV familiaux, berlines exécutives et véhicules spacieux pour les groupes.',
    allFleet: 'Voir toute la flotte', from: 'À partir de', day: '/ jour', seats: 'places', auto: 'Automatique', manual: 'Manuelle',
    why: 'Expertise locale, standards internationaux.', whySub: 'Les voyages évoluent et les vols ont parfois du retard. Notre équipe reste disponible du premier message au dernier transfert.',
    guide: 'Préparez votre séjour sereinement.', quoteTitle: 'Dites-nous où la Tunisie vous mène.', quoteSub: 'Partagez votre trajet en quelques étapes. Aucun paiement immédiat; notre équipe confirme la disponibilité et votre devis.',
    faq: 'Les réponses utiles avant votre voyage.', footer: 'Location premium, chauffeur privé et transferts aéroport en Tunisie. Service disponible 24h/24.',
    servicesLabel: 'Services', exploreLabel: 'Explorer', contactLabel: 'Contact', myBookings: 'Mes réservations', journal: 'Journal de voyage', currencyLabel: 'Devise', currencyNote: 'Les prix affichés sont indicatifs ; les locations sont facturées en dinar tunisien (TND).',
    terms: 'Conditions', privacy: 'Confidentialité', cancellation: 'Annulation', serviceEyebrow: 'Services VIPCAR', travelJournal: 'Journal de voyage',
    discover: 'Découvrir', readGuide: 'Lire le guide', homeStandard: 'Le standard VIPCAR', meetVipcar: 'Découvrir VIPCAR', directAssistance: 'Assistance directe',
    clearQuotes: 'Devis clairs', confirmedBeforeTravel: 'Confirmés avant le départ', localTeam: 'Équipe locale', airportPickup: 'accueil aux aéroports',
    vehiclesFleet: 'véhicules dans la flotte', assistanceEveryDay: 'assistance quotidienne', hubsTunisia: 'agences en Tunisie',
    startTrip: 'Commencez par votre trajet', whatArranging: 'Quel trajet organisez-vous ?', quoteIntro: 'Indiquez l’essentiel : nous confirmerons le bon véhicule, l’horaire et votre devis fixe.', noPayment: 'Aucun paiement immédiat', whereMeet: 'Lieu de départ',
    when: 'Date souhaitée', returnDate: 'Date de retour', dropoff: 'Destination / lieu de retour', flightNumber: 'Numéro de vol', yourName: 'Votre nom', fullName: 'Nom complet', phoneWhatsapp: 'Téléphone / WhatsApp', email: 'Adresse e-mail',
    tripStep: 'Détails du trajet', contactStep: 'Vos coordonnées', reviewTrip: 'Vérifiez votre trajet', continueToContact: 'Continuer', addDetails: 'Ajouter des détails (facultatif)', serviceDuration: 'Durée du service', passengers: 'Passagers', notesDestination: 'Notes / destination',
    hotelFlightPlaceholder: 'Hôtel, destination, numéro de vol…', saveThenWhatsapp: 'Nous enregistrons d’abord votre demande, puis vous pouvez continuer sur WhatsApp pour la confirmation.',
    getFixedQuote: 'Recevoir mon devis fixe', sending: 'Envoi…', requestReceived: 'Demande reçue', successTitle: 'Votre demande de trajet est bien enregistrée par l’équipe VIPCAR.',
    successCopy: 'Nous allons confirmer la disponibilité et votre devis fixe directement. Conservez cette référence pour tout suivi.', requestReference: 'Référence de la demande',
    continueWhatsapp: 'Continuer sur WhatsApp', anotherRequest: 'Faire une autre demande', serviceSelfDrive: 'Sans chauffeur', serviceAirport: 'Aéroport', serviceHourly: 'À l’heure ou à la journée',
    designedAroundTrip: 'Pensé pour votre voyage', mobilityTitle: 'Une mobilité professionnelle, sans incertitude.', back: 'Retour', continue: 'Continuer',
    selectedVehicle: 'Véhicule sélectionné', reviewRequest: 'Vérifiez votre demande', noImmediatePayment: 'Aucun paiement immédiat',
    requestSavedWhatsapp: 'Nous enregistrons d’abord votre demande, puis ouvrons WhatsApp pour confirmation avec l’équipe VIPCAR.',
    whatsappTitle: 'Écrire à VIPCAR', whatsappPlaceholder: 'Écrivez votre message…', whatsappSend: 'Ouvrir WhatsApp', whatsappClose: 'Fermer',
    whatsappHint: 'Votre message s’ouvrira dans WhatsApp.', whatsappDefault: 'Bonjour VIPCAR, je souhaite recevoir plus d’informations sur vos services.',
  },
  ar: {
    nav: ['تأجير السيارات', 'خدمات النقل من المطار', 'سائق خاص', 'الأسطول', 'الشركات', 'الوجهات', 'من نحن'],
    book: 'اطلب عرضاً', explore: 'اكتشف الأسطول', whatsapp: 'تواصل معنا عبر واتساب',
    hero: 'تنقّل فاخر أينما تأخذك تونس.', heroSub: 'تأجير سيارات، سائقون خاصون ونقل من المطار، بتنسيق يناسب وصولك وتأكيد مباشر من فريق محلي.',
    eyebrow: 'تونس، على طريقتك', serviceTitle: 'فريق واحد. لكل رحلة.', serviceSub: 'اختر الخدمة المناسبة لرحلتك. نؤكد كل التفاصيل والسعر النهائي مباشرة معك.',
    fleetTitle: 'السيارة المناسبة لكل رحلة.', fleetSub: 'سيارات مدينة عملية، سيارات دفع رباعي عائلية، سيارات سيدان تنفيذية وخيارات واسعة للمجموعات.',
    allFleet: 'شاهد كامل الأسطول', from: 'ابتداءً من', day: '/ يوم', seats: 'مقاعد', auto: 'أوتوماتيكية', manual: 'يدوية',
    why: 'خبرة محلية، معايير دولية.', whySub: 'قد تتغير خطط السفر وقد تتأخر الرحلات. يبقى فريقنا قريباً منك من أول رسالة حتى إعادة السيارة أو الوصول النهائي.',
    guide: 'خطط لرحلتك في تونس بثقة.', quoteTitle: 'أخبرنا إلى أين تأخذك تونس.', quoteSub: 'شارك تفاصيل رحلتك في خطوات بسيطة. لا يوجد دفع فوري؛ نؤكد التوفر والعرض مباشرة معك.',
    faq: 'إجابات عملية قبل السفر.', footer: 'تأجير سيارات مميز، سائق خاص ونقل من المطارات في مختلف أنحاء تونس. متاحون على مدار الساعة.',
    servicesLabel: 'الخدمات', exploreLabel: 'استكشف', contactLabel: 'اتصل بنا', myBookings: 'حجوزاتي', journal: 'مجلة السفر', currencyLabel: 'العملة', currencyNote: 'الأسعار المعروضة إرشادية؛ تتم محاسبة التأجير بالدينار التونسي (TND).',
    terms: 'الشروط', privacy: 'الخصوصية', cancellation: 'الإلغاء', serviceEyebrow: 'خدمات VIPCAR', travelJournal: 'مجلة السفر',
    discover: 'اكتشف الخدمة', readGuide: 'اقرأ الدليل', homeStandard: 'معايير VIPCAR', meetVipcar: 'اكتشف VIPCAR', directAssistance: 'مساعدة مباشرة',
    clearQuotes: 'عروض واضحة', confirmedBeforeTravel: 'مؤكدة قبل السفر', localTeam: 'فريق محلي', airportPickup: 'استقبال في المطارات الرئيسية',
    vehiclesFleet: 'سيارة في الأسطول', assistanceEveryDay: 'مساعدة يومية', hubsTunisia: 'وكالات في تونس',
    startTrip: 'ابدأ رحلتك', whatArranging: 'ما نوع الرحلة التي تنظمها؟', quoteIntro: 'شاركنا الأساسيات وسنؤكد لك السيارة المناسبة والموعد والسعر النهائي.', noPayment: 'لا يوجد دفع الآن', whereMeet: 'أين نلتقي؟',
    when: 'متى؟', returnDate: 'تاريخ العودة', dropoff: 'الوجهة / مكان العودة', flightNumber: 'رقم الرحلة', yourName: 'اسمك', fullName: 'الاسم الكامل', phoneWhatsapp: 'الهاتف / واتساب', email: 'البريد الإلكتروني',
    tripStep: 'تفاصيل الرحلة', contactStep: 'بياناتك', reviewTrip: 'راجع رحلتك', continueToContact: 'متابعة', addDetails: 'أضف تفاصيل (اختياري)', serviceDuration: 'مدة الخدمة', passengers: 'عدد الركاب', notesDestination: 'ملاحظات / الوجهة',
    hotelFlightPlaceholder: 'الفندق، الوجهة، رقم الرحلة…', saveThenWhatsapp: 'نحفظ طلبك أولاً، ثم يمكنك المتابعة عبر واتساب للتأكيد.',
    getFixedQuote: 'احصل على عرض سعر ثابت', sending: 'جارٍ الإرسال…', requestReceived: 'تم استلام الطلب', successTitle: 'تم تسجيل طلب رحلتك بأمان لدى فريق VIPCAR.',
    successCopy: 'سنؤكد التوفر وعرض السعر الثابت مباشرة. احتفظ بهذا الرقم لأي متابعة.', requestReference: 'مرجع الطلب',
    continueWhatsapp: 'المتابعة عبر واتساب', anotherRequest: 'إنشاء طلب آخر', serviceSelfDrive: 'قيادة ذاتية', serviceAirport: 'استقبال من المطار', serviceHourly: 'بالساعة أو باليوم',
    designedAroundTrip: 'مصمم حول رحلتك', mobilityTitle: 'تنقّل احترافي بلا مفاجآت.', back: 'رجوع', continue: 'متابعة',
    selectedVehicle: 'السيارة المختارة', reviewRequest: 'راجع طلبك', noImmediatePayment: 'لا يوجد دفع فوري',
    requestSavedWhatsapp: 'نحفظ طلبك أولاً، ثم نفتح واتساب ليؤكد فريق VIPCAR التفاصيل معك.',
    whatsappTitle: 'تواصل مع VIPCAR', whatsappPlaceholder: 'اكتب رسالتك…', whatsappSend: 'فتح واتساب', whatsappClose: 'إغلاق',
    whatsappHint: 'ستفتح رسالتك في واتساب.', whatsappDefault: 'مرحباً VIPCAR، أود الحصول على مزيد من المعلومات حول خدماتكم.',
  }
};

const services = [
  { key:'rental', icon:Car, image:'luxury-amg.jpg', title:['Car rental','Location de voiture','تأجير السيارات'], text:['Self-drive vehicles from economical city cars to premium models, delivered to your airport or hotel.','Des citadines économiques aux modèles premium, avec livraison à votre aéroport ou hôtel.','سيارات للقيادة الذاتية، من السيارات الاقتصادية إلى الطرازات المميزة، مع توصيل إلى المطار أو الفندق.'] },
  { key:'transfer', icon:Plane, image:'airport.jpg', title:['Airport transfers','Transferts aéroport','النقل من المطار'], text:['Meet-and-greet at Tunis-Carthage, Djerba-Zarzis and Enfidha-Hammamet airports, available 24/7.','Accueil aux aéroports Tunis-Carthage, Djerba-Zarzis et Enfidha-Hammamet, disponible 24h/24.','استقبال في مطارات تونس قرطاج وجربة جرجيس والنفيضة الحمامات، متاح على مدار الساعة.'] },
  { key:'chauffeur', icon:Users, image:'interior.jpg', title:['Private chauffeur','Chauffeur privé','سائق خاص'], text:['Professional English- and French-speaking drivers for business, events, touring or travel by the hour or day.','Chauffeurs professionnels francophones et anglophones pour affaires, événements ou circuits, à l’heure ou à la journée.','سائقون محترفون يتحدثون الإنجليزية والفرنسية للأعمال والفعاليات والجولات، بالساعة أو باليوم.'] }
];

const serviceSeoContent = {
  rental:{en:{eyebrow:'Car rental Tunisia',title:'A clear way to rent a car across Tunisia.',intro:'Choose the vehicle that fits your route, dates and passengers. VIPCAR coordinates airport or hotel delivery, confirms the exact availability and sends the final TND quote before you commit.',points:[['Short or long stays','Arrange a practical city car for a few days, a family SUV for a longer route or a premium vehicle for an important arrival.'],['Airport and hotel delivery','Tell us where you land or stay. The team confirms the handover point, timing and documents directly with you.'],['A fleet chosen around the journey','Compare compact, sedan, SUV, premium and group vehicles by seats, luggage and transmission.']]},fr:{eyebrow:'Location de voiture en Tunisie',title:'Louer une voiture en Tunisie, simplement.',intro:'Choisissez le véhicule adapté à votre itinéraire, à vos dates et à vos passagers. VIPCAR organise la livraison à l’aéroport ou à l’hôtel et confirme le devis final en TND avant votre engagement.',points:[['Courte ou longue durée','Une citadine pour quelques jours, un SUV familial pour un long trajet ou un véhicule premium pour une arrivée importante.'],['Livraison à l’aéroport ou à l’hôtel','Indiquez votre lieu d’arrivée ou de séjour. L’équipe confirme directement le point de remise, l’horaire et les documents.'],['Une flotte pensée pour votre trajet','Comparez citadines, berlines, SUV, véhicules premium et modèles pour groupes selon les places, les bagages et la boîte de vitesses.']]}},
  transfer:{en:{eyebrow:'Airport transfers Tunisia',title:'Arrive calmly. Leave the airport with a plan.',intro:'VIPCAR arranges private airport transfers between Tunisia’s main airports, hotels and destinations. Your driver follows the flight, meets you on arrival and confirms the fixed quote before travel.',points:[['Flight tracking','Share your flight number and the team can coordinate the pickup around the actual arrival time.'],['Meet-and-greet','Your driver meets you at the agreed arrival point and helps keep the first part of your journey clear.'],['Direct, fixed confirmation','The route, vehicle, passengers and final TND quote are agreed directly before your trip.']]},fr:{eyebrow:'Transferts aéroport en Tunisie',title:'Arrivez sereinement, dès la sortie de l’aéroport.',intro:'VIPCAR organise vos transferts privés entre les principaux aéroports tunisiens, les hôtels et les destinations. Votre chauffeur suit le vol, vous accueille à l’arrivée et confirme le devis fixe avant le départ.',points:[['Suivi du vol','Partagez votre numéro de vol afin que l’équipe coordonne la prise en charge selon l’heure réelle d’arrivée.'],['Accueil personnalisé','Votre chauffeur vous attend au point convenu et vous accompagne dès les premiers instants du séjour.'],['Confirmation directe et fixe','Le trajet, le véhicule, le nombre de passagers et le devis final en TND sont confirmés avant le départ.']]}},
  chauffeur:{en:{eyebrow:'Private chauffeur Tunisia',title:'A professional driver for the journeys that matter.',intro:'Book a private chauffeur for airport arrivals, business meetings, events or a full day of touring. VIPCAR confirms the schedule, vehicle and fixed quote directly with you.',points:[['By the hour or by the day','Choose the service duration that fits your itinerary, from a focused transfer to a full day of movement.'],['Professional and discreet','English- and French-speaking drivers coordinate the details with care and keep the service calm and punctual.'],['For business, events and touring','Use one trusted team for important meetings, special occasions or a relaxed way to discover Tunisia.']]},fr:{eyebrow:'Chauffeur privé en Tunisie',title:'Un chauffeur professionnel pour les trajets qui comptent.',intro:'Réservez un chauffeur privé pour une arrivée à l’aéroport, des rendez-vous professionnels, un événement ou un circuit à la journée. VIPCAR confirme directement votre programme, le véhicule et le devis fixe.',points:[['À l’heure ou à la journée','Choisissez la durée adaptée à votre itinéraire, d’un transfert ponctuel à une journée complète.'],['Professionnalisme et discrétion','Des chauffeurs francophones et anglophones coordonnent chaque détail avec calme et ponctualité.'],['Affaires, événements et circuits','Une seule équipe pour vos rendez-vous importants, vos occasions spéciales ou votre découverte de la Tunisie.']]}}
};

const serviceSeoArabic = {
  rental: {
    eyebrow: 'تأجير السيارات في تونس',
    title: 'طريقة واضحة لتأجير سيارة في مختلف أنحاء تونس.',
    intro: 'اختر السيارة المناسبة لمسارك وتواريخك وعدد الركاب. تنسق VIPCAR التوصيل إلى المطار أو الفندق وتؤكد التوفر والسعر النهائي بالدينار التونسي قبل الالتزام.',
    points: [
      ['إقامات قصيرة أو طويلة', 'سيارة مدينة عملية لبضعة أيام، أو سيارة دفع رباعي للعائلة لمسار أطول، أو سيارة مميزة لوصول مهم.'],
      ['توصيل إلى المطار أو الفندق', 'أخبرنا بمكان وصولك أو إقامتك، وسنؤكد معك نقطة التسليم والتوقيت والوثائق المطلوبة.'],
      ['أسطول مصمم حول الرحلة', 'قارن بين السيارات المدمجة والسيدان والدفع الرباعي والطرازات المميزة وسيارات المجموعات حسب المقاعد والأمتعة وناقل الحركة.'],
    ],
  },
  transfer: {
    eyebrow: 'النقل من مطارات تونس',
    title: 'وصول هادئ يبدأ بخطة واضحة.',
    intro: 'تنظم VIPCAR رحلات نقل خاصة بين المطارات الرئيسية والفنادق والوجهات التونسية. يتابع السائق رحلتك ويستقبلك عند الوصول مع تأكيد السعر الثابت قبل السفر.',
    points: [
      ['متابعة الرحلة', 'شارك رقم رحلتك حتى ننسق الاستقبال حسب وقت الوصول الفعلي.'],
      ['استقبال ومرافقة', 'يلتقي بك السائق في نقطة الوصول المتفق عليها ويساعدك على بدء رحلتك بسهولة.'],
      ['تأكيد مباشر وثابت', 'يتم الاتفاق على المسار والسيارة وعدد الركاب والسعر النهائي بالدينار التونسي قبل الرحلة.'],
    ],
  },
  chauffeur: {
    eyebrow: 'سائق خاص في تونس',
    title: 'سائق محترف للرحلات المهمة.',
    intro: 'احجز سائقاً خاصاً للوصول من المطار أو الاجتماعات أو الفعاليات أو جولة ليوم كامل. تؤكد VIPCAR البرنامج والسيارة والسعر الثابت مباشرة معك.',
    points: [
      ['بالساعة أو باليوم', 'اختر المدة التي تناسب برنامجك، من رحلة قصيرة إلى يوم كامل من التنقل.'],
      ['احتراف وخصوصية', 'سائقون يتحدثون الإنجليزية والفرنسية وينسقون التفاصيل بهدوء ودقة.'],
      ['للأعمال والفعاليات والجولات', 'فريق واحد موثوق لاجتماعاتك المهمة ومناسباتك الخاصة واكتشاف تونس براحة.'],
    ],
  },
};

const locations = ['Tunis-Carthage Airport','Tunis','Enfidha-Hammamet Airport','Sousse','Hammamet','Gabès','Djerba-Zarzis Airport','Nabeul','Bizerte'];
const commercialLocations = [
  { slug:'tunis', name:['Tunis','Tunis','تونس'], airport:'Tunis-Carthage Airport', image:'road-travel.jpg' },
  { slug:'djerba', name:['Djerba','Djerba','جربة'], airport:'Djerba-Zarzis Airport', image:'luxury-rear.jpg' },
  { slug:'sousse', name:['Sousse','Sousse','سوسة'], airport:'Enfidha-Hammamet Airport', image:'suv-white.jpg' },
  { slug:'hammamet', name:['Hammamet','Hammamet','الحمامات'], airport:'Enfidha-Hammamet Airport', image:'airport.jpg' },
  { slug:'gabes', name:['Gabès','Gabès','قابس'], airport:'Gabès', image:'road-travel.jpg' }
];
const chauffeurHubs = ['tunis','gabes','djerba'];

function routeInfo() {
  const parts = location.pathname.split('/').filter(Boolean);
  const lang = ['en', 'fr', 'ar'].includes(parts[0]) ? parts[0] : 'en';
  return { lang, parts: parts.slice(1), path: '/' + parts.slice(1).join('/') };
}

function link(lang, path='') { return `/${lang}${path}`; }
function img(name) { return `${ASSET}/${name}`; }
function go(path) { history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); scrollTo({top:0, behavior:'smooth'}); }

function SmartLink({href, children, className='', onClick, ...props}) {
  const external = href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:');
  const handleClick=e=>{if(!external)e.preventDefault(); onClick?.(e); if(!external)go(href)};
  return <a {...props} className={className} href={href} onClick={handleClick}>{children}</a>;
}

function readFormValues(form) {
  return Object.fromEntries(Array.from(form?.elements ?? []).filter((element) => element.name).map((element) => [element.name, element.value]));
}

function CurrencySelector({lang}) {
  const {currency, setCurrency} = useCurrency();
  const [open, setOpen] = useState(false);
  const selected = getCurrency(currency);
  useEffect(()=>{
    if(!open)return;
    const close=()=>setOpen(false);
    addEventListener('mousedown',close);
    return()=>removeEventListener('mousedown',close);
  },[open]);
  return <div className="currency-picker">
    <button type="button" className="currency-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={`${copy[lang].currencyLabel}: ${selected.code}`} onMouseDown={event=>event.stopPropagation()} onClick={()=>setOpen(previous=>!previous)}>
      <span>{selected.code}</span><ChevronDown size={13}/>
    </button>
    {open&&<div className="currency-menu" role="listbox" aria-label={copy[lang].currencyLabel} onMouseDown={event=>event.stopPropagation()}>
      {CURRENCIES.map(option=><button key={option.code} type="button" role="option" aria-selected={selected.code===option.code} className={selected.code===option.code?'active':''} onClick={()=>{setCurrency(option.code);setOpen(false);trackEvent('currency_change',{currency:option.code,language:lang})}}><span>{option.code}</span><small>{currencyNames[option.code][lang]||currencyNames[option.code].en}</small></button>)}
    </div>}
  </div>;
}

function FloatingWhatsApp({lang}) {
  const [open,setOpen]=useState(false);
  const t=copy[lang];
  const [message,setMessage]=useState(t.whatsappDefault);
  useEffect(()=>{setMessage(t.whatsappDefault)},[lang,t.whatsappDefault]);
  useEffect(()=>{
    if(!open)return;
    const closeOnEscape=event=>{if(event.key==='Escape')setOpen(false)};
    addEventListener('keydown',closeOnEscape);
    return()=>removeEventListener('keydown',closeOnEscape);
  },[open]);
  const send=()=>{
    const textValue=message.trim()||t.whatsappDefault;
    trackEvent('whatsapp_click',{location:'floating',language:lang});
    openWhatsAppQuote(textValue,WA);
  };
  return <div className={`floating-wa-wrap${open?' is-open':''}`}>
    {open&&<div id="floating-whatsapp-panel" className="floating-wa-panel" role="dialog" aria-labelledby="floating-whatsapp-title">
      <div className="floating-wa-panel-head">
        <div><p className="overline">{t.contactLabel}</p><h3 id="floating-whatsapp-title">{t.whatsappTitle}</h3></div>
        <button type="button" className="floating-wa-close" aria-label={t.whatsappClose} onClick={()=>setOpen(false)}><X size={17}/></button>
      </div>
      <textarea autoFocus rows="4" value={message} onChange={event=>setMessage(event.target.value)} placeholder={t.whatsappPlaceholder} aria-label={t.whatsappPlaceholder}/>
      <p className="floating-wa-hint">{t.whatsappHint}</p>
      <button type="button" className="button floating-wa-send" onClick={send}>{t.whatsappSend}<MessageCircle size={17}/></button>
    </div>}
    <button type="button" className="floating-wa" aria-expanded={open} aria-controls="floating-whatsapp-panel" aria-label={open?t.whatsappClose:t.whatsapp} onClick={()=>setOpen(previous=>!previous)}>
      {open?<X size={22}/>:<MessageCircle size={22}/>}
    </button>
  </div>;
}

function Header({lang,home=false}) {
  const [open,setOpen]=useState(false); const [languageOpen,setLanguageOpen]=useState(false); const t=copy[lang];
  const navPaths=['/services/rental','/services/transfer','/services/chauffeur','/fleet','/corporate','/destinations','/about'];
  const currentPath=location.pathname.replace(/^\/(en|fr|ar)/,'')||'/';
  useEffect(()=>{document.body.style.overflow=open?'hidden':''; return()=>{document.body.style.overflow=''}},[open]);
  useEffect(()=>{if(!languageOpen)return; const close=()=>setLanguageOpen(false); addEventListener('mousedown',close); return()=>removeEventListener('mousedown',close)},[languageOpen]);
  const switchLanguage=next=>{setLanguageOpen(false);go(link(next,location.pathname.replace(/^\/(en|fr|ar)/,'')))};
  return <>
    <div className="utility"><span><Clock3 size={13}/> 24/7 · Tunis · Gabès · Djerba</span><a href="tel:+21655771077" onClick={()=>trackEvent('phone_click',{location:'utility',language:lang})}>{PHONE}</a></div>
    <header className={home?'header header--home':'header'}>
      <SmartLink href={link(lang)} className="brand-logo brand-logo--header" aria-label="VIPCAR Tunisia home"><img src={home?LOGO_LIGHT:LOGO} alt="VIPCAR Tunisia" /></SmartLink>
      <nav id="primary-navigation" className={open?'nav open':'nav'} aria-label="Primary navigation">{t.nav.map((n,i)=>{const path=navPaths[i]; const active=currentPath===path||currentPath.startsWith(`${path}/`); return <SmartLink key={n} href={link(lang,path)} aria-current={active?'page':undefined} onClick={()=>setOpen(false)}>{n}</SmartLink>})}</nav>
      <div className="header-actions">
        <div className="language-picker"><button type="button" className="language-trigger" aria-haspopup="listbox" aria-expanded={languageOpen} aria-label={text(lang,'Select language','Choisir la langue','اختيار اللغة')} onMouseDown={event=>event.stopPropagation()} onClick={()=>setLanguageOpen(previous=>!previous)}><Languages size={16}/><span>{lang.toUpperCase()}</span><ChevronDown size={13}/></button>{languageOpen&&<div className="language-menu" role="listbox" aria-label={text(lang,'Languages','Langues','اللغات')} onMouseDown={event=>event.stopPropagation()}>{LANGUAGES.map(option=><button key={option.code} type="button" role="option" aria-selected={lang===option.code} className={lang===option.code?'active':''} onClick={()=>switchLanguage(option.code)}><span>{option.code.toUpperCase()}</span><small>{option.native}</small></button>)}</div>}</div>
        <CurrencySelector lang={lang}/>
        <a className="icon-link" href={WA} aria-label="WhatsApp" onClick={()=>trackEvent('whatsapp_click',{location:'header',language:lang})}><MessageCircle size={20}/></a>
        <SmartLink className="button button-small" href={link(lang,'/booking')}>{t.book}<ArrowRight size={16}/></SmartLink>
        <button className="menu" onClick={()=>setOpen(previous=>!previous)} aria-label="Toggle menu" aria-expanded={open} aria-controls="primary-navigation">{open?<X/>:<Menu/>}</button>
      </div>
    </header>
  </>;
}

function Footer({lang}) { const t=copy[lang]; return <footer>
  <div className="footer-top"><div><SmartLink href={link(lang)} className="brand-logo brand-logo--footer" aria-label="VIPCAR Tunisia home"><img src={LOGO_LIGHT} alt="VIPCAR Tunisia" /></SmartLink><p>{t.footer}</p></div><div><strong>{t.servicesLabel}</strong><SmartLink href={link(lang,'/services/rental')}>{t.nav[0]}</SmartLink><SmartLink href={link(lang,'/services/transfer')}>{t.nav[1]}</SmartLink><SmartLink href={link(lang,'/services/chauffeur')}>{t.nav[2]}</SmartLink></div><div><strong>{t.exploreLabel}</strong><SmartLink href={link(lang,'/fleet')}>{t.nav[3]}</SmartLink><SmartLink href={link(lang,'/corporate')}>{t.nav[4]}</SmartLink><SmartLink href={link(lang,'/my-bookings')}>{t.myBookings}</SmartLink><SmartLink href={link(lang,'/blog')}>{t.journal}</SmartLink><SmartLink href={link(lang,'/about')}>{t.nav[6]}</SmartLink></div><div><strong>{t.contactLabel}</strong><a href="tel:+21655771077" onClick={()=>trackEvent('phone_click',{location:'footer',language:lang})}>{PHONE}</a><a href={WA} onClick={()=>trackEvent('whatsapp_click',{location:'footer',language:lang})}>WhatsApp</a><a href="mailto:info@vipcar.com.tn" onClick={()=>trackEvent('email_click',{location:'footer',language:lang})}>info@vipcar.com.tn</a><span>Rue de la Feuille d'Érable<br/>Lac 2, Tunis</span></div></div>
  <p className="currency-note">{t.currencyNote}</p>
  <div className="footer-bottom"><span>© 2026 VIPCAR Tunisia</span><div><SmartLink href={link(lang,'/legal/terms-conditions')}>{t.terms}</SmartLink><SmartLink href={link(lang,'/legal/privacy-policy')}>{t.privacy}</SmartLink><SmartLink href={link(lang,'/legal/cancellation-policy')}>{t.cancellation}</SmartLink></div></div>
  </footer> }

function QuoteSuccess({lang,request,compact=false,onWhatsApp,onReset}) {
  const t=copy[lang];
  const accountUser=getStoredUser();
  return <section className={`quote-success${compact?' quote-success--compact':''}`} aria-live="polite">
    <div className="quote-success-mark" aria-hidden="true"><Check size={19}/></div>
    <p className="overline">{t.requestReceived}</p>
    <h3>{t.successTitle}</h3>
    <p className="quote-success-copy">{t.successCopy}</p>
    <div className="quote-success-reference"><span>{t.requestReference}</span><strong>{request.reference}</strong></div>
    {accountUser?.role==='customer'&&<p className="quote-success-account">{text(lang,'This request is linked to your VIPCAR account and will appear in My bookings once confirmed.','Cette demande est liée à votre compte VIPCAR et apparaîtra dans Mes réservations une fois confirmée.','هذا الطلب مرتبط بحسابك في VIPCAR وسيظهر في حجوزاتي بعد تأكيده.')}</p>}
    <div className="quote-success-actions">
      <button type="button" className="button" onClick={onWhatsApp}>{t.continueWhatsapp}<MessageCircle size={17}/></button>
      <button type="button" className="quote-success-reset" onClick={onReset}>{t.anotherRequest}</button>
    </div>
  </section>
}

function QuoteWidget({lang,compact=false,selectedVehicle=null,serviceType=null}) {
  const [service,setService]=useState(serviceType||'rental');
  const [step,setStep]=useState(1);
  const [data,setData]=useState({pickup:locations[0],dropoff:'',date:'',endDate:'',flightNumber:'',duration:'full-day',passengers:'2',name:'',phone:'',email:'',notes:''});
  const [error,setError]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [success,setSuccess]=useState(null);
  useEffect(()=>{initAnalytics()},[]);
  const today=new Date().toISOString().slice(0,10);
  const t=copy[lang];
  const {currency}=useCurrency();
  const action=t.getFixedQuote;
  const fixedService=serviceType?services.find(item=>item.key===serviceType):null;
  const FixedServiceIcon=fixedService?.icon;
  const update=e=>setData(previous=>({...previous,[e.target.name]:e.target.value}));
  const chooseService=key=>{
    setService(key);
    setStep(1);
    setError('');
    trackEvent('service_selected',{service:key,language:lang,location:compact?'compact_quote':'quote'});
  };
  const validateTrip=(values=data)=>{
    if(!values.pickup||!values.date){
      setError(text(lang,'Please choose your pick-up point and date.','Choisissez votre lieu de départ et votre date.','اختر مكان الاستلام والتاريخ.'));
      return false;
    }
    if(service==='rental'&&!values.endDate){
      setError(text(lang,'Please choose a return date for your rental.','Choisissez une date de retour pour votre location.','اختر تاريخ عودة السيارة.'));
      return false;
    }
    if(service==='transfer'&&!values.dropoff){
      setError(text(lang,'Please add your destination for the airport transfer.','Ajoutez votre destination pour le transfert aéroport.','أضف وجهتك لنقل المطار.'));
      return false;
    }
    if(!values.passengers||Number(values.passengers)<1||Number(values.passengers)>50){
      setError(text(lang,'Please enter the number of passengers.','Indiquez le nombre de passagers.','أدخل عدد الركاب.'));
      return false;
    }
    return true;
  };
  const goToContact=e=>{
    const formValues=readFormValues(e.currentTarget.form);
    const nextData={...data,...formValues};
    if(validateTrip(nextData)){setData(nextData);setError('');setStep(2)}
  };
  const submit=async(e)=>{
    e.preventDefault();
    if(submitting)return;
    setError('');
    const submittedData={...data,...readFormValues(e.currentTarget)};
    const pickup=String(submittedData.pickup||'').trim();
    const dropoff=String(submittedData.dropoff||'').trim()||undefined;
    const startDate=String(submittedData.date||'').trim();
    const endRaw=String(submittedData.endDate||'').trim();
    const name=String(submittedData.name||'').trim();
    const phone=String(submittedData.phone||'').trim();
    const email=String(submittedData.email||'').trim()||undefined;
    const flightNumber=service==='transfer'?String(submittedData.flightNumber||'').trim()||undefined:undefined;
    const notes=String(submittedData.notes||'').trim()||undefined;
    const passengers=Number(submittedData.passengers);
    const durationValue=service==='chauffeur'?submittedData.duration:undefined;
    if(!name||!phone){
      setError(text(lang,'Please enter your name and phone number.','Indiquez votre nom et votre numéro de téléphone.','أدخل اسمك ورقم هاتفك.'));
      return;
    }
    if(!validateTrip(submittedData))return;
    const body={
      service,
      ...(selectedVehicle&&service==='rental'?{vehicleSlug:selectedVehicle.slug}:{}),
      pickup,
      ...(dropoff?{dropoff}:{}),
      startDate,
      ...(service==='rental'?{endDate:endRaw}:{}),
      ...(durationValue?{duration:durationValue}:{}),
      ...(Number.isInteger(passengers)?{passengers}:{}),
      ...(flightNumber?{flightNumber}:{}),
      ...(notes?{notes}:{}),
      name,
      phone,
      ...(email?{email}:{}),
      locale:lang,
      channel:'web',
    };
    setSubmitting(true);
    try{
      const response=await createQuote(body,{locale:lang});
      const quote=response?.data;
      const reference=formatQuoteReference(quote?.id);
      const whatsappText=`${buildWhatsAppQuoteMessage({
        service,
        vehicleName:selectedVehicle&&service==='rental'?selectedVehicle.name:undefined,
        pickup,
        dropoff,
        startDate,
        endDate:body.endDate,
        duration:durationValue,
        passengers,
        flightNumber,
        name,
        phone,
        email,
        notes,
      })} Reference: ${reference}.`;
      setSuccess({reference,whatsappText});
      trackEvent('quote_submit',{service,language:lang,location:compact?'compact_quote':'quote',vehicle:selectedVehicle?.slug});
    }catch(err){
      setError(quoteErrorMessage(err,lang));
    }finally{
      setSubmitting(false);
    }
  };
  const reset=()=>{
    setSuccess(null);
    setError('');
    setStep(1);
    setData({pickup:locations[0],dropoff:'',date:'',endDate:'',flightNumber:'',duration:'full-day',passengers:'2',name:'',phone:'',email:'',notes:''});
  };
  if(success)return <QuoteSuccess lang={lang} request={success} compact={compact} onWhatsApp={()=>openWhatsAppQuote(success.whatsappText,WA)} onReset={reset}/>;
  return <form className={compact?'quote compact':'quote'} onSubmit={submit}>
    <div className="quote-heading"><div className="quote-heading-copy"><p className="overline">{t.startTrip}</p><h3>{t.whatArranging}</h3><p className="quote-intro">{t.quoteIntro}</p></div><span><ShieldCheck size={15}/>{t.noPayment}</span></div>
    <div className="quote-progress" aria-label={text(lang,'Quote steps','Étapes du devis','خطوات عرض السعر')}><span className={step===1?'active':''}>01 <b>{t.tripStep}</b></span><i/><span className={step===2?'active':''}>02 <b>{t.contactStep}</b></span></div>
    {selectedVehicle&&<div className="quote-selected-vehicle" aria-label={`${t.selectedVehicle}: ${selectedVehicle.name}`}><Car size={20}/><span><small>{t.selectedVehicle}</small><strong>{selectedVehicle.name}</strong></span><b>{formatCurrency(selectedVehicle.price,currency,lang)} {t.day}</b></div>}
    {step===1&&<div className="quote-step" aria-labelledby="quote-trip-heading">
      <h4 id="quote-trip-heading">{t.tripStep}</h4>
      {fixedService&&FixedServiceIcon?<div className="quote-service-fixed" aria-label={`${text(lang,'Selected service','Service sélectionné','الخدمة المختارة')}: ${fixedService.title[languageIndex(lang)]}`}><FixedServiceIcon size={20}/><span><small>{text(lang,'Selected service','Service sélectionné','الخدمة المختارة')}</small><strong>{fixedService.title[languageIndex(lang)]}</strong></span><b>{fixedService.key==='rental'?t.serviceSelfDrive:fixedService.key==='transfer'?t.serviceAirport:t.serviceHourly}</b></div>:<div className="quote-service-choice" role="group" aria-label={text(lang,'Choose a service','Choisir un service','اختر خدمة')}>{services.map(s=>{const Icon=s.icon;return <button type="button" className={service===s.key?'active':''} aria-pressed={service===s.key} onClick={()=>chooseService(s.key)} key={s.key}><Icon size={20}/><span><strong>{s.title[languageIndex(lang)]}</strong><small>{s.key==='rental'?t.serviceSelfDrive:s.key==='transfer'?t.serviceAirport:t.serviceHourly}</small></span></button>})}</div>}
      <div className="quote-fields quote-trip-fields">
        <label><span><MapPin size={15}/>{t.whereMeet}</span><select name="pickup" value={data.pickup} onChange={update} required aria-label={t.whereMeet}>{locations.map(x=><option key={x} value={x}>{locationLabel(x,lang)}</option>)}</select></label>
        <label><span><MapPin size={15}/>{t.dropoff}</span><select name="dropoff" value={data.dropoff} onChange={update} required={service==='transfer'} aria-label={t.dropoff}><option value="">{text(lang,'Select a destination','Sélectionner une destination','اختر وجهة')}</option>{locations.map(x=><option key={x} value={x}>{locationLabel(x,lang)}</option>)}</select></label>
        <label><span><CalendarDays size={15}/>{t.when}</span><input required name="date" value={data.date} onChange={update} type="date" min={today}/></label>
        {service==='rental'&&<label><span><CalendarDays size={15}/>{t.returnDate}</span><input required name="endDate" value={data.endDate} onChange={update} type="date" min={data.date||today}/></label>}
        {service==='chauffeur'&&<label><span><Clock3 size={15}/>{t.serviceDuration}</span><select name="duration" value={data.duration} onChange={update}><option value="hourly">{text(lang,'By the hour','À l’heure','بالساعة')}</option><option value="half-day">{text(lang,'Half day','Demi-journée','نصف يوم')}</option><option value="full-day">{text(lang,'Full day','Journée complète','يوم كامل')}</option></select></label>}
        {service==='transfer'&&<label><span><Plane size={15}/>{t.flightNumber}</span><input name="flightNumber" value={data.flightNumber} onChange={update} placeholder="TU1234"/></label>}
        <label><span><Users size={15}/>{t.passengers}</span><input required name="passengers" value={data.passengers} onChange={update} type="number" min="1" max="50"/></label>
      </div>
      {error&&<p className="form-feedback form-feedback-error" role="alert">{error}</p>}
      <div className="quote-step-actions"><button className="button" type="button" onClick={goToContact}>{t.continueToContact}<ArrowRight size={17}/></button></div>
    </div>}
    {step===2&&<div className="quote-step" aria-labelledby="quote-contact-heading">
      <h4 id="quote-contact-heading">{t.contactStep}</h4>
      <div className="quote-review"><span>{t.reviewTrip}</span><strong>{services.find(s=>s.key===service)?.title[languageIndex(lang)]}{selectedVehicle&&service==='rental'?` · ${selectedVehicle.name}`:''}</strong><small>{data.pickup}{data.dropoff?` → ${data.dropoff}`:''} · {data.date}{service==='rental'&&data.endDate?` → ${data.endDate}`:''} · {data.passengers} {t.passengers.toLowerCase()}</small></div>
      <div className="quote-fields quote-contact-fields">
        <label><span><Users size={15}/>{t.yourName}</span><input required name="name" value={data.name} onChange={update} placeholder={t.fullName} autoComplete="name"/></label>
        <label><span><MessageCircle size={15}/>{t.phoneWhatsapp}</span><input required name="phone" value={data.phone} onChange={update} type="tel" placeholder="+216…" autoComplete="tel"/></label>
        <label><span>{t.email}</span><input name="email" value={data.email} onChange={update} type="email" placeholder="name@example.com" autoComplete="email"/></label>
        <label className="quote-contact-wide"><span><MapPin size={15}/>{t.notesDestination}</span><textarea name="notes" value={data.notes} onChange={update} placeholder={t.hotelFlightPlaceholder}/></label>
      </div>
      {error&&<p className="form-feedback form-feedback-error" role="alert">{error}</p>}
      <div className="quote-step-actions"><button className="quote-back" type="button" onClick={()=>{setError('');setStep(1)}}>{t.back}</button><button className="button" type="submit" disabled={submitting}>{submitting?t.sending:action}{!submitting&&<ArrowRight size={17}/>}</button></div>
    </div>}
    <p className="quote-note"><span>{t.saveThenWhatsapp}</span></p>
  </form>
}

function VehicleCard({car,lang,loading='lazy'}) { const t=copy[lang]; const {currency}=useCurrency(); return <article className="vehicle-card">
  <SmartLink href={link(lang,`/fleet/${car.slug}`)} className="vehicle-image"><span>{tierLabel(car.tier,lang)}</span><img loading={loading} decoding="async" src={img(car.image)} alt={car.name}/></SmartLink>
  <div className="vehicle-body"><p className="overline">{categoryLabel(car.cat,lang)}</p><h3>{car.name}</h3><div className="spec-row"><span><Users size={16}/>{car.seats} {t.seats}</span><span><SlidersHorizontal size={16}/>{transmissionLabel(car.transmission,lang)}</span></div><div className="vehicle-foot"><p>{t.from} <strong>{formatCurrency(car.price,currency,lang)}</strong> {t.day}</p><SmartLink href={link(lang,`/fleet/${car.slug}`)} aria-label={`${t.explore} ${car.name}`}><ArrowRight/></SmartLink></div></div>
  </article> }

function SectionHead({eyebrow,title,text,action}) { return <div className="section-head"><div>{eyebrow&&<p className="overline">{eyebrow}</p>}<h2>{title}</h2>{text&&<p>{text}</p>}</div>{action}</div> }

function Home({lang}) { const t=copy[lang], fi=languageIndex(lang); return <>
  <section className="hero"><img src={img('hero-mercedes.jpg')} alt="Mercedes vehicle in Tunisia"/><div className="hero-shade"/><div className="hero-content"><p className="eyebrow-light">{t.eyebrow}</p><h1>{t.hero}</h1><p>{t.heroSub}</p><div className="hero-actions"><SmartLink className="button" href={link(lang,'/booking')}>{t.book}<ArrowRight size={18}/></SmartLink><SmartLink className="text-link light" href={link(lang,'/fleet')}>{t.explore}<ArrowRight size={17}/></SmartLink></div></div><div className="hero-place"><MapPin size={16}/> Tunis · Djerba · Gabès</div></section>
  <div className="quote-wrap home-quote-wrap"><QuoteWidget lang={lang} compact/></div>
  <section className="trust"><div><strong>100+</strong><span>{t.vehiclesFleet}</span></div><div><strong>24/7</strong><span>{t.assistanceEveryDay}</span></div><div><strong>3</strong><span>{t.hubsTunisia}</span></div><div><Plane/><span>{t.airportPickup}</span></div></section>
  <section className="section services"><SectionHead eyebrow={t.serviceEyebrow} title={t.serviceTitle} text={t.serviceSub}/><div className="service-grid">{services.map(s=>{const Icon=s.icon;return <SmartLink className="service-card" href={link(lang,`/services/${s.key}`)} key={s.key}><img loading="lazy" src={img(s.image)} alt={s.title[fi]}/><div className="service-overlay"><Icon/><h3>{s.title[fi]}</h3><p>{s.text[fi]}</p><span>{t.discover}<ArrowRight/></span></div></SmartLink>})}</div></section>
  <section className="section fleet-section"><SectionHead title={t.fleetTitle} text={t.fleetSub} action={<SmartLink className="text-link" href={link(lang,'/fleet')}>{t.allFleet}<ArrowRight size={17}/></SmartLink>}/><div className="vehicle-grid featured">{fleet.slice(0,4).map(c=><VehicleCard key={c.slug} car={c} lang={lang} loading="eager"/>)}</div></section>
  <section className="split-story"><div className="story-image"><img loading="lazy" src={img('road-travel.jpg')} alt={text(lang,'Road travel in Tunisia','Route en Tunisie','رحلة على الطرق التونسية')}/></div><div className="story-copy"><p className="overline">{t.homeStandard}</p><h2>{t.why}</h2><p>{t.whySub}</p><div className="values"><div><Headphones/><strong>24/7</strong><span>{t.directAssistance}</span></div><div><ShieldCheck/><strong>{t.clearQuotes}</strong><span>{t.confirmedBeforeTravel}</span></div><div><MapPin/><strong>{t.localTeam}</strong><span>Tunis · Gabès · Djerba</span></div></div><SmartLink className="text-link" href={link(lang,'/about')}>{t.meetVipcar}<ArrowRight size={17}/></SmartLink></div></section>
   <section className="section journal"><SectionHead eyebrow={t.travelJournal} title={t.guide}/><div className="journal-grid"><GuideCard image="road-travel.jpg" tag={text(lang,'Car rental guide','Guide location','دليل تأجير السيارات')} title={text(lang,'Renting a car in Tunisia: what to know','Louer une voiture en Tunisie : l’essentiel','تأجير سيارة في تونس: ما يجب معرفته')} slug="car-rental-tunisia-guide" lang={lang}/><GuideCard image="airport.jpg" tag={text(lang,'Airport guide','Guide aéroport','دليل المطار')} title={text(lang,'Arriving at Tunis-Carthage Airport','Arriver à l’aéroport Tunis-Carthage','الوصول إلى مطار تونس قرطاج')} slug="tunis-carthage-airport-guide" lang={lang}/><GuideCard image="hero-mercedes.jpg" tag={text(lang,'Travel planning','Préparer son voyage','التخطيط للسفر')} title={text(lang,'Choosing the right car for your itinerary','Choisir la voiture adaptée à votre circuit','اختيار السيارة المناسبة لمسارك')} slug="choosing-a-car-in-tunisia" lang={lang}/></div></section>
  <Faq lang={lang}/><Cta lang={lang}/>
  </> }

function GuideCard({image,tag,title,lang,slug='car-rental-tunisia-guide'}) { return <SmartLink className="guide-card" href={link(lang,`/blog/${slug}`)}><img loading="lazy" src={img(image)} alt={title}/><p className="overline">{tag}</p><h3>{title}</h3><span>{copy[lang].readGuide}<ArrowRight size={16}/></span></SmartLink> }

const faqs={
  en:[['What documents do I need to rent a car?','A valid driving licence held for at least one year, your passport or ID, and a bank card. An International Driving Permit is recommended if your licence is not in the Latin alphabet.'],['Can VIPCAR meet me at the airport?','Yes. VIPCAR serves Tunis-Carthage, Djerba-Zarzis and Enfidha-Hammamet airports. Transfer drivers track your flight and meet you in arrivals.'],['Is a security deposit required?','Yes. The refundable security deposit depends on the vehicle and is confirmed before booking. It is released after the car is returned in good condition.'],['Can a car be delivered to my hotel?','Yes. Hotel and airport delivery can be arranged across the operating areas and elsewhere in Tunisia on request.']],
  fr:[['Quels documents faut-il pour louer ?','Un permis valide depuis au moins un an, votre passeport ou pièce d’identité et une carte bancaire. Le permis international est conseillé si votre permis n’utilise pas l’alphabet latin.'],['VIPCAR peut-il m’accueillir à l’aéroport ?','Oui. VIPCAR dessert Tunis-Carthage, Djerba-Zarzis et Enfidha-Hammamet. Pour un transfert, votre chauffeur suit votre vol et vous attend aux arrivées.'],['Une caution est-elle demandée ?','Oui. Son montant dépend du véhicule et vous est communiqué avant la réservation. Elle est libérée après le retour du véhicule en bon état.'],['La voiture peut-elle être livrée à mon hôtel ?','Oui. La livraison à l’hôtel ou à l’aéroport est disponible dans les zones desservies et ailleurs en Tunisie sur demande.']],
  ar:[['ما الوثائق المطلوبة لتأجير سيارة؟','رخصة قيادة سارية منذ سنة على الأقل، وجواز سفر أو بطاقة هوية، وبطاقة دفع. يُنصح برخصة قيادة دولية إذا كانت الرخصة ليست بالأبجدية اللاتينية.'],['هل يمكن لـ VIPCAR استقبالي في المطار؟','نعم. نخدم مطارات تونس قرطاج وجربة جرجيس والنفيضة الحمامات. يتابع سائق النقل رحلتك وينتظرك عند الوصول.'],['هل يُطلب مبلغ تأمين؟','نعم. يختلف مبلغ التأمين القابل للاسترداد حسب السيارة ويُؤكد قبل الحجز، ثم يُعاد بعد إرجاع السيارة بحالة جيدة.'],['هل يمكن توصيل السيارة إلى الفندق؟','نعم. يمكن ترتيب التوصيل إلى الفندق أو المطار في مناطق الخدمة وفي وجهات أخرى داخل تونس عند الطلب.']]
};
function Faq({lang}) { return <section className="section faq"><SectionHead eyebrow="FAQ" title={copy[lang].faq}/><div>{faqs[lang].map(([q,a])=><details key={q}><summary>{q}<ChevronDown/></summary><p>{a}</p></details>)}</div></section> }
function Cta({lang}) { const t=copy[lang]; return <section className="cta"><div><p className="overline">{text(lang,'Your trip, clearly arranged','Votre trajet, simplement organisé','رحلتك، منظمة بوضوح')}</p><h2>{t.quoteTitle}</h2><p>{t.quoteSub}</p></div><div><SmartLink className="button button-light" href={link(lang,'/booking')}>{t.book}<ArrowRight size={18}/></SmartLink><a className="text-link light" href={WA}>{t.whatsapp}<MessageCircle size={17}/></a></div></section> }

function FleetPage({lang}) {
  const [cat,setCat]=useState('All');
  const [vehicles,setVehicles]=useState([]);
  const [source,setSource]=useState('api');
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const ac=new AbortController();
    setLoading(true);
    loadFleet({signal:ac.signal}).then(result=>{
      if(ac.signal.aborted)return;
      setVehicles(result.vehicles);
      setSource(result.source);
      setLoading(false);
    }).catch(()=>{ /* aborted */ });
    return()=>ac.abort();
  },[]);
  const list=cat==='All'?vehicles:vehicles.filter(c=>c.cat===cat);
  return <main className="page"><PageHero image="luxury-rear.jpg" eyebrow={text(lang,'VIPCAR fleet','Flotte VIPCAR','أسطول VIPCAR')} title={text(lang,'Find your car for Tunisia.','Trouvez votre voiture en Tunisie.','اعثر على سيارتك في تونس.')} text={copy[lang].fleetSub}/><section className="section"><div className="filter-row" role="group" aria-label={text(lang,'Filter vehicles by category','Filtrer les véhicules par catégorie','تصفية السيارات حسب الفئة')}>{FLEET_CATEGORIES.map(c=><button type="button" key={c} onClick={()=>setCat(c)} className={cat===c?'active':''} aria-pressed={cat===c}>{categoryLabel(c,lang)}</button>)}</div>{source==='seed'&&!loading&&<p className="form-feedback catalog-notice" role="status">{fleetOfflineMessage(lang)}</p>}{loading?<p className="filter-result" aria-live="polite">{text(lang,'Loading fleet…','Chargement de la flotte…','جارٍ تحميل الأسطول…')}</p>:<><p className="filter-result" aria-live="polite">{list.length} {text(lang,'vehicles shown','véhicules affichés','سيارة معروضة')}</p><div className="vehicle-grid">{list.map(c=><VehicleCard key={c.slug} car={c} lang={lang}/>)}</div></>}</section><Faq lang={lang}/><Cta lang={lang}/></main>;
}

function PageHero({image,title,text,eyebrow}) { return <section className="page-hero"><img loading="eager" fetchPriority="high" decoding="async" src={img(image)} alt={title}/><div className="hero-shade"/><div><p>{eyebrow}</p><h1>{title}</h1><span>{text}</span></div></section> }

function ServiceSeoContent({lang,type}) { const data=serviceSeoContent[type]?.[lang] ?? serviceSeoArabic[type]; if(!data)return null; return <section className="section seo-content"><div className="seo-content-intro"><p className="overline">{data.eyebrow}</p><h2>{data.title}</h2><p>{data.intro}</p></div><div className="seo-content-points">{data.points.map(([title,text],index)=><article key={title}><span>0{index+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section> }

function LocalSeoContent({lang,item,airport=false}) {
  const displayName = item.name[languageIndex(lang)];
  const airportName = locationLabel(item.airport, lang);
  const title = airport
    ? text(lang, `Airport transfers from ${item.airport}.`, `Transferts depuis ${item.airport}.`, `النقل من ${airportName}.`)
    : text(lang, `Car rental in ${item.name[0]}, arranged around your route.`, `Location de voiture à ${item.name[1]}, organisée selon votre trajet.`, `تأجير السيارات في ${displayName} بما يناسب مسارك.`);
  const intro = airport
    ? text(lang, `Whether you are heading to a hotel, a private residence or another Tunisian destination, VIPCAR confirms the pickup point, flight details, vehicle and fixed TND quote before you travel.`, `Que vous rejoigniez un hôtel, une résidence ou une autre destination tunisienne, VIPCAR confirme le point de prise en charge, le vol, le véhicule et le devis fixe en TND avant le départ.`, `سواء كنت متوجهاً إلى فندق أو إقامة خاصة أو وجهة تونسية أخرى، تؤكد VIPCAR نقطة الاستقبال وتفاصيل الرحلة والسيارة والسعر الثابت بالدينار التونسي قبل السفر.`)
    : text(lang, `Collect or receive your vehicle in ${item.name[0]} with a local team coordinating the practical details. Airport, hotel and alternative delivery requests are confirmed around your dates and itinerary.`, `Récupérez ou recevez votre véhicule à ${item.name[1]} avec une équipe locale qui coordonne les détails pratiques. Les demandes de livraison à l’aéroport, à l’hôtel ou ailleurs sont confirmées selon vos dates et votre itinéraire.`, `استلم سيارتك أو اطلب توصيلها في ${displayName} مع فريق محلي ينسق التفاصيل العملية. نؤكد طلبات التوصيل إلى المطار أو الفندق أو أي نقطة أخرى حسب تواريخك ومسارك.`);
  const points = airport
    ? (lang === 'en'
      ? [['Before you land', 'Share your flight number, arrival time and destination so the team can prepare the right pickup.'], ['A clear handover', 'Your driver confirms where to meet, who to call and what happens if the flight changes.'], ['Beyond the airport', 'Continue to your hotel, business meeting or next destination with a route agreed in advance.']]
      : lang === 'fr'
        ? [['Avant votre arrivée', 'Partagez votre numéro de vol, votre heure d’arrivée et votre destination pour préparer la prise en charge.'], ['Une remise claire', 'Votre chauffeur confirme le lieu de rendez-vous, le contact et la marche à suivre en cas de changement de vol.'], ['Au-delà de l’aéroport', 'Rejoignez votre hôtel, un rendez-vous professionnel ou une autre destination selon un trajet confirmé.']]
        : [['قبل الوصول', 'شارك رقم رحلتك ووقت الوصول والوجهة حتى يجهز الفريق الاستقبال المناسب.'], ['تسليم واضح', 'يؤكد السائق مكان اللقاء ووسيلة التواصل وما يجب فعله عند تغير الرحلة.'], ['ما بعد المطار', 'واصل إلى الفندق أو اجتماع العمل أو وجهتك التالية وفق مسار متفق عليه مسبقاً.']])
    : (lang === 'en'
      ? [['Choose by trip', 'Select a compact car, sedan, SUV or premium vehicle according to your passengers, luggage and roads.'], ['Delivery or collection', 'The team confirms the practical handover details for your hotel, airport or chosen point.'], ['One local contact', 'Ask about availability, rental conditions and the final quote before you travel.']]
      : lang === 'fr'
        ? [['Choisissez selon le trajet', 'Sélectionnez une citadine, une berline, un SUV ou un véhicule premium selon vos passagers, bagages et routes.'], ['Livraison ou prise en charge', 'L’équipe confirme les détails pratiques pour votre hôtel, l’aéroport ou le point de votre choix.'], ['Un contact local', 'Demandez la disponibilité, les conditions de location et le devis final avant votre départ.']]
        : [['اختر حسب الرحلة', 'اختر سيارة مدمجة أو سيدان أو دفع رباعي أو سيارة مميزة حسب الركاب والأمتعة والطرق.'], ['التوصيل أو الاستلام', 'يؤكد الفريق تفاصيل التسليم العملية للفندق أو المطار أو النقطة التي تختارها.'], ['جهة اتصال محلية واحدة', 'اسأل عن التوفر وشروط التأجير وعرض السعر النهائي قبل السفر.']]);
  return <section className="section seo-content local-seo-content"><div className="seo-content-intro"><p className="overline">{displayName} · VIPCAR</p><h2>{title}</h2><p>{intro}</p></div><div className="seo-content-points">{points.map(([heading,pointText],index)=><article key={heading}><span>0{index+1}</span><h3>{heading}</h3><p>{pointText}</p></article>)}</div></section>;
}

function ServicePage({lang,type}) { const fi=languageIndex(lang); const s=services.find(x=>x.key===type)||services[0]; const details={rental:[['Short and long-term rentals','Locations courte et longue durée','تأجير قصير أو طويل الأمد'],['Airport and hotel delivery','Livraison à l’aéroport et à l’hôtel','توصيل إلى المطار أو الفندق'],['Economy to luxury fleet','Flotte économique à premium','أسطول من الاقتصادي إلى الفاخر']],transfer:[['Flight tracking and meet-and-greet','Suivi du vol et accueil personnalisé','متابعة الرحلة والاستقبال الشخصي'],['Tunis, Djerba and Enfidha airports','Aéroports de Tunis, Djerba et Enfidha','مطارات تونس وجربة والنفيضة'],['Fixed quote agreed in advance','Devis fixe confirmé à l’avance','سعر ثابت مؤكد مسبقاً']],chauffeur:[['English- and French-speaking drivers','Chauffeurs anglophones et francophones','سائقون يتحدثون الإنجليزية والفرنسية'],['By the hour, day or longer','À l’heure, à la journée ou davantage','بالساعة أو باليوم أو لفترة أطول'],['Business, events and touring','Affaires, événements et circuits','للأعمال والفعاليات والجولات']]}[s.key].map(x=>x[fi]); return <main className="page"><PageHero image={s.image} eyebrow={copy[lang].serviceEyebrow} title={s.title[fi]} text={s.text[fi]}/><section className="section service-detail"><div><p className="overline">{copy[lang].designedAroundTrip}</p><h2>{copy[lang].mobilityTitle}</h2><p>{s.text[fi]} {text(lang,'Send your schedule and preferences; the VIPCAR team will confirm availability, vehicle and price before you travel.','Envoyez votre programme et vos préférences ; l’équipe VIPCAR confirme la disponibilité, le véhicule et le tarif avant votre départ.','أرسل برنامجك وتفضيلاتك؛ وسيؤكد فريق VIPCAR التوفر والسيارة والسعر قبل سفرك.')}</p><ul>{details.map(x=><li key={x}><Check/>{x}</li>)}</ul></div><QuoteWidget lang={lang} serviceType={s.key}/></section><ServiceSeoContent lang={lang} type={s.key}/>{s.key==='rental'&&<section className="section"><SectionHead eyebrow={text(lang,'VIPCAR fleet','Flotte VIPCAR','أسطول VIPCAR')} title={copy[lang].fleetTitle}/><div className="vehicle-grid featured">{fleet.slice(0,3).map(c=><VehicleCard car={c} lang={lang} key={c.slug}/>)}</div></section>}<Faq lang={lang}/><Cta lang={lang}/></main> }

function VehiclePage({lang,slug}) {
  const [car,setCar]=useState(null);
  const [related,setRelated]=useState([]);
  const [source,setSource]=useState('api');
  const [loading,setLoading]=useState(true);
  const [notFound,setNotFound]=useState(false);
  const {currency}=useCurrency();
  useEffect(()=>{
    const ac=new AbortController();
    setLoading(true);
    setNotFound(false);
    loadVehiclePage(slug,{signal:ac.signal}).then(result=>{
      if(ac.signal.aborted)return;
      setCar(result.vehicle);
      setRelated(result.related);
      setSource(result.source);
      setNotFound(result.notFound);
      setLoading(false);
    }).catch(()=>{ /* aborted */ });
    return()=>ac.abort();
  },[slug]);
  if(loading)return <main className="page"><section className="section"><p aria-live="polite">{text(lang,'Loading vehicle…','Chargement du véhicule…','جارٍ تحميل السيارة…')}</p></section></main>;
  if(notFound||!car)return <NotFound lang={lang}/>;
  return <main className="page vehicle-page">{source==='seed'&&<p className="form-feedback catalog-notice catalog-notice-inline" role="status">{fleetOfflineMessage(lang)}</p>}<section className="vehicle-hero"><div className="vehicle-hero-copy"><p className="overline">{tierLabel(car.tier,lang)} · {categoryLabel(car.cat,lang)}</p><h1>{car.name}</h1><p>{text(lang,'A refined, well-maintained choice for your journey across Tunisia. Availability and the final TND quote are confirmed for your dates.','Un véhicule soigné et entretenu pour votre voyage en Tunisie. La disponibilité et le devis final en TND sont confirmés selon vos dates.','سيارة أنيقة ومعتنى بها لرحلتك في تونس. نؤكد التوفر وعرض السعر النهائي بالدينار التونسي حسب تواريخك.')}</p><div className="vehicle-price">{copy[lang].from} <strong>{formatCurrency(car.price,currency,lang)}</strong> {copy[lang].day}</div><SmartLink className="button" href={link(lang,`/booking?vehicle=${car.slug}`)}>{copy[lang].book}<ArrowRight/></SmartLink></div><div className="vehicle-hero-image"><img src={img(car.image)} alt={car.name}/></div></section><section className="spec-band"><div><Users/><span>{copy[lang].seats}</span><strong>{car.seats}</strong></div><div><SlidersHorizontal/><span>{text(lang,'Transmission','Transmission','ناقل الحركة')}</span><strong>{transmissionLabel(car.transmission,lang)}</strong></div><div><BriefcaseBusiness/><span>{text(lang,'Luggage','Bagages','الأمتعة')}</span><strong>{car.bags}</strong></div><div><MapPin/><span>{text(lang,'Delivery','Livraison','التوصيل')}</span><strong>{car.location||(lang==='ar'?'عند الطلب':lang==='en'?'On request':'Sur demande')}</strong></div></section><section className="section vehicle-overview"><div><p className="overline">{text(lang,'Vehicle overview','Présentation du véhicule','نظرة عامة على السيارة')}</p><h2>{text(lang,'Comfort, space and a clear booking process.','Confort, espace et réservation claire.','راحة ومساحة وحجز واضح.')}</h2><p>{text(lang,'Choose your dates and pick-up point, then VIPCAR confirms the exact vehicle availability, rental conditions, deposit and final rate before you commit. Airport and hotel delivery can be arranged.','Choisissez vos dates et votre lieu de départ. VIPCAR confirme ensuite la disponibilité, les conditions, la caution et le tarif final avant votre engagement. Livraison possible à l’aéroport ou à l’hôtel.','اختر تواريخك ونقطة الاستلام، ثم يؤكد فريق VIPCAR توفر السيارة وشروط التأجير والتأمين والسعر النهائي قبل التزامك. يمكن ترتيب التوصيل إلى المطار أو الفندق.')}</p></div><aside><h3>{text(lang,'Request this vehicle','Demander ce véhicule','اطلب هذه السيارة')}</h3><QuoteWidget lang={lang} compact selectedVehicle={car}/></aside></section><section className="section"><SectionHead eyebrow={text(lang,'You may also like','Vous aimerez aussi','قد يعجبك أيضاً')} title={text(lang,'Related vehicles','Véhicules similaires','سيارات مشابهة')}/><div className="vehicle-grid featured">{related.map(c=><VehicleCard car={c} lang={lang} key={c.slug}/>)}</div></section><Faq lang={lang}/></main>;
}

function safeNextPath(lang, raw) {
  if (!raw || typeof raw !== 'string') return link(lang, '/my-bookings');
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith(`/${lang}/`) || decoded === `/${lang}`) return decoded;
  } catch { /* ignore */ }
  return link(lang, '/my-bookings');
}

function LoginPage({lang}) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const next = safeNextPath(lang, new URLSearchParams(location.search).get('next'));
  useEffect(() => {
    if (getAccessToken()) go(next);
  }, [next]);
  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email') || '').trim();
    const password = String(f.get('password') || '');
    if (!email || password.length < 8) {
      setError(text(lang,'Enter your email and a password of at least 8 characters.','Saisissez votre e-mail et un mot de passe d’au moins 8 caractères.','أدخل بريدك الإلكتروني وكلمة مرور من 8 أحرف على الأقل.'));
      return;
    }
    setSubmitting(true);
    try {
      await login({ email, password }, { locale: lang });
      go(next);
    } catch (err) {
      setError(loginErrorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="page account-page">
      <PageHero
        image="interior.jpg"
        eyebrow={text(lang,'VIPCAR account','Compte VIPCAR','حساب VIPCAR')}
        title={text(lang,'Sign in to your account.','Connectez-vous à votre compte.','سجّل الدخول إلى حسابك.')}
        text={text(lang,'View your confirmed bookings, trip details and status in one place.','Consultez vos réservations confirmées, les détails de trajet et leur statut.','اطّلع على حجوزاتك المؤكدة وتفاصيل رحلاتك وحالتها في مكان واحد.')}
      />
      <section className="section account-section">
        <div className="account-form contact-form">
          <h2>{text(lang,'Sign in','Connexion','تسجيل الدخول')}</h2>
          <p className="account-lead">
            {text(lang,'Use the email and password from your VIPCAR customer account.','Utilisez l’e-mail et le mot de passe de votre compte client VIPCAR.','استخدم البريد الإلكتروني وكلمة المرور الخاصين بحسابك لدى VIPCAR.')}
          </p>
          <form onSubmit={submit}>
            <label>
              {text(lang,'Email','E-mail','البريد الإلكتروني')}
              <input required name="email" type="email" autoComplete="email" />
            </label>
            <label>
              {text(lang,'Password','Mot de passe','كلمة المرور')}
              <input required name="password" type="password" autoComplete="current-password" minLength={8} />
            </label>
            {error && <p className="form-feedback form-feedback-error" role="alert">{error}</p>}
            <button className="button" type="submit" disabled={submitting}>
              {submitting
                ? text(lang,'Signing in…','Connexion…','جارٍ تسجيل الدخول…')
                : text(lang,'Sign in','Se connecter','تسجيل الدخول')}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function MyBookingsPage({lang}) {
  const {currency}=useCurrency();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = getStoredUser();
  const token = getAccessToken();

  useEffect(() => {
    if (!token) {
      go(link(lang, `/login?next=${encodeURIComponent(link(lang, '/my-bookings'))}`));
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listMyBookings({ locale: lang, signal: controller.signal, token })
      .then((payload) => {
        setBookings(Array.isArray(payload?.data) ? payload.data : []);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        if (err?.status === 401 || err?.status === 403) {
          clearSession();
          go(link(lang, `/login?next=${encodeURIComponent(link(lang, '/my-bookings'))}`));
          return;
        }
        setError(bookingsErrorMessage(err, lang));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [lang, token]);

  if (!token) {
    return (
      <main className="page">
        <section className="section">
          <p aria-live="polite">{text(lang,'Redirecting to sign in…','Redirection vers la connexion…','جارٍ تحويلك إلى صفحة تسجيل الدخول…')}</p>
        </section>
      </main>
    );
  }

  const signOut = () => {
    clearSession();
    go(link(lang, '/login'));
  };

  return (
    <main className="page account-page">
      <PageHero
        image="luxury-rear.jpg"
        eyebrow={text(lang,'My bookings','Mes réservations','حجوزاتي')}
        title={text(lang,'Your VIPCAR journeys.','Vos trajets VIPCAR.','رحلاتك مع VIPCAR.')}
        text={text(lang,'Confirmed bookings for your account. Prices shown are the amounts recorded with your booking.','Les réservations confirmées de votre compte. Les montants affichés sont ceux enregistrés avec la réservation.','حجوزات حسابك المؤكدة. الأسعار المعروضة هي المبالغ المسجلة في حجزك.')}
      />
      <section className="section account-section">
        <div className="account-toolbar">
          <div>
            <p className="overline">{text(lang,'Customer account','Compte client','حساب العميل')}</p>
            <h2>{user?.name || user?.email || text(lang,'Your bookings','Vos réservations','حجوزاتك')}</h2>
          </div>
          <button type="button" className="text-link account-signout" onClick={signOut}>
            {text(lang,'Sign out','Se déconnecter','تسجيل الخروج')}
          </button>
        </div>
        {loading && (
          <p aria-live="polite">{text(lang,'Loading bookings…','Chargement des réservations…','جارٍ تحميل الحجوزات…')}</p>
        )}
        {!loading && error && (
          <p className="form-feedback form-feedback-error" role="alert">{error}</p>
        )}
        {!loading && !error && bookings.length === 0 && (
          <div className="account-empty">
            <p>
              {text(lang,'No bookings yet. Request a quote and our team will confirm your trip.','Aucune réservation pour le moment. Demandez un devis et notre équipe confirmera votre trajet.','لا توجد حجوزات بعد. اطلب عرض سعر وسيؤكد فريقنا رحلتك.')}
            </p>
            <SmartLink className="button" href={link(lang, '/booking')}>
              {copy[lang].book}
              <ArrowRight size={16} />
            </SmartLink>
          </div>
        )}
        {!loading && !error && bookings.length > 0 && (
          <ul className="booking-list">
            {bookings.map((b) => (
              <li key={b.id} className="booking-list-item">
                <div className="booking-list-main">
                  <p className="overline">{bookingServiceLabel(b.type, lang)}</p>
                  <strong>{b.pickupLabel || '—'}</strong>
                  {b.dropoffLabel && <span className="booking-list-route">→ {b.dropoffLabel}</span>}
                  <div className="booking-list-meta">
                    <span><CalendarDays size={15} />{formatBookingDate(b.startAt, lang)}</span>
                    {b.endAt && b.endAt !== b.startAt && (
                      <span><Clock3 size={15} />{formatBookingDate(b.endAt, lang)}</span>
                    )}
                  </div>
                </div>
                <div className="booking-list-side">
                  <span className={`booking-status booking-status-${b.status}`}>
                    {bookingStatusLabel(b.status, lang)}
                  </span>
                  <span className="booking-price">
                    {formatCurrency(b.priceTnd, currency, lang)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function BookingPage({lang}) {
  const [step,setStep]=useState(1), [service,setService]=useState('rental'), [data,setData]=useState({});
  const [error,setError]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [success,setSuccess]=useState(null);
  const t=copy[lang];
  const vehicleSlug=new URLSearchParams(location.search).get('vehicle');
  const vehicle=fleet.find(x=>x.slug===vehicleSlug);
  const today=new Date().toISOString().slice(0,10);
  const update=e=>setData(previous=>({...previous,[e.target.name]:e.target.value}));
  const chooseService=key=>{setService(key);setError('');};
  const finish=async(e)=>{
    e.preventDefault();
    if(submitting)return;
    setError('');
    const name=(data.name||'').trim();
    const phone=(data.contact||'').trim();
    const email=(data.email||'').trim()||undefined;
    const notes=(data.notes||'').trim()||undefined;
    const pickup=data.pickup||'';
    const dropoff=data.return||undefined;
    const startDate=data.date||'';
    const endDate=data.returnDate||undefined;
    const duration=service==='chauffeur'?(data.duration||'full-day'):undefined;
    if(!name||!phone||!pickup||!startDate){
      setError(text(lang,'Please complete the required trip and contact details.','Complétez les informations de trajet et de contact.','Veuillez compléter les informations de voyage et de contact.'));
      return;
    }
    if(service==='rental'&&!endDate){
      setError(text(lang,'Please choose a return date for your rental.','Choisissez une date de retour pour votre location.','اختر تاريخ عودة السيارة.'));
      return;
    }
    const body={
      service,
      ...(vehicle?{vehicleSlug:vehicle.slug}:{}),
      pickup,
      ...(dropoff?{dropoff}:{}),
      startDate,
      ...(service==='rental'?{endDate}:endDate?{endDate}:{}),
      ...(duration?{duration}:{}),
      ...(notes?{notes}:{}),
      name,
      phone,
      ...(email?{email}:{}),
      locale:lang,
      channel:'web',
    };
    setSubmitting(true);
    try{
      const response=await createQuote(body,{locale:lang});
      const quote=response?.data;
      const reference=formatQuoteReference(quote?.id);
      const whatsappText=`${buildWhatsAppQuoteMessage({
        service,
        pickup,
        dropoff,
        startDate,
        endDate:body.endDate,
        name,
        phone,
        email,
        notes,
        duration,
        vehicleName:vehicle?.name,
      })} Reference: ${reference}.`;
      setSuccess({
        reference,
        whatsappText,
      });
      trackEvent('quote_submit',{service,language:lang,location:'booking'});
    }catch(err){
      setError(quoteErrorMessage(err,lang));
    }finally{
      setSubmitting(false);
    }
  };
  return <main className="booking-page"><div className="booking-intro"><p className="overline">{text(lang,'VIPCAR quote request','Demande de devis VIPCAR','طلب عرض سعر من VIPCAR')}</p><h1>{text(lang,'Your journey, arranged in a few steps.','Votre trajet, organisé en quelques étapes.','رحلتك منظمة في خطوات بسيطة.')}</h1><p>{t.quoteSub}</p>{vehicle&&<p className="booking-selection">{t.selectedVehicle}: <strong>{vehicle.name}</strong></p>}<div className="booking-contact"><Clock3/><span>24/7</span><MessageCircle/><span>{PHONE}</span></div></div><form className="booking-panel" onSubmit={finish}>{success?<QuoteSuccess lang={lang} request={success} onWhatsApp={()=>openWhatsAppQuote(success.whatsappText,WA)} onReset={()=>{setSuccess(null);setError('');setStep(1);setData({})}}/>:<><div className="steps"><span className={step>=1?'active':''}>1 <b>{text(lang,'Service','Service','الخدمة')}</b></span><i/><span className={step>=2?'active':''}>2 <b>{text(lang,'Trip','Trajet','الرحلة')}</b></span><i/><span className={step>=3?'active':''}>3 <b>{text(lang,'Contact','Contact','التواصل')}</b></span></div>{step===1&&<div className="booking-step"><h2>{text(lang,'What do you need?','De quel service avez-vous besoin ?','ما الخدمة التي تحتاجها؟')}</h2><div className="booking-services">{services.map(s=>{const Icon=s.icon;return <button type="button" key={s.key} className={service===s.key?'active':''} onClick={()=>chooseService(s.key)}><Icon/><strong>{s.title[languageIndex(lang)]}</strong><span>{s.text[languageIndex(lang)]}</span><Check/></button>})}</div><button type="button" className="button next" onClick={()=>setStep(2)}>{t.continue}<ArrowRight/></button></div>}{step===2&&<div className="booking-step"><h2>{text(lang,'Tell us about the trip','Parlez-nous du trajet','أخبرنا عن الرحلة')}</h2><div className="form-grid"><label>{text(lang,'Pick-up location','Lieu de départ','مكان الاستلام')}<select required name="pickup" value={data.pickup||''} onChange={update}><option value="">{text(lang,'Select','Sélectionner','اختر')}</option>{locations.map(x=><option key={x} value={x}>{locationLabel(x,lang)}</option>)}</select></label><label>{text(lang,'Return location','Lieu de retour','مكان العودة')}<select name="return" value={data.return||''} onChange={update}><option value="">{text(lang,'Select','Sélectionner','اختر')}</option>{locations.map(x=><option key={x} value={x}>{locationLabel(x,lang)}</option>)}</select></label><label>{text(lang,'Pick-up date','Date de départ','تاريخ الاستلام')}<input required min={today} type="date" name="date" value={data.date||''} onChange={update}/></label><label>{text(lang,'Return date','Date de retour','تاريخ العودة')}<input required={service==='rental'} min={data.date||today} type="date" name="returnDate" value={data.returnDate||''} onChange={update}/></label>{service==='chauffeur'&&<label>{t.serviceDuration}<select name="duration" value={data.duration||'full-day'} onChange={update}><option value="hourly">{text(lang,'By the hour','À l’heure','بالساعة')}</option><option value="half-day">{text(lang,'Half day','Demi-journée','نصف يوم')}</option><option value="full-day">{text(lang,'Full day','Journée complète','يوم كامل')}</option></select></label>}<label className="full">{text(lang,'Notes','Notes','ملاحظات')}<textarea name="notes" value={data.notes||''} onChange={update} placeholder={t.hotelFlightPlaceholder}/></label></div><div className="step-actions"><button type="button" onClick={()=>setStep(1)}>{t.back}</button><button type="button" className="button" onClick={()=>setStep(3)}>{t.continue}<ArrowRight/></button></div></div>}{step===3&&<div className="booking-step"><h2>{text(lang,'Where should we confirm your quote?','Où devons-nous confirmer votre devis ?','أين نؤكد عرض السعر الخاص بك؟')}</h2><div className="form-grid"><label>{t.fullName}<input required name="name" value={data.name||''} onChange={update} autoComplete="name"/></label><label>{t.phoneWhatsapp}<input required name="contact" type="tel" value={data.contact||''} onChange={update} autoComplete="tel"/></label><label className="full">{t.contactLabel}<input name="email" type="email" value={data.email||''} onChange={update} autoComplete="email"/></label></div><div className="booking-summary"><strong>{t.reviewRequest}</strong><span>{services.find(s=>s.key===service)?.title[languageIndex(lang)]}{vehicle?` · ${vehicle.name}`:''}</span><span>{data.pickup||'—'} → {data.return||data.pickup||'—'}</span><span>{data.date||'—'} → {data.returnDate||'—'}</span></div><div className="confirm-note"><ShieldCheck/><p><strong>{t.noImmediatePayment}</strong><br/>{t.requestSavedWhatsapp}</p></div>{error&&<p className="form-feedback form-feedback-error" role="alert">{error}</p>}<div className="step-actions"><button type="button" onClick={()=>setStep(2)}>{t.back}</button><button className="button" type="submit" disabled={submitting}>{submitting?t.sending:t.book}{!submitting&&<MessageCircle/>}</button></div></div>}</>}</form></main>
}

function CorporateForm({lang}) {
  const [service,setService]=useState('rental');
  const [data,setData]=useState({company:'',name:'',email:'',phone:'',teamSize:'',pickup:locations[0],dropoff:'',date:'',endDate:'',duration:'full-day',flightNumber:'',notes:''});
  const [error,setError]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [success,setSuccess]=useState(null);
  const t=copy[lang];
  const today=new Date().toISOString().slice(0,10);
  const update=e=>setData(previous=>({...previous,[e.target.name]:e.target.value}));
  const submit=async e=>{
    e.preventDefault();
    if(submitting)return;
    const values={...data, ...readFormValues(e.currentTarget)};
    const company=String(values.company||'').trim();
    const name=String(values.name||'').trim();
    const email=String(values.email||'').trim();
    const phone=String(values.phone||'').trim();
    const teamSize=Number(values.teamSize);
    const pickup=String(values.pickup||'').trim();
    const dropoff=String(values.dropoff||'').trim()||undefined;
    const startDate=String(values.date||'').trim();
    const endDate=String(values.endDate||'').trim();
    const flightNumber=service==='transfer'?String(values.flightNumber||'').trim()||undefined:undefined;
    const additionalNotes=String(values.notes||'').trim();
    if(!company||!name||!email||!phone){setError(text(lang,'Please complete the company and contact details.','Renseignez les informations de l’entreprise et vos coordonnées.','أكمل بيانات الشركة وبيانات التواصل.'));return}
    if(!Number.isInteger(teamSize)||teamSize<1||teamSize>50){setError(text(lang,'Enter a team size between 1 and 50.','Indiquez une taille d’équipe entre 1 et 50.','أدخل عدد أفراد الفريق بين 1 و50.'));return}
    if(!pickup||!startDate){setError(text(lang,'Please choose a pick-up point and date.','Choisissez un lieu de départ et une date.','اختر مكان الاستلام والتاريخ.'));return}
    if(service==='rental'&&!endDate){setError(text(lang,'Please choose a return date for the rental.','Choisissez une date de retour pour la location.','اختر تاريخ عودة السيارة.'));return}
    if(service==='transfer'&&!dropoff){setError(text(lang,'Please add the transfer destination.','Ajoutez la destination du transfert.','أضف وجهة النقل.'));return}
    const serviceName=services.find(item=>item.key===service)?.title[languageIndex(lang)]||service;
    const structuredNotes=[
      `Company: ${company}`,
      `Team size: ${teamSize}`,
      `Requested service: ${serviceName}`,
      `Pick-up: ${pickup}`,
      dropoff?`Destination / return: ${dropoff}`:null,
      service==='rental'?`Rental dates: ${startDate} → ${endDate}`:`Requested date: ${startDate}`,
      service==='chauffeur'?`Duration: ${values.duration}`:null,
      flightNumber?`Flight number: ${flightNumber}`:null,
      additionalNotes?`Additional notes: ${additionalNotes}`:null,
    ].filter(Boolean).join('\n');
    const body={service,pickup,...(dropoff?{dropoff}:{}),startDate,...(service==='rental'?{endDate}:{}),...(service==='chauffeur'?{duration:values.duration}:{}),passengers:teamSize,...(flightNumber?{flightNumber}:{}),notes:structuredNotes,name,phone,email,locale:lang,channel:'contact'};
    setSubmitting(true);setError('');
    try{
      const response=await createQuote(body,{locale:lang});
      const reference=formatQuoteReference(response?.data?.id);
      const whatsappText=`${buildWhatsAppQuoteMessage({service,pickup,dropoff,startDate,endDate:body.endDate,duration:body.duration,passengers:teamSize,name,phone,email,notes:structuredNotes})} Reference: ${reference}.`;
      setSuccess({reference,whatsappText});
      trackEvent('quote_submit',{service,language:lang,location:'corporate',company});
    }catch(err){setError(quoteErrorMessage(err,lang));}
    finally{setSubmitting(false)}
  };
  const reset=()=>{setSuccess(null);setError('');setService('rental');setData({company:'',name:'',email:'',phone:'',teamSize:'',pickup:locations[0],dropoff:'',date:'',endDate:'',duration:'full-day',flightNumber:'',notes:''})};
  if(success)return <div className="corporate-form corporate-form--success"><QuoteSuccess lang={lang} request={success} onWhatsApp={()=>openWhatsAppQuote(success.whatsappText,WA)} onReset={reset}/></div>;
  return <div className="corporate-form">
    <div className="corporate-form-heading"><div><p className="overline">{text(lang,'B2B / TEAM RESERVATION','B2B / RÉSERVATION D’ÉQUIPE','B2B / حجز للفريق')}</p><h3>{text(lang,'Plan your team’s next journey.','Organisez le prochain trajet de votre équipe.','نظّم رحلة فريقك القادمة.')}</h3></div><span><ShieldCheck size={17}/>{text(lang,'No payment now','Aucun paiement immédiat','لا يوجد دفع الآن')}</span></div>
    <p className="corporate-form-intro">{text(lang,'Send the key details once. Our team will prepare a clear, coordinated quote for your company.','Partagez les informations essentielles en une fois. Notre équipe préparera un devis clair et coordonné pour votre entreprise.','شارك التفاصيل الأساسية مرة واحدة، وسنعدّ لشركتك عرضاً واضحاً ومنسقاً.')}</p>
    <form onSubmit={submit}>
      <div className="corporate-form-section"><p className="corporate-form-kicker">01 · {text(lang,'Company & contact','Entreprise et contact','الشركة وبيانات التواصل')}</p><div className="form-grid corporate-form-fields"><label>{text(lang,'Company name','Nom de l’entreprise','اسم الشركة')}<input required name="company" value={data.company} onChange={update} autoComplete="organization"/></label><label>{t.fullName}<input required name="name" value={data.name} onChange={update} autoComplete="name"/></label><label>{t.email}<input required type="email" name="email" value={data.email} onChange={update} autoComplete="email"/></label><label>{t.phoneWhatsapp}<input required type="tel" name="phone" value={data.phone} onChange={update} autoComplete="tel" placeholder="+216…"/></label><label>{text(lang,'Team size','Taille de l’équipe','حجم الفريق')}<input required type="number" min="1" max="50" name="teamSize" value={data.teamSize} onChange={update}/></label></div></div>
      <div className="corporate-form-section"><p className="corporate-form-kicker">02 · {text(lang,'Trip requirements','Besoins du trajet','احتياجات الرحلة')}</p><div className="form-grid corporate-form-fields"><label>{text(lang,'Service','Service','الخدمة')}<select name="service" value={service} onChange={e=>{setService(e.target.value);setError('')}}>{services.map(item=><option key={item.key} value={item.key}>{item.title[languageIndex(lang)]}</option>)}</select></label><label><span><MapPin size={14}/>{t.whereMeet}</span><select required name="pickup" value={data.pickup} onChange={update}>{locations.map(x=><option key={x} value={x}>{locationLabel(x,lang)}</option>)}</select></label><label><span><MapPin size={14}/>{text(lang,'Destination / return location','Destination / lieu de retour','الوجهة / مكان العودة')}</span><select required={service==='transfer'} name="dropoff" value={data.dropoff} onChange={update}><option value="">{text(lang,'Select a destination','Sélectionner une destination','اختر وجهة')}</option>{locations.map(x=><option key={x} value={x}>{locationLabel(x,lang)}</option>)}</select></label><label><span><CalendarDays size={14}/>{t.when}</span><input required type="date" min={today} name="date" value={data.date} onChange={update}/></label>{service==='rental'&&<label><span><CalendarDays size={14}/>{t.returnDate}</span><input required type="date" min={data.date||today} name="endDate" value={data.endDate} onChange={update}/></label>}{service==='chauffeur'&&<label><span><Clock3 size={14}/>{t.serviceDuration}</span><select name="duration" value={data.duration} onChange={update}><option value="hourly">{text(lang,'By the hour','À l’heure','بالساعة')}</option><option value="half-day">{text(lang,'Half day','Demi-journée','نصف يوم')}</option><option value="full-day">{text(lang,'Full day','Journée complète','يوم كامل')}</option></select></label>}{service==='transfer'&&<label><span><Plane size={14}/>{t.flightNumber}</span><input name="flightNumber" value={data.flightNumber} onChange={update} placeholder="TU1234"/></label>}<label className="corporate-form-wide"><span>{text(lang,'Project notes / billing needs','Notes projet / besoins de facturation','ملاحظات المشروع / احتياجات الفوترة')}</span><textarea name="notes" rows="4" value={data.notes} onChange={update} placeholder={text(lang,'Hotel names, flight details, billing reference or special requirements…','Hôtels, détails de vol, référence de facturation ou besoins particuliers…','أسماء الفنادق أو تفاصيل الرحلة أو مرجع الفوترة أو المتطلبات الخاصة…')}/></label></div></div>
      {error&&<p className="form-feedback form-feedback-error" role="alert">{error}</p>}
      <div className="corporate-form-actions"><p>{text(lang,'Your request is saved in our back-office for follow-up.','Votre demande est enregistrée dans notre back-office pour suivi.','يتم حفظ طلبك في نظام الإدارة للمتابعة.')}</p><button type="submit" className="button" disabled={submitting}>{submitting?t.sending:text(lang,'Send B2B request','Envoyer la demande B2B','إرسال طلب الشركات')}<ArrowRight size={17}/></button></div>
    </form>
  </div>;
}

function Corporate({lang}) { const benefits={en:['Corporate accounts','Airport coordination','Professional drivers','24/7 support'],fr:['Comptes entreprises','Coordination aéroport','Chauffeurs professionnels','Assistance 24h/24'],ar:['حسابات الشركات','تنسيق المطار','سائقون محترفون','مساعدة على مدار الساعة']}[lang]; return <main className="page"><PageHero image="interior.jpg" eyebrow={text(lang,'VIPCAR for business','VIPCAR pour les entreprises','VIPCAR للشركات')} title={text(lang,'Ground mobility your team can rely on.','La mobilité professionnelle sur laquelle compter.','تنقّل موثوق لفريقك.')} text={text(lang,'Airport transfers, chauffeur services and vehicle rental for companies, hotels, travel agencies and events.','Transferts, chauffeurs et location pour entreprises, hôtels, agences de voyage et événements.','نقل من المطار، خدمات سائق خاص وتأجير سيارات للشركات والفنادق ووكالات السفر والفعاليات.')}/><section className="section corporate-grid corporate-overview"><div><p className="overline">{text(lang,'Corporate mobility','Mobilité d’entreprise','تنقّل الشركات')}</p><h2>{text(lang,'One point of contact across Tunisia.','Un seul contact partout en Tunisie.','جهة اتصال واحدة في مختلف أنحاء تونس.')}</h2><p>{text(lang,'VIPCAR already works with concierge services, travel agencies and corporate accounts. Share passenger schedules, vehicle needs and invoicing requirements with a team available around the clock.','VIPCAR travaille avec des conciergeries, agences de voyage et comptes entreprises. Confiez les horaires, véhicules et besoins de facturation à une équipe disponible 24h/24.','تعمل VIPCAR مع خدمات الكونسيرج ووكالات السفر وحسابات الشركات. شارك جداول الركاب واحتياجات السيارات ومتطلبات الفوترة مع فريق متاح على مدار الساعة.')}</p></div><div className="benefit-grid">{benefits.map(x=><div key={x}><BriefcaseBusiness/><strong>{x}</strong><span>{text(lang,'Arranged around your operation','Adapté à votre activité','مصمم حول احتياجات عملك')}</span></div>)}</div></section><section className="section corporate-request"><div className="corporate-request-intro"><p className="overline">{text(lang,'Built for business travel','Pensé pour les déplacements professionnels','مصمم لتنقلات الشركات')}</p><h2>{text(lang,'A simpler way to move your team.','Une façon plus simple de déplacer votre équipe.','طريقة أبسط لتنقل فريقك.')}</h2><p>{text(lang,'One request gives the back-office the company, passenger, route and timing details needed to coordinate your reservation.','Une seule demande transmet au back-office les informations entreprise, passagers, itinéraire et horaires nécessaires à la coordination.','طلب واحد يرسل إلى نظام الإدارة بيانات الشركة والركاب والمسار والمواعيد اللازمة للتنسيق.')}</p><div className="corporate-request-meta"><span><strong>24/7</strong>{text(lang,'Direct assistance','Assistance directe','مساعدة مباشرة')}</span><span><strong>3</strong>{text(lang,'Tunisia hubs','Agences en Tunisie','وكالات في تونس')}</span></div></div><CorporateForm lang={lang}/></section><Cta lang={lang}/></main> }

function ContentPage({lang,type}) { const data={
  about:{image:'road-travel.jpg',ey:'About VIPCAR',en:['International standards. Local Tunisian expertise.','VIPCAR coordinates car rental, professional chauffeur services and airport transfers from its hubs in Tunis, Gabès and Djerba. The service is built around direct contact, clear quotes and support at every hour.'],fr:['Des standards internationaux. Une expertise tunisienne.','VIPCAR organise location, chauffeur professionnel et transferts aéroport depuis Tunis, Gabès et Djerba. Le service repose sur un contact direct, des devis clairs et une disponibilité permanente.'],ar:['معايير دولية. وخبرة تونسية محلية.','تنسق VIPCAR تأجير السيارات وخدمات السائق الخاص والنقل من المطار انطلاقاً من مراكزها في تونس وقابس وجربة. تقوم الخدمة على التواصل المباشر والعروض الواضحة والدعم المتواصل.']},
  destinations:{image:'suv-white.jpg',ey:'Tunisia destinations',en:['Move through Tunisia with one local team.','Arrange pick-up or delivery in Tunis, Gabès and Djerba, at the major airports, and in the other destinations listed in our booking service. Coverage outside the main hubs is confirmed for each request.'],fr:['Parcourez la Tunisie avec une seule équipe locale.','Organisez votre prise en charge à Tunis, Gabès et Djerba, dans les principaux aéroports et les autres destinations proposées à la réservation. La couverture hors agences est confirmée sur demande.'],ar:['تنقّل في تونس مع فريق محلي واحد.','رتّب الاستلام أو التوصيل في تونس وقابس وجربة وفي المطارات الرئيسية والوجهات الأخرى المتاحة في خدمة الحجز. نؤكد التغطية خارج المراكز الرئيسية لكل طلب.']},
  blog:{image:'luxury-rear.jpg',ey:'Travel journal',en:['Useful guidance for travelling through Tunisia.','Practical airport, driving and rental information, written to help you make informed decisions before you arrive.'],fr:['Les informations utiles pour voyager en Tunisie.','Conseils pratiques sur les aéroports, la conduite et la location pour préparer votre arrivée.'],ar:['دليل مفيد للسفر في تونس.','معلومات عملية عن المطارات والقيادة وتأجير السيارات تساعدك على اتخاذ قرارات واضحة قبل الوصول.']}
  }[type]; const a=data[lang]; return <main className="page"><PageHero image={data.image} eyebrow={text(lang,data.ey, type==='about'?'À propos de VIPCAR':type==='destinations'?'Destinations tunisiennes':'Journal de voyage', type==='about'?'عن VIPCAR':type==='destinations'?'وجهات تونسية':'مجلة السفر')} title={a[0]} text={a[1]}/>{type==='destinations'?<DestinationHub lang={lang}/>:type==='blog'?<section className="section journal"><div className="journal-grid"><GuideCard image="suv-white.jpg" tag={text(lang,'Car rental','Location de voiture','تأجير السيارات')} title={text(lang,'Renting a car in Tunisia: the practical guide','Location de voiture en Tunisie : le guide pratique','تأجير سيارة في تونس: الدليل العملي')} slug="car-rental-tunisia-guide" lang={lang}/><GuideCard image="airport.jpg" tag={text(lang,'Airport transfer','Transfert aéroport','النقل من المطار')} title={text(lang,'How airport transfers work in Tunisia','Comment fonctionne un transfert aéroport','كيف تعمل خدمة النقل من المطار في تونس')} slug="tunis-carthage-airport-guide" lang={lang}/><GuideCard image="interior.jpg" tag={text(lang,'Chauffeur','Chauffeur','سائق خاص')} title={text(lang,'When to book a private chauffeur','Quand réserver un chauffeur privé','متى تحجز سائقاً خاصاً')} slug="choosing-a-car-in-tunisia" lang={lang}/></div></section>:<section className="section about-copy"><p className="overline">{text(lang,'VIPCAR Tunisia','VIPCAR Tunisie','VIPCAR تونس')}</p><h2>{text(lang,'Built around the realities of travel.','Pensé pour les réalités du voyage.','مصمم حول واقع السفر.')}</h2><p>{a[1]}</p><div className="values about-values"><div><Clock3/><strong>24/7</strong><span>{text(lang,'Always available','Disponibilité permanente','متاحون دائماً')}</span><small>{text(lang,'Direct support every day','Une équipe disponible chaque jour','دعم مباشر كل يوم')}</small></div><div><Car/><strong>100+</strong><span>{text(lang,'Vehicles in the fleet','Véhicules dans la flotte','سيارة في الأسطول')}</span><small>{text(lang,'From city cars to premium models','Des citadines aux modèles premium','من سيارات المدينة إلى الطرازات المميزة')}</small></div><div><MapPin/><strong>{text(lang,'3 hubs','3 hubs','3 مراكز')}</strong><span>Tunis · Gabès · Djerba</span><small>{text(lang,'Coverage across Tunisia','Une couverture partout en Tunisie','تغطية في مختلف أنحاء تونس')}</small></div></div></section>}<Cta lang={lang}/></main> }

const articles={
  'car-rental-tunisia-guide':{image:'road-travel.jpg',en:['Renting a car in Tunisia: what to know','A practical starting point for choosing a vehicle, preparing documents and arranging collection or delivery.',[['Choose the vehicle around the journey','Think first about passengers, luggage, distance and the roads on your route. A compact car can suit city stays, while a sedan or SUV gives more space for family travel, business visits or longer itineraries.'],['Confirm the essentials before arrival','Ask for the exact vehicle availability, delivery point, rental conditions, deposit and final TND quote before you travel. This keeps the handover clear and avoids surprises at the airport or hotel.'],['Plan collection or delivery','VIPCAR can coordinate airport and hotel delivery according to your dates. Share your arrival details early so the team can confirm the practical handover.']]],fr:['Louer une voiture en Tunisie : l’essentiel','Les points pratiques pour choisir un véhicule, préparer vos documents et organiser la prise en charge ou la livraison.',[['Choisir selon votre trajet','Pensez aux passagers, aux bagages, aux distances et aux routes prévues. Une citadine convient à un séjour urbain, tandis qu’une berline ou un SUV apporte davantage d’espace pour la famille, les affaires ou un long circuit.'],['Confirmer l’essentiel avant l’arrivée','Demandez la disponibilité exacte, le point de livraison, les conditions de location, la caution et le devis final en TND avant votre départ. La remise du véhicule reste ainsi simple et claire.'],['Prévoir la prise en charge ou la livraison','VIPCAR peut organiser une livraison à l’aéroport ou à l’hôtel selon vos dates. Partagez vos informations d’arrivée suffisamment tôt pour confirmer les détails pratiques.']]]},
  'tunis-carthage-airport-guide':{image:'airport.jpg',en:['Arriving at Tunis-Carthage Airport','How to make the first part of your Tunis trip calm, clear and coordinated.',[['Share your arrival details','Give your flight number, planned arrival time, passenger count and destination when requesting a transfer. It helps the team prepare the route and meet you at the agreed point.'],['Choose the right arrival service','A private transfer is ideal when you want to go directly to a hotel, residence or meeting. If you plan to drive during your stay, a rental vehicle can be arranged for airport collection or delivery.'],['Keep the first connection simple','Save the VIPCAR contact details before landing and confirm the final instructions before departure. If your flight schedule changes, notify the team as early as possible.']]],fr:['Arriver à l’aéroport Tunis-Carthage','Comment rendre les premiers instants de votre séjour à Tunis simples et bien organisés.',[['Partager les détails de votre arrivée','Indiquez votre numéro de vol, l’heure prévue, le nombre de passagers et votre destination lors de la demande. L’équipe peut ainsi préparer le trajet et le point de rendez-vous.'],['Choisir le bon service à l’arrivée','Un transfert privé convient si vous souhaitez rejoindre directement un hôtel, une résidence ou un rendez-vous. Si vous prévoyez de conduire, une location peut être organisée à l’aéroport.'],['Simplifier le premier trajet','Conservez les coordonnées VIPCAR avant l’atterrissage et confirmez les instructions finales avant le départ. En cas de modification de vol, prévenez l’équipe dès que possible.']]]},
  'choosing-a-car-in-tunisia':{image:'hero-mercedes.jpg',en:['Choosing the right car for your itinerary','A simple way to match vehicle size, luggage, roads and travel style across Tunisia.',[['For city breaks and short stays','A compact car is often the most practical option for Tunis and shorter urban stays. It is easy to handle and leaves room in the budget for the rest of the trip.'],['For family routes and longer distances','Choose a sedan, SUV or van when you need more luggage capacity, extra seating or better comfort across several destinations. Review the seat and bag information on each vehicle page before requesting a quote.'],['For business and special occasions','Premium and luxury models suit executive travel, client arrivals and events. Confirm the preferred vehicle, timings and delivery point with the VIPCAR team in advance.']]],fr:['Choisir la voiture adaptée à votre circuit','Une méthode simple pour choisir selon les bagages, les routes et le style de votre voyage en Tunisie.',[['Pour un séjour urbain ou court','Une citadine est souvent le choix le plus pratique pour Tunis et les séjours urbains. Elle est facile à conduire et laisse plus de budget pour le reste du voyage.'],['Pour la famille et les longues distances','Préférez une berline, un SUV ou un van si vous avez davantage de bagages, de passagers ou plusieurs destinations. Consultez les informations de places et de bagages avant de demander un devis.'],['Pour les affaires et les occasions spéciales','Les véhicules premium et luxe conviennent aux déplacements exécutifs, aux arrivées de clients et aux événements. Confirmez le modèle souhaité, les horaires et le point de livraison à l’avance.']]]},
  'rental-documents-and-deposit':{image:'interior.jpg',en:['Car rental documents and deposit in Tunisia','What to prepare before requesting your rental and what to confirm with the provider.',[['Bring the essential documents','A valid driving licence, passport or identity document and a payment card are normally required. If your licence does not use the Latin alphabet, an International Driving Permit is recommended.'],['Ask how the deposit works','The refundable deposit depends on the vehicle and the confirmed rental conditions. Ask for the amount, payment method and release process before the booking is finalised.'],['Keep every condition clear','Before travel, confirm insurance, mileage, fuel, delivery, return time and any additional-driver conditions. A clear written confirmation makes the rental easier for everyone.']]],fr:['Documents et caution pour une location en Tunisie','Ce qu’il faut préparer avant votre demande et confirmer avec le loueur.',[['Préparer les documents essentiels','Un permis de conduire valide, un passeport ou une pièce d’identité et une carte de paiement sont généralement nécessaires. Si votre permis n’utilise pas l’alphabet latin, un permis international est conseillé.'],['Comprendre le fonctionnement de la caution','La caution remboursable dépend du véhicule et des conditions confirmées. Demandez le montant, le mode de paiement et les modalités de restitution avant de finaliser la réservation.'],['Clarifier toutes les conditions','Avant le départ, confirmez l’assurance, le kilométrage, le carburant, la livraison, l’horaire de retour et les éventuels conducteurs additionnels. Une confirmation écrite facilite toute la location.']]]},
  'long-term-car-rental-tunisia':{image:'road-travel.jpg',en:['Long-term car rental in Tunisia: how it works','A practical option for extended stays, business assignments and flexible local travel.',[['When a longer rental makes sense','Long-term rental can suit expatriates, project teams, extended family visits and business stays. It offers a consistent vehicle and can be simpler than arranging repeated short rentals.'],['Share the full requirement','Tell VIPCAR the expected dates, cities, vehicle category, passenger needs and any delivery requirements. The team can confirm what is available for the full period and the final quote.'],['Review the agreement carefully','For an extended rental, clarify maintenance, mileage, insurance, deposit, extensions and early-return terms before confirming the service.']]],fr:['Location longue durée en Tunisie : comment ça marche','Une solution pratique pour les séjours prolongés, missions professionnelles et déplacements flexibles.',[['Quand la longue durée est pertinente','La location longue durée convient aux expatriés, équipes en mission, visites familiales prolongées et séjours professionnels. Elle permet de garder un véhicule cohérent sans organiser plusieurs locations courtes.'],['Partager le besoin complet','Indiquez vos dates, les villes concernées, la catégorie de véhicule, les passagers et les besoins de livraison. VIPCAR peut confirmer la disponibilité sur toute la période et le devis final.'],['Relire les conditions avec attention','Pour une longue durée, clarifiez l’entretien, le kilométrage, l’assurance, la caution, les prolongations et les conditions de retour anticipé avant la confirmation.']]]},
  'driving-in-tunisia-guide':{image:'road-travel.jpg',en:['Driving in Tunisia: practical tips before your trip','Prepare for a calmer road trip with a few simple local-driving habits.',[['Plan the route before leaving','For longer drives, check the distance, daylight, fuel stops and your arrival point in advance. Leave extra time when travelling between cities or heading south.'],['Drive for the conditions','Road conditions and traffic can vary by area. Stay attentive, keep a safe distance and adapt your speed to the road, weather and visibility.'],['Choose a vehicle that fits the route','A compact car may be right for cities, while an SUV or larger vehicle can be more comfortable for family travel, luggage or longer road trips. Ask VIPCAR if you are unsure which category suits your plan.']]],fr:['Conduire en Tunisie : conseils pratiques avant le départ','Préparez un road trip plus serein avec quelques habitudes simples.',[['Préparer l’itinéraire avant de partir','Pour les longs trajets, vérifiez la distance, la lumière du jour, les arrêts carburant et votre point d’arrivée. Prévoyez une marge de temps entre les villes ou vers le sud.'],['Adapter la conduite aux conditions','La circulation et l’état des routes peuvent varier selon les zones. Restez attentif, gardez vos distances et adaptez votre vitesse à la route, à la météo et à la visibilité.'],['Choisir un véhicule adapté au trajet','Une citadine peut suffire en ville, tandis qu’un SUV ou un véhicule plus grand apporte davantage de confort pour la famille, les bagages ou les longs circuits. Demandez conseil à VIPCAR en cas de doute.']] ]}
};

const articleArabic = {
  'car-rental-tunisia-guide': ['تأجير سيارة في تونس: ما يجب معرفته', 'نقطة بداية عملية لاختيار السيارة وتجهيز الوثائق وتنظيم الاستلام أو التوصيل.', [['اختر السيارة حسب الرحلة', 'فكر أولاً في عدد الركاب والأمتعة والمسافة والطرق التي ستسلكها. تناسب السيارة المدمجة الإقامات داخل المدن، بينما تمنحك السيدان أو الدفع الرباعي مساحة أكبر للعائلة أو الرحلات الطويلة.'], ['أكد التفاصيل الأساسية قبل الوصول', 'اطلب تأكيد السيارة المتاحة ونقطة التوصيل وشروط التأجير والتأمين وعرض السعر النهائي بالدينار التونسي قبل السفر.'], ['خطط للاستلام أو التوصيل', 'يمكن لـ VIPCAR تنسيق التوصيل إلى المطار أو الفندق حسب تواريخك. شارك تفاصيل وصولك مبكراً لتأكيد العملية بسهولة.']]],
  'tunis-carthage-airport-guide': ['الوصول إلى مطار تونس قرطاج', 'كيف تجعل بداية رحلتك في تونس هادئة وواضحة ومنظمة.', [['شارك تفاصيل الوصول', 'أرسل رقم الرحلة ووقت الوصول وعدد الركاب والوجهة عند طلب النقل، حتى يجهز الفريق المسار ويلتقي بك في النقطة المتفق عليها.'], ['اختر خدمة الوصول المناسبة', 'النقل الخاص مثالي للوصول مباشرة إلى الفندق أو السكن أو الاجتماع. وإذا كنت ستقود خلال إقامتك، يمكن ترتيب سيارة للتسلم من المطار.'], ['اجعل التواصل الأول بسيطاً', 'احفظ بيانات VIPCAR قبل الهبوط وأكد التعليمات النهائية قبل المغادرة. أبلغ الفريق مبكراً عند تغير موعد الرحلة.']]],
  'choosing-a-car-in-tunisia': ['اختيار السيارة المناسبة لمسارك', 'طريقة بسيطة لمطابقة حجم السيارة والأمتعة والطرق وأسلوب السفر في تونس.', [['للرحلات القصيرة والإقامات داخل المدن', 'السيارة المدمجة خيار عملي في تونس والإقامات القصيرة. يسهل التعامل معها وتساعدك على الحفاظ على ميزانية الرحلة.'], ['للعائلة والمسافات الطويلة', 'اختر سيارة سيدان أو دفع رباعي أو فان عندما تحتاج إلى مساحة أكبر للأمتعة أو مقاعد إضافية أو راحة أكثر بين الوجهات.'], ['للأعمال والمناسبات الخاصة', 'تناسب الطرازات المميزة والفاخرة الرحلات التنفيذية واستقبال العملاء والفعاليات. أكد السيارة والتوقيت ونقطة التوصيل مسبقاً.']]],
  'rental-documents-and-deposit': ['وثائق وتأمين تأجير السيارات في تونس', 'ما يجب تحضيره قبل طلب السيارة وما ينبغي تأكيده مع مزود الخدمة.', [['جهز الوثائق الأساسية', 'تحتاج عادة إلى رخصة قيادة سارية وجواز سفر أو بطاقة هوية وبطاقة دفع. يُنصح برخصة قيادة دولية إذا كانت الرخصة ليست بالأبجدية اللاتينية.'], ['اسأل عن طريقة التأمين', 'يختلف مبلغ التأمين القابل للاسترداد حسب السيارة وشروط التأجير. اطلب المبلغ وطريقة الدفع وموعد إرجاعه قبل إنهاء الحجز.'], ['اجعل الشروط واضحة', 'أكد التأمين والمسافة والوقود والتوصيل ووقت الإرجاع وأي سائق إضافي قبل السفر.']]],
  'long-term-car-rental-tunisia': ['تأجير سيارة طويل الأمد في تونس: كيف يعمل؟', 'خيار عملي للإقامات الطويلة والمهام المهنية والتنقل المحلي المرن.', [['متى يناسب التأجير الطويل؟', 'يناسب التأجير الطويل المقيمين والفرق العاملة والزيارات العائلية الممتدة والإقامات المهنية، مع سيارة ثابتة بدلاً من عدة حجوزات قصيرة.'], ['شارك احتياجاتك كاملة', 'أخبر VIPCAR بالتواريخ والمدن وفئة السيارة وعدد الركاب ومتطلبات التوصيل، حتى نؤكد التوفر والعرض النهائي للفترة كلها.'], ['راجع الاتفاق بعناية', 'وضح الصيانة والمسافة والتأمين والتأمين المالي والتمديد وشروط الإرجاع المبكر قبل تأكيد الخدمة.']]],
  'driving-in-tunisia-guide': ['القيادة في تونس: نصائح عملية قبل السفر', 'استعد لرحلة برية أكثر راحة مع بعض العادات المحلية البسيطة.', [['خطط للمسار قبل الانطلاق', 'في الرحلات الطويلة، تحقق من المسافة وضوء النهار ومحطات الوقود ونقطة الوصول. اترك وقتاً إضافياً بين المدن أو عند التوجه جنوباً.'], ['قد حسب ظروف الطريق', 'قد تختلف حالة الطرق وحركة المرور حسب المنطقة. انتبه وحافظ على مسافة آمنة وعدّل السرعة حسب الطريق والطقس والرؤية.'], ['اختر سيارة تناسب المسار', 'قد تناسب السيارة المدمجة المدن، بينما تكون سيارة الدفع الرباعي أو السيارة الأكبر أكثر راحة للعائلة والأمتعة والرحلات الطويلة.']]],
};

function articleLocale(slug, article, lang) {
  return lang === 'ar' ? articleArabic[slug] ?? article.en : article[lang] ?? article.en;
}

function ArticlePage({lang,slug}) { const article=articles[slug]; if(!article)return <NotFound lang={lang}/>; const [title,summary,sections]=articleLocale(slug,article,lang); const related=Object.entries(articles).filter(([key])=>key!==slug).slice(0,3); return <main className="page"><PageHero image={article.image} eyebrow={text(lang,'VIPCAR travel journal','Journal de voyage VIPCAR','مجلة سفر VIPCAR')} title={title} text={summary}/><article className="section article-copy"><p className="overline">{text(lang,'Travel guidance','Conseils de voyage','إرشادات السفر')}</p><h2>{title}</h2><p>{summary}</p><div className="article-sections">{sections.map(([heading,textValue])=><section key={heading}><h3>{heading}</h3><p>{textValue}</p></section>)}</div><p>{text(lang,'Share your dates, pick-up point and preferences with the VIPCAR team. We confirm the practical details, availability and final quote directly before you travel.','Partagez vos dates, votre lieu de prise en charge et vos préférences avec l’équipe VIPCAR. Nous confirmons directement les détails pratiques, la disponibilité et le devis final avant votre départ.','شارك تواريخك ونقطة الاستلام وتفضيلاتك مع فريق VIPCAR. نؤكد التفاصيل العملية والتوفر وعرض السعر النهائي مباشرة قبل السفر.')}</p><SmartLink className="button" href={link(lang,'/booking')}>{copy[lang].book}<ArrowRight/></SmartLink></article><section className="section related-guides"><SectionHead eyebrow={text(lang,'Keep planning','Préparez la suite','واصل التخطيط')} title={text(lang,'More useful guides for your trip.','D’autres guides utiles pour votre séjour.','أدلة أخرى مفيدة لرحلتك.')}/><div className="journal-grid">{related.map(([key,item])=>{const relatedContent=articleLocale(key,item,lang);return <GuideCard key={key} image={item.image} tag={text(lang,'Travel guide','Guide pratique','دليل عملي')} title={relatedContent[0]} slug={key} lang={lang}/>})}</div></section><Cta lang={lang}/></main> }

function DestinationHub({lang}) { return <section className="section destination-grid"><div className="destination-grid-intro"><p className="overline">{text(lang,'Local service areas','Zones desservies','مناطق الخدمة')}</p><h2>{text(lang,'Start with the place that matters to your trip.','Commencez par le lieu qui compte pour votre trajet.','ابدأ من المكان الأهم في رحلتك.')}</h2><p>{text(lang,'Explore the locations where VIPCAR can arrange rental, delivery or a private transfer. Availability outside these hubs is confirmed for each request.','Découvrez les zones où VIPCAR organise location, livraison ou transfert privé. La disponibilité hors de ces hubs est confirmée pour chaque demande.','اكتشف المناطق التي تنظم فيها VIPCAR التأجير والتوصيل والنقل الخاص. نؤكد التوفر خارج هذه المراكز لكل طلب.')}</p></div>{commercialLocations.map((x,i)=><article key={x.slug}><span>0{String(i+1).padStart(2,'0')}</span><MapPin/><h2>{x.name[languageIndex(lang)]}</h2><p>{text(lang,`Car rental in ${x.name[0]}, with delivery or collection coordinated around your itinerary.`,`Location de voiture à ${x.name[1]}, avec livraison ou prise en charge selon votre trajet.`,`تأجير سيارة في ${x.name[2]} مع توصيل أو استلام منسق حسب مسارك.`)}</p><div className="destination-links"><SmartLink className="text-link" href={link(lang,`/car-rental/${x.slug}`)}>{text(lang,'Car rental','Location','تأجير السيارات')}<ArrowRight/></SmartLink>{x.slug!=='gabes'&&<SmartLink className="text-link" href={link(lang,`/airport-transfers/${x.slug}`)}>{text(lang,'Airport transfer','Transfert aéroport','النقل من المطار')}<ArrowRight/></SmartLink>}{chauffeurHubs.includes(x.slug)&&<SmartLink className="text-link" href={link(lang,`/chauffeur/${x.slug}`)}>سائق خاص<ArrowRight/></SmartLink>}</div></article>)}</section> }

const legalPages={
  'terms-conditions':{en:['Terms & conditions','The rental, transfer and chauffeur conditions confirmed for each request apply to the agreed service, vehicle and dates.'],fr:['Conditions générales','Les conditions de location, de transfert et de chauffeur confirmées pour chaque demande s’appliquent au service, au véhicule et aux dates convenus.']},
  'privacy-policy':{en:['Privacy policy','VIPCAR uses the details you share to respond to your request, confirm availability and coordinate the service you asked for.'],fr:['Politique de confidentialité','VIPCAR utilise les informations partagées pour répondre à votre demande, confirmer la disponibilité et organiser le service demandé.']},
  'cancellation-policy':{en:['Cancellation policy','Cancellation and amendment terms depend on the service, vehicle and timing of the request and are confirmed before booking.'],fr:['Politique d’annulation','Les conditions d’annulation et de modification dépendent du service, du véhicule et du délai de la demande et sont confirmées avant la réservation.']}
};

const legalArabic = {
  'terms-conditions': ['الشروط والأحكام', 'تنطبق شروط التأجير والنقل وخدمات السائق التي يتم تأكيدها لكل طلب على الخدمة والسيارة والتواريخ المتفق عليها.'],
  'privacy-policy': ['سياسة الخصوصية', 'تستخدم VIPCAR البيانات التي تشاركها للرد على طلبك وتأكيد التوفر وتنظيم الخدمة التي طلبتها.'],
  'cancellation-policy': ['سياسة الإلغاء', 'تختلف شروط الإلغاء والتعديل حسب الخدمة والسيارة ووقت الطلب، ويتم تأكيدها قبل الحجز.'],
};

function LegalPage({lang,slug}) { const data=legalPages[slug]; if(!data)return <NotFound lang={lang}/>; const a=lang==='ar'?legalArabic[slug]:data[lang]; return <main className="page"><PageHero image="interior.jpg" eyebrow={text(lang,'VIPCAR legal','VIPCAR juridique','الجوانب القانونية لـ VIPCAR')} title={a[0]} text={a[1]}/><section className="section legal-copy"><p className="overline">{text(lang,'Last updated','Dernière mise à jour','آخر تحديث')} · 18 August 2026</p><h2>{a[0]}</h2><p>{a[1]}</p><h3>{text(lang,'Direct confirmation','Confirmation directe','التأكيد المباشر')}</h3><p>{text(lang,'Your exact quote, availability, deposit and service conditions are confirmed directly with the VIPCAR team before you commit.','Votre devis exact, la disponibilité, la caution et les conditions du service sont confirmés directement avec l’équipe VIPCAR avant votre engagement.','يؤكد فريق VIPCAR مباشرة عرض السعر النهائي والتوفر والتأمين وشروط الخدمة قبل التزامك.')}</p><h3>{text(lang,'Contact','Contact','التواصل')}</h3><p><a href={WA}>{PHONE}</a> · <a href="mailto:info@vipcar.com.tn">info@vipcar.com.tn</a></p></section></main> }

function ContactPage({lang}) { return <main className="page"><PageHero image="road-travel.jpg" eyebrow={text(lang,'VIPCAR contact','Contact VIPCAR','التواصل مع VIPCAR')} title={text(lang,'Let’s arrange the details.','Organisons les détails de votre trajet.','لننظم تفاصيل رحلتك.')} text={text(lang,'Questions, fixed quotes and corporate requests reach a real VIPCAR team, available 24/7.','Questions, devis fixes et demandes entreprises sont traités par une vraie équipe VIPCAR, disponible 24h/24.','تصلك أسئلتك وعروض الأسعار الثابتة وطلبات الشركات إلى فريق VIPCAR الحقيقي المتاح على مدار الساعة.')}/><section className="section contact-grid"><div className="contact-cards"><a href={WA}><MessageCircle/><strong>WhatsApp</strong><span>{PHONE}</span><small>{text(lang,'Fastest reply','Réponse la plus rapide','أسرع رد')}</small></a><a href="tel:+21655771077"><Headphones/><strong>{text(lang,'Call the team','Appeler l’équipe','اتصل بالفريق')}</strong><span>{PHONE}</span><small>{text(lang,'Available 24/7','Disponible 24h/24','متاح على مدار الساعة')}</small></a><a href="mailto:info@vipcar.com.tn"><BriefcaseBusiness/><strong>Email</strong><span>info@vipcar.com.tn</span><small>{text(lang,'Corporate accounts & invoicing','Comptes entreprises et facturation','حسابات الشركات والفوترة')}</small></a><div><MapPin/><strong>{text(lang,'Head office','Bureau principal','المقر الرئيسي')}</strong><span>Rue de la Feuille d'Érable, Lac 2, Tunis</span><small>Tunis · Gabès · Djerba</small></div></div><div className="contact-form"><h2>{text(lang,'Send a message','Envoyer un message','أرسل رسالة')}</h2><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);location.href=`${WA}?text=${encodeURIComponent(`Hello VIPCAR, ${f.get('message')} My name is ${f.get('name')}. Contact: ${f.get('contact')}.`)}`}}><label>{copy[lang].yourName}<input required name="name"/></label><label>{text(lang,'Phone / WhatsApp / Email','Téléphone / WhatsApp / Email','الهاتف / واتساب / البريد الإلكتروني')}<input required name="contact"/></label><label>{text(lang,'Message','Message','الرسالة')}<textarea required name="message" rows="6"/></label><button className="button" type="submit">{text(lang,'Send via WhatsApp','Envoyer sur WhatsApp','إرسال عبر واتساب')}<MessageCircle/></button></form></div></section><Cta lang={lang}/></main> }

function FaqPage({lang}) { return <main className="page"><PageHero image="interior.jpg" eyebrow="VIPCAR FAQ" title={text(lang,'Useful answers before you travel.','Les réponses utiles avant votre voyage.','إجابات مفيدة قبل السفر.')} text={text(lang,'Rental requirements, airport collection, deposits, delivery and booking explained clearly.','Conditions de location, aéroports, caution, livraison et réservation expliqués clairement.','نوضح متطلبات التأجير والاستقبال من المطار والتأمين والتوصيل والحجز.')}/><Faq lang={lang}/><section className="section faq-extra"><div><p className="overline">{text(lang,'Still deciding?','Vous hésitez encore ?','هل ما زلت متردداً؟')}</p><h2>{text(lang,'Tell us what you need and we will confirm the practical details.','Dites-nous ce qu’il vous faut et nous confirmerons les détails pratiques.','أخبرنا بما تحتاجه وسنؤكد لك التفاصيل العملية.')}</h2></div><QuoteWidget lang={lang}/></section></main> }

function LocationLinks({lang,currentSlug,airport}) { return <section className="section location-links"><SectionHead eyebrow={airport?text(lang,'More airport routes','Autres transferts aéroport','المزيد من مسارات المطارات'):text(lang,'More local routes','Autres destinations','المزيد من الوجهات المحلية')} title={airport?text(lang,'Arrive anywhere in Tunisia.','Arrivez partout en Tunisie.','صل إلى أي مكان في تونس.'):text(lang,'Choose where your journey starts.','Choisissez le point de départ de votre voyage.','اختر نقطة انطلاق رحلتك.')}/><div className="location-link-grid">{commercialLocations.filter(x=>x.slug!==currentSlug).slice(0,4).map(x=><SmartLink key={x.slug} className="location-link-card" href={link(lang,`${airport?'/airport-transfers':'/car-rental'}/${x.slug}`)}><MapPin size={18}/><strong>{airport?text(lang,`${x.airport} transfers`,`Transferts ${x.airport}`,`النقل من ${x.airport}`):text(lang,`Car rental in ${x.name[0]}`,`Location de voiture à ${x.name[1]}`,`تأجير السيارات في ${x.name[2]}`)}</strong><span>{text(lang,'Fixed quote confirmed for your itinerary','Devis fixe confirmé selon votre trajet','عرض سعر ثابت مؤكد حسب مسارك')}<ArrowRight size={15}/></span></SmartLink>)}</div></section> }

function LocationPage({lang,slug,airport=false}) { const item=commercialLocations.find(x=>x.slug===slug)||commercialLocations[0]; const title=airport?text(lang,`${item.airport} transfers`,`Transferts depuis ${item.airport}`,`النقل من ${item.airport}`):text(lang,`Car rental in ${item.name[0]}`,`Location de voiture à ${item.name[1]}`,`تأجير السيارات في ${item.name[2]}`); const pageText=airport?text(lang,`Pre-arranged airport transfers between ${item.airport}, hotels and destinations in Tunisia. Your driver tracks the flight and the final fixed quote is confirmed before travel.`,`Transferts aéroport organisés entre ${item.airport}, les hôtels et les destinations en Tunisie. Votre chauffeur suit le vol et le devis fixe est confirmé avant le départ.`,`نظم نقلك من ${item.airport} إلى الفنادق والوجهات في تونس مسبقاً. يتابع السائق الرحلة ويؤكد السعر الثابت قبل السفر.`):text(lang,`Arrange a VIPCAR rental in ${item.name[0]} with collection or delivery at ${item.airport}. Choose from economy, compact, SUV, executive and group vehicles, subject to availability for your dates.`,`Organisez votre location VIPCAR à ${item.name[1]} avec prise en charge ou livraison à ${item.airport}. Choisissez parmi les citadines, compactes, SUV, berlines et véhicules de groupe, selon disponibilité.`,`رتب تأجير سيارة من VIPCAR في ${item.name[2]} مع الاستلام أو التوصيل في ${item.airport}. اختر من السيارات الاقتصادية والمدمجة والدفع الرباعي والتنفيذية وسيارات المجموعات حسب التوفر.`); return <main className="page"><PageHero image={item.image} eyebrow={airport?text(lang,'Airport transfer Tunisia','Transfert aéroport Tunisie','النقل من مطار تونس') : text(lang,'Car rental Tunisia','Location de voiture Tunisie','تأجير السيارات في تونس')} title={title} text={pageText}/><section className="section location-detail"><div><p className="overline">{item.name[languageIndex(lang)]} · {text(lang,'Tunisia','Tunisie','تونس')}</p><h2>{airport?text(lang,'A calm arrival starts before you land.','Une arrivée sereine commence avant l’atterrissage.','وصول هادئ يبدأ قبل هبوط الطائرة.'):text(lang,'Your local mobility partner in Tunisia.','Votre partenaire mobilité en Tunisie.','شريكك المحلي للتنقل في تونس.')}</h2><p>{pageText}</p><ul><li><Check/>{text(lang,'Fixed quote confirmed directly','Devis fixe confirmé directement','عرض سعر ثابت مؤكد مباشرة')}</li><li><Check/>{text(lang,'Airport and hotel collection on request','Prise en charge à l’aéroport ou à l’hôtel sur demande','استلام من المطار أو الفندق عند الطلب')}</li><li><Check/>{text(lang,'English- and French-speaking team','Équipe francophone et anglophone','فريق يتحدث العربية والإنجليزية والفرنسية')}</li><li><Check/>{text(lang,'24/7 availability','Disponibilité 24h/24','متاح على مدار الساعة')}</li></ul></div><QuoteWidget lang={lang}/></section><LocalSeoContent lang={lang} item={item} airport={airport}/>{!airport&&<section className="section"><SectionHead eyebrow={text(lang,'Choose your vehicle','Choisissez votre véhicule','اختر سيارتك')} title={copy[lang].fleetTitle}/><div className="vehicle-grid featured">{fleet.slice(0,4).map(c=><VehicleCard key={c.slug} car={c} lang={lang}/>)}</div></section>}<LocationLinks lang={lang} currentSlug={slug} airport={airport}/><Faq lang={lang}/><Cta lang={lang}/></main> }

function ChauffeurLocationPage({lang,slug}) { const item=commercialLocations.find(x=>x.slug===slug); if(!item||!chauffeurHubs.includes(slug))return <NotFound lang={lang}/>; const city=item.name[languageIndex(lang)]; const title=text(lang,`Private chauffeur in ${item.name[0]}`,`Chauffeur privé à ${item.name[1]}`,`سائق خاص في ${city}`); const pageText=text(lang,`Arrange a professional VIPCAR chauffeur in ${item.name[0]} for airport arrivals, business travel, events or a full day of private touring. Your schedule, vehicle and fixed quote are confirmed directly before travel.`,`Organisez un chauffeur privé VIPCAR à ${item.name[1]} pour vos arrivées à l’aéroport, déplacements professionnels, événements ou circuits à la journée. Votre programme, le véhicule et le devis fixe sont confirmés directement avant le départ.`,`رتب سائقاً خاصاً محترفاً من VIPCAR في ${city} للوصول من المطار أو رحلات العمل أو الفعاليات أو جولة ليوم كامل. نؤكد برنامجك والسيارة والسعر الثابت مباشرة قبل السفر.`); return <main className="page"><PageHero image="interior.jpg" eyebrow={text(lang,'Private chauffeur Tunisia','Chauffeur privé Tunisie','سائق خاص في تونس')} title={title} text={pageText}/><section className="section location-detail"><div><p className="overline">{city} · VIPCAR</p><h2>{text(lang,'A calm, capable driver for every important journey.','Un chauffeur fiable pour les trajets qui comptent.','سائق هادئ وموثوق لكل رحلة مهمة.')}</h2><p>{pageText}</p><ul><li><Check/>{text(lang,'English- and French-speaking drivers','Chauffeurs francophones et anglophones','سائقون يتحدثون العربية والإنجليزية والفرنسية')}</li><li><Check/>{text(lang,'Airport meet-and-greet and flight tracking','Accueil à l’aéroport et suivi du vol','استقبال في المطار ومتابعة الرحلة')}</li><li><Check/>{text(lang,'Hourly, half-day or full-day service','À l’heure, à la demi-journée ou à la journée','خدمة بالساعة أو نصف يوم أو يوم كامل')}</li><li><Check/>{text(lang,'Discreet service for business and events','Service discret pour affaires et événements','خدمة خاصة للأعمال والفعاليات')}</li></ul></div><QuoteWidget lang={lang}/></section><section className="section"><SectionHead eyebrow={text(lang,'Related local services','Services locaux associés','خدمات محلية مرتبطة')} title={text(lang,`More ways to move through ${item.name[0]}.`,`D’autres façons de vous déplacer à ${item.name[1]}.`,`مزيد من طرق التنقل في ${city}.`)}/><div className="location-link-grid"><SmartLink className="location-link-card" href={link(lang,`/car-rental/${slug}`)}><Car size={18}/><strong>{text(lang,`Car rental in ${item.name[0]}`,`Location de voiture à ${item.name[1]}`,`تأجير السيارات في ${city}`)}</strong><span>{text(lang,'Explore rental options','Voir les options de location','اكتشف خيارات التأجير')}<ArrowRight size={15}/></span></SmartLink>{slug!=='gabes'&&<SmartLink className="location-link-card" href={link(lang,`/airport-transfers/${slug}`)}><Plane size={18}/><strong>{text(lang,`${item.airport} transfer`,`Transfert ${item.airport}`,`النقل من ${locationLabel(item.airport,lang)}`)}</strong><span>{text(lang,'Plan your arrival','Organiser votre arrivée','نظم وصولك')}<ArrowRight size={15}/></span></SmartLink>}</div></section><Faq lang={lang}/><Cta lang={lang}/></main> }

function NotFound({lang}) { return <main className="not-found"><span>404</span><h1>{text(lang,'This road ends here.','Cette route s’arrête ici.','انتهى الطريق هنا.')}</h1><p>{text(lang,'The page may have moved. Return to VIPCAR or explore the fleet.','Cette page a peut-être changé. Revenez à VIPCAR ou consultez la flotte.','ربما تغيرت الصفحة. عد إلى VIPCAR أو استكشف الأسطول.')}</p><SmartLink className="button" href={link(lang)}>{text(lang,'Return home','Retour à l’accueil','العودة إلى الصفحة الرئيسية')}<ArrowRight/></SmartLink></main> }

function Motion({routeKey}) {
  useLayoutEffect(()=>{
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const isMobile=matchMedia('(max-width:700px)').matches;
    const lenis = new Lenis({duration:isMobile?.75:.9, smoothWheel:true, wheelMultiplier:isMobile?.85:.9});
    const tick = time => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', ScrollTrigger.update);
    const ctx = gsap.context(()=>{
      const targets=selector=>gsap.utils.toArray(selector);
      const heroMedia=targets('.hero>img,.page-hero>img');
      const heroContent=targets('.hero-content>* ,.page-hero>div:last-child>*');
      const quote=targets('.quote-wrap');
      const enterY=isMobile?20:32;
      const enterDuration=isMobile?.62:.78;
      if(heroMedia.length) gsap.fromTo(heroMedia,{scale:1.06},{scale:1.02,duration:isMobile?1.25:1.6,ease:'power3.out'});
      if(heroContent.length) gsap.from(heroContent,{y:isMobile?28:42,opacity:0,duration:isMobile?.78:.92,stagger:isMobile?.06:.08,ease:'power3.out',delay:.12});
      if(quote.length) gsap.from(quote,{y:isMobile?28:44,opacity:0,duration:isMobile?.72:.88,ease:'power3.out',delay:isMobile?.32:.5});
      targets('.section-head').forEach(el=>{const children=targets(el.children);if(children.length)gsap.from(children,{scrollTrigger:{trigger:el,start:'top 84%',once:true},y:enterY,opacity:0,duration:enterDuration,stagger:isMobile?.05:.07,ease:'power3.out'});});
      targets('.vehicle-card,.service-card,.guide-card,.destination-grid article,.benefit-grid>div').forEach((el,i)=>gsap.from(el,{scrollTrigger:{trigger:el,start:'top 91%',once:true},y:enterY,opacity:0,duration:enterDuration,delay:(i%4)*(isMobile?.025:.045),ease:'power2.out'}));
      if(!isMobile) targets('.story-image img').forEach(el=>gsap.to(el,{scrollTrigger:{trigger:el.parentElement,start:'top bottom',end:'bottom top',scrub:1.2},yPercent:8,ease:'none'}));
      targets('.story-copy,.service-detail>div:first-child,.vehicle-overview>div:first-child,.location-detail>div:first-child').forEach(el=>gsap.from(el,{scrollTrigger:{trigger:el,start:'top 82%',once:true},x:isMobile?0:-35,y:isMobile?18:0,opacity:0,duration:isMobile?.7:.9,ease:'power3.out'}));
    });
    return()=>{ctx.revert();lenis.destroy();gsap.ticker.remove(tick);ScrollTrigger.getAll().forEach(trigger=>trigger.kill())};
  },[routeKey]);
  return null;
}

function Seo({lang,parts}) { useEffect(()=>{let title=text(lang,'Car Rental in Tunisia | VIPCAR','Location Voiture Tunisie | VIPCAR','تأجير سيارات في تونس | VIPCAR'); let desc=copy[lang].heroSub; const p=parts.join('/'); if(p==='fleet')title=text(lang,'Car Rental Fleet & Prices | VIPCAR Tunisia','Flotte & Prix Location Voiture | VIPCAR','أسطول وأسعار تأجير السيارات | VIPCAR تونس'); if(p.includes('services/transfer'))title=text(lang,'Airport Transfers in Tunisia | VIPCAR','Transfert Aéroport Tunisie | VIPCAR','خدمات النقل من المطار في تونس | VIPCAR'); if(p.includes('services/chauffeur'))title=text(lang,'Private Chauffeur in Tunisia | VIPCAR','Chauffeur Privé Tunisie | VIPCAR','سائق خاص في تونس | VIPCAR'); if(p.includes('services/rental'))title=text(lang,'Car Rental in Tunisia | VIPCAR','Location Voiture en Tunisie | VIPCAR','تأجير السيارات في تونس | VIPCAR'); if(p==='booking')title=text(lang,'Get a Fixed Quote | VIPCAR Tunisia','Demander un Devis | VIPCAR Tunisie','اطلب عرض سعر ثابت | VIPCAR تونس'); if(p==='my-bookings')title=text(lang,'My Bookings | VIPCAR Tunisia','Mes réservations | VIPCAR Tunisie','حجوزاتي | VIPCAR تونس'); if(p==='login')title=text(lang,'Sign in | VIPCAR Tunisia','Connexion | VIPCAR Tunisie','تسجيل الدخول | VIPCAR تونس'); if(p==='corporate')title=text(lang,'Corporate Mobility in Tunisia | VIPCAR','Mobilité d’entreprise en Tunisie | VIPCAR','تنقل الشركات في تونس | VIPCAR'); if(p==='about')title=text(lang,'About VIPCAR Tunisia | Local Mobility Experts','À propos de VIPCAR Tunisie | Experts mobilité','عن VIPCAR تونس | خبراء التنقل المحلي'); if(p==='destinations')title=text(lang,'Tunisia Car Rental Destinations | VIPCAR','Destinations location voiture Tunisie | VIPCAR','وجهات تأجير السيارات في تونس | VIPCAR'); if(p==='blog')title=text(lang,'Tunisia Travel Journal | VIPCAR','Journal de voyage Tunisie | VIPCAR','مجلة السفر في تونس | VIPCAR'); if(p==='contact')title=text(lang,'Contact VIPCAR Tunisia | Quotes & Support','Contacter VIPCAR Tunisie | Devis & Assistance','تواصل مع VIPCAR تونس | عروض ودعم'); if(p==='faq')title=text(lang,'Car Rental & Transfer FAQ | VIPCAR Tunisia','FAQ Location & Transfert | VIPCAR Tunisie','الأسئلة الشائعة لتأجير السيارات والنقل | VIPCAR تونس'); if(parts[0]==='blog'&&parts[1]&&articles[parts[1]])title=`${articleLocale(parts[1],articles[parts[1]],lang)[0]} | VIPCAR`; if(parts[0]==='legal'&&parts[1]&&legalPages[parts[1]])title=`${lang==='ar'?legalArabic[parts[1]][0]:legalPages[parts[1]][lang][0]} | VIPCAR Tunisia`; const vehicle=parts[0]==='fleet'&&parts[1]?fleet.find(x=>x.slug===parts[1]):null; if(vehicle)title=text(lang,`${vehicle.name} Rental | VIPCAR Tunisia`,`${vehicle.name} | Location Voiture | VIPCAR Tunisie`,`${vehicle.name} | تأجير السيارات | VIPCAR تونس`); document.title=title; document.documentElement.lang=lang; document.documentElement.dir=languageOption(lang).dir; const set=(sel,attr,val)=>{let e=document.head.querySelector(sel);if(!e){e=document.createElement(attr==='rel'?'link':'meta');document.head.appendChild(e)}Object.entries(val).forEach(([k,v])=>e.setAttribute(k,v))}; set('meta[name="description"]','name',{name:'description',content:desc}); set('link[rel="canonical"]','rel',{rel:'canonical',href:`${ORIGIN}${location.pathname}`}); set('meta[property="og:title"]','property',{property:'og:title',content:title}); set('meta[property="og:description"]','property',{property:'og:description',content:desc}); set('meta[property="og:image"]','property',{property:'og:image',content:vehicle?img(vehicle.image):img('hero-mercedes.jpg')}); set('meta[name="twitter:card"]','name',{name:'twitter:card',content:'summary_large_image'}); ['en','fr','ar'].forEach(l=>set(`link[hreflang="${l}"]`,'rel',{rel:'alternate',hreflang:l,href:`${ORIGIN}/${l}/${parts.join('/')}`.replace(/\/$/, '')})); const base={
      '@context':'https://schema.org','@type':['AutoRental','LocalBusiness'],name:'VIPCAR Tunisia',url:ORIGIN,telephone:'+21655771077',email:'info@vipcar.com.tn',image:img('hero-mercedes.jpg'),address:{'@type':'PostalAddress',streetAddress:"Rue de la Feuille d'Érable, Lac 2",addressLocality:'Tunis',addressCountry:'TN'},areaServed:'Tunisia',availableLanguage:['English','French','Arabic']
    }; const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{ '@type':'ListItem',position:1,name:'VIPCAR',item:`${ORIGIN}/${lang}`},...parts.map((x,i)=>({'@type':'ListItem',position:i+2,name:x.replaceAll('-',' '),item:`${ORIGIN}/${lang}/${parts.slice(0,i+1).join('/')}`}))]}; let schema=[base,crumbs]; if(parts[0]==='services'||parts[0]==='chauffeur')schema.push({'@context':'https://schema.org','@type':'Service',name:title,provider:{'@type':'Organization',name:'VIPCAR Tunisia'},areaServed:parts[1]||'Tunisia',url:`${ORIGIN}${location.pathname}`}); if(vehicle)schema.push({'@context':'https://schema.org','@type':['Product','Vehicle'],name:vehicle.name,image:img(vehicle.image),vehicleConfiguration:vehicle.cat,vehicleSeatingCapacity:vehicle.seats,offers:{'@type':'Offer',price:vehicle.price,priceCurrency:CURRENCY,url:`${ORIGIN}${location.pathname}`,description:'Indicative daily price in Tunisian Dinar; availability and the final quote are confirmed for the requested dates.'}}); if(!parts.length||parts[0]==='fleet'||parts[0]==='services'||parts[0]==='chauffeur')schema.push({'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs[lang].map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}); let script=document.head.querySelector('#route-schema'); if(!script){script=document.createElement('script');script.type='application/ld+json';script.id='route-schema';document.head.appendChild(script)}script.textContent=JSON.stringify(schema);
  },[lang,parts.join('/')]);
  useEffect(()=>{
    const item=parts[1]?commercialLocations.find(x=>x.slug===parts[1]):null;
    if(!item||!['car-rental','airport-transfers'].includes(parts[0])) return;
    const description=parts[0]==='car-rental'
      ?text(lang,`Car rental in ${item.name[0]} with airport and hotel delivery. Choose your vehicle and receive a fixed VIPCAR quote for your dates.`,`Location de voiture à ${item.name[1]} avec livraison à l’aéroport ou à l’hôtel. Choisissez votre véhicule et recevez un devis fixe VIPCAR.`,`Location de voitures à ${item.name[2]} avec livraison à l’aéroport ou à l’hôtel. Choisissez votre véhicule et recevez un devis fixe VIPCAR.`)
      :text(lang,`Private ${item.airport} airport transfers with flight tracking, meet-and-greet and a fixed VIPCAR quote confirmed before travel.`,`Transferts privés depuis ${item.airport}, avec suivi du vol, accueil personnalisé et devis fixe VIPCAR confirmé avant le départ.`,`Transferts privés depuis ${item.airport}, avec suivi du vol, accueil personnalisé et devis fixe VIPCAR confirmé avant le départ.`);
    let meta=document.head.querySelector('meta[name="description"]');
    if(meta) meta.setAttribute('content',description);
  },[lang,parts.join('/')]);
  useEffect(()=>{
    const path=parts.join('/');
    if(path==='contact') document.title=text(lang,'Contact VIPCAR Tunisia | Quotes & Support','Contacter VIPCAR Tunisie | Devis & Assistance','تواصل مع VIPCAR تونس | عروض ودعم');
    if(path==='faq') document.title=text(lang,'Car Rental & Transfer FAQ | VIPCAR Tunisia','FAQ Location & Transfert | VIPCAR Tunisie','الأسئلة الشائعة لتأجير السيارات والنقل | VIPCAR تونس');
    if(parts[0]==='car-rental'&&parts[1]) document.title=text(lang,`Car Rental in ${commercialLocations.find(x=>x.slug===parts[1])?.name[0]||'Tunisia'} | VIPCAR`,`Location Voiture ${commercialLocations.find(x=>x.slug===parts[1])?.name[1]||'Tunisie'} | VIPCAR`,`تأجير السيارات في ${commercialLocations.find(x=>x.slug===parts[1])?.name[2]||'تونس'} | VIPCAR`);
    if(parts[0]==='airport-transfers'&&parts[1]) document.title=text(lang,`${commercialLocations.find(x=>x.slug===parts[1])?.airport||'Tunisia'} Transfer | VIPCAR`,`Transfert ${commercialLocations.find(x=>x.slug===parts[1])?.airport||'Tunisie'} | VIPCAR`,`نقل من ${commercialLocations.find(x=>x.slug===parts[1])?.airport||'تونس'} | VIPCAR`);
    if(parts[0]==='chauffeur'&&parts[1]) document.title=text(lang,`Private Chauffeur in ${commercialLocations.find(x=>x.slug===parts[1])?.name[0]||'Tunisia'} | VIPCAR`,`Chauffeur Privé à ${commercialLocations.find(x=>x.slug===parts[1])?.name[1]||'Tunisie'} | VIPCAR`,`سائق خاص في ${commercialLocations.find(x=>x.slug===parts[1])?.name[2]||'تونس'} | VIPCAR`);
  },[lang,parts.join('/')]);
  useEffect(()=>{
    const path=parts.join('/');
    const descriptions={
      '':{en:'Premium car rental, private chauffeurs and airport transfers across Tunisia. Get a fixed quote from the VIPCAR local team.',fr:'Location de voiture premium, chauffeurs privés et transferts aéroport en Tunisie. Recevez un devis fixe de l’équipe VIPCAR.',ar:'تأجير سيارات مميز وسائقون خاصون ونقل من المطارات في مختلف أنحاء تونس. احصل على عرض سعر ثابت من فريق VIPCAR المحلي.'},
      fleet:{en:'Explore VIPCAR’s car rental fleet in Tunisia, from practical city cars and SUVs to premium vehicles and group transport.',fr:'Découvrez la flotte VIPCAR en Tunisie : citadines, SUV, véhicules premium et modèles adaptés aux groupes.',ar:'اكتشف أسطول VIPCAR في تونس، من السيارات العملية وسيارات الدفع الرباعي إلى السيارات الفاخرة وخيارات المجموعات.'},
      'services/rental':{en:'Car rental in Tunisia with airport or hotel delivery, clear daily rates and direct confirmation from VIPCAR.',fr:'Location de voiture en Tunisie avec livraison à l’aéroport ou à l’hôtel, tarifs clairs et confirmation directe VIPCAR.',ar:'تأجير سيارات في تونس مع توصيل إلى المطار أو الفندق، وأسعار يومية واضحة وتأكيد مباشر من VIPCAR.'},
      'services/transfer':{en:'Pre-arranged airport transfers in Tunisia with flight tracking, meet-and-greet and a fixed quote.',fr:'Transferts aéroport en Tunisie avec suivi du vol, accueil personnalisé et devis fixe confirmé à l’avance.',ar:'خدمات نقل من المطارات في تونس مع متابعة الرحلة واستقبال شخصي وعرض سعر ثابت مؤكد مسبقاً.'},
      'services/chauffeur':{en:'Private chauffeur service in Tunisia for airport transfers, business travel, events and touring.',fr:'Service de chauffeur privé en Tunisie pour transferts, déplacements professionnels, événements et circuits.',ar:'خدمة سائق خاص في تونس للنقل من المطار ورحلات العمل والفعاليات والجولات.'},
      booking:{en:'Request a clear VIPCAR quote for car rental, airport transfer or private chauffeur service in Tunisia.',fr:'Demandez un devis clair pour une location, un transfert aéroport ou un chauffeur privé en Tunisie.',ar:'اطلب عرض سعر واضحاً من VIPCAR لتأجير السيارات أو النقل من المطار أو خدمة السائق الخاص في تونس.'},
      destinations:{en:'Explore VIPCAR car rental, airport transfer and private chauffeur service areas across Tunisia.',fr:'Découvrez les zones VIPCAR pour la location, les transferts aéroport et le chauffeur privé en Tunisie.',ar:'اكتشف مناطق خدمة VIPCAR لتأجير السيارات والنقل من المطار والسائق الخاص في مختلف أنحاء تونس.'},
      contact:{en:'Contact VIPCAR Tunisia for car rental, airport transfer, chauffeur and corporate mobility requests.',fr:'Contactez VIPCAR Tunisie pour vos demandes de location, transfert aéroport, chauffeur et mobilité d’entreprise.',ar:'تواصل مع VIPCAR تونس لطلبات تأجير السيارات والنقل من المطار والسائق الخاص وتنقل الشركات.'},
      faq:{en:'Answers about car rental, airport transfers, chauffeur service, deposits, delivery and booking in Tunisia.',fr:'Réponses sur la location, les transferts, le chauffeur, la caution, la livraison et la réservation en Tunisie.',ar:'إجابات عن تأجير السيارات والنقل من المطار وخدمة السائق والتأمين والتوصيل والحجز في تونس.'}
    };
    let description=descriptions[path]?.[lang];
    if(parts[0]==='blog'&&parts[1]&&articles[parts[1]]) description=articleLocale(parts[1],articles[parts[1]],lang)[1];
    if(parts[0]==='legal'&&parts[1]&&legalPages[parts[1]]) description=lang==='ar'?legalArabic[parts[1]][1]:legalPages[parts[1]][lang][1];
    if(!description&&parts[0]==='car-rental'&&parts[1]){const item=commercialLocations.find(x=>x.slug===parts[1]);if(item)description=text(lang,`Car rental in ${item.name[0]} with airport and hotel delivery. Receive a fixed VIPCAR quote for your dates.`,`Location de voiture à ${item.name[1]} avec livraison à l’aéroport ou à l’hôtel. Recevez un devis fixe VIPCAR.`,`تأجير سيارات في ${item.name[2]} مع توصيل إلى المطار أو الفندق. احصل على عرض سعر ثابت من VIPCAR.`)}
    if(!description&&parts[0]==='airport-transfers'&&parts[1]){const item=commercialLocations.find(x=>x.slug===parts[1]);if(item)description=text(lang,`Private ${item.airport} airport transfers with flight tracking, meet-and-greet and a fixed VIPCAR quote.`,`Transferts privés depuis ${item.airport}, avec suivi du vol, accueil personnalisé et devis fixe VIPCAR.`,`نقل خاص من ${item.airport} مع متابعة الرحلة واستقبال شخصي وعرض سعر ثابت من VIPCAR.`)}
    if(!description&&parts[0]==='chauffeur'&&parts[1]){const item=commercialLocations.find(x=>x.slug===parts[1]);if(item)description=text(lang,`Private chauffeur in ${item.name[0]} for airport arrivals, business travel, events and full-day touring with VIPCAR.`,`Chauffeur privé à ${item.name[1]} pour arrivées à l’aéroport, affaires, événements et circuits à la journée avec VIPCAR.`,`سائق خاص في ${item.name[2]} لاستقبال المطار ورحلات العمل والفعاليات والجولات اليومية مع VIPCAR.`)}
    if(!description)description=copy[lang].heroSub;
    const meta=document.head.querySelector('meta[name="description"]');
    if(meta)meta.setAttribute('content',description);
    const og=document.head.querySelector('meta[property="og:description"]');
    if(og)og.setAttribute('content',description);
    const setAlternate=(hreflang,href)=>{let el=document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);if(!el){el=document.createElement('link');el.setAttribute('rel','alternate');el.setAttribute('hreflang',hreflang);document.head.appendChild(el)}el.setAttribute('href',href)};
    setAlternate('x-default',`${ORIGIN}/en/${path}`.replace(/\/$/,''));
  },[lang,parts.join('/')]);
  useEffect(()=>{
    const item=parts[1]?commercialLocations.find(x=>x.slug===parts[1]):null;
    if(!item||!['car-rental','airport-transfers','chauffeur'].includes(parts[0]))return;
    const schema=document.head.querySelector('#route-schema');
    if(!schema)return;
    try{const data=JSON.parse(schema.textContent);const service=data.find(x=>x['@type']==='Service');if(service)service.name=document.title;schema.textContent=JSON.stringify(data)}catch{}
  },[lang,parts.join('/')]);
  return null }

 function App(){
  const [pathname,setPathname]=useState(location.pathname);
  const [currency,setCurrency]=useState(getInitialCurrency);
  useEffect(()=>{const h=()=>setPathname(location.pathname);addEventListener('popstate',h);return()=>removeEventListener('popstate',h)},[]);
  useEffect(()=>{try{localStorage.setItem(CURRENCY_STORAGE_KEY,currency)}catch{/* storage can be unavailable in private browsing */}},[currency]);
  // Staff backoffice: same Vite app/port, path routing outside public locales.
  if(isAdminPathname(pathname)) return <AdminApp pathname={pathname}/>;
  const route=routeInfo();
  const {lang,parts}=route;
  let page;
  if(!parts.length)page=<Home lang={lang}/>;
  else if(parts[0]==='fleet'&&parts[1])page=<VehiclePage lang={lang} slug={parts[1]}/>;
  else if(parts[0]==='fleet')page=<FleetPage lang={lang}/>;
  else if(parts[0]==='services')page=<ServicePage lang={lang} type={parts[1]||'rental'}/>;
  else if(parts[0]==='booking')page=<BookingPage lang={lang}/>;
  else if(parts[0]==='my-bookings')page=<MyBookingsPage lang={lang}/>;
  else if(parts[0]==='login')page=<LoginPage lang={lang}/>;
  else if(parts[0]==='corporate')page=<Corporate lang={lang}/>;
  else if(parts[0]==='contact')page=<ContactPage lang={lang}/>;
  else if(parts[0]==='faq')page=<FaqPage lang={lang}/>;
  else if(parts[0]==='car-rental'&&parts[1])page=<LocationPage lang={lang} slug={parts[1]}/>;
  else if(parts[0]==='airport-transfers'&&parts[1])page=<LocationPage lang={lang} slug={parts[1]} airport/>;
  else if(parts[0]==='chauffeur'&&parts[1])page=<ChauffeurLocationPage lang={lang} slug={parts[1]}/>;
  else if(parts[0]==='blog'&&parts[1])page=<ArticlePage lang={lang} slug={parts[1]}/>;
  else if(['about','destinations','blog'].includes(parts[0]))page=<ContentPage lang={lang} type={parts[0]}/>;
  else if(parts[0]==='legal'&&parts[1])page=<LegalPage lang={lang} slug={parts[1]}/>;
  else page=<NotFound lang={lang}/>;
  return <CurrencyContext.Provider value={{currency,setCurrency}}><><Seo lang={lang} parts={parts}/><Motion routeKey={`${lang}/${parts.join('/')}`}/><a className="skip-link" href="#main-content">{lang==='en'?'Skip to main content':'Aller au contenu principal'}</a><Header lang={lang} home={!parts.length}/><div id="main-content">{page}</div><Footer lang={lang}/><FloatingWhatsApp lang={lang}/><SmartLink className="mobile-book" href={link(lang,'/booking')}>{copy[lang].book}<ArrowRight/></SmartLink></></CurrencyContext.Provider>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
