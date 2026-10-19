import React, { useEffect, useMemo } from 'react';
import { ArrowRight, BriefcaseBusiness, CalendarDays, Gauge, MapPin, Users } from 'lucide-react';
import {
  FLEET_CATEGORIES, catalogErrorMessage, fetchVehicleBySlug, fetchVehicles, formatCurrency, loadVehiclePage,
} from '../../../../libs/web-client/src/index.js';
import { categoryLabel, locationLabel, t, text, tierLabel, transmissionLabel } from '../i18n.js';
import { href, Link, navigate, useQuery } from '../router.jsx';
import { PHONE, img } from '../site.js';
import { tripFromQuery, tripSearch, useCurrency } from '../state.jsx';
import { QuoteFlow } from '../components/QuoteFlow.jsx';
import { CtaBand, EmptyState, ErrorState, Faq, LoadingState, PageHero, SectionHead, VehicleCard } from '../components/Blocks.jsx';
import { useRequest } from '../useRequest.js';
import { vehicleTitle } from '../seo.js';
import { NotFound } from './Content.jsx';
import { SearchBand } from './Home.jsx';

function groupByCategory(vehicles) {
  const order = FLEET_CATEGORIES.filter((category) => category !== 'All');
  const extra = [...new Set(vehicles.map((car) => car.cat))].filter((category) => !order.includes(category));
  return [...order, ...extra]
    .map((category) => ({ category, cars: vehicles.filter((car) => car.cat === category) }))
    .filter((group) => group.cars.length);
}

export function FleetPage({ lang }) {
  const copy = t(lang);
  const query = useQuery();
  const category = FLEET_CATEGORIES.includes(query.get('category')) ? query.get('category') : 'All';
  const trip = tripFromQuery(query.toString());
  const hasTrip = Boolean(trip.date);
  const bookingQuery = tripSearch(query.toString());
  const fleet = useRequest((signal) => fetchVehicles({ signal }), []);
  const vehicles = fleet.data?.vehicles ?? [];
  const list = category === 'All' ? vehicles : vehicles.filter((car) => car.cat === category);
  const groups = useMemo(() => (category === 'All' ? groupByCategory(vehicles) : [{ category, cars: list }]), [category, vehicles, list]);

  const chooseCategory = (next) => {
    const params = new URLSearchParams(window.location.search);
    if (next === 'All') params.delete('category');
    else params.set('category', next);
    const search = params.toString();
    navigate(`${window.location.pathname}${search ? `?${search}` : ''}`, { replace: true, scroll: false });
  };

  return (
    <main>
      <SearchBand lang={lang} search={query.toString()} />
      <PageHero image="luxury-rear.jpg" eyebrow={text(lang, 'VIPCAR fleet', 'Flotte VIPCAR', 'أسطول VIPCAR')} title={text(lang, 'Find your car for Tunisia.', 'Trouvez votre voiture en Tunisie.', 'اعثر على سيارتك في تونس.')} intro={copy.fleetSub} />
      <div className="category-bar">
        <div className="container category-bar__inner" role="group" aria-label={text(lang, 'Filter vehicles by category', 'Filtrer les véhicules par catégorie', 'تصفية السيارات حسب الفئة')}>
          {FLEET_CATEGORIES.map((item) => (
            <button type="button" key={item} className={category === item ? 'is-active' : ''} aria-pressed={category === item} onClick={() => chooseCategory(item)}>{categoryLabel(item, lang)}</button>
          ))}
        </div>
      </div>
      <section className="section fleet-list">
        <div className="container">
          {hasTrip && (
            <p className="trip-note" role="status">
              <CalendarDays size={16} aria-hidden="true" />
              <span>{locationLabel(trip.pickup ?? '', lang)} · {trip.date}{trip.endDate ? ` → ${trip.endDate}` : ''}</span>
              <small>{text(lang, 'Availability is confirmed by the VIPCAR team after your request; prices are indicative.', 'La disponibilité est confirmée par l’équipe VIPCAR après votre demande ; les prix sont indicatifs.', 'يؤكد فريق VIPCAR التوفر بعد طلبك؛ الأسعار إرشادية.')}</small>
            </p>
          )}
          {fleet.status === 'loading' && <LoadingState label={text(lang, 'Loading fleet…', 'Chargement de la flotte…', 'جارٍ تحميل الأسطول…')} />}
          {fleet.status === 'error' && <ErrorState lang={lang} message={catalogErrorMessage(fleet.error, lang)} onRetry={fleet.retry} />}
          {fleet.status === 'success' && (
            <>
              <p className="result-count" aria-live="polite">{list.length} {text(lang, 'vehicles shown', 'véhicules affichés', 'سيارة معروضة')}</p>
              {list.length === 0 && (
                <EmptyState>
                  <p>{text(lang, 'No vehicles in this category right now.', 'Aucun véhicule dans cette catégorie pour le moment.', 'لا توجد سيارات في هذه الفئة حالياً.')}</p>
                  <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => chooseCategory('All')}>{categoryLabel('All', lang)}</button>
                </EmptyState>
              )}
              {groups.map((group) => (
                <section key={group.category} className="fleet-group" aria-labelledby={`cat-${group.category}`}>
                  <h2 id={`cat-${group.category}`} className="fleet-group__title">{categoryLabel(group.category, lang)}<span>{group.cars.length}</span></h2>
                  <div className="car-grid">
                    {group.cars.map((car, index) => <VehicleCard key={car.slug} car={car} lang={lang} bookingQuery={bookingQuery} loading={index < 4 ? 'eager' : 'lazy'} />)}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      </section>
      <Faq lang={lang} />
      <CtaBand lang={lang} />
    </main>
  );
}

export function VehiclePage({ lang, slug }) {
  const copy = t(lang);
  const { currency } = useCurrency();
  const query = useQuery();
  const page = useRequest((signal) => loadVehiclePage(slug, { signal }), [slug]);
  const vehicleName = page.data?.vehicle?.name;
  useEffect(() => { if (vehicleName) document.title = vehicleTitle(lang, vehicleName); }, [lang, vehicleName]);
  if (page.status === 'loading') return <main className="section"><div className="container"><LoadingState label={text(lang, 'Loading vehicle…', 'Chargement du véhicule…', 'جارٍ تحميل السيارة…')} /></div></main>;
  if (page.status === 'error') return <main className="section"><div className="container"><ErrorState lang={lang} message={catalogErrorMessage(page.error, lang)} onRetry={page.retry} /></div></main>;
  if (page.data.notFound || !page.data.vehicle) return <NotFound lang={lang} />;
  const car = page.data.vehicle;
  const tripParams = tripSearch(query.toString());
  const tripQuery = tripParams ? `&${tripParams}` : '';
  return (
    <main className="vehicle">
      <section className="vehicle-hero">
        <div className="container vehicle-hero__grid">
          <div className="vehicle-hero__copy">
            <p className="eyebrow eyebrow--light">{tierLabel(car.tier, lang)} · {categoryLabel(car.cat, lang)}</p>
            <h1>{car.name}</h1>
            <p>{text(lang, 'A refined, well-maintained choice for your journey across Tunisia. Availability and the final TND quote are confirmed for your dates.', 'Un véhicule soigné et entretenu pour votre voyage en Tunisie. La disponibilité et le devis final en TND sont confirmés selon vos dates.', 'سيارة أنيقة ومعتنى بها لرحلتك في تونس. نؤكد التوفر وعرض السعر النهائي بالدينار التونسي حسب تواريخك.')}</p>
            <p className="price price--hero"><small>{copy.from}</small><strong>{formatCurrency(car.price, currency, lang)}</strong><small>{copy.day}</small></p>
            <Link className="btn btn--accent" to={href(lang, `/booking?vehicle=${encodeURIComponent(car.slug)}${tripQuery}`)}>{copy.book}<ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <div className="vehicle-hero__media"><img src={img(car.image)} alt={car.name} fetchPriority="high" /></div>
        </div>
      </section>
      <section className="spec-band" aria-label={text(lang, 'Vehicle overview', 'Présentation du véhicule', 'نظرة عامة على السيارة')}>
        <div className="container spec-band__grid">
          <div><Users size={22} aria-hidden="true" /><span>{copy.seats}</span><strong>{car.seats}</strong></div>
          <div><Gauge size={22} aria-hidden="true" /><span>{text(lang, 'Transmission', 'Transmission', 'ناقل الحركة')}</span><strong>{transmissionLabel(car.transmission, lang)}</strong></div>
          <div><BriefcaseBusiness size={22} aria-hidden="true" /><span>{text(lang, 'Luggage', 'Bagages', 'الأمتعة')}</span><strong>{car.bags}</strong></div>
          <div><MapPin size={22} aria-hidden="true" /><span>{text(lang, 'Delivery', 'Livraison', 'التوصيل')}</span><strong>{lang === 'ar' ? 'عند الطلب' : lang === 'en' ? 'On request' : 'Sur demande'}</strong></div>
        </div>
      </section>
      <section className="section vehicle-overview">
        <div className="container vehicle-overview__grid">
          <div>
            <p className="eyebrow">{text(lang, 'Vehicle overview', 'Présentation du véhicule', 'نظرة عامة على السيارة')}</p>
            <h2>{text(lang, 'Comfort, space and a clear booking process.', 'Confort, espace et réservation claire.', 'راحة ومساحة وحجز واضح.')}</h2>
            <p>{text(lang, 'Choose your dates and pick-up point, then VIPCAR confirms the exact vehicle availability, rental conditions, deposit and final rate before you commit. Airport and hotel delivery can be arranged.', 'Choisissez vos dates et votre lieu de départ. VIPCAR confirme ensuite la disponibilité, les conditions, la caution et le tarif final avant votre engagement. Livraison possible à l’aéroport ou à l’hôtel.', 'اختر تواريخك ونقطة الاستلام، ثم يؤكد فريق VIPCAR توفر السيارة وشروط التأجير والتأمين والسعر النهائي قبل التزامك. يمكن ترتيب التوصيل إلى المطار أو الفندق.')}</p>
          </div>
          <aside className="panel" aria-label={text(lang, 'Request this vehicle', 'Demander ce véhicule', 'اطلب هذه السيارة')}>
            <h3 className="panel__title">{text(lang, 'Request this vehicle', 'Demander ce véhicule', 'اطلب هذه السيارة')}</h3>
            <QuoteFlow lang={lang} selectedVehicle={car} initialSearch={query.toString()} analyticsLocation="vehicle_page" />
          </aside>
        </div>
      </section>
      {page.data.related.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHead eyebrow={text(lang, 'You may also like', 'Vous aimerez aussi', 'قد يعجبك أيضاً')} title={text(lang, 'Related vehicles', 'Véhicules similaires', 'سيارات مشابهة')} />
            <div className="car-grid car-grid--three">{page.data.related.map((item) => <VehicleCard key={item.slug} car={item} lang={lang} />)}</div>
          </div>
        </section>
      )}
      <Faq lang={lang} />
    </main>
  );
}

export function BookingPage({ lang }) {
  const copy = t(lang);
  const query = useQuery();
  const search = query.toString();
  const vehicleSlug = query.get('vehicle');
  const vehicle = useRequest((signal) => (vehicleSlug ? fetchVehicleBySlug(vehicleSlug, { signal }).catch(() => null) : Promise.resolve(null)), [vehicleSlug]);
  const startAtContact = Boolean(tripFromQuery(search).date);
  return (
    <main className="booking">
      <div className="container booking__grid">
        <section className="booking__intro">
          <p className="eyebrow eyebrow--light">{text(lang, 'VIPCAR quote request', 'Demande de devis VIPCAR', 'طلب عرض سعر من VIPCAR')}</p>
          <h1>{text(lang, 'Your journey, arranged in a few steps.', 'Votre trajet, organisé en quelques étapes.', 'رحلتك منظمة في خطوات بسيطة.')}</h1>
          <p>{copy.quoteSub}</p>
          {vehicle.data && <p className="booking__selection">{copy.selectedVehicle}: <strong>{vehicle.data.name}</strong></p>}
          <ul className="booking__contact" aria-label={text(lang, 'Contact VIPCAR', 'Contacter VIPCAR', 'التواصل مع VIPCAR')}>
            <li><small>{text(lang, 'Available every day', 'Disponible chaque jour', 'متاح كل يوم')}</small><strong>24/7</strong></li>
            <li><small>{text(lang, 'WhatsApp and phone', 'WhatsApp et téléphone', 'واتساب والهاتف')}</small><strong dir="ltr">{PHONE}</strong></li>
          </ul>
          {!vehicleSlug && <Link className="text-link text-link--light" to={href(lang, '/fleet')}>{copy.explore}<ArrowRight size={16} aria-hidden="true" /></Link>}
        </section>
        <section className="booking__panel panel">
          {vehicle.status === 'loading' && vehicleSlug
            ? <LoadingState label={text(lang, 'Loading vehicle…', 'Chargement du véhicule…', 'جارٍ تحميل السيارة…')} />
            : <QuoteFlow key={vehicle.data?.slug ?? 'none'} lang={lang} selectedVehicle={vehicle.data} initialSearch={search} startAtContact={startAtContact} analyticsLocation="quote" />}
        </section>
      </div>
    </main>
  );
}
