import React from 'react';
import { ArrowRight, Car, Check, Clock3, MapPin, Plane } from 'lucide-react';
import { articleArabic, articles, chauffeurHubs, commercialLocations, legalArabic, legalPages } from '../content/app1-content.js';
import { languageIndex, locationLabel, t, text } from '../i18n.js';
import { href, Link } from '../router.jsx';
import { EMAIL, HUBS, PHONE, WA } from '../site.js';
import { QuoteFlow } from '../components/QuoteFlow.jsx';
import { CtaBand, Faq, GuideCard, PageHero, PointsGrid, Reveal, SectionHead } from '../components/Blocks.jsx';
import { FeaturedFleet } from './Home.jsx';

export function articleLocale(slug, article, lang) {
  return lang === 'ar' ? articleArabic[slug] ?? article.en : article[lang] ?? article.en;
}

export function legalLocale(slug, lang) {
  const data = legalPages[slug];
  if (!data) return null;
  return lang === 'ar' ? legalArabic[slug] : data[lang];
}

export function NotFound({ lang }) {
  return (
    <main className="not-found">
      <div className="container">
        <span className="not-found__code">404</span>
        <h1>{text(lang, 'This road ends here.', 'Cette route s’arrête ici.', 'انتهى الطريق هنا.')}</h1>
        <p>{text(lang, 'The page may have moved. Return to VIPCAR or explore the fleet.', 'Cette page a peut-être changé. Revenez à VIPCAR ou consultez la flotte.', 'ربما تغيرت الصفحة. عد إلى VIPCAR أو استكشف الأسطول.')}</p>
        <div className="not-found__actions">
          <Link className="btn btn--accent" to={href(lang)}>{text(lang, 'Return home', 'Retour à l’accueil', 'العودة إلى الصفحة الرئيسية')}<ArrowRight size={17} aria-hidden="true" /></Link>
          <Link className="btn btn--ghost-dark" to={href(lang, '/fleet')}>{t(lang).explore}</Link>
        </div>
      </div>
    </main>
  );
}

const CONTENT = {
  about: { image: 'road-travel.jpg', ey: ['About VIPCAR', 'À propos de VIPCAR', 'عن VIPCAR'], en: ['International standards. Local Tunisian expertise.', 'VIPCAR coordinates car rental, professional chauffeur services and airport transfers from its hubs in Tunis, Gabès and Djerba. The service is built around direct contact, clear quotes and support at every hour.'], fr: ['Des standards internationaux. Une expertise tunisienne.', 'VIPCAR organise location, chauffeur professionnel et transferts aéroport depuis Tunis, Gabès et Djerba. Le service repose sur un contact direct, des devis clairs et une disponibilité permanente.'], ar: ['معايير دولية. وخبرة تونسية محلية.', 'تنسق VIPCAR تأجير السيارات وخدمات السائق الخاص والنقل من المطار انطلاقاً من مراكزها في تونس وقابس وجربة. تقوم الخدمة على التواصل المباشر والعروض الواضحة والدعم المتواصل.'] },
  destinations: { image: 'suv-white.jpg', ey: ['Tunisia destinations', 'Destinations tunisiennes', 'وجهات تونسية'], en: ['Move through Tunisia with one local team.', 'Arrange pick-up or delivery in Tunis, Gabès and Djerba, at the major airports, and in the other destinations listed in our booking service. Coverage outside the main hubs is confirmed for each request.'], fr: ['Parcourez la Tunisie avec une seule équipe locale.', 'Organisez votre prise en charge à Tunis, Gabès et Djerba, dans les principaux aéroports et les autres destinations proposées à la réservation. La couverture hors agences est confirmée sur demande.'], ar: ['تنقّل في تونس مع فريق محلي واحد.', 'رتّب الاستلام أو التوصيل في تونس وقابس وجربة وفي المطارات الرئيسية والوجهات الأخرى المتاحة في خدمة الحجز. نؤكد التغطية خارج المراكز الرئيسية لكل طلب.'] },
  blog: { image: 'luxury-rear.jpg', ey: ['Travel journal', 'Journal de voyage', 'مجلة السفر'], en: ['Useful guidance for travelling through Tunisia.', 'Practical airport, driving and rental information, written to help you make informed decisions before you arrive.'], fr: ['Les informations utiles pour voyager en Tunisie.', 'Conseils pratiques sur les aéroports, la conduite et la location pour préparer votre arrivée.'], ar: ['دليل مفيد للسفر في تونس.', 'معلومات عملية عن المطارات والقيادة وتأجير السيارات تساعدك على اتخاذ قرارات واضحة قبل الوصول.'] },
};

export function ContentPage({ lang, type }) {
  const data = CONTENT[type];
  const [title, body] = data[lang];
  return (
    <main>
      <PageHero image={data.image} eyebrow={data.ey[languageIndex(lang)]} title={title} intro={body} />
      {type === 'destinations' && <DestinationHub lang={lang} />}
      {type === 'blog' && (
        <section className="section journal">
          <div className="container guide-grid">
            <GuideCard image="suv-white.jpg" tag={text(lang, 'Car rental', 'Location de voiture', 'تأجير السيارات')} title={text(lang, 'Renting a car in Tunisia: the practical guide', 'Location de voiture en Tunisie : le guide pratique', 'تأجير سيارة في تونس: الدليل العملي')} slug="car-rental-tunisia-guide" lang={lang} />
            <GuideCard image="airport.jpg" tag={text(lang, 'Airport transfer', 'Transfert aéroport', 'النقل من المطار')} title={text(lang, 'How airport transfers work in Tunisia', 'Comment fonctionne un transfert aéroport', 'كيف تعمل خدمة النقل من المطار في تونس')} slug="tunis-carthage-airport-guide" lang={lang} />
            <GuideCard image="interior.jpg" tag={text(lang, 'Chauffeur', 'Chauffeur', 'سائق خاص')} title={text(lang, 'When to book a private chauffeur', 'Quand réserver un chauffeur privé', 'متى تحجز سائقاً خاصاً')} slug="choosing-a-car-in-tunisia" lang={lang} />
          </div>
        </section>
      )}
      {type === 'about' && (
        <section className="section about">
          <div className="container about__grid">
            <Reveal>
              <p className="eyebrow">{text(lang, 'VIPCAR Tunisia', 'VIPCAR Tunisie', 'VIPCAR تونس')}</p>
              <h2>{text(lang, 'Built around the realities of travel.', 'Pensé pour les réalités du voyage.', 'مصمم حول واقع السفر.')}</h2>
              <p>{body}</p>
            </Reveal>
            <ul className="stat-grid">
              <li><Clock3 size={24} aria-hidden="true" /><strong>24/7</strong><span>{text(lang, 'Always available', 'Disponibilité permanente', 'متاحون دائماً')}</span><small>{text(lang, 'Direct support every day', 'Une équipe disponible chaque jour', 'دعم مباشر كل يوم')}</small></li>
              <li><Car size={24} aria-hidden="true" /><strong>100+</strong><span>{text(lang, 'Vehicles in the fleet', 'Véhicules dans la flotte', 'سيارة في الأسطول')}</span><small>{text(lang, 'From city cars to premium models', 'Des citadines aux modèles premium', 'من سيارات المدينة إلى الطرازات المميزة')}</small></li>
              <li><MapPin size={24} aria-hidden="true" /><strong>{text(lang, '3 hubs', '3 hubs', '3 مراكز')}</strong><span>{HUBS}</span><small>{text(lang, 'Coverage across Tunisia', 'Une couverture partout en Tunisie', 'تغطية في مختلف أنحاء تونس')}</small></li>
            </ul>
          </div>
        </section>
      )}
      <CtaBand lang={lang} />
    </main>
  );
}

function DestinationHub({ lang }) {
  return (
    <section className="section destinations">
      <div className="container">
        <SectionHead eyebrow={text(lang, 'Local service areas', 'Zones desservies', 'مناطق الخدمة')} title={text(lang, 'Start with the place that matters to your trip.', 'Commencez par le lieu qui compte pour votre trajet.', 'ابدأ من المكان الأهم في رحلتك.')} intro={text(lang, 'Explore the locations where VIPCAR can arrange rental, delivery or a private transfer. Availability outside these hubs is confirmed for each request.', 'Découvrez les zones où VIPCAR organise location, livraison ou transfert privé. La disponibilité hors de ces hubs est confirmée pour chaque demande.', 'اكتشف المناطق التي تنظم فيها VIPCAR التأجير والتوصيل والنقل الخاص. نؤكد التوفر خارج هذه المراكز لكل طلب.')} />
        <div className="destination-grid">
          {commercialLocations.map((item, index) => (
            <Reveal as="article" key={item.slug} className="destination">
              <span className="destination__num">{String(index + 1).padStart(2, '0')}</span>
              <h3><MapPin size={18} aria-hidden="true" />{item.name[languageIndex(lang)]}</h3>
              <p>{text(lang, `Car rental in ${item.name[0]}, with delivery or collection coordinated around your itinerary.`, `Location de voiture à ${item.name[1]}, avec livraison ou prise en charge selon votre trajet.`, `تأجير سيارة في ${item.name[2]} مع توصيل أو استلام منسق حسب مسارك.`)}</p>
              <div className="destination__links">
                <Link className="text-link" to={href(lang, `/car-rental/${item.slug}`)}>{text(lang, 'Car rental', 'Location', 'تأجير السيارات')}<ArrowRight size={15} aria-hidden="true" /></Link>
                {item.slug !== 'gabes' && <Link className="text-link" to={href(lang, `/airport-transfers/${item.slug}`)}>{text(lang, 'Airport transfer', 'Transfert aéroport', 'النقل من المطار')}<ArrowRight size={15} aria-hidden="true" /></Link>}
                {chauffeurHubs.includes(item.slug) && <Link className="text-link" to={href(lang, `/chauffeur/${item.slug}`)}>{text(lang, 'Private chauffeur', 'Chauffeur privé', 'سائق خاص')}<ArrowRight size={15} aria-hidden="true" /></Link>}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ArticlePage({ lang, slug }) {
  const article = articles[slug];
  if (!article) return <NotFound lang={lang} />;
  const [title, summary, sections] = articleLocale(slug, article, lang);
  const related = Object.entries(articles).filter(([key]) => key !== slug).slice(0, 3);
  return (
    <main>
      <PageHero image={article.image} eyebrow={text(lang, 'VIPCAR travel journal', 'Journal de voyage VIPCAR', 'مجلة سفر VIPCAR')} title={title} intro={summary} />
      <article className="section prose">
        <div className="container container--narrow">
          <p className="eyebrow">{text(lang, 'Travel guidance', 'Conseils de voyage', 'إرشادات السفر')}</p>
          <h2>{title}</h2>
          <p className="prose__lead">{summary}</p>
          {sections.map(([heading, body]) => <section key={heading}><h3>{heading}</h3><p>{body}</p></section>)}
          <p>{text(lang, 'Share your dates, pick-up point and preferences with the VIPCAR team. We confirm the practical details, availability and final quote directly before you travel.', 'Partagez vos dates, votre lieu de prise en charge et vos préférences avec l’équipe VIPCAR. Nous confirmons directement les détails pratiques, la disponibilité et le devis final avant votre départ.', 'شارك تواريخك ونقطة الاستلام وتفضيلاتك مع فريق VIPCAR. نؤكد التفاصيل العملية والتوفر وعرض السعر النهائي مباشرة قبل السفر.')}</p>
          <Link className="btn btn--accent" to={href(lang, '/booking')}>{t(lang).book}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </article>
      <section className="section journal">
        <div className="container">
          <SectionHead eyebrow={text(lang, 'Keep planning', 'Préparez la suite', 'واصل التخطيط')} title={text(lang, 'More useful guides for your trip.', 'D’autres guides utiles pour votre séjour.', 'أدلة أخرى مفيدة لرحلتك.')} />
          <div className="guide-grid">
            {related.map(([key, item]) => <GuideCard key={key} image={item.image} tag={text(lang, 'Travel guide', 'Guide pratique', 'دليل عملي')} title={articleLocale(key, item, lang)[0]} slug={key} lang={lang} />)}
          </div>
        </div>
      </section>
      <CtaBand lang={lang} />
    </main>
  );
}

export function LegalPage({ lang, slug }) {
  const data = legalLocale(slug, lang);
  if (!data) return <NotFound lang={lang} />;
  const [title, body] = data;
  return (
    <main>
      <PageHero image="interior.jpg" eyebrow={text(lang, 'VIPCAR legal', 'VIPCAR juridique', 'الجوانب القانونية لـ VIPCAR')} title={title} intro={body} />
      <section className="section prose">
        <div className="container container--narrow">
          <p className="eyebrow">{text(lang, 'Last updated', 'Dernière mise à jour', 'آخر تحديث')} · 18 August 2026</p>
          <h2>{title}</h2>
          <p>{body}</p>
          <h3>{text(lang, 'Direct confirmation', 'Confirmation directe', 'التأكيد المباشر')}</h3>
          <p>{text(lang, 'Your exact quote, availability, deposit and service conditions are confirmed directly with the VIPCAR team before you commit.', 'Votre devis exact, la disponibilité, la caution et les conditions du service sont confirmés directement avec l’équipe VIPCAR avant votre engagement.', 'يؤكد فريق VIPCAR مباشرة عرض السعر النهائي والتوفر والتأمين وشروط الخدمة قبل التزامك.')}</p>
          <h3>{text(lang, 'Contact', 'Contact', 'التواصل')}</h3>
          <p><a href={WA}>{PHONE}</a> · <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
        </div>
      </section>
    </main>
  );
}

function localPoints(lang, airport) {
  if (airport) {
    return lang === 'en'
      ? [['Before you land', 'Share your flight number, arrival time and destination so the team can prepare the right pickup.'], ['A clear handover', 'Your driver confirms where to meet, who to call and what happens if the flight changes.'], ['Beyond the airport', 'Continue to your hotel, business meeting or next destination with a route agreed in advance.']]
      : lang === 'fr'
        ? [['Avant votre arrivée', 'Partagez votre numéro de vol, votre heure d’arrivée et votre destination pour préparer la prise en charge.'], ['Une remise claire', 'Votre chauffeur confirme le lieu de rendez-vous, le contact et la marche à suivre en cas de changement de vol.'], ['Au-delà de l’aéroport', 'Rejoignez votre hôtel, un rendez-vous professionnel ou une autre destination selon un trajet confirmé.']]
        : [['قبل الوصول', 'شارك رقم رحلتك ووقت الوصول والوجهة حتى يجهز الفريق الاستقبال المناسب.'], ['تسليم واضح', 'يؤكد السائق مكان اللقاء ووسيلة التواصل وما يجب فعله عند تغير الرحلة.'], ['ما بعد المطار', 'واصل إلى الفندق أو اجتماع العمل أو وجهتك التالية وفق مسار متفق عليه مسبقاً.']];
  }
  return lang === 'en'
    ? [['Choose by trip', 'Select a compact car, sedan, SUV or premium vehicle according to your passengers, luggage and roads.'], ['Delivery or collection', 'The team confirms the practical handover details for your hotel, airport or chosen point.'], ['One local contact', 'Ask about availability, rental conditions and the final quote before you travel.']]
    : lang === 'fr'
      ? [['Choisissez selon le trajet', 'Sélectionnez une citadine, une berline, un SUV ou un véhicule premium selon vos passagers, bagages et routes.'], ['Livraison ou prise en charge', 'L’équipe confirme les détails pratiques pour votre hôtel, l’aéroport ou le point de votre choix.'], ['Un contact local', 'Demandez la disponibilité, les conditions de location et le devis final avant votre départ.']]
      : [['اختر حسب الرحلة', 'اختر سيارة مدمجة أو سيدان أو دفع رباعي أو سيارة مميزة حسب الركاب والأمتعة والطرق.'], ['التوصيل أو الاستلام', 'يؤكد الفريق تفاصيل التسليم العملية للفندق أو المطار أو النقطة التي تختارها.'], ['جهة اتصال محلية واحدة', 'اسأل عن التوفر وشروط التأجير وعرض السعر النهائي قبل السفر.']];
}

function LocationLinks({ lang, currentSlug, airport }) {
  return (
    <section className="section location-links">
      <div className="container">
        <SectionHead eyebrow={airport ? text(lang, 'More airport routes', 'Autres transferts aéroport', 'المزيد من مسارات المطارات') : text(lang, 'More local routes', 'Autres destinations', 'المزيد من الوجهات المحلية')} title={airport ? text(lang, 'Arrive anywhere in Tunisia.', 'Arrivez partout en Tunisie.', 'صل إلى أي مكان في تونس.') : text(lang, 'Choose where your journey starts.', 'Choisissez le point de départ de votre voyage.', 'اختر نقطة انطلاق رحلتك.')} />
        <div className="link-grid">
          {commercialLocations.filter((item) => item.slug !== currentSlug).slice(0, 4).map((item) => (
            <Link key={item.slug} className="link-card" to={href(lang, `${airport ? '/airport-transfers' : '/car-rental'}/${item.slug}`)}>
              <MapPin size={18} aria-hidden="true" />
              <strong>{airport ? text(lang, `${item.airport} transfers`, `Transferts ${item.airport}`, `النقل من ${item.airport}`) : text(lang, `Car rental in ${item.name[0]}`, `Location de voiture à ${item.name[1]}`, `تأجير السيارات في ${item.name[2]}`)}</strong>
              <span>{text(lang, 'Fixed quote confirmed for your itinerary', 'Devis fixe confirmé selon votre trajet', 'عرض سعر ثابت مؤكد حسب مسارك')}<ArrowRight size={15} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailWithQuote({ lang, eyebrow, title, body, bullets, serviceType = null }) {
  return (
    <section className="section detail">
      <div className="container detail__grid">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{body}</p>
          <ul className="check-list">{bullets.map((item) => <li key={item}><Check size={18} aria-hidden="true" />{item}</li>)}</ul>
        </Reveal>
        <div className="panel"><QuoteFlow lang={lang} serviceType={serviceType} analyticsLocation="location_page" /></div>
      </div>
    </section>
  );
}

export function LocationPage({ lang, slug, airport = false }) {
  const item = commercialLocations.find((entry) => entry.slug === slug) || commercialLocations[0];
  const displayName = item.name[languageIndex(lang)];
  const title = airport ? text(lang, `${item.airport} transfers`, `Transferts depuis ${item.airport}`, `النقل من ${item.airport}`) : text(lang, `Car rental in ${item.name[0]}`, `Location de voiture à ${item.name[1]}`, `تأجير السيارات في ${item.name[2]}`);
  const pageText = airport
    ? text(lang, `Pre-arranged airport transfers between ${item.airport}, hotels and destinations in Tunisia. Your driver tracks the flight and the final fixed quote is confirmed before travel.`, `Transferts aéroport organisés entre ${item.airport}, les hôtels et les destinations en Tunisie. Votre chauffeur suit le vol et le devis fixe est confirmé avant le départ.`, `نظم نقلك من ${item.airport} إلى الفنادق والوجهات في تونس مسبقاً. يتابع السائق الرحلة ويؤكد السعر الثابت قبل السفر.`)
    : text(lang, `Arrange a VIPCAR rental in ${item.name[0]} with collection or delivery at ${item.airport}. Choose from economy, compact, SUV, executive and group vehicles, subject to availability for your dates.`, `Organisez votre location VIPCAR à ${item.name[1]} avec prise en charge ou livraison à ${item.airport}. Choisissez parmi les citadines, compactes, SUV, berlines et véhicules de groupe, selon disponibilité.`, `رتب تأجير سيارة من VIPCAR في ${item.name[2]} مع الاستلام أو التوصيل في ${item.airport}. اختر من السيارات الاقتصادية والمدمجة والدفع الرباعي والتنفيذية وسيارات المجموعات حسب التوفر.`);
  const seoTitle = airport
    ? text(lang, `Airport transfers from ${item.airport}.`, `Transferts depuis ${item.airport}.`, `النقل من ${locationLabel(item.airport, lang)}.`)
    : text(lang, `Car rental in ${item.name[0]}, arranged around your route.`, `Location de voiture à ${item.name[1]}, organisée selon votre trajet.`, `تأجير السيارات في ${displayName} بما يناسب مسارك.`);
  const seoIntro = airport
    ? text(lang, 'Whether you are heading to a hotel, a private residence or another Tunisian destination, VIPCAR confirms the pickup point, flight details, vehicle and fixed TND quote before you travel.', 'Que vous rejoigniez un hôtel, une résidence ou une autre destination tunisienne, VIPCAR confirme le point de prise en charge, le vol, le véhicule et le devis fixe en TND avant le départ.', 'سواء كنت متوجهاً إلى فندق أو إقامة خاصة أو وجهة تونسية أخرى، تؤكد VIPCAR نقطة الاستقبال وتفاصيل الرحلة والسيارة والسعر الثابت بالدينار التونسي قبل السفر.')
    : text(lang, `Collect or receive your vehicle in ${item.name[0]} with a local team coordinating the practical details. Airport, hotel and alternative delivery requests are confirmed around your dates and itinerary.`, `Récupérez ou recevez votre véhicule à ${item.name[1]} avec une équipe locale qui coordonne les détails pratiques. Les demandes de livraison à l’aéroport, à l’hôtel ou ailleurs sont confirmées selon vos dates et votre itinéraire.`, `استلم سيارتك أو اطلب توصيلها في ${displayName} مع فريق محلي ينسق التفاصيل العملية. نؤكد طلبات التوصيل إلى المطار أو الفندق أو أي نقطة أخرى حسب تواريخك ومسارك.`);
  return (
    <main>
      <PageHero image={item.image} eyebrow={airport ? text(lang, 'Airport transfer Tunisia', 'Transfert aéroport Tunisie', 'النقل من مطار تونس') : text(lang, 'Car rental Tunisia', 'Location de voiture Tunisie', 'تأجير السيارات في تونس')} title={title} intro={pageText} />
      <DetailWithQuote
        lang={lang}
        eyebrow={`${displayName} · ${text(lang, 'Tunisia', 'Tunisie', 'تونس')}`}
        title={airport ? text(lang, 'A calm arrival starts before you land.', 'Une arrivée sereine commence avant l’atterrissage.', 'وصول هادئ يبدأ قبل هبوط الطائرة.') : text(lang, 'Your local mobility partner in Tunisia.', 'Votre partenaire mobilité en Tunisie.', 'شريكك المحلي للتنقل في تونس.')}
        body={pageText}
        bullets={[
          text(lang, 'Fixed quote confirmed directly', 'Devis fixe confirmé directement', 'عرض سعر ثابت مؤكد مباشرة'),
          text(lang, 'Airport and hotel collection on request', 'Prise en charge à l’aéroport ou à l’hôtel sur demande', 'استلام من المطار أو الفندق عند الطلب'),
          text(lang, 'English- and French-speaking team', 'Équipe francophone et anglophone', 'فريق يتحدث العربية والإنجليزية والفرنسية'),
          text(lang, '24/7 availability', 'Disponibilité 24h/24', 'متاح على مدار الساعة'),
        ]}
      />
      <PointsGrid eyebrow={`${displayName} · VIPCAR`} title={seoTitle} intro={seoIntro} points={localPoints(lang, airport)} />
      {!airport && <FeaturedFleet lang={lang} eyebrow={text(lang, 'Choose your vehicle', 'Choisissez votre véhicule', 'اختر سيارتك')} />}
      <LocationLinks lang={lang} currentSlug={slug} airport={airport} />
      <Faq lang={lang} />
      <CtaBand lang={lang} />
    </main>
  );
}

export function ChauffeurLocationPage({ lang, slug }) {
  const item = commercialLocations.find((entry) => entry.slug === slug);
  if (!item || !chauffeurHubs.includes(slug)) return <NotFound lang={lang} />;
  const city = item.name[languageIndex(lang)];
  const title = text(lang, `Private chauffeur in ${item.name[0]}`, `Chauffeur privé à ${item.name[1]}`, `سائق خاص في ${city}`);
  const pageText = text(lang, `Arrange a professional VIPCAR chauffeur in ${item.name[0]} for airport arrivals, business travel, events or a full day of private touring. Your schedule, vehicle and fixed quote are confirmed directly before travel.`, `Organisez un chauffeur privé VIPCAR à ${item.name[1]} pour vos arrivées à l’aéroport, déplacements professionnels, événements ou circuits à la journée. Votre programme, le véhicule et le devis fixe sont confirmés directement avant le départ.`, `رتب سائقاً خاصاً محترفاً من VIPCAR في ${city} للوصول من المطار أو رحلات العمل أو الفعاليات أو جولة ليوم كامل. نؤكد برنامجك والسيارة والسعر الثابت مباشرة قبل السفر.`);
  return (
    <main>
      <PageHero image="interior.jpg" eyebrow={text(lang, 'Private chauffeur Tunisia', 'Chauffeur privé Tunisie', 'سائق خاص في تونس')} title={title} intro={pageText} />
      <DetailWithQuote
        lang={lang}
        eyebrow={`${city} · VIPCAR`}
        title={text(lang, 'A calm, capable driver for every important journey.', 'Un chauffeur fiable pour les trajets qui comptent.', 'سائق هادئ وموثوق لكل رحلة مهمة.')}
        body={pageText}
        bullets={[
          text(lang, 'English- and French-speaking drivers', 'Chauffeurs francophones et anglophones', 'سائقون يتحدثون العربية والإنجليزية والفرنسية'),
          text(lang, 'Airport meet-and-greet and flight tracking', 'Accueil à l’aéroport et suivi du vol', 'استقبال في المطار ومتابعة الرحلة'),
          text(lang, 'Hourly, half-day or full-day service', 'À l’heure, à la demi-journée ou à la journée', 'خدمة بالساعة أو نصف يوم أو يوم كامل'),
          text(lang, 'Discreet service for business and events', 'Service discret pour affaires et événements', 'خدمة خاصة للأعمال والفعاليات'),
        ]}
      />
      <section className="section location-links">
        <div className="container">
          <SectionHead eyebrow={text(lang, 'Related local services', 'Services locaux associés', 'خدمات محلية مرتبطة')} title={text(lang, `More ways to move through ${item.name[0]}.`, `D’autres façons de vous déplacer à ${item.name[1]}.`, `مزيد من طرق التنقل في ${city}.`)} />
          <div className="link-grid">
            <Link className="link-card" to={href(lang, `/car-rental/${slug}`)}><Car size={18} aria-hidden="true" /><strong>{text(lang, `Car rental in ${item.name[0]}`, `Location de voiture à ${item.name[1]}`, `تأجير السيارات في ${city}`)}</strong><span>{text(lang, 'Explore rental options', 'Voir les options de location', 'اكتشف خيارات التأجير')}<ArrowRight size={15} aria-hidden="true" /></span></Link>
            {slug !== 'gabes' && <Link className="link-card" to={href(lang, `/airport-transfers/${slug}`)}><Plane size={18} aria-hidden="true" /><strong>{text(lang, `${item.airport} transfer`, `Transfert ${item.airport}`, `النقل من ${locationLabel(item.airport, lang)}`)}</strong><span>{text(lang, 'Plan your arrival', 'Organiser votre arrivée', 'نظم وصولك')}<ArrowRight size={15} aria-hidden="true" /></span></Link>}
          </div>
        </div>
      </section>
      <Faq lang={lang} />
      <CtaBand lang={lang} />
    </main>
  );
}
