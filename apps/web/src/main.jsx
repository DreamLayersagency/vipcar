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
import { AdminApp, isAdminPathname } from './admin';
import './admin/admin.css';

gsap.registerPlugin(ScrollTrigger);

const ORIGIN = 'https://vipcar.com.tn';
const PHONE = '+216 55 771 077';
const WA = 'https://wa.me/21655771077';
const ASSET = `${ORIGIN}/images`;
const LOGO = '/images/vipcar-logo.png';
const CURRENCY = 'TND';

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
  }
};

const services = [
  { key:'rental', icon:Car, image:'luxury-amg.jpg', title:['Car rental','Location de voiture'], text:['Self-drive vehicles from economical city cars to premium models, delivered to your airport or hotel.','Des citadines économiques aux modèles premium, avec livraison à votre aéroport ou hôtel.'] },
  { key:'transfer', icon:Plane, image:'airport.jpg', title:['Airport transfers','Transferts aéroport'], text:['Meet-and-greet at Tunis-Carthage, Djerba-Zarzis and Enfidha-Hammamet airports, available 24/7.','Accueil aux aéroports Tunis-Carthage, Djerba-Zarzis et Enfidha-Hammamet, disponible 24h/24.'] },
  { key:'chauffeur', icon:Users, image:'interior.jpg', title:['Private chauffeur','Chauffeur privé'], text:['Professional English- and French-speaking drivers for business, events, touring or travel by the hour or day.','Chauffeurs professionnels francophones et anglophones pour affaires, événements ou circuits, à l’heure ou à la journée.'] }
];

const serviceSeoContent = {
  rental:{en:{eyebrow:'Car rental Tunisia',title:'A clear way to rent a car across Tunisia.',intro:'Choose the vehicle that fits your route, dates and passengers. VIPCAR coordinates airport or hotel delivery, confirms the exact availability and sends the final TND quote before you commit.',points:[['Short or long stays','Arrange a practical city car for a few days, a family SUV for a longer route or a premium vehicle for an important arrival.'],['Airport and hotel delivery','Tell us where you land or stay. The team confirms the handover point, timing and documents directly with you.'],['A fleet chosen around the journey','Compare compact, sedan, SUV, premium and group vehicles by seats, luggage and transmission.']]},fr:{eyebrow:'Location de voiture en Tunisie',title:'Louer une voiture en Tunisie, simplement.',intro:'Choisissez le véhicule adapté à votre itinéraire, à vos dates et à vos passagers. VIPCAR organise la livraison à l’aéroport ou à l’hôtel et confirme le devis final en TND avant votre engagement.',points:[['Courte ou longue durée','Une citadine pour quelques jours, un SUV familial pour un long trajet ou un véhicule premium pour une arrivée importante.'],['Livraison à l’aéroport ou à l’hôtel','Indiquez votre lieu d’arrivée ou de séjour. L’équipe confirme directement le point de remise, l’horaire et les documents.'],['Une flotte pensée pour votre trajet','Comparez citadines, berlines, SUV, véhicules premium et modèles pour groupes selon les places, les bagages et la boîte de vitesses.']]}},
  transfer:{en:{eyebrow:'Airport transfers Tunisia',title:'Arrive calmly. Leave the airport with a plan.',intro:'VIPCAR arranges private airport transfers between Tunisia’s main airports, hotels and destinations. Your driver follows the flight, meets you on arrival and confirms the fixed quote before travel.',points:[['Flight tracking','Share your flight number and the team can coordinate the pickup around the actual arrival time.'],['Meet-and-greet','Your driver meets you at the agreed arrival point and helps keep the first part of your journey clear.'],['Direct, fixed confirmation','The route, vehicle, passengers and final TND quote are agreed directly before your trip.']]},fr:{eyebrow:'Transferts aéroport en Tunisie',title:'Arrivez sereinement, dès la sortie de l’aéroport.',intro:'VIPCAR organise vos transferts privés entre les principaux aéroports tunisiens, les hôtels et les destinations. Votre chauffeur suit le vol, vous accueille à l’arrivée et confirme le devis fixe avant le départ.',points:[['Suivi du vol','Partagez votre numéro de vol afin que l’équipe coordonne la prise en charge selon l’heure réelle d’arrivée.'],['Accueil personnalisé','Votre chauffeur vous attend au point convenu et vous accompagne dès les premiers instants du séjour.'],['Confirmation directe et fixe','Le trajet, le véhicule, le nombre de passagers et le devis final en TND sont confirmés avant le départ.']]}},
  chauffeur:{en:{eyebrow:'Private chauffeur Tunisia',title:'A professional driver for the journeys that matter.',intro:'Book a private chauffeur for airport arrivals, business meetings, events or a full day of touring. VIPCAR confirms the schedule, vehicle and fixed quote directly with you.',points:[['By the hour or by the day','Choose the service duration that fits your itinerary, from a focused transfer to a full day of movement.'],['Professional and discreet','English- and French-speaking drivers coordinate the details with care and keep the service calm and punctual.'],['For business, events and touring','Use one trusted team for important meetings, special occasions or a relaxed way to discover Tunisia.']]},fr:{eyebrow:'Chauffeur privé en Tunisie',title:'Un chauffeur professionnel pour les trajets qui comptent.',intro:'Réservez un chauffeur privé pour une arrivée à l’aéroport, des rendez-vous professionnels, un événement ou un circuit à la journée. VIPCAR confirme directement votre programme, le véhicule et le devis fixe.',points:[['À l’heure ou à la journée','Choisissez la durée adaptée à votre itinéraire, d’un transfert ponctuel à une journée complète.'],['Professionnalisme et discrétion','Des chauffeurs francophones et anglophones coordonnent chaque détail avec calme et ponctualité.'],['Affaires, événements et circuits','Une seule équipe pour vos rendez-vous importants, vos occasions spéciales ou votre découverte de la Tunisie.']]}}
};

const locations = ['Tunis-Carthage Airport','Tunis','Enfidha-Hammamet Airport','Sousse','Hammamet','Gabès','Djerba-Zarzis Airport','Nabeul','Bizerte'];
const commercialLocations = [
  { slug:'tunis', name:['Tunis','Tunis'], airport:'Tunis-Carthage Airport', image:'road-travel.jpg' },
  { slug:'djerba', name:['Djerba','Djerba'], airport:'Djerba-Zarzis Airport', image:'luxury-rear.jpg' },
  { slug:'sousse', name:['Sousse','Sousse'], airport:'Enfidha-Hammamet Airport', image:'suv-white.jpg' },
  { slug:'hammamet', name:['Hammamet','Hammamet'], airport:'Enfidha-Hammamet Airport', image:'airport.jpg' },
  { slug:'gabes', name:['Gabès','Gabès'], airport:'Gabès', image:'road-travel.jpg' }
];
const chauffeurHubs = ['tunis','gabes','djerba'];

function routeInfo() {
  const parts = location.pathname.split('/').filter(Boolean);
  const lang = parts[0] === 'fr' ? 'fr' : 'en';
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

function Header({lang}) {
  const [open,setOpen]=useState(false); const [languageOpen,setLanguageOpen]=useState(false); const t=copy[lang];
  const navPaths=['/services/rental','/services/transfer','/services/chauffeur','/fleet','/corporate','/destinations','/about'];
  const currentPath=location.pathname.replace(/^\/(en|fr)/,'')||'/';
  useEffect(()=>{document.body.style.overflow=open?'hidden':''; return()=>{document.body.style.overflow=''}},[open]);
  useEffect(()=>{if(!languageOpen)return; const close=()=>setLanguageOpen(false); addEventListener('mousedown',close); return()=>removeEventListener('mousedown',close)},[languageOpen]);
  const switchLanguage=next=>{setLanguageOpen(false);go(link(next,location.pathname.replace(/^\/(en|fr)/,'')))};
  return <>
    <div className="utility"><span><Clock3 size={13}/> 24/7 · Tunis · Gabès · Djerba</span><a href="tel:+21655771077" onClick={()=>trackEvent('phone_click',{location:'utility',language:lang})}>{PHONE}</a></div>
    <header className="header">
      <SmartLink href={link(lang)} className="brand-logo brand-logo--header" aria-label="VIPCAR Tunisia home"><img src={LOGO} alt="VIPCAR Tunisia" /></SmartLink>
      <nav id="primary-navigation" className={open?'nav open':'nav'} aria-label="Primary navigation">{t.nav.map((n,i)=>{const path=navPaths[i]; const active=currentPath===path||currentPath.startsWith(`${path}/`); return <SmartLink key={n} href={link(lang,path)} aria-current={active?'page':undefined} onClick={()=>setOpen(false)}>{n}</SmartLink>})}</nav>
      <div className="header-actions">
        <div className="language-picker"><button type="button" className="language-trigger" aria-haspopup="listbox" aria-expanded={languageOpen} aria-label={lang==='en'?'Select language':'Choisir la langue'} onMouseDown={event=>event.stopPropagation()} onClick={()=>setLanguageOpen(previous=>!previous)}><Languages size={16}/><span>{lang.toUpperCase()}</span><ChevronDown size={13}/></button>{languageOpen&&<div className="language-menu" role="listbox" aria-label={lang==='en'?'Languages':'Langues'} onMouseDown={event=>event.stopPropagation()}><button type="button" role="option" aria-selected={lang==='en'} className={lang==='en'?'active':''} onClick={()=>switchLanguage('en')}><span>EN</span><small>English</small></button><button type="button" role="option" aria-selected={lang==='fr'} className={lang==='fr'?'active':''} onClick={()=>switchLanguage('fr')}><span>FR</span><small>Français</small></button></div>}</div>
        <a className="icon-link" href={WA} aria-label="WhatsApp" onClick={()=>trackEvent('whatsapp_click',{location:'header',language:lang})}><MessageCircle size={20}/></a>
        <SmartLink className="button button-small" href={link(lang,'/booking')}>{t.book}<ArrowRight size={16}/></SmartLink>
        <button className="menu" onClick={()=>setOpen(previous=>!previous)} aria-label="Toggle menu" aria-expanded={open} aria-controls="primary-navigation">{open?<X/>:<Menu/>}</button>
      </div>
    </header>
  </>;
}

function Footer({lang}) { const t=copy[lang]; return <footer>
  <div className="footer-top"><div><SmartLink href={link(lang)} className="brand-logo brand-logo--footer" aria-label="VIPCAR Tunisia home"><img src={LOGO} alt="VIPCAR Tunisia" /></SmartLink><p>{t.footer}</p></div><div><strong>Services</strong><SmartLink href={link(lang,'/services/rental')}>{t.nav[0]}</SmartLink><SmartLink href={link(lang,'/services/transfer')}>{t.nav[1]}</SmartLink><SmartLink href={link(lang,'/services/chauffeur')}>{t.nav[2]}</SmartLink></div><div><strong>Explore</strong><SmartLink href={link(lang,'/fleet')}>{t.nav[3]}</SmartLink><SmartLink href={link(lang,'/corporate')}>{t.nav[4]}</SmartLink><SmartLink href={link(lang,'/my-bookings')}>{lang==='en'?'My bookings':'Mes réservations'}</SmartLink><SmartLink href={link(lang,'/blog')}>Travel journal</SmartLink><SmartLink href={link(lang,'/about')}>{t.nav[6]}</SmartLink></div><div><strong>Contact</strong><a href="tel:+21655771077" onClick={()=>trackEvent('phone_click',{location:'footer',language:lang})}>{PHONE}</a><a href={WA} onClick={()=>trackEvent('whatsapp_click',{location:'footer',language:lang})}>WhatsApp</a><a href="mailto:info@vipcar.com.tn" onClick={()=>trackEvent('email_click',{location:'footer',language:lang})}>info@vipcar.com.tn</a><span>Rue de la Feuille d'Érable<br/>Lac 2, Tunis</span></div></div>
  <div className="footer-bottom"><span>© 2026 VIPCAR Tunisia</span><div><SmartLink href={link(lang,'/legal/terms-conditions')}>Terms</SmartLink><SmartLink href={link(lang,'/legal/privacy-policy')}>Privacy</SmartLink><SmartLink href={link(lang,'/legal/cancellation-policy')}>Cancellation</SmartLink></div></div>
  </footer> }

function QuoteSuccess({lang,request,compact=false,onWhatsApp,onReset}) {
  const isEnglish=lang==='en';
  const accountUser=getStoredUser();
  return <section className={`quote-success${compact?' quote-success--compact':''}`} aria-live="polite">
    <div className="quote-success-mark" aria-hidden="true"><Check size={19}/></div>
    <p className="overline">{isEnglish?'Request received':'Demande reçue'}</p>
    <h3>{isEnglish?'Your trip request is safely with the VIPCAR team.':'Votre demande de trajet est bien enregistrée par l’équipe VIPCAR.'}</h3>
    <p className="quote-success-copy">{isEnglish?'We will confirm availability and your fixed quote directly. Keep this reference for any follow-up.':'Nous allons confirmer la disponibilité et votre devis fixe directement. Conservez cette référence pour tout suivi.'}</p>
    <div className="quote-success-reference"><span>{isEnglish?'Request reference':'Référence de la demande'}</span><strong>{request.reference}</strong></div>
    {accountUser?.role==='customer'&&<p className="quote-success-account">{isEnglish?'This request is linked to your VIPCAR account and will appear in My bookings once confirmed.':'Cette demande est liée à votre compte VIPCAR et apparaîtra dans Mes réservations une fois confirmée.'}</p>}
    <div className="quote-success-actions">
      <button type="button" className="button" onClick={onWhatsApp}>{isEnglish?'Continue on WhatsApp':'Continuer sur WhatsApp'}<MessageCircle size={17}/></button>
      <button type="button" className="quote-success-reset" onClick={onReset}>{isEnglish?'Make another request':'Faire une autre demande'}</button>
    </div>
  </section>
}

function QuoteWidget({lang,compact=false}) {
  const [service,setService]=useState('rental');
  const [showDetails,setShowDetails]=useState(false);
  const [duration,setDuration]=useState('full-day');
  const [error,setError]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [success,setSuccess]=useState(null);
  useEffect(()=>{initAnalytics()},[]);
  const today=new Date().toISOString().slice(0,10);
  const action=lang==='en'?'Get my fixed quote':'Recevoir mon devis fixe';
  const chooseService=key=>{
    setService(key);
    setShowDetails(key==='chauffeur');
    setError('');
    trackEvent('service_selected',{service:key,language:lang,location:compact?'compact_quote':'quote'});
  };
  const submit=async(e)=>{
    e.preventDefault();
    if(submitting)return;
    setError('');
    const f=new FormData(e.currentTarget);
    const pickup=String(f.get('pickup')||'');
    const startDate=String(f.get('date')||'');
    const endRaw=String(f.get('endDate')||'').trim();
    const name=String(f.get('name')||'').trim();
    const phone=String(f.get('phone')||'').trim();
    const passengersRaw=f.get('passengers');
    const passengers=passengersRaw!==null&&String(passengersRaw).trim()!==''?Number(passengersRaw):undefined;
    const notes=String(f.get('notes')||'').trim()||undefined;
    const durationValue=service==='chauffeur'
      ?(String(f.get('duration')||duration)||'full-day')
      :undefined;
    if(!name||!phone){
      setError(lang==='en'
        ?'Please enter your name and phone number.'
        :'Indiquez votre nom et votre numéro de téléphone.');
      return;
    }
    if(service==='rental'&&!endRaw){
      setError(lang==='en'
        ?'Please choose a return date for your rental.'
        :'Choisissez une date de retour pour votre location.');
      return;
    }
    const body={
      service,
      pickup,
      startDate,
      ...(service==='rental'?{endDate:endRaw}:{}),
      ...(durationValue?{duration:durationValue}:{}),
      ...(passengers&&!Number.isNaN(passengers)?{passengers}:{}),
      ...(notes?{notes}:{}),
      name,
      phone,
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
        startDate,
        endDate:body.endDate,
        name,
        phone,
        notes,
        duration:durationValue,
        passengers,
      })} Reference: ${reference}.`;
      setSuccess({
        reference,
        whatsappText,
      });
      trackEvent('quote_submit',{service,language:lang,location:compact?'compact_quote':'quote'});
    }catch(err){
      setError(quoteErrorMessage(err,lang));
    }finally{
      setSubmitting(false);
    }
  };
  if(success)return <QuoteSuccess lang={lang} request={success} compact={compact} onWhatsApp={()=>openWhatsAppQuote(success.whatsappText,WA)} onReset={()=>{setSuccess(null);setError('')}}/>;
  return <form className={compact?'quote compact':'quote'} onSubmit={submit}>
    <div className="quote-heading"><div><p className="overline">{lang==='en'?'Start with your trip':'Commencez par votre trajet'}</p><h3>{lang==='en'?'What are you arranging?':'Quel trajet organisez-vous ?'}</h3></div><span><ShieldCheck size={15}/>{lang==='en'?'No payment now':'Aucun paiement immédiat'}</span></div>
    <div className="quote-service-choice" role="group" aria-label={lang==='en'?'Choose a service':'Choisir un service'}>{services.map(s=>{const Icon=s.icon;return <button type="button" className={service===s.key?'active':''} aria-pressed={service===s.key} onClick={()=>chooseService(s.key)} key={s.key}><Icon size={20}/><span><strong>{s.title[lang==='en'?0:1]}</strong><small>{s.key==='rental'?(lang==='en'?'Self-drive':'Sans chauffeur'):s.key==='transfer'?(lang==='en'?'Airport pickup':'Aéroport'):lang==='en'?'By the hour or day':'À l’heure ou à la journée'}</small></span></button>})}</div>
    <div className="quote-fields">
      <label><span><MapPin size={15}/>{lang==='en'?'Where should we meet?':'Lieu de départ'}</span><select name="pickup" aria-label={lang==='en'?'Pick-up location':'Lieu de départ'}>{locations.map(x=><option key={x}>{x}</option>)}</select></label>
      <label><span><CalendarDays size={15}/>{lang==='en'?'When?':'Date souhaitée'}</span><input required name="date" type="date" min={today}/></label>
      {service==='rental'&&<label><span><CalendarDays size={15}/>{lang==='en'?'Return date':'Date de retour'}</span><input required name="endDate" type="date" min={today}/></label>}
      <label><span><Users size={15}/>{lang==='en'?'Your name':'Votre nom'}</span><input required name="name" placeholder={lang==='en'?'Full name':'Nom complet'} autoComplete="name"/></label>
      <label><span><MessageCircle size={15}/>{lang==='en'?'Phone / WhatsApp':'Téléphone / WhatsApp'}</span><input required name="phone" type="tel" placeholder="+216…" autoComplete="tel"/></label>
      <button className="button" type="submit" disabled={submitting}>{submitting?(lang==='en'?'Sending…':'Envoi…'):action}{!submitting&&<ArrowRight size={17}/>}</button>
    </div><button type="button" className="details-toggle" aria-expanded={showDetails} onClick={()=>setShowDetails(previous=>!previous)}>{showDetails?'−':'+'} {lang==='en'?'Add details (optional)':'Ajouter des détails (facultatif)'}</button>{showDetails&&<div className="quote-extra">
      {service==='chauffeur'&&<label><span><Clock3 size={15}/>{lang==='en'?'Service duration':'Durée du service'}</span><select name="duration" value={duration} onChange={e=>setDuration(e.target.value)}><option value="hourly">{lang==='en'?'By the hour':'À l’heure'}</option><option value="half-day">{lang==='en'?'Half day':'Demi-journée'}</option><option value="full-day">{lang==='en'?'Full day':'Journée complète'}</option></select></label>}
      <label><span><Users size={15}/>{lang==='en'?'Passengers':'Passagers'}</span><input name="passengers" type="number" min="1" max="50" defaultValue="2"/></label>
      <label className="quote-extra-wide"><span><MapPin size={15}/>{lang==='en'?'Notes / destination':'Notes / destination'}</span><input name="notes" placeholder={lang==='en'?'Hotel, destination, flight number…':'Hôtel, destination, numéro de vol…'}/></label>
    </div>}
    {error&&<p className="form-feedback form-feedback-error" role="alert">{error}</p>}
    <p className="quote-note"><span>{lang==='en'?'We save your request first, then you can continue on WhatsApp for confirmation.':'Nous enregistrons d’abord votre demande, puis vous pouvez continuer sur WhatsApp pour la confirmation.'}</span></p>
  </form>
}

function VehicleCard({car,lang,loading='lazy'}) { const t=copy[lang]; return <article className="vehicle-card">
  <SmartLink href={link(lang,`/fleet/${car.slug}`)} className="vehicle-image"><span>{car.tier}</span><img loading={loading} decoding="async" src={img(car.image)} alt={car.name}/></SmartLink>
  <div className="vehicle-body"><p className="overline">{car.cat}</p><h3>{car.name}</h3><div className="spec-row"><span><Users size={16}/>{car.seats} {t.seats}</span><span><SlidersHorizontal size={16}/>{car.transmission==='Automatic'?t.auto:t.manual}</span></div><div className="vehicle-foot"><p>{t.from} <strong>{CURRENCY} {car.price}</strong> {t.day}</p><SmartLink href={link(lang,`/fleet/${car.slug}`)} aria-label={`View ${car.name}`}><ArrowRight/></SmartLink></div></div>
  </article> }

function SectionHead({eyebrow,title,text,action}) { return <div className="section-head"><div>{eyebrow&&<p className="overline">{eyebrow}</p>}<h2>{title}</h2>{text&&<p>{text}</p>}</div>{action}</div> }

function Home({lang}) { const t=copy[lang], fi=lang==='en'?0:1; return <>
  <section className="hero"><img src={img('hero-mercedes.jpg')} alt="Mercedes vehicle in Tunisia"/><div className="hero-shade"/><div className="hero-content"><p className="eyebrow-light">{t.eyebrow}</p><h1>{t.hero}</h1><p>{t.heroSub}</p><div className="hero-actions"><SmartLink className="button" href={link(lang,'/booking')}>{t.book}<ArrowRight size={18}/></SmartLink><SmartLink className="text-link light" href={link(lang,'/fleet')}>{t.explore}<ArrowRight size={17}/></SmartLink></div></div><div className="hero-place"><MapPin size={16}/> Tunis · Djerba · Gabès</div></section>
  <div className="quote-wrap home-quote-wrap"><QuoteWidget lang={lang} compact/></div>
  <section className="trust"><div><strong>100+</strong><span>{lang==='en'?'vehicles in the fleet':'véhicules dans la flotte'}</span></div><div><strong>24/7</strong><span>{lang==='en'?'assistance every day':'assistance quotidienne'}</span></div><div><strong>3</strong><span>{lang==='en'?'hubs across Tunisia':'agences en Tunisie'}</span></div><div><Plane/><span>{lang==='en'?'major airport pickup':'accueil aux aéroports'}</span></div></section>
  <section className="section services"><SectionHead eyebrow="VIPCAR services" title={t.serviceTitle} text={t.serviceSub}/><div className="service-grid">{services.map(s=>{const Icon=s.icon;return <SmartLink className="service-card" href={link(lang,`/services/${s.key}`)} key={s.key}><img loading="lazy" src={img(s.image)} alt={s.title[fi]}/><div className="service-overlay"><Icon/><h3>{s.title[fi]}</h3><p>{s.text[fi]}</p><span>{lang==='en'?'Discover service':'Découvrir'}<ArrowRight/></span></div></SmartLink>})}</div></section>
  <section className="section fleet-section"><SectionHead title={t.fleetTitle} text={t.fleetSub} action={<SmartLink className="text-link" href={link(lang,'/fleet')}>{t.allFleet}<ArrowRight size={17}/></SmartLink>}/><div className="vehicle-grid featured">{fleet.slice(0,4).map(c=><VehicleCard key={c.slug} car={c} lang={lang} loading="eager"/>)}</div></section>
  <section className="split-story"><div className="story-image"><img loading="lazy" src={img('road-travel.jpg')} alt="Road travel in Tunisia"/></div><div className="story-copy"><p className="overline">The VIPCAR standard</p><h2>{t.why}</h2><p>{t.whySub}</p><div className="values"><div><Headphones/><strong>24/7</strong><span>{lang==='en'?'Direct assistance':'Assistance directe'}</span></div><div><ShieldCheck/><strong>{lang==='en'?'Clear quotes':'Devis clairs'}</strong><span>{lang==='en'?'Confirmed before travel':'Confirmés avant le départ'}</span></div><div><MapPin/><strong>{lang==='en'?'Local team':'Équipe locale'}</strong><span>Tunis · Gabès · Djerba</span></div></div><SmartLink className="text-link" href={link(lang,'/about')}>{lang==='en'?'Meet VIPCAR':'Découvrir VIPCAR'}<ArrowRight size={17}/></SmartLink></div></section>
   <section className="section journal"><SectionHead eyebrow="Travel journal" title={t.guide}/><div className="journal-grid"><GuideCard image="road-travel.jpg" tag="Car rental guide" title={lang==='en'?'Renting a car in Tunisia: what to know':'Louer une voiture en Tunisie : l’essentiel'} slug="car-rental-tunisia-guide" lang={lang}/><GuideCard image="airport.jpg" tag="Airport guide" title={lang==='en'?'Arriving at Tunis-Carthage Airport':'Arriver à l’aéroport Tunis-Carthage'} slug="tunis-carthage-airport-guide" lang={lang}/><GuideCard image="hero-mercedes.jpg" tag="Travel planning" title={lang==='en'?'Choosing the right car for your itinerary':'Choisir la voiture adaptée à votre circuit'} slug="choosing-a-car-in-tunisia" lang={lang}/></div></section>
  <Faq lang={lang}/><Cta lang={lang}/>
  </> }

function GuideCard({image,tag,title,lang,slug='car-rental-tunisia-guide'}) { return <SmartLink className="guide-card" href={link(lang,`/blog/${slug}`)}><img loading="lazy" src={img(image)} alt={title}/><p className="overline">{tag}</p><h3>{title}</h3><span>{lang==='en'?'Read guide':'Lire le guide'}<ArrowRight size={16}/></span></SmartLink> }

const faqs={
  en:[['What documents do I need to rent a car?','A valid driving licence held for at least one year, your passport or ID, and a bank card. An International Driving Permit is recommended if your licence is not in the Latin alphabet.'],['Can VIPCAR meet me at the airport?','Yes. VIPCAR serves Tunis-Carthage, Djerba-Zarzis and Enfidha-Hammamet airports. Transfer drivers track your flight and meet you in arrivals.'],['Is a security deposit required?','Yes. The refundable security deposit depends on the vehicle and is confirmed before booking. It is released after the car is returned in good condition.'],['Can a car be delivered to my hotel?','Yes. Hotel and airport delivery can be arranged across the operating areas and elsewhere in Tunisia on request.']],
  fr:[['Quels documents faut-il pour louer ?','Un permis valide depuis au moins un an, votre passeport ou pièce d’identité et une carte bancaire. Le permis international est conseillé si votre permis n’utilise pas l’alphabet latin.'],['VIPCAR peut-il m’accueillir à l’aéroport ?','Oui. VIPCAR dessert Tunis-Carthage, Djerba-Zarzis et Enfidha-Hammamet. Pour un transfert, votre chauffeur suit votre vol et vous attend aux arrivées.'],['Une caution est-elle demandée ?','Oui. Son montant dépend du véhicule et vous est communiqué avant la réservation. Elle est libérée après le retour du véhicule en bon état.'],['La voiture peut-elle être livrée à mon hôtel ?','Oui. La livraison à l’hôtel ou à l’aéroport est disponible dans les zones desservies et ailleurs en Tunisie sur demande.']]
};
function Faq({lang}) { return <section className="section faq"><SectionHead eyebrow="FAQ" title={copy[lang].faq}/><div>{faqs[lang].map(([q,a])=><details key={q}><summary>{q}<ChevronDown/></summary><p>{a}</p></details>)}</div></section> }
function Cta({lang}) { const t=copy[lang]; return <section className="cta"><div><p className="overline">{lang==='en'?'Your trip, clearly arranged':'Votre trajet, simplement organisé'}</p><h2>{t.quoteTitle}</h2><p>{t.quoteSub}</p></div><div><SmartLink className="button button-light" href={link(lang,'/booking')}>{t.book}<ArrowRight size={18}/></SmartLink><a className="text-link light" href={WA}>{t.whatsapp}<MessageCircle size={17}/></a></div></section> }

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
  return <main className="page"><PageHero image="luxury-rear.jpg" eyebrow="VIPCAR fleet" title={lang==='en'?'Find your car for Tunisia.':'Trouvez votre voiture en Tunisie.'} text={copy[lang].fleetSub}/><section className="section"><div className="filter-row" role="group" aria-label={lang==='en'?'Filter vehicles by category':'Filtrer les véhicules par catégorie'}>{FLEET_CATEGORIES.map(c=><button type="button" key={c} onClick={()=>setCat(c)} className={cat===c?'active':''} aria-pressed={cat===c}>{c}</button>)}</div>{source==='seed'&&!loading&&<p className="form-feedback catalog-notice" role="status">{fleetOfflineMessage(lang)}</p>}{loading?<p className="filter-result" aria-live="polite">{lang==='en'?'Loading fleet…':'Chargement de la flotte…'}</p>:<><p className="filter-result" aria-live="polite">{list.length} {lang==='en'?'vehicles shown':'véhicules affichés'}</p><div className="vehicle-grid">{list.map(c=><VehicleCard key={c.slug} car={c} lang={lang}/>)}</div></>}</section><Faq lang={lang}/><Cta lang={lang}/></main>;
}

function PageHero({image,title,text,eyebrow}) { return <section className="page-hero"><img loading="eager" fetchPriority="high" decoding="async" src={img(image)} alt={title}/><div className="hero-shade"/><div><p>{eyebrow}</p><h1>{title}</h1><span>{text}</span></div></section> }

function ServiceSeoContent({lang,type}) { const data=serviceSeoContent[type]?.[lang]; if(!data)return null; return <section className="section seo-content"><div className="seo-content-intro"><p className="overline">{data.eyebrow}</p><h2>{data.title}</h2><p>{data.intro}</p></div><div className="seo-content-points">{data.points.map(([title,text],index)=><article key={title}><span>0{index+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section> }

function LocalSeoContent({lang,item,airport=false}) { const title=airport?(lang==='en'?`Airport transfers from ${item.airport}.`:`Transferts depuis ${item.airport}.`):(lang==='en'?`Car rental in ${item.name[0]}, arranged around your route.`:`Location de voiture à ${item.name[1]}, organisée selon votre trajet.`); const intro=airport?(lang==='en'?`Whether you are heading to a hotel, a private residence or another Tunisian destination, VIPCAR confirms the pickup point, flight details, vehicle and fixed TND quote before you travel.`:`Que vous rejoigniez un hôtel, une résidence ou une autre destination tunisienne, VIPCAR confirme le point de prise en charge, le vol, le véhicule et le devis fixe en TND avant le départ.`):(lang==='en'?`Collect or receive your vehicle in ${item.name[0]} with a local team coordinating the practical details. Airport, hotel and alternative delivery requests are confirmed around your dates and itinerary.`:`Récupérez ou recevez votre véhicule à ${item.name[1]} avec une équipe locale qui coordonne les détails pratiques. Les demandes de livraison à l’aéroport, à l’hôtel ou ailleurs sont confirmées selon vos dates et votre itinéraire.`); const points=airport?(lang==='en'?[['Before you land','Share your flight number, arrival time and destination so the team can prepare the right pickup.'],['A clear handover','Your driver confirms where to meet, who to call and what happens if the flight changes.'],['Beyond the airport','Continue to your hotel, business meeting or next destination with a route agreed in advance.']]:[['Avant votre arrivée','Partagez votre numéro de vol, votre heure d’arrivée et votre destination pour préparer la prise en charge.'],['Une remise claire','Votre chauffeur confirme le lieu de rendez-vous, le contact et la marche à suivre en cas de changement de vol.'],['Au-delà de l’aéroport','Rejoignez votre hôtel, un rendez-vous professionnel ou une autre destination selon un trajet confirmé.']]):(lang==='en'?[['Choose by trip','Select a compact car, sedan, SUV or premium vehicle according to your passengers, luggage and roads.'],['Delivery or collection','The team confirms the practical handover details for your hotel, airport or chosen point.'],['One local contact','Ask about availability, rental conditions and the final quote before you travel.']]:[['Choisissez selon le trajet','Sélectionnez une citadine, une berline, un SUV ou un véhicule premium selon vos passagers, bagages et routes.'],['Livraison ou prise en charge','L’équipe confirme les détails pratiques pour votre hôtel, l’aéroport ou le point de votre choix.'],['Un contact local','Demandez la disponibilité, les conditions de location et le devis final avant votre départ.']]); return <section className="section seo-content local-seo-content"><div className="seo-content-intro"><p className="overline">{item.name[0]} · VIPCAR</p><h2>{title}</h2><p>{intro}</p></div><div className="seo-content-points">{points.map(([heading,text],index)=><article key={heading}><span>0{index+1}</span><h3>{heading}</h3><p>{text}</p></article>)}</div></section> }

function ServicePage({lang,type}) { const fi=lang==='en'?0:1; const s=services.find(x=>x.key===type)||services[0]; const details={rental:[['Short and long-term rentals','Locations courte et longue durée'],['Airport and hotel delivery','Livraison à l’aéroport et à l’hôtel'],['Economy to luxury fleet','Flotte économique à premium']],transfer:[['Flight tracking and meet-and-greet','Suivi du vol et accueil personnalisé'],['Tunis, Djerba and Enfidha airports','Aéroports de Tunis, Djerba et Enfidha'],['Fixed quote agreed in advance','Devis fixe confirmé à l’avance']],chauffeur:[['English- and French-speaking drivers','Chauffeurs anglophones et francophones'],['By the hour, day or longer','À l’heure, à la journée ou davantage'],['Business, events and touring','Affaires, événements et circuits']]}[s.key].map(x=>x[fi]); return <main className="page"><PageHero image={s.image} eyebrow="VIPCAR services" title={s.title[fi]} text={s.text[fi]}/><section className="section service-detail"><div><p className="overline">{lang==='en'?'Designed around your trip':'Pensé pour votre voyage'}</p><h2>{lang==='en'?'Professional mobility without the uncertainty.':'Une mobilité professionnelle, sans incertitude.'}</h2><p>{s.text[fi]} {lang==='en'?'Send your schedule and preferences; the VIPCAR team will confirm availability, vehicle and price before you travel.':'Envoyez votre programme et vos préférences ; l’équipe VIPCAR confirme la disponibilité, le véhicule et le tarif avant votre départ.'}</p><ul>{details.map(x=><li key={x}><Check/>{x}</li>)}</ul></div><QuoteWidget lang={lang}/></section><ServiceSeoContent lang={lang} type={s.key}/>{s.key==='rental'&&<section className="section"><SectionHead eyebrow="Fleet" title={copy[lang].fleetTitle}/><div className="vehicle-grid featured">{fleet.slice(0,3).map(c=><VehicleCard car={c} lang={lang} key={c.slug}/>)}</div></section>}<Faq lang={lang}/><Cta lang={lang}/></main> }

function VehiclePage({lang,slug}) {
  const [car,setCar]=useState(null);
  const [related,setRelated]=useState([]);
  const [source,setSource]=useState('api');
  const [loading,setLoading]=useState(true);
  const [notFound,setNotFound]=useState(false);
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
  if(loading)return <main className="page"><section className="section"><p aria-live="polite">{lang==='en'?'Loading vehicle…':'Chargement du véhicule…'}</p></section></main>;
  if(notFound||!car)return <NotFound lang={lang}/>;
  return <main className="page vehicle-page">{source==='seed'&&<p className="form-feedback catalog-notice catalog-notice-inline" role="status">{fleetOfflineMessage(lang)}</p>}<section className="vehicle-hero"><div className="vehicle-hero-copy"><p className="overline">{car.tier} · {car.cat}</p><h1>{car.name}</h1><p>{lang==='en'?'A refined, well-maintained choice for your journey across Tunisia. Availability and the final TND quote are confirmed for your dates.':'Un véhicule soigné et entretenu pour votre voyage en Tunisie. La disponibilité et le devis final en TND sont confirmés selon vos dates.'}</p><div className="vehicle-price">{copy[lang].from} <strong>{CURRENCY} {car.price}</strong> {copy[lang].day}</div><SmartLink className="button" href={link(lang,`/booking?vehicle=${car.slug}`)}>{copy[lang].book}<ArrowRight/></SmartLink></div><div className="vehicle-hero-image"><img src={img(car.image)} alt={car.name}/></div></section><section className="spec-band"><div><Users/><span>{copy[lang].seats}</span><strong>{car.seats}</strong></div><div><SlidersHorizontal/><span>Transmission</span><strong>{car.transmission==='Automatic'?(lang==='en'?'Automatic':'Automatique'):(lang==='en'?'Manual':'Manuelle')}</strong></div><div><BriefcaseBusiness/><span>{lang==='en'?'Luggage':'Bagages'}</span><strong>{car.bags}</strong></div><div><MapPin/><span>{lang==='en'?'Delivery':'Livraison'}</span><strong>{car.location||(lang==='en'?'On request':'Sur demande')}</strong></div></section><section className="section vehicle-overview"><div><p className="overline">{lang==='en'?'Vehicle overview':'Présentation du véhicule'}</p><h2>{lang==='en'?'Comfort, space and a clear booking process.':'Confort, espace et réservation claire.'}</h2><p>{lang==='en'?'Choose your dates and pick-up point, then VIPCAR confirms the exact vehicle availability, rental conditions, deposit and final rate before you commit. Airport and hotel delivery can be arranged.':'Choisissez vos dates et votre lieu de départ. VIPCAR confirme ensuite la disponibilité, les conditions, la caution et le tarif final avant votre engagement. Livraison possible à l’aéroport ou à l’hôtel.'}</p></div><aside><h3>{lang==='en'?'Request this vehicle':'Demander ce véhicule'}</h3><QuoteWidget lang={lang} compact/></aside></section><section className="section"><SectionHead eyebrow={lang==='en'?'You may also like':'Vous aimerez aussi'} title={lang==='en'?'Related vehicles':'Véhicules similaires'}/><div className="vehicle-grid featured">{related.map(c=><VehicleCard car={c} lang={lang} key={c.slug}/>)}</div></section><Faq lang={lang}/></main>;
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
      setError(lang === 'en'
        ? 'Enter your email and a password of at least 8 characters.'
        : 'Saisissez votre e-mail et un mot de passe d’au moins 8 caractères.');
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
        eyebrow={lang === 'en' ? 'VIPCAR account' : 'Compte VIPCAR'}
        title={lang === 'en' ? 'Sign in to your account.' : 'Connectez-vous à votre compte.'}
        text={lang === 'en'
          ? 'View your confirmed bookings, trip details and status in one place.'
          : 'Consultez vos réservations confirmées, les détails de trajet et leur statut.'}
      />
      <section className="section account-section">
        <div className="account-form contact-form">
          <h2>{lang === 'en' ? 'Sign in' : 'Connexion'}</h2>
          <p className="account-lead">
            {lang === 'en'
              ? 'Use the email and password from your VIPCAR customer account.'
              : 'Utilisez l’e-mail et le mot de passe de votre compte client VIPCAR.'}
          </p>
          <form onSubmit={submit}>
            <label>
              {lang === 'en' ? 'Email' : 'E-mail'}
              <input required name="email" type="email" autoComplete="email" />
            </label>
            <label>
              {lang === 'en' ? 'Password' : 'Mot de passe'}
              <input required name="password" type="password" autoComplete="current-password" minLength={8} />
            </label>
            {error && <p className="form-feedback form-feedback-error" role="alert">{error}</p>}
            <button className="button" type="submit" disabled={submitting}>
              {submitting
                ? (lang === 'en' ? 'Signing in…' : 'Connexion…')
                : (lang === 'en' ? 'Sign in' : 'Se connecter')}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function MyBookingsPage({lang}) {
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
          <p aria-live="polite">{lang === 'en' ? 'Redirecting to sign in…' : 'Redirection vers la connexion…'}</p>
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
        eyebrow={lang === 'en' ? 'My bookings' : 'Mes réservations'}
        title={lang === 'en' ? 'Your VIPCAR journeys.' : 'Vos trajets VIPCAR.'}
        text={lang === 'en'
          ? 'Confirmed bookings for your account. Prices shown are the amounts recorded with your booking.'
          : 'Les réservations confirmées de votre compte. Les montants affichés sont ceux enregistrés avec la réservation.'}
      />
      <section className="section account-section">
        <div className="account-toolbar">
          <div>
            <p className="overline">{lang === 'en' ? 'Customer account' : 'Compte client'}</p>
            <h2>{user?.name || user?.email || (lang === 'en' ? 'Your bookings' : 'Vos réservations')}</h2>
          </div>
          <button type="button" className="text-link account-signout" onClick={signOut}>
            {lang === 'en' ? 'Sign out' : 'Se déconnecter'}
          </button>
        </div>
        {loading && (
          <p aria-live="polite">{lang === 'en' ? 'Loading bookings…' : 'Chargement des réservations…'}</p>
        )}
        {!loading && error && (
          <p className="form-feedback form-feedback-error" role="alert">{error}</p>
        )}
        {!loading && !error && bookings.length === 0 && (
          <div className="account-empty">
            <p>
              {lang === 'en'
                ? 'No bookings yet. Request a quote and our team will confirm your trip.'
                : 'Aucune réservation pour le moment. Demandez un devis et notre équipe confirmera votre trajet.'}
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
                    {CURRENCY} {Number(b.priceTnd ?? 0).toFixed(0)}
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
      setError(lang==='en'
        ?'Please complete the required trip and contact details.'
        :'Complétez les informations de trajet et de contact.');
      return;
    }
    if(service==='rental'&&!endDate){
      setError(lang==='en'
        ?'Please choose a return date for your rental.'
        :'Choisissez une date de retour pour votre location.');
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
  return <main className="booking-page"><div className="booking-intro"><p className="overline">VIPCAR quote request</p><h1>{lang==='en'?'Your journey, arranged in a few steps.':'Votre trajet, organisé en quelques étapes.'}</h1><p>{t.quoteSub}</p>{vehicle&&<p className="booking-selection">Selected vehicle: <strong>{vehicle.name}</strong></p>}<div className="booking-contact"><Clock3/><span>24/7</span><MessageCircle/><span>{PHONE}</span></div></div><form className="booking-panel" onSubmit={finish}>{success?<QuoteSuccess lang={lang} request={success} onWhatsApp={()=>openWhatsAppQuote(success.whatsappText,WA)} onReset={()=>{setSuccess(null);setError('');setStep(1);setData({})}}/>:<><div className="steps"><span className={step>=1?'active':''}>1 <b>{lang==='en'?'Service':'Service'}</b></span><i/><span className={step>=2?'active':''}>2 <b>{lang==='en'?'Trip':'Trajet'}</b></span><i/><span className={step>=3?'active':''}>3 <b>{lang==='en'?'Contact':'Contact'}</b></span></div>{step===1&&<div className="booking-step"><h2>{lang==='en'?'What do you need?':'De quel service avez-vous besoin ?'}</h2><div className="booking-services">{services.map(s=>{const Icon=s.icon;return <button type="button" key={s.key} className={service===s.key?'active':''} onClick={()=>chooseService(s.key)}><Icon/><strong>{s.title[lang==='en'?0:1]}</strong><span>{s.text[lang==='en'?0:1]}</span><Check/></button>})}</div><button type="button" className="button next" onClick={()=>setStep(2)}>{lang==='en'?'Continue':'Continuer'}<ArrowRight/></button></div>}{step===2&&<div className="booking-step"><h2>{lang==='en'?'Tell us about the trip':'Parlez-nous du trajet'}</h2><div className="form-grid"><label>Pick-up location<select required name="pickup" value={data.pickup||''} onChange={update}><option value="">Select</option>{locations.map(x=><option key={x}>{x}</option>)}</select></label><label>Return location<select name="return" value={data.return||''} onChange={update}><option value="">Select</option>{locations.map(x=><option key={x}>{x}</option>)}</select></label><label>Pick-up date<input required min={today} type="date" name="date" value={data.date||''} onChange={update}/></label><label>Return date<input required={service==='rental'} min={data.date||today} type="date" name="returnDate" value={data.returnDate||''} onChange={update}/></label>{service==='chauffeur'&&<label>Service duration<select name="duration" value={data.duration||'full-day'} onChange={update}><option value="hourly">{lang==='en'?'By the hour':'À l’heure'}</option><option value="half-day">{lang==='en'?'Half day':'Demi-journée'}</option><option value="full-day">{lang==='en'?'Full day':'Journée complète'}</option></select></label>}<label className="full">Notes<textarea name="notes" value={data.notes||''} onChange={update} placeholder="Flight number, passengers, hotel or other useful details"/></label></div><div className="step-actions"><button type="button" onClick={()=>setStep(1)}>Back</button><button type="button" className="button" onClick={()=>setStep(3)}>Continue<ArrowRight/></button></div></div>}{step===3&&<div className="booking-step"><h2>{lang==='en'?'Where should we confirm your quote?':'Où devons-nous confirmer votre devis ?'}</h2><div className="form-grid"><label>Full name<input required name="name" value={data.name||''} onChange={update} autoComplete="name"/></label><label>Phone / WhatsApp<input required name="contact" type="tel" value={data.contact||''} onChange={update} autoComplete="tel"/></label><label className="full">Email<input name="email" type="email" value={data.email||''} onChange={update} autoComplete="email"/></label></div><div className="booking-summary"><strong>{lang==='en'?'Review your request':'Vérifiez votre demande'}</strong><span>{services.find(s=>s.key===service)?.title[lang==='en'?0:1]}{vehicle?` · ${vehicle.name}`:''}</span><span>{data.pickup||'—'} → {data.return||data.pickup||'—'}</span><span>{data.date||'—'} → {data.returnDate||'—'}</span></div><div className="confirm-note"><ShieldCheck/><p><strong>{lang==='en'?'No immediate payment':'Aucun paiement immédiat'}</strong><br/>{lang==='en'?'We save your request first, then open WhatsApp so the VIPCAR team can confirm with you.':'Nous enregistrons d’abord votre demande, puis ouvrons WhatsApp pour confirmation avec l’équipe VIPCAR.'}</p></div>{error&&<p className="form-feedback form-feedback-error" role="alert">{error}</p>}<div className="step-actions"><button type="button" onClick={()=>setStep(2)}>Back</button><button className="button" type="submit" disabled={submitting}>{submitting?(lang==='en'?'Sending…':'Envoi…'):t.book}{!submitting&&<MessageCircle/>}</button></div></div>}</>}</form></main>
}

function Corporate({lang}) { return <main className="page"><PageHero image="interior.jpg" eyebrow="VIPCAR for business" title={lang==='en'?'Ground mobility your team can rely on.':'La mobilité professionnelle sur laquelle compter.'} text={lang==='en'?'Airport transfers, chauffeur services and vehicle rental for companies, hotels, travel agencies and events.':'Transferts, chauffeurs et location pour entreprises, hôtels, agences de voyage et événements.'}/><section className="section corporate-grid"><div><p className="overline">Corporate mobility</p><h2>{lang==='en'?'One point of contact across Tunisia.':'Un seul contact partout en Tunisie.'}</h2><p>{lang==='en'?'VIPCAR already works with concierge services, travel agencies and corporate accounts. Share passenger schedules, vehicle needs and invoicing requirements with a team available around the clock.':'VIPCAR travaille avec des conciergeries, agences de voyage et comptes entreprises. Confiez les horaires, véhicules et besoins de facturation à une équipe disponible 24h/24.'}</p></div><div className="benefit-grid">{[['briefcase','Corporate accounts'],['plane','Airport coordination'],['users','Professional drivers'],['clock','24/7 support']].map(([i,x])=><div key={x}><BriefcaseBusiness/><strong>{x}</strong><span>{lang==='en'?'Arranged around your operation':'Adapté à votre activité'}</span></div>)}</div></section><Cta lang={lang}/></main> }

function ContentPage({lang,type}) { const data={
  about:{image:'road-travel.jpg',ey:'About VIPCAR',en:['International standards. Local Tunisian expertise.','VIPCAR coordinates car rental, professional chauffeur services and airport transfers from its hubs in Tunis, Gabès and Djerba. The service is built around direct contact, clear quotes and support at every hour.'],fr:['Des standards internationaux. Une expertise tunisienne.','VIPCAR organise location, chauffeur professionnel et transferts aéroport depuis Tunis, Gabès et Djerba. Le service repose sur un contact direct, des devis clairs et une disponibilité permanente.']},
  destinations:{image:'suv-white.jpg',ey:'Tunisia destinations',en:['Move through Tunisia with one local team.','Arrange pick-up or delivery in Tunis, Gabès and Djerba, at the major airports, and in the other destinations listed in our booking service. Coverage outside the main hubs is confirmed for each request.'],fr:['Parcourez la Tunisie avec une seule équipe locale.','Organisez votre prise en charge à Tunis, Gabès et Djerba, dans les principaux aéroports et les autres destinations proposées à la réservation. La couverture hors agences est confirmée sur demande.']},
  blog:{image:'luxury-rear.jpg',ey:'Travel journal',en:['Useful guidance for travelling through Tunisia.','Practical airport, driving and rental information, written to help you make informed decisions before you arrive.'],fr:['Les informations utiles pour voyager en Tunisie.','Conseils pratiques sur les aéroports, la conduite et la location pour préparer votre arrivée.']}
  }[type]; const a=data[lang]; return <main className="page"><PageHero image={data.image} eyebrow={data.ey} title={a[0]} text={a[1]}/>{type==='destinations'?<DestinationHub lang={lang}/>:type==='blog'?<section className="section journal"><div className="journal-grid"><GuideCard image="suv-white.jpg" tag="Car rental" title={lang==='en'?'Renting a car in Tunisia: the practical guide':'Location de voiture en Tunisie : le guide pratique'} slug="car-rental-tunisia-guide" lang={lang}/><GuideCard image="airport.jpg" tag="Airport transfer" title={lang==='en'?'How airport transfers work in Tunisia':'Comment fonctionne un transfert aéroport'} slug="tunis-carthage-airport-guide" lang={lang}/><GuideCard image="interior.jpg" tag="Chauffeur" title={lang==='en'?'When to book a private chauffeur':'Quand réserver un chauffeur privé'} slug="choosing-a-car-in-tunisia" lang={lang}/></div></section>:<section className="section about-copy"><p className="overline">VIPCAR Tunisia</p><h2>{lang==='en'?'Built around the realities of travel.':'Pensé pour les réalités du voyage.'}</h2><p>{a[1]}</p><div className="values about-values"><div><Clock3/><strong>24/7</strong><span>{lang==='en'?'Always available':'Disponibilité permanente'}</span><small>{lang==='en'?'Direct support every day':'Une équipe disponible chaque jour'}</small></div><div><Car/><strong>100+</strong><span>{lang==='en'?'Vehicles in the fleet':'Véhicules dans la flotte'}</span><small>{lang==='en'?'From city cars to premium models':'Des citadines aux modèles premium'}</small></div><div><MapPin/><strong>3 hubs</strong><span>{lang==='en'?'Tunis · Gabès · Djerba':'Tunis · Gabès · Djerba'}</span><small>{lang==='en'?'Coverage across Tunisia':'Une couverture partout en Tunisie'}</small></div></div></section>}<Cta lang={lang}/></main> }

const articles={
  'car-rental-tunisia-guide':{image:'road-travel.jpg',en:['Renting a car in Tunisia: what to know','A practical starting point for choosing a vehicle, preparing documents and arranging collection or delivery.',[['Choose the vehicle around the journey','Think first about passengers, luggage, distance and the roads on your route. A compact car can suit city stays, while a sedan or SUV gives more space for family travel, business visits or longer itineraries.'],['Confirm the essentials before arrival','Ask for the exact vehicle availability, delivery point, rental conditions, deposit and final TND quote before you travel. This keeps the handover clear and avoids surprises at the airport or hotel.'],['Plan collection or delivery','VIPCAR can coordinate airport and hotel delivery according to your dates. Share your arrival details early so the team can confirm the practical handover.']]],fr:['Louer une voiture en Tunisie : l’essentiel','Les points pratiques pour choisir un véhicule, préparer vos documents et organiser la prise en charge ou la livraison.',[['Choisir selon votre trajet','Pensez aux passagers, aux bagages, aux distances et aux routes prévues. Une citadine convient à un séjour urbain, tandis qu’une berline ou un SUV apporte davantage d’espace pour la famille, les affaires ou un long circuit.'],['Confirmer l’essentiel avant l’arrivée','Demandez la disponibilité exacte, le point de livraison, les conditions de location, la caution et le devis final en TND avant votre départ. La remise du véhicule reste ainsi simple et claire.'],['Prévoir la prise en charge ou la livraison','VIPCAR peut organiser une livraison à l’aéroport ou à l’hôtel selon vos dates. Partagez vos informations d’arrivée suffisamment tôt pour confirmer les détails pratiques.']]]},
  'tunis-carthage-airport-guide':{image:'airport.jpg',en:['Arriving at Tunis-Carthage Airport','How to make the first part of your Tunis trip calm, clear and coordinated.',[['Share your arrival details','Give your flight number, planned arrival time, passenger count and destination when requesting a transfer. It helps the team prepare the route and meet you at the agreed point.'],['Choose the right arrival service','A private transfer is ideal when you want to go directly to a hotel, residence or meeting. If you plan to drive during your stay, a rental vehicle can be arranged for airport collection or delivery.'],['Keep the first connection simple','Save the VIPCAR contact details before landing and confirm the final instructions before departure. If your flight schedule changes, notify the team as early as possible.']]],fr:['Arriver à l’aéroport Tunis-Carthage','Comment rendre les premiers instants de votre séjour à Tunis simples et bien organisés.',[['Partager les détails de votre arrivée','Indiquez votre numéro de vol, l’heure prévue, le nombre de passagers et votre destination lors de la demande. L’équipe peut ainsi préparer le trajet et le point de rendez-vous.'],['Choisir le bon service à l’arrivée','Un transfert privé convient si vous souhaitez rejoindre directement un hôtel, une résidence ou un rendez-vous. Si vous prévoyez de conduire, une location peut être organisée à l’aéroport.'],['Simplifier le premier trajet','Conservez les coordonnées VIPCAR avant l’atterrissage et confirmez les instructions finales avant le départ. En cas de modification de vol, prévenez l’équipe dès que possible.']]]},
  'choosing-a-car-in-tunisia':{image:'hero-mercedes.jpg',en:['Choosing the right car for your itinerary','A simple way to match vehicle size, luggage, roads and travel style across Tunisia.',[['For city breaks and short stays','A compact car is often the most practical option for Tunis and shorter urban stays. It is easy to handle and leaves room in the budget for the rest of the trip.'],['For family routes and longer distances','Choose a sedan, SUV or van when you need more luggage capacity, extra seating or better comfort across several destinations. Review the seat and bag information on each vehicle page before requesting a quote.'],['For business and special occasions','Premium and luxury models suit executive travel, client arrivals and events. Confirm the preferred vehicle, timings and delivery point with the VIPCAR team in advance.']]],fr:['Choisir la voiture adaptée à votre circuit','Une méthode simple pour choisir selon les bagages, les routes et le style de votre voyage en Tunisie.',[['Pour un séjour urbain ou court','Une citadine est souvent le choix le plus pratique pour Tunis et les séjours urbains. Elle est facile à conduire et laisse plus de budget pour le reste du voyage.'],['Pour la famille et les longues distances','Préférez une berline, un SUV ou un van si vous avez davantage de bagages, de passagers ou plusieurs destinations. Consultez les informations de places et de bagages avant de demander un devis.'],['Pour les affaires et les occasions spéciales','Les véhicules premium et luxe conviennent aux déplacements exécutifs, aux arrivées de clients et aux événements. Confirmez le modèle souhaité, les horaires et le point de livraison à l’avance.']]]},
  'rental-documents-and-deposit':{image:'interior.jpg',en:['Car rental documents and deposit in Tunisia','What to prepare before requesting your rental and what to confirm with the provider.',[['Bring the essential documents','A valid driving licence, passport or identity document and a payment card are normally required. If your licence does not use the Latin alphabet, an International Driving Permit is recommended.'],['Ask how the deposit works','The refundable deposit depends on the vehicle and the confirmed rental conditions. Ask for the amount, payment method and release process before the booking is finalised.'],['Keep every condition clear','Before travel, confirm insurance, mileage, fuel, delivery, return time and any additional-driver conditions. A clear written confirmation makes the rental easier for everyone.']]],fr:['Documents et caution pour une location en Tunisie','Ce qu’il faut préparer avant votre demande et confirmer avec le loueur.',[['Préparer les documents essentiels','Un permis de conduire valide, un passeport ou une pièce d’identité et une carte de paiement sont généralement nécessaires. Si votre permis n’utilise pas l’alphabet latin, un permis international est conseillé.'],['Comprendre le fonctionnement de la caution','La caution remboursable dépend du véhicule et des conditions confirmées. Demandez le montant, le mode de paiement et les modalités de restitution avant de finaliser la réservation.'],['Clarifier toutes les conditions','Avant le départ, confirmez l’assurance, le kilométrage, le carburant, la livraison, l’horaire de retour et les éventuels conducteurs additionnels. Une confirmation écrite facilite toute la location.']]]},
  'long-term-car-rental-tunisia':{image:'road-travel.jpg',en:['Long-term car rental in Tunisia: how it works','A practical option for extended stays, business assignments and flexible local travel.',[['When a longer rental makes sense','Long-term rental can suit expatriates, project teams, extended family visits and business stays. It offers a consistent vehicle and can be simpler than arranging repeated short rentals.'],['Share the full requirement','Tell VIPCAR the expected dates, cities, vehicle category, passenger needs and any delivery requirements. The team can confirm what is available for the full period and the final quote.'],['Review the agreement carefully','For an extended rental, clarify maintenance, mileage, insurance, deposit, extensions and early-return terms before confirming the service.']]],fr:['Location longue durée en Tunisie : comment ça marche','Une solution pratique pour les séjours prolongés, missions professionnelles et déplacements flexibles.',[['Quand la longue durée est pertinente','La location longue durée convient aux expatriés, équipes en mission, visites familiales prolongées et séjours professionnels. Elle permet de garder un véhicule cohérent sans organiser plusieurs locations courtes.'],['Partager le besoin complet','Indiquez vos dates, les villes concernées, la catégorie de véhicule, les passagers et les besoins de livraison. VIPCAR peut confirmer la disponibilité sur toute la période et le devis final.'],['Relire les conditions avec attention','Pour une longue durée, clarifiez l’entretien, le kilométrage, l’assurance, la caution, les prolongations et les conditions de retour anticipé avant la confirmation.']]]},
  'driving-in-tunisia-guide':{image:'road-travel.jpg',en:['Driving in Tunisia: practical tips before your trip','Prepare for a calmer road trip with a few simple local-driving habits.',[['Plan the route before leaving','For longer drives, check the distance, daylight, fuel stops and your arrival point in advance. Leave extra time when travelling between cities or heading south.'],['Drive for the conditions','Road conditions and traffic can vary by area. Stay attentive, keep a safe distance and adapt your speed to the road, weather and visibility.'],['Choose a vehicle that fits the route','A compact car may be right for cities, while an SUV or larger vehicle can be more comfortable for family travel, luggage or longer road trips. Ask VIPCAR if you are unsure which category suits your plan.']]],fr:['Conduire en Tunisie : conseils pratiques avant le départ','Préparez un road trip plus serein avec quelques habitudes simples.',[['Préparer l’itinéraire avant de partir','Pour les longs trajets, vérifiez la distance, la lumière du jour, les arrêts carburant et votre point d’arrivée. Prévoyez une marge de temps entre les villes ou vers le sud.'],['Adapter la conduite aux conditions','La circulation et l’état des routes peuvent varier selon les zones. Restez attentif, gardez vos distances et adaptez votre vitesse à la route, à la météo et à la visibilité.'],['Choisir un véhicule adapté au trajet','Une citadine peut suffire en ville, tandis qu’un SUV ou un véhicule plus grand apporte davantage de confort pour la famille, les bagages ou les longs circuits. Demandez conseil à VIPCAR en cas de doute.']] ]}
};

function ArticlePage({lang,slug}) { const article=articles[slug]; if(!article)return <NotFound lang={lang}/>; const [title,summary,sections]=article[lang]; const related=Object.entries(articles).filter(([key])=>key!==slug).slice(0,3); return <main className="page"><PageHero image={article.image} eyebrow="VIPCAR travel journal" title={title} text={summary}/><article className="section article-copy"><p className="overline">{lang==='en'?'Travel guidance':'Conseils de voyage'}</p><h2>{title}</h2><p>{summary}</p><div className="article-sections">{sections.map(([heading,text])=><section key={heading}><h3>{heading}</h3><p>{text}</p></section>)}</div><p>{lang==='en'?'Share your dates, pick-up point and preferences with the VIPCAR team. We confirm the practical details, availability and final quote directly before you travel.':'Partagez vos dates, votre lieu de prise en charge et vos préférences avec l’équipe VIPCAR. Nous confirmons directement les détails pratiques, la disponibilité et le devis final avant votre départ.'}</p><SmartLink className="button" href={link(lang,'/booking')}>{copy[lang].book}<ArrowRight/></SmartLink></article><section className="section related-guides"><SectionHead eyebrow={lang==='en'?'Keep planning':'Préparez la suite'} title={lang==='en'?'More useful guides for your trip.':'D’autres guides utiles pour votre séjour.'}/><div className="journal-grid">{related.map(([key,item])=><GuideCard key={key} image={item.image} tag={lang==='en'?'Travel guide':'Guide pratique'} title={item[lang][0]} slug={key} lang={lang}/>)}</div></section><Cta lang={lang}/></main> }

function DestinationHub({lang}) { return <section className="section destination-grid"><div className="destination-grid-intro"><p className="overline">{lang==='en'?'Local service areas':'Zones desservies'}</p><h2>{lang==='en'?'Start with the place that matters to your trip.':'Commencez par le lieu qui compte pour votre trajet.'}</h2><p>{lang==='en'?'Explore the locations where VIPCAR can arrange rental, delivery or a private transfer. Availability outside these hubs is confirmed for each request.':'Découvrez les zones où VIPCAR organise location, livraison ou transfert privé. La disponibilité hors de ces hubs est confirmée pour chaque demande.'}</p></div>{commercialLocations.map((x,i)=><article key={x.slug}><span>0{String(i+1).padStart(2,'0')}</span><MapPin/><h2>{x.name[lang==='en'?0:1]}</h2><p>{lang==='en'?`Car rental in ${x.name[0]}, with delivery or collection coordinated around your itinerary.`:`Location de voiture à ${x.name[1]}, avec livraison ou prise en charge selon votre trajet.`}</p><div className="destination-links"><SmartLink className="text-link" href={link(lang,`/car-rental/${x.slug}`)}>{lang==='en'?'Car rental':'Location'}<ArrowRight/></SmartLink>{x.slug!=='gabes'&&<SmartLink className="text-link" href={link(lang,`/airport-transfers/${x.slug}`)}>{lang==='en'?'Airport transfer':'Transfert aéroport'}<ArrowRight/></SmartLink>}{chauffeurHubs.includes(x.slug)&&<SmartLink className="text-link" href={link(lang,`/chauffeur/${x.slug}`)}>{lang==='en'?'Chauffeur':'Chauffeur'}<ArrowRight/></SmartLink>}</div></article>)}</section> }

const legalPages={
  'terms-conditions':{en:['Terms & conditions','The rental, transfer and chauffeur conditions confirmed for each request apply to the agreed service, vehicle and dates.'],fr:['Conditions générales','Les conditions de location, de transfert et de chauffeur confirmées pour chaque demande s’appliquent au service, au véhicule et aux dates convenus.']},
  'privacy-policy':{en:['Privacy policy','VIPCAR uses the details you share to respond to your request, confirm availability and coordinate the service you asked for.'],fr:['Politique de confidentialité','VIPCAR utilise les informations partagées pour répondre à votre demande, confirmer la disponibilité et organiser le service demandé.']},
  'cancellation-policy':{en:['Cancellation policy','Cancellation and amendment terms depend on the service, vehicle and timing of the request and are confirmed before booking.'],fr:['Politique d’annulation','Les conditions d’annulation et de modification dépendent du service, du véhicule et du délai de la demande et sont confirmées avant la réservation.']}
};

function LegalPage({lang,slug}) { const data=legalPages[slug]; if(!data)return <NotFound lang={lang}/>; const a=data[lang]; return <main className="page"><PageHero image="interior.jpg" eyebrow="VIPCAR legal" title={a[0]} text={a[1]}/><section className="section legal-copy"><p className="overline">{lang==='en'?'Last updated':'Dernière mise à jour'} · 18 August 2026</p><h2>{a[0]}</h2><p>{a[1]}</p><h3>{lang==='en'?'Direct confirmation':'Confirmation directe'}</h3><p>{lang==='en'?'Your exact quote, availability, deposit and service conditions are confirmed directly with the VIPCAR team before you commit.':'Votre devis exact, la disponibilité, la caution et les conditions du service sont confirmés directement avec l’équipe VIPCAR avant votre engagement.'}</p><h3>{lang==='en'?'Contact':'Contact'}</h3><p><a href={WA}>{PHONE}</a> · <a href="mailto:info@vipcar.com.tn">info@vipcar.com.tn</a></p></section></main> }

function ContactPage({lang}) { return <main className="page"><PageHero image="road-travel.jpg" eyebrow="VIPCAR contact" title={lang==='en'?'Let’s arrange the details.':'Organisons les détails de votre trajet.'} text={lang==='en'?'Questions, fixed quotes and corporate requests reach a real VIPCAR team, available 24/7.':'Questions, devis fixes et demandes entreprises sont traités par une vraie équipe VIPCAR, disponible 24h/24.'}/><section className="section contact-grid"><div className="contact-cards"><a href={WA}><MessageCircle/><strong>WhatsApp</strong><span>{PHONE}</span><small>{lang==='en'?'Fastest reply':'Réponse la plus rapide'}</small></a><a href="tel:+21655771077"><Headphones/><strong>{lang==='en'?'Call the team':'Appeler l’équipe'}</strong><span>{PHONE}</span><small>{lang==='en'?'Available 24/7':'Disponible 24h/24'}</small></a><a href="mailto:info@vipcar.com.tn"><BriefcaseBusiness/><strong>Email</strong><span>info@vipcar.com.tn</span><small>{lang==='en'?'Corporate accounts & invoicing':'Comptes entreprises et facturation'}</small></a><div><MapPin/><strong>{lang==='en'?'Head office':'Bureau principal'}</strong><span>Rue de la Feuille d'Érable, Lac 2, Tunis</span><small>Tunis · Gabès · Djerba</small></div></div><div className="contact-form"><h2>{lang==='en'?'Send a message':'Envoyer un message'}</h2><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);location.href=`${WA}?text=${encodeURIComponent(`Hello VIPCAR, ${f.get('message')} My name is ${f.get('name')}. Contact: ${f.get('contact')}.`)}`}}><label>{lang==='en'?'Your name':'Votre nom'}<input required name="name"/></label><label>{lang==='en'?'Phone / WhatsApp / Email':'Téléphone / WhatsApp / Email'}<input required name="contact"/></label><label>{lang==='en'?'Message':'Message'}<textarea required name="message" rows="6"/></label><button className="button" type="submit">{lang==='en'?'Send via WhatsApp':'Envoyer sur WhatsApp'}<MessageCircle/></button></form></div></section><Cta lang={lang}/></main> }

function FaqPage({lang}) { return <main className="page"><PageHero image="interior.jpg" eyebrow="VIPCAR FAQ" title={lang==='en'?'Useful answers before you travel.':'Les réponses utiles avant votre voyage.'} text={lang==='en'?'Rental requirements, airport collection, deposits, delivery and booking explained clearly.':'Conditions de location, aéroports, caution, livraison et réservation expliqués clairement.'}/><Faq lang={lang}/><section className="section faq-extra"><div><p className="overline">Still deciding?</p><h2>{lang==='en'?'Tell us what you need and we will confirm the practical details.':'Dites-nous ce qu’il vous faut et nous confirmerons les détails pratiques.'}</h2></div><QuoteWidget lang={lang}/></section></main> }

function LocationLinks({lang,currentSlug,airport}) { return <section className="section location-links"><SectionHead eyebrow={airport?(lang==='en'?'More airport routes':'Autres transferts aéroport'):(lang==='en'?'More local routes':'Autres destinations')} title={airport?(lang==='en'?'Arrive anywhere in Tunisia.':'Arrivez partout en Tunisie.'):(lang==='en'?'Choose where your journey starts.':'Choisissez le point de départ de votre voyage.')}/><div className="location-link-grid">{commercialLocations.filter(x=>x.slug!==currentSlug).slice(0,4).map(x=><SmartLink key={x.slug} className="location-link-card" href={link(lang,`${airport?'/airport-transfers':'/car-rental'}/${x.slug}`)}><MapPin size={18}/><strong>{airport?(lang==='en'?`${x.airport} transfers`:`Transferts ${x.airport}`):(lang==='en'?`Car rental in ${x.name[0]}`:`Location de voiture à ${x.name[1]}`)}</strong><span>{lang==='en'?'Fixed quote confirmed for your itinerary':'Devis fixe confirmé selon votre trajet'}<ArrowRight size={15}/></span></SmartLink>)}</div></section> }

function LocationPage({lang,slug,airport=false}) { const item=commercialLocations.find(x=>x.slug===slug)||commercialLocations[0]; const title=airport?(lang==='en'?`${item.airport} transfers`:`Transferts depuis ${item.airport}`):(lang==='en'?`Car rental in ${item.name[0]}`:`Location de voiture à ${item.name[1]}`); const text=airport?(lang==='en'?`Pre-arranged airport transfers between ${item.airport}, hotels and destinations in Tunisia. Your driver tracks the flight and the final fixed quote is confirmed before travel.`:`Transferts aéroport organisés entre ${item.airport}, les hôtels et les destinations en Tunisie. Votre chauffeur suit le vol et le devis fixe est confirmé avant le départ.`):(lang==='en'?`Arrange a VIPCAR rental in ${item.name[0]} with collection or delivery at ${item.airport}. Choose from economy, compact, SUV, executive and group vehicles, subject to availability for your dates.`:`Organisez votre location VIPCAR à ${item.name[1]} avec prise en charge ou livraison à ${item.airport}. Choisissez parmi les citadines, compactes, SUV, berlines et véhicules de groupe, selon disponibilité.`); return <main className="page"><PageHero image={item.image} eyebrow={airport?(lang==='en'?'Airport transfer Tunisia':'Transfert aéroport Tunisie'):(lang==='en'?'Car rental Tunisia':'Location de voiture Tunisie')} title={title} text={text}/><section className="section location-detail"><div><p className="overline">{item.name[0]} · Tunisia</p><h2>{airport?(lang==='en'?'A calm arrival starts before you land.':'Une arrivée sereine commence avant l’atterrissage.'):(lang==='en'?'Your local mobility partner in Tunisia.':'Votre partenaire mobilité en Tunisie.')}</h2><p>{text}</p><ul><li><Check/>{lang==='en'?'Fixed quote confirmed directly':'Devis fixe confirmé directement'}</li><li><Check/>{lang==='en'?'Airport and hotel collection on request':'Prise en charge à l’aéroport ou à l’hôtel sur demande'}</li><li><Check/>{lang==='en'?'English- and French-speaking team':'Équipe francophone et anglophone'}</li><li><Check/>{lang==='en'?'24/7 availability':'Disponibilité 24h/24'}</li></ul></div><QuoteWidget lang={lang}/></section><LocalSeoContent lang={lang} item={item} airport={airport}/>{!airport&&<section className="section"><SectionHead eyebrow={lang==='en'?'Choose your vehicle':'Choisissez votre véhicule'} title={copy[lang].fleetTitle}/><div className="vehicle-grid featured">{fleet.slice(0,4).map(c=><VehicleCard key={c.slug} car={c} lang={lang}/>)}</div></section>}<LocationLinks lang={lang} currentSlug={slug} airport={airport}/><Faq lang={lang}/><Cta lang={lang}/></main> }

function ChauffeurLocationPage({lang,slug}) { const item=commercialLocations.find(x=>x.slug===slug); if(!item||!chauffeurHubs.includes(slug))return <NotFound lang={lang}/>; const title=lang==='en'?`Private chauffeur in ${item.name[0]}`:`Chauffeur privé à ${item.name[1]}`; const text=lang==='en'?`Arrange a professional VIPCAR chauffeur in ${item.name[0]} for airport arrivals, business travel, events or a full day of private touring. Your schedule, vehicle and fixed quote are confirmed directly before travel.`:`Organisez un chauffeur privé VIPCAR à ${item.name[1]} pour vos arrivées à l’aéroport, déplacements professionnels, événements ou circuits à la journée. Votre programme, le véhicule et le devis fixe sont confirmés directement avant le départ.`; return <main className="page"><PageHero image="interior.jpg" eyebrow={lang==='en'?'Private chauffeur Tunisia':'Chauffeur privé Tunisie'} title={title} text={text}/><section className="section location-detail"><div><p className="overline">{item.name[0]} · VIPCAR</p><h2>{lang==='en'?'A calm, capable driver for every important journey.':'Un chauffeur fiable pour les trajets qui comptent.'}</h2><p>{text}</p><ul><li><Check/>{lang==='en'?'English- and French-speaking drivers':'Chauffeurs francophones et anglophones'}</li><li><Check/>{lang==='en'?'Airport meet-and-greet and flight tracking':'Accueil à l’aéroport et suivi du vol'}</li><li><Check/>{lang==='en'?'Hourly, half-day or full-day service':'À l’heure, à la demi-journée ou à la journée'}</li><li><Check/>{lang==='en'?'Discreet service for business and events':'Service discret pour affaires et événements'}</li></ul></div><QuoteWidget lang={lang}/></section><section className="section"><SectionHead eyebrow={lang==='en'?'Related local services':'Services locaux associés'} title={lang==='en'?`More ways to move through ${item.name[0]}.`:`D’autres façons de vous déplacer à ${item.name[1]}.`}/><div className="location-link-grid"><SmartLink className="location-link-card" href={link(lang,`/car-rental/${slug}`)}><Car size={18}/><strong>{lang==='en'?`Car rental in ${item.name[0]}`:`Location de voiture à ${item.name[1]}`}</strong><span>{lang==='en'?'Explore rental options':'Voir les options de location'}<ArrowRight size={15}/></span></SmartLink>{slug!=='gabes'&&<SmartLink className="location-link-card" href={link(lang,`/airport-transfers/${slug}`)}><Plane size={18}/><strong>{lang==='en'?`${item.airport} transfer`:`Transfert ${item.airport}`}</strong><span>{lang==='en'?'Plan your arrival':'Organiser votre arrivée'}<ArrowRight size={15}/></span></SmartLink>}</div></section><Faq lang={lang}/><Cta lang={lang}/></main> }

function NotFound({lang}) { return <main className="not-found"><span>404</span><h1>{lang==='en'?'This road ends here.':'Cette route s’arrête ici.'}</h1><p>{lang==='en'?'The page may have moved. Return to VIPCAR or explore the fleet.':'Cette page a peut-être changé. Revenez à VIPCAR ou consultez la flotte.'}</p><SmartLink className="button" href={link(lang)}>{lang==='en'?'Return home':'Retour à l’accueil'}<ArrowRight/></SmartLink></main> }

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

function Seo({lang,parts}) { useEffect(()=>{let title=lang==='en'?'Car Rental in Tunisia | VIPCAR':'Location Voiture Tunisie | VIPCAR'; let desc=copy[lang].heroSub; const p=parts.join('/'); if(p==='fleet')title=lang==='en'?'Car Rental Fleet & Prices | VIPCAR Tunisia':'Flotte & Prix Location Voiture | VIPCAR'; if(p.includes('services/transfer'))title=lang==='en'?'Airport Transfers in Tunisia | VIPCAR':'Transfert Aéroport Tunisie | VIPCAR'; if(p.includes('services/chauffeur'))title=lang==='en'?'Private Chauffeur in Tunisia | VIPCAR':'Chauffeur Privé Tunisie | VIPCAR'; if(p.includes('services/rental'))title=lang==='en'?'Car Rental in Tunisia | VIPCAR':'Location Voiture en Tunisie | VIPCAR'; if(p==='booking')title=lang==='en'?'Get a Fixed Quote | VIPCAR Tunisia':'Demander un Devis | VIPCAR Tunisie'; if(p==='my-bookings')title=lang==='en'?'My Bookings | VIPCAR Tunisia':'Mes réservations | VIPCAR Tunisie'; if(p==='login')title=lang==='en'?'Sign in | VIPCAR Tunisia':'Connexion | VIPCAR Tunisie'; if(p==='corporate')title=lang==='en'?'Corporate Mobility in Tunisia | VIPCAR':'Mobilité d’entreprise en Tunisie | VIPCAR'; if(p==='about')title=lang==='en'?'About VIPCAR Tunisia | Local Mobility Experts':'À propos de VIPCAR Tunisie | Experts mobilité'; if(p==='destinations')title=lang==='en'?'Tunisia Car Rental Destinations | VIPCAR':'Destinations location voiture Tunisie | VIPCAR'; if(p==='blog')title=lang==='en'?'Tunisia Travel Journal | VIPCAR':'Journal de voyage Tunisie | VIPCAR'; if(p==='contact')title=lang==='en'?'Contact VIPCAR Tunisia | Quotes & Support':'Contacter VIPCAR Tunisie | Devis & Assistance'; if(p==='faq')title=lang==='en'?'Car Rental & Transfer FAQ | VIPCAR Tunisia':'FAQ Location & Transfert | VIPCAR Tunisie'; if(parts[0]==='blog'&&parts[1]&&articles[parts[1]])title=`${articles[parts[1]][lang][0]} | VIPCAR`; if(parts[0]==='legal'&&parts[1]&&legalPages[parts[1]])title=`${legalPages[parts[1]][lang][0]} | VIPCAR Tunisia`; const vehicle=parts[0]==='fleet'&&parts[1]?fleet.find(x=>x.slug===parts[1]):null; if(vehicle)title=`${vehicle.name} Rental | VIPCAR Tunisia`; document.title=title; document.documentElement.lang=lang; const set=(sel,attr,val)=>{let e=document.head.querySelector(sel);if(!e){e=document.createElement(attr==='rel'?'link':'meta');document.head.appendChild(e)}Object.entries(val).forEach(([k,v])=>e.setAttribute(k,v))}; set('meta[name="description"]','name',{name:'description',content:desc}); set('link[rel="canonical"]','rel',{rel:'canonical',href:`${ORIGIN}${location.pathname}`}); set('meta[property="og:title"]','property',{property:'og:title',content:title}); set('meta[property="og:description"]','property',{property:'og:description',content:desc}); set('meta[property="og:image"]','property',{property:'og:image',content:vehicle?img(vehicle.image):img('hero-mercedes.jpg')}); set('meta[name="twitter:card"]','name',{name:'twitter:card',content:'summary_large_image'}); ['en','fr'].forEach(l=>set(`link[hreflang="${l}"]`,'rel',{rel:'alternate',hreflang:l,href:`${ORIGIN}/${l}/${parts.join('/')}`.replace(/\/$/, '')})); const base={
      '@context':'https://schema.org','@type':['AutoRental','LocalBusiness'],name:'VIPCAR Tunisia',url:ORIGIN,telephone:'+21655771077',email:'info@vipcar.com.tn',image:img('hero-mercedes.jpg'),address:{'@type':'PostalAddress',streetAddress:"Rue de la Feuille d'Érable, Lac 2",addressLocality:'Tunis',addressCountry:'TN'},areaServed:'Tunisia',availableLanguage:['English','French']
    }; const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{ '@type':'ListItem',position:1,name:'VIPCAR',item:`${ORIGIN}/${lang}`},...parts.map((x,i)=>({'@type':'ListItem',position:i+2,name:x.replaceAll('-',' '),item:`${ORIGIN}/${lang}/${parts.slice(0,i+1).join('/')}`}))]}; let schema=[base,crumbs]; if(parts[0]==='services'||parts[0]==='chauffeur')schema.push({'@context':'https://schema.org','@type':'Service',name:title,provider:{'@type':'Organization',name:'VIPCAR Tunisia'},areaServed:parts[1]||'Tunisia',url:`${ORIGIN}${location.pathname}`}); if(vehicle)schema.push({'@context':'https://schema.org','@type':['Product','Vehicle'],name:vehicle.name,image:img(vehicle.image),vehicleConfiguration:vehicle.cat,vehicleSeatingCapacity:vehicle.seats,offers:{'@type':'Offer',price:vehicle.price,priceCurrency:CURRENCY,url:`${ORIGIN}${location.pathname}`,description:'Indicative daily price in Tunisian Dinar; availability and the final quote are confirmed for the requested dates.'}}); if(!parts.length||parts[0]==='fleet'||parts[0]==='services'||parts[0]==='chauffeur')schema.push({'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs[lang].map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}); let script=document.head.querySelector('#route-schema'); if(!script){script=document.createElement('script');script.type='application/ld+json';script.id='route-schema';document.head.appendChild(script)}script.textContent=JSON.stringify(schema);
  },[lang,parts.join('/')]);
  useEffect(()=>{
    const item=parts[1]?commercialLocations.find(x=>x.slug===parts[1]):null;
    if(!item||!['car-rental','airport-transfers'].includes(parts[0])) return;
    const description=parts[0]==='car-rental'
      ?(lang==='en'?`Car rental in ${item.name[0]} with airport and hotel delivery. Choose your vehicle and receive a fixed VIPCAR quote for your dates.`:`Location de voiture à ${item.name[1]} avec livraison à l’aéroport ou à l’hôtel. Choisissez votre véhicule et recevez un devis fixe VIPCAR.`)
      :(lang==='en'?`Private ${item.airport} airport transfers with flight tracking, meet-and-greet and a fixed VIPCAR quote confirmed before travel.`:`Transferts privés depuis ${item.airport}, avec suivi du vol, accueil personnalisé et devis fixe VIPCAR confirmé avant le départ.`);
    let meta=document.head.querySelector('meta[name="description"]');
    if(meta) meta.setAttribute('content',description);
  },[lang,parts.join('/')]);
  useEffect(()=>{
    const path=parts.join('/');
    if(path==='contact') document.title=lang==='en'?'Contact VIPCAR Tunisia | Quotes & Support':'Contacter VIPCAR Tunisie | Devis & Assistance';
    if(path==='faq') document.title=lang==='en'?'Car Rental & Transfer FAQ | VIPCAR Tunisia':'FAQ Location & Transfert | VIPCAR Tunisie';
    if(parts[0]==='car-rental'&&parts[1]) document.title=lang==='en'?`Car Rental in ${commercialLocations.find(x=>x.slug===parts[1])?.name[0]||'Tunisia'} | VIPCAR`:`Location Voiture ${commercialLocations.find(x=>x.slug===parts[1])?.name[1]||'Tunisie'} | VIPCAR`;
    if(parts[0]==='airport-transfers'&&parts[1]) document.title=lang==='en'?`${commercialLocations.find(x=>x.slug===parts[1])?.airport||'Tunisia'} Transfer | VIPCAR`:`Transfert ${commercialLocations.find(x=>x.slug===parts[1])?.airport||'Tunisie'} | VIPCAR`;
    if(parts[0]==='chauffeur'&&parts[1]) document.title=lang==='en'?`Private Chauffeur in ${commercialLocations.find(x=>x.slug===parts[1])?.name[0]||'Tunisia'} | VIPCAR`:`Chauffeur Privé à ${commercialLocations.find(x=>x.slug===parts[1])?.name[1]||'Tunisie'} | VIPCAR`;
  },[lang,parts.join('/')]);
  useEffect(()=>{
    const path=parts.join('/');
    const descriptions={
      '':{en:'Premium car rental, private chauffeurs and airport transfers across Tunisia. Get a fixed quote from the VIPCAR local team.',fr:'Location de voiture premium, chauffeurs privés et transferts aéroport en Tunisie. Recevez un devis fixe de l’équipe VIPCAR.'},
      fleet:{en:'Explore VIPCAR’s car rental fleet in Tunisia, from practical city cars and SUVs to premium vehicles and group transport.',fr:'Découvrez la flotte VIPCAR en Tunisie : citadines, SUV, véhicules premium et modèles adaptés aux groupes.'},
      'services/rental':{en:'Car rental in Tunisia with airport or hotel delivery, clear daily rates and direct confirmation from VIPCAR.',fr:'Location de voiture en Tunisie avec livraison à l’aéroport ou à l’hôtel, tarifs clairs et confirmation directe VIPCAR.'},
      'services/transfer':{en:'Pre-arranged airport transfers in Tunisia with flight tracking, meet-and-greet and a fixed quote.',fr:'Transferts aéroport en Tunisie avec suivi du vol, accueil personnalisé et devis fixe confirmé à l’avance.'},
      'services/chauffeur':{en:'Private chauffeur service in Tunisia for airport transfers, business travel, events and touring.',fr:'Service de chauffeur privé en Tunisie pour transferts, déplacements professionnels, événements et circuits.'},
      booking:{en:'Request a clear VIPCAR quote for car rental, airport transfer or private chauffeur service in Tunisia.',fr:'Demandez un devis clair pour une location, un transfert aéroport ou un chauffeur privé en Tunisie.'},
      destinations:{en:'Explore VIPCAR car rental, airport transfer and private chauffeur service areas across Tunisia.',fr:'Découvrez les zones VIPCAR pour la location, les transferts aéroport et le chauffeur privé en Tunisie.'},
      contact:{en:'Contact VIPCAR Tunisia for car rental, airport transfer, chauffeur and corporate mobility requests.',fr:'Contactez VIPCAR Tunisie pour vos demandes de location, transfert aéroport, chauffeur et mobilité d’entreprise.'},
      faq:{en:'Answers about car rental, airport transfers, chauffeur service, deposits, delivery and booking in Tunisia.',fr:'Réponses sur la location, les transferts, le chauffeur, la caution, la livraison et la réservation en Tunisie.'}
    };
    let description=descriptions[path]?.[lang];
    if(parts[0]==='blog'&&parts[1]&&articles[parts[1]]) description=articles[parts[1]][lang][1];
    if(parts[0]==='legal'&&parts[1]&&legalPages[parts[1]]) description=legalPages[parts[1]][lang][1];
    if(!description&&parts[0]==='car-rental'&&parts[1]){const item=commercialLocations.find(x=>x.slug===parts[1]);if(item)description=lang==='en'?`Car rental in ${item.name[0]} with airport and hotel delivery. Receive a fixed VIPCAR quote for your dates.`:`Location de voiture à ${item.name[1]} avec livraison à l’aéroport ou à l’hôtel. Recevez un devis fixe VIPCAR.`}
    if(!description&&parts[0]==='airport-transfers'&&parts[1]){const item=commercialLocations.find(x=>x.slug===parts[1]);if(item)description=lang==='en'?`Private ${item.airport} airport transfers with flight tracking, meet-and-greet and a fixed VIPCAR quote.`:`Transferts privés depuis ${item.airport}, avec suivi du vol, accueil personnalisé et devis fixe VIPCAR.`}
    if(!description&&parts[0]==='chauffeur'&&parts[1]){const item=commercialLocations.find(x=>x.slug===parts[1]);if(item)description=lang==='en'?`Private chauffeur in ${item.name[0]} for airport arrivals, business travel, events and full-day touring with VIPCAR.`:`Chauffeur privé à ${item.name[1]} pour arrivées à l’aéroport, affaires, événements et circuits à la journée avec VIPCAR.`}
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
  useEffect(()=>{const h=()=>setPathname(location.pathname);addEventListener('popstate',h);return()=>removeEventListener('popstate',h)},[]);
  // Staff backoffice: same Vite app/port, path routing (not under /en|/fr).
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
  return <><Seo lang={lang} parts={parts}/><Motion routeKey={`${lang}/${parts.join('/')}`}/><a className="skip-link" href="#main-content">{lang==='en'?'Skip to main content':'Aller au contenu principal'}</a><Header lang={lang}/><div id="main-content">{page}</div><Footer lang={lang}/><a className="floating-wa" href={WA} aria-label="Chat on WhatsApp"><MessageCircle/></a><SmartLink className="mobile-book" href={link(lang,'/booking')}>{copy[lang].book}<ArrowRight/></SmartLink></>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
