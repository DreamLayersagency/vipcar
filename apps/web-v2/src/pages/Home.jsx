import React from 'react';
import { ArrowRight, Headphones, MapPin, ShieldCheck } from 'lucide-react';
import { catalogErrorMessage, fetchVehicles } from '../../../../libs/web-client/src/index.js';
import { services } from '../content/app1-content.js';
import { languageIndex, t, text } from '../i18n.js';
import { href, Link } from '../router.jsx';
import { HUBS, img } from '../site.js';
import { QuoteFlow, serviceIcon } from '../components/QuoteFlow.jsx';
import { ContactBand, ErrorState, Faq, GuideCard, LoadingState, Reveal, SectionHead, VehicleCard } from '../components/Blocks.jsx';
import { useRequest } from '../useRequest.js';

export function SearchBand({ lang, search = '' }) {
  return (
    <section className="search-band" aria-label={t(lang).startTrip}>
      <div className="container">
        <QuoteFlow lang={lang} mode="band" initialSearch={search} analyticsLocation="search_band" />
      </div>
    </section>
  );
}

export function FeaturedFleet({ lang, count = 4, title, intro, eyebrow }) {
  const copy = t(lang);
  const fleet = useRequest((signal) => fetchVehicles({ signal }), []);
  return (
    <section className="section fleet-preview">
      <div className="container">
        <SectionHead
          eyebrow={eyebrow}
          title={title ?? copy.fleetTitle}
          intro={intro ?? copy.fleetSub}
          action={<Link className="text-link" to={href(lang, '/fleet')}>{copy.allFleet}<ArrowRight size={16} aria-hidden="true" /></Link>}
        />
        {fleet.status === 'loading' && <LoadingState label={text(lang, 'Loading fleet…', 'Chargement de la flotte…', 'جارٍ تحميل الأسطول…')} />}
        {fleet.status === 'error' && <ErrorState lang={lang} message={catalogErrorMessage(fleet.error, lang)} onRetry={fleet.retry} />}
        {fleet.status === 'success' && (
          <div className="car-grid">
            {fleet.data.vehicles.slice(0, count).map((car) => <VehicleCard key={car.slug} car={car} lang={lang} loading="eager" />)}
          </div>
        )}
      </div>
    </section>
  );
}

export function Home({ lang }) {
  const copy = t(lang);
  const fi = languageIndex(lang);
  const reasons = [
    ['100+', copy.vehiclesFleet],
    ['24/7', copy.assistanceEveryDay],
    ['3', copy.hubsTunisia],
    [text(lang, 'Airports', 'Aéroports', 'المطارات'), copy.airportPickup],
  ];
  return (
    <>
      <SearchBand lang={lang} />
      <section className="hero">
        <img src={img('hero-mercedes.jpg')} alt={text(lang, 'Mercedes vehicle in Tunisia', 'Véhicule Mercedes en Tunisie', 'سيارة مرسيدس في تونس')} fetchPriority="high" />
        <div className="hero__shade" aria-hidden="true" />
        <div className="hero__content container">
          <p className="eyebrow eyebrow--light">{copy.eyebrow}</p>
          <h1>{copy.hero}</h1>
          <p>{copy.heroSub}</p>
          <div className="hero__actions">
            <Link className="btn btn--accent" to={href(lang, '/booking')}>{copy.book}<ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className="btn btn--outline-light" to={href(lang, '/fleet')}>{copy.explore}</Link>
          </div>
        </div>
      </section>

      <section className="tiles" aria-label={copy.servicesLabel}>
        <div className="container tiles__grid">
          {services.map((service, index) => {
            const Icon = serviceIcon(service);
            return (
              <Reveal key={service.key} className={`tile${index === 1 ? ' tile--accent' : ''}`} style={{ '--delay': `${index * 80}ms` }}>
                <Icon size={34} strokeWidth={1.5} aria-hidden="true" />
                <h2>{service.title[fi]}</h2>
                <p>{service.text[fi]}</p>
                <Link className="tile__link" to={href(lang, `/services/${service.key}`)}>{copy.discover}<ArrowRight size={15} aria-hidden="true" /></Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="section intro">
        <div className="container">
          <SectionHead center eyebrow={copy.serviceEyebrow} title={copy.serviceTitle} intro={copy.serviceSub} />
        </div>
      </section>

      <FeaturedFleet lang={lang} />

      <section className="split">
        <div className="split__media"><img src={img('road-travel.jpg')} alt={text(lang, 'Road travel in Tunisia', 'Route en Tunisie', 'رحلة على الطرق التونسية')} loading="lazy" /></div>
        <Reveal className="split__copy">
          <p className="eyebrow">{copy.homeStandard}</p>
          <h2>{copy.why}</h2>
          <p>{copy.whySub}</p>
          <ul className="values">
            <li><Headphones size={22} aria-hidden="true" /><strong>24/7</strong><span>{copy.directAssistance}</span></li>
            <li><ShieldCheck size={22} aria-hidden="true" /><strong>{copy.clearQuotes}</strong><span>{copy.confirmedBeforeTravel}</span></li>
            <li><MapPin size={22} aria-hidden="true" /><strong>{copy.localTeam}</strong><span>{HUBS}</span></li>
          </ul>
          <Link className="text-link" to={href(lang, '/about')}>{copy.meetVipcar}<ArrowRight size={16} aria-hidden="true" /></Link>
        </Reveal>
      </section>

      <section className="reasons">
        <div className="reasons__panel">
          <div className="reasons__copy">
            <p className="eyebrow eyebrow--light">{copy.designedAroundTrip}</p>
            <h2>{copy.mobilityTitle}</h2>
            <ol>
              {reasons.map(([value, label], index) => (
                <li key={label}><span>{index + 1}</span><strong>{value}</strong>{label}</li>
              ))}
            </ol>
          </div>
          <div className="reasons__media"><img src={img('airport.jpg')} alt="" loading="lazy" /></div>
        </div>
      </section>

      <section className="section journal">
        <div className="container">
          <SectionHead eyebrow={copy.travelJournal} title={copy.guide} />
          <div className="guide-grid">
            <GuideCard image="road-travel.jpg" tag={text(lang, 'Car rental guide', 'Guide location', 'دليل تأجير السيارات')} title={text(lang, 'Renting a car in Tunisia: what to know', 'Louer une voiture en Tunisie : l’essentiel', 'تأجير سيارة في تونس: ما يجب معرفته')} slug="car-rental-tunisia-guide" lang={lang} />
            <GuideCard image="airport.jpg" tag={text(lang, 'Airport guide', 'Guide aéroport', 'دليل المطار')} title={text(lang, 'Arriving at Tunis-Carthage Airport', 'Arriver à l’aéroport Tunis-Carthage', 'الوصول إلى مطار تونس قرطاج')} slug="tunis-carthage-airport-guide" lang={lang} />
            <GuideCard image="hero-mercedes.jpg" tag={text(lang, 'Travel planning', 'Préparer son voyage', 'التخطيط للسفر')} title={text(lang, 'Choosing the right car for your itinerary', 'Choisir la voiture adaptée à votre circuit', 'اختيار السيارة المناسبة لمسارك')} slug="choosing-a-car-in-tunisia" lang={lang} />
          </div>
        </div>
      </section>

      <Faq lang={lang} />
      <ContactBand lang={lang} />
    </>
  );
}
