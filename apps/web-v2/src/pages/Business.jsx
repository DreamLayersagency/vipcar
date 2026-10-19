import React, { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CalendarDays, Check, Clock3, Headphones, MapPin, MessageCircle, Plane, ShieldCheck } from 'lucide-react';
import {
  buildWhatsAppQuoteMessage, createQuote, formatQuoteReference, quoteErrorMessage, trackEvent, whatsAppUrl,
} from '../../../../libs/web-client/src/index.js';
import { locations, serviceSeoArabic, serviceSeoContent, services } from '../content/app1-content.js';
import { languageIndex, locationLabel, t, text } from '../i18n.js';
import { ADDRESS, EMAIL, HUBS, PHONE, PHONE_HREF, WA } from '../site.js';
import { QuoteFlow, QuoteSuccess } from '../components/QuoteFlow.jsx';
import { CtaBand, Faq, PageHero, PointsGrid, Reveal, SectionHead } from '../components/Blocks.jsx';
import { FeaturedFleet } from './Home.jsx';

const SERVICE_DETAILS = {
  rental: [['Short and long-term rentals', 'Locations courte et longue durée', 'تأجير قصير أو طويل الأمد'], ['Airport and hotel delivery', 'Livraison à l’aéroport et à l’hôtel', 'توصيل إلى المطار أو الفندق'], ['Economy to luxury fleet', 'Flotte économique à premium', 'أسطول من الاقتصادي إلى الفاخر']],
  transfer: [['Flight tracking and meet-and-greet', 'Suivi du vol et accueil personnalisé', 'متابعة الرحلة والاستقبال الشخصي'], ['Tunis, Djerba and Enfidha airports', 'Aéroports de Tunis, Djerba et Enfidha', 'مطارات تونس وجربة والنفيضة'], ['Fixed quote agreed in advance', 'Devis fixe confirmé à l’avance', 'سعر ثابت مؤكد مسبقاً']],
  chauffeur: [['English- and French-speaking drivers', 'Chauffeurs anglophones et francophones', 'سائقون يتحدثون الإنجليزية والفرنسية'], ['By the hour, day or longer', 'À l’heure, à la journée ou davantage', 'بالساعة أو باليوم أو لفترة أطول'], ['Business, events and touring', 'Affaires, événements et circuits', 'للأعمال والفعاليات والجولات']],
};

export function ServicePage({ lang, type }) {
  const copy = t(lang);
  const fi = languageIndex(lang);
  const service = services.find((item) => item.key === type) || services[0];
  const details = SERVICE_DETAILS[service.key].map((item) => item[fi]);
  const seo = serviceSeoContent[service.key]?.[lang] ?? serviceSeoArabic[service.key];
  return (
    <main>
      <PageHero image={service.image} eyebrow={copy.serviceEyebrow} title={service.title[fi]} intro={service.text[fi]} />
      <section className="section detail">
        <div className="container detail__grid">
          <Reveal>
            <p className="eyebrow">{copy.designedAroundTrip}</p>
            <h2>{copy.mobilityTitle}</h2>
            <p>{service.text[fi]} {text(lang, 'Send your schedule and preferences; the VIPCAR team will confirm availability, vehicle and price before you travel.', 'Envoyez votre programme et vos préférences ; l’équipe VIPCAR confirme la disponibilité, le véhicule et le tarif avant votre départ.', 'أرسل برنامجك وتفضيلاتك؛ وسيؤكد فريق VIPCAR التوفر والسيارة والسعر قبل سفرك.')}</p>
            <ul className="check-list">{details.map((item) => <li key={item}><Check size={18} aria-hidden="true" />{item}</li>)}</ul>
          </Reveal>
          <div className="panel"><QuoteFlow lang={lang} serviceType={service.key} analyticsLocation={`service_${service.key}`} /></div>
        </div>
      </section>
      {seo && <PointsGrid eyebrow={seo.eyebrow} title={seo.title} intro={seo.intro} points={seo.points} />}
      {service.key === 'rental' && <FeaturedFleet lang={lang} count={8} eyebrow={text(lang, 'VIPCAR fleet', 'Flotte VIPCAR', 'أسطول VIPCAR')} />}
      <Faq lang={lang} />
      <CtaBand lang={lang} />
    </main>
  );
}

const EMPTY_CORPORATE = { company: '', name: '', email: '', phone: '', teamSize: '', pickup: locations[0], dropoff: '', date: '', endDate: '', duration: 'full-day', flightNumber: '', notes: '' };

function readFormValues(form) {
  return Object.fromEntries(Array.from(form?.elements ?? []).filter((element) => element.name).map((element) => [element.name, element.value]));
}

/** B2B request: same validation, notes structure and `POST /v1/quotes` body as App 1's CorporateForm. */
function CorporateForm({ lang }) {
  const copy = t(lang);
  const [service, setService] = useState('rental');
  const [data, setData] = useState(EMPTY_CORPORATE);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const update = (event) => setData((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const values = { ...data, ...readFormValues(event.currentTarget) };
    const company = String(values.company || '').trim();
    const name = String(values.name || '').trim();
    const email = String(values.email || '').trim();
    const phone = String(values.phone || '').trim();
    const teamSize = Number(values.teamSize);
    const pickup = String(values.pickup || '').trim();
    const dropoff = String(values.dropoff || '').trim() || undefined;
    const startDate = String(values.date || '').trim();
    const endDate = String(values.endDate || '').trim();
    const flightNumber = service === 'transfer' ? String(values.flightNumber || '').trim() || undefined : undefined;
    const additionalNotes = String(values.notes || '').trim();
    if (!company || !name || !email || !phone) return setError(text(lang, 'Please complete the company and contact details.', 'Renseignez les informations de l’entreprise et vos coordonnées.', 'أكمل بيانات الشركة وبيانات التواصل.'));
    if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 50) return setError(text(lang, 'Enter a team size between 1 and 50.', 'Indiquez une taille d’équipe entre 1 et 50.', 'أدخل عدد أفراد الفريق بين 1 و50.'));
    if (!pickup || !startDate) return setError(text(lang, 'Please choose a pick-up point and date.', 'Choisissez un lieu de départ et une date.', 'اختر مكان الاستلام والتاريخ.'));
    if (service === 'rental' && !endDate) return setError(text(lang, 'Please choose a return date for the rental.', 'Choisissez une date de retour pour la location.', 'اختر تاريخ عودة السيارة.'));
    if (service === 'transfer' && !dropoff) return setError(text(lang, 'Please add the transfer destination.', 'Ajoutez la destination du transfert.', 'أضف وجهة النقل.'));
    const serviceName = services.find((item) => item.key === service)?.title[languageIndex(lang)] || service;
    const structuredNotes = [
      `Company: ${company}`,
      `Team size: ${teamSize}`,
      `Requested service: ${serviceName}`,
      `Pick-up: ${pickup}`,
      dropoff ? `Destination / return: ${dropoff}` : null,
      service === 'rental' ? `Rental dates: ${startDate} → ${endDate}` : `Requested date: ${startDate}`,
      service === 'chauffeur' ? `Duration: ${values.duration}` : null,
      flightNumber ? `Flight number: ${flightNumber}` : null,
      additionalNotes ? `Additional notes: ${additionalNotes}` : null,
    ].filter(Boolean).join('\n');
    const body = {
      service, pickup, ...(dropoff ? { dropoff } : {}), startDate, ...(service === 'rental' ? { endDate } : {}),
      ...(service === 'chauffeur' ? { duration: values.duration } : {}), passengers: teamSize, ...(flightNumber ? { flightNumber } : {}),
      notes: structuredNotes, name, phone, email, locale: lang, channel: 'contact',
    };
    setSubmitting(true);
    setError('');
    try {
      const response = await createQuote(body, { locale: lang });
      const reference = formatQuoteReference(response?.data?.id);
      const whatsappText = `${buildWhatsAppQuoteMessage({ service, pickup, dropoff, startDate, endDate: body.endDate, duration: body.duration, passengers: teamSize, name, phone, email, notes: structuredNotes })} Reference: ${reference}.`;
      setSuccess({ reference, whatsappText });
      trackEvent('quote_submit', { service, language: lang, location: 'corporate', company });
    } catch (err) {
      setError(quoteErrorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSuccess(null);
    setError('');
    setService('rental');
    setData(EMPTY_CORPORATE);
  };

  if (success) return <div className="panel"><QuoteSuccess lang={lang} request={success} onReset={reset} /></div>;

  return (
    <div className="panel corporate-form">
      <div className="quote__head">
        <div>
          <p className="eyebrow">{text(lang, 'B2B / TEAM RESERVATION', 'B2B / RÉSERVATION D’ÉQUIPE', 'B2B / حجز للفريق')}</p>
          <h3>{text(lang, 'Plan your team’s next journey.', 'Organisez le prochain trajet de votre équipe.', 'نظّم رحلة فريقك القادمة.')}</h3>
        </div>
        <span className="quote__badge"><ShieldCheck size={15} aria-hidden="true" />{text(lang, 'No payment now', 'Aucun paiement immédiat', 'لا يوجد دفع الآن')}</span>
      </div>
      <p className="corporate-form__intro">{text(lang, 'Send the key details once. Our team will prepare a clear, coordinated quote for your company.', 'Partagez les informations essentielles en une fois. Notre équipe préparera un devis clair et coordonné pour votre entreprise.', 'شارك التفاصيل الأساسية مرة واحدة، وسنعدّ لشركتك عرضاً واضحاً ومنسقاً.')}</p>
      <form onSubmit={submit} noValidate>
        <fieldset>
          <legend>01 · {text(lang, 'Company & contact', 'Entreprise et contact', 'الشركة وبيانات التواصل')}</legend>
          <div className="form-grid">
            <label className="field"><span>{text(lang, 'Company name', 'Nom de l’entreprise', 'اسم الشركة')}</span><input required name="company" value={data.company} onChange={update} autoComplete="organization" /></label>
            <label className="field"><span>{copy.fullName}</span><input required name="name" value={data.name} onChange={update} autoComplete="name" /></label>
            <label className="field"><span>{copy.email}</span><input required type="email" name="email" value={data.email} onChange={update} autoComplete="email" /></label>
            <label className="field"><span>{copy.phoneWhatsapp}</span><input required type="tel" name="phone" value={data.phone} onChange={update} autoComplete="tel" placeholder="+216…" /></label>
            <label className="field"><span>{text(lang, 'Team size', 'Taille de l’équipe', 'حجم الفريق')}</span><input required type="number" min="1" max="50" name="teamSize" value={data.teamSize} onChange={update} /></label>
          </div>
        </fieldset>
        <fieldset>
          <legend>02 · {text(lang, 'Trip requirements', 'Besoins du trajet', 'احتياجات الرحلة')}</legend>
          <div className="form-grid">
            <label className="field"><span>{text(lang, 'Service', 'Service', 'الخدمة')}</span>
              <select name="service" value={service} onChange={(event) => { setService(event.target.value); setError(''); }}>
                {services.map((item) => <option key={item.key} value={item.key}>{item.title[languageIndex(lang)]}</option>)}
              </select>
            </label>
            <label className="field"><span><MapPin size={14} aria-hidden="true" />{copy.whereMeet}</span>
              <select required name="pickup" value={data.pickup} onChange={update}>{locations.map((item) => <option key={item} value={item}>{locationLabel(item, lang)}</option>)}</select>
            </label>
            <label className="field"><span><MapPin size={14} aria-hidden="true" />{text(lang, 'Destination / return location', 'Destination / lieu de retour', 'الوجهة / مكان العودة')}</span>
              <select required={service === 'transfer'} name="dropoff" value={data.dropoff} onChange={update}>
                <option value="">{text(lang, 'Select a destination', 'Sélectionner une destination', 'اختر وجهة')}</option>
                {locations.map((item) => <option key={item} value={item}>{locationLabel(item, lang)}</option>)}
              </select>
            </label>
            <label className="field"><span><CalendarDays size={14} aria-hidden="true" />{copy.when}</span><input required type="date" min={today} name="date" value={data.date} onChange={update} /></label>
            {service === 'rental' && <label className="field"><span><CalendarDays size={14} aria-hidden="true" />{copy.returnDate}</span><input required type="date" min={data.date || today} name="endDate" value={data.endDate} onChange={update} /></label>}
            {service === 'chauffeur' && (
              <label className="field"><span><Clock3 size={14} aria-hidden="true" />{copy.serviceDuration}</span>
                <select name="duration" value={data.duration} onChange={update}>
                  <option value="hourly">{text(lang, 'By the hour', 'À l’heure', 'بالساعة')}</option>
                  <option value="half-day">{text(lang, 'Half day', 'Demi-journée', 'نصف يوم')}</option>
                  <option value="full-day">{text(lang, 'Full day', 'Journée complète', 'يوم كامل')}</option>
                </select>
              </label>
            )}
            {service === 'transfer' && <label className="field"><span><Plane size={14} aria-hidden="true" />{copy.flightNumber}</span><input name="flightNumber" value={data.flightNumber} onChange={update} placeholder="TU1234" /></label>}
            <label className="field field--wide"><span>{text(lang, 'Project notes / billing needs', 'Notes projet / besoins de facturation', 'ملاحظات المشروع / احتياجات الفوترة')}</span>
              <textarea name="notes" rows="4" value={data.notes} onChange={update} placeholder={text(lang, 'Hotel names, flight details, billing reference or special requirements…', 'Hôtels, détails de vol, référence de facturation ou besoins particuliers…', 'أسماء الفنادق أو تفاصيل الرحلة أو مرجع الفوترة أو المتطلبات الخاصة…')} />
            </label>
          </div>
        </fieldset>
        {error && <p className="feedback feedback--error" role="alert">{error}</p>}
        <div className="corporate-form__actions">
          <p>{text(lang, 'Your request is saved in our back-office for follow-up.', 'Votre demande est enregistrée dans notre back-office pour suivi.', 'يتم حفظ طلبك في نظام الإدارة للمتابعة.')}</p>
          <button type="submit" className="btn btn--accent" disabled={submitting}>{submitting ? copy.sending : text(lang, 'Send B2B request', 'Envoyer la demande B2B', 'إرسال طلب الشركات')}<ArrowRight size={17} aria-hidden="true" /></button>
        </div>
      </form>
    </div>
  );
}

export function CorporatePage({ lang }) {
  const benefits = { en: ['Corporate accounts', 'Airport coordination', 'Professional drivers', '24/7 support'], fr: ['Comptes entreprises', 'Coordination aéroport', 'Chauffeurs professionnels', 'Assistance 24h/24'], ar: ['حسابات الشركات', 'تنسيق المطار', 'سائقون محترفون', 'مساعدة على مدار الساعة'] }[lang];
  return (
    <main>
      <PageHero image="interior.jpg" eyebrow={text(lang, 'VIPCAR for business', 'VIPCAR pour les entreprises', 'VIPCAR للشركات')} title={text(lang, 'Ground mobility your team can rely on.', 'La mobilité professionnelle sur laquelle compter.', 'تنقّل موثوق لفريقك.')} intro={text(lang, 'Airport transfers, chauffeur services and vehicle rental for companies, hotels, travel agencies and events.', 'Transferts, chauffeurs et location pour entreprises, hôtels, agences de voyage et événements.', 'نقل من المطار، خدمات سائق خاص وتأجير سيارات للشركات والفنادق ووكالات السفر والفعاليات.')} />
      <section className="section">
        <div className="container detail__grid">
          <Reveal>
            <p className="eyebrow">{text(lang, 'Corporate mobility', 'Mobilité d’entreprise', 'تنقّل الشركات')}</p>
            <h2>{text(lang, 'One point of contact across Tunisia.', 'Un seul contact partout en Tunisie.', 'جهة اتصال واحدة في مختلف أنحاء تونس.')}</h2>
            <p>{text(lang, 'VIPCAR already works with concierge services, travel agencies and corporate accounts. Share passenger schedules, vehicle needs and invoicing requirements with a team available around the clock.', 'VIPCAR travaille avec des conciergeries, agences de voyage et comptes entreprises. Confiez les horaires, véhicules et besoins de facturation à une équipe disponible 24h/24.', 'تعمل VIPCAR مع خدمات الكونسيرج ووكالات السفر وحسابات الشركات. شارك جداول الركاب واحتياجات السيارات ومتطلبات الفوترة مع فريق متاح على مدار الساعة.')}</p>
          </Reveal>
          <ul className="stat-grid stat-grid--two">
            {benefits.map((item) => <li key={item}><BriefcaseBusiness size={24} aria-hidden="true" /><strong>{item}</strong><small>{text(lang, 'Arranged around your operation', 'Adapté à votre activité', 'مصمم حول احتياجات عملك')}</small></li>)}
          </ul>
        </div>
      </section>
      <section className="section section--mist">
        <div className="container detail__grid">
          <div>
            <p className="eyebrow">{text(lang, 'Built for business travel', 'Pensé pour les déplacements professionnels', 'مصمم لتنقلات الشركات')}</p>
            <h2>{text(lang, 'A simpler way to move your team.', 'Une façon plus simple de déplacer votre équipe.', 'طريقة أبسط لتنقل فريقك.')}</h2>
            <p>{text(lang, 'One request gives the back-office the company, passenger, route and timing details needed to coordinate your reservation.', 'Une seule demande transmet au back-office les informations entreprise, passagers, itinéraire et horaires nécessaires à la coordination.', 'طلب واحد يرسل إلى نظام الإدارة بيانات الشركة والركاب والمسار والمواعيد اللازمة للتنسيق.')}</p>
            <ul className="mini-stats">
              <li><strong>24/7</strong>{text(lang, 'Direct assistance', 'Assistance directe', 'مساعدة مباشرة')}</li>
              <li><strong>3</strong>{text(lang, 'Tunisia hubs', 'Agences en Tunisie', 'وكالات في تونس')}</li>
            </ul>
          </div>
          <CorporateForm lang={lang} />
        </div>
      </section>
      <CtaBand lang={lang} />
    </main>
  );
}

export function ContactPage({ lang }) {
  const copy = t(lang);
  const onSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    window.location.href = whatsAppUrl(`Hello VIPCAR, ${form.get('message')} My name is ${form.get('name')}. Contact: ${form.get('contact')}.`, WA);
  };
  return (
    <main>
      <PageHero image="road-travel.jpg" eyebrow={text(lang, 'VIPCAR contact', 'Contact VIPCAR', 'التواصل مع VIPCAR')} title={text(lang, 'Let’s arrange the details.', 'Organisons les détails de votre trajet.', 'لننظم تفاصيل رحلتك.')} intro={text(lang, 'Questions, fixed quotes and corporate requests reach a real VIPCAR team, available 24/7.', 'Questions, devis fixes et demandes entreprises sont traités par une vraie équipe VIPCAR, disponible 24h/24.', 'تصلك أسئلتك وعروض الأسعار الثابتة وطلبات الشركات إلى فريق VIPCAR الحقيقي المتاح على مدار الساعة.')} />
      <section className="section">
        <div className="container detail__grid">
          <ul className="contact-cards">
            <li><a href={WA}><MessageCircle size={24} aria-hidden="true" /><strong>WhatsApp</strong><span dir="ltr">{PHONE}</span><small>{text(lang, 'Fastest reply', 'Réponse la plus rapide', 'أسرع رد')}</small></a></li>
            <li><a href={PHONE_HREF}><Headphones size={24} aria-hidden="true" /><strong>{text(lang, 'Call the team', 'Appeler l’équipe', 'اتصل بالفريق')}</strong><span dir="ltr">{PHONE}</span><small>{text(lang, 'Available 24/7', 'Disponible 24h/24', 'متاح على مدار الساعة')}</small></a></li>
            <li><a href={`mailto:${EMAIL}`}><BriefcaseBusiness size={24} aria-hidden="true" /><strong>Email</strong><span>{EMAIL}</span><small>{text(lang, 'Corporate accounts & invoicing', 'Comptes entreprises et facturation', 'حسابات الشركات والفوترة')}</small></a></li>
            <li><div><MapPin size={24} aria-hidden="true" /><strong>{text(lang, 'Head office', 'Bureau principal', 'المقر الرئيسي')}</strong><span>{ADDRESS.join(', ')}</span><small>{HUBS}</small></div></li>
          </ul>
          <div className="panel">
            <h2 className="panel__title">{text(lang, 'Send a message', 'Envoyer un message', 'أرسل رسالة')}</h2>
            <form className="form-stack" onSubmit={onSubmit}>
              <label className="field"><span>{copy.yourName}</span><input required name="name" autoComplete="name" /></label>
              <label className="field"><span>{text(lang, 'Phone / WhatsApp / Email', 'Téléphone / WhatsApp / Email', 'الهاتف / واتساب / البريد الإلكتروني')}</span><input required name="contact" /></label>
              <label className="field"><span>{text(lang, 'Message', 'Message', 'الرسالة')}</span><textarea required name="message" rows="6" /></label>
              <button className="btn btn--wa" type="submit">{text(lang, 'Send via WhatsApp', 'Envoyer sur WhatsApp', 'إرسال عبر واتساب')}<MessageCircle size={17} aria-hidden="true" /></button>
            </form>
          </div>
        </div>
      </section>
      <CtaBand lang={lang} />
    </main>
  );
}

export function FaqPage({ lang }) {
  return (
    <main>
      <PageHero image="interior.jpg" eyebrow="VIPCAR FAQ" title={text(lang, 'Useful answers before you travel.', 'Les réponses utiles avant votre voyage.', 'إجابات مفيدة قبل السفر.')} intro={text(lang, 'Rental requirements, airport collection, deposits, delivery and booking explained clearly.', 'Conditions de location, aéroports, caution, livraison et réservation expliqués clairement.', 'نوضح متطلبات التأجير والاستقبال من المطار والتأمين والتوصيل والحجز.')} />
      <Faq lang={lang} />
      <section className="section section--mist">
        <div className="container detail__grid">
          <div>
            <p className="eyebrow">{text(lang, 'Still deciding?', 'Vous hésitez encore ?', 'هل ما زلت متردداً؟')}</p>
            <h2>{text(lang, 'Tell us what you need and we will confirm the practical details.', 'Dites-nous ce qu’il vous faut et nous confirmerons les détails pratiques.', 'أخبرنا بما تحتاجه وسنؤكد لك التفاصيل العملية.')}</h2>
          </div>
          <div className="panel"><QuoteFlow lang={lang} analyticsLocation="faq" /></div>
        </div>
      </section>
    </main>
  );
}

