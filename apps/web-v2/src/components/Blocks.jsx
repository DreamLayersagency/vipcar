import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BriefcaseBusiness, ChevronDown, Gauge, Headphones, Luggage, Mail, MessageCircle,
  RotateCw, Search, Users,
} from 'lucide-react';
import { formatCurrency } from '../../../../libs/web-client/src/index.js';
import { faqs } from '../content/app1-content.js';
import { categoryLabel, t, text, tierLabel, transmissionLabel } from '../i18n.js';
import { href, Link } from '../router.jsx';
import { EMAIL, PHONE, PHONE_HREF, WA, img } from '../site.js';
import { useCurrency } from '../state.jsx';

/** Adds `is-visible` when the element scrolls into view (CSS handles motion and reduced-motion). */
export function Reveal({ as: Tag = 'div', className = '', children, ...props }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <Tag ref={ref} className={`reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`} {...props}>{children}</Tag>;
}

export function SectionHead({ eyebrow, title, intro, action, center = false, light = false }) {
  return (
    <Reveal className={`section-head${center ? ' section-head--center' : ''}${light ? ' section-head--light' : ''}`}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {intro && <p className="section-head__intro">{intro}</p>}
      </div>
      {action}
    </Reveal>
  );
}

export function PageHero({ image, eyebrow, title, intro, children }) {
  return (
    <section className="page-hero">
      <img src={img(image)} alt="" loading="eager" fetchPriority="high" decoding="async" />
      <div className="page-hero__shade" aria-hidden="true" />
      <div className="page-hero__content">
        {eyebrow && <p className="eyebrow eyebrow--light">{eyebrow}</p>}
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
        {children}
      </div>
    </section>
  );
}

export function VehicleCard({ car, lang, loading = 'lazy', bookingQuery = '' }) {
  const copy = t(lang);
  const { currency } = useCurrency();
  const detail = href(lang, `/fleet/${car.slug}`);
  const request = href(lang, `/booking?vehicle=${encodeURIComponent(car.slug)}${bookingQuery ? `&${bookingQuery.replace(/^\?/, '')}` : ''}`);
  return (
    <article className="car-card">
      <header className={`car-card__head${car.tier === car.cat ? ' car-card__head--single' : ''}`}>
        <span className="car-card__tier">{tierLabel(car.tier, lang)}</span>
        {car.tier !== car.cat && <span className="car-card__cat">{categoryLabel(car.cat, lang)}</span>}
        <h3><Link to={detail}>{car.name}</Link></h3>
      </header>
      <Link to={detail} className="car-card__media" tabIndex={-1} aria-hidden="true">
        <img src={img(car.image)} alt="" loading={loading} decoding="async" />
      </Link>
      <ul className="car-card__specs">
        <li><Users size={17} aria-hidden="true" /><span>{car.seats} {copy.seats}</span></li>
        <li><Gauge size={17} aria-hidden="true" /><span>{transmissionLabel(car.transmission, lang)}</span></li>
        <li><Luggage size={17} aria-hidden="true" /><span>{car.bags} {text(lang, 'bags', 'bagages', 'حقائب')}</span></li>
      </ul>
      <div className="car-card__foot">
        <p className="price"><small>{copy.from}</small><strong>{formatCurrency(car.price, currency, lang)}</strong><small>{copy.day}</small></p>
        <div className="car-card__actions">
          <Link className="btn btn--ghost-dark btn--sm" to={detail}>{text(lang, 'Details', 'Détails', 'التفاصيل')}</Link>
          <Link className="btn btn--accent btn--sm" to={request} aria-label={`${text(lang, 'Request this vehicle', 'Demander ce véhicule', 'اطلب هذه السيارة')}: ${car.name}`}>{text(lang, 'Request', 'Demander', 'اطلب')}<ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  );
}

export function LoadingState({ label }) {
  return <p className="state state--loading" aria-live="polite"><span className="spinner" aria-hidden="true" />{label}</p>;
}

export function ErrorState({ message, onRetry, lang }) {
  return (
    <div className="state state--error" role="alert">
      <AlertTriangle size={20} aria-hidden="true" />
      <p>{message}</p>
      {onRetry && <button type="button" className="btn btn--ghost-dark btn--sm" onClick={onRetry}><RotateCw size={15} aria-hidden="true" />{text(lang, 'Try again', 'Réessayer', 'أعد المحاولة')}</button>}
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="state state--empty"><Search size={20} aria-hidden="true" />{children}</div>;
}

export function Faq({ lang, eyebrow = 'FAQ' }) {
  return (
    <section className="section faq">
      <div className="container faq__grid">
        <SectionHead eyebrow={eyebrow} title={t(lang).faq} />
        <div className="faq__list">
          {faqs[lang].map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<ChevronDown size={18} aria-hidden="true" /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBand({ lang }) {
  const copy = t(lang);
  return (
    <section className="cta-band">
      <div className="container cta-band__inner">
        <div>
          <p className="eyebrow eyebrow--light">{text(lang, 'Your trip, clearly arranged', 'Votre trajet, simplement organisé', 'رحلتك، منظمة بوضوح')}</p>
          <h2>{copy.quoteTitle}</h2>
          <p>{copy.quoteSub}</p>
        </div>
        <div className="cta-band__actions">
          <Link className="btn btn--dark" to={href(lang, '/booking')}>{copy.book}<ArrowRight size={17} aria-hidden="true" /></Link>
          <a className="btn btn--outline-light" href={WA}>{copy.whatsapp}<MessageCircle size={17} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}

/** "Book with us" contact band: every way to reach the VIPCAR team. */
export function ContactBand({ lang }) {
  const copy = t(lang);
  const items = [
    { icon: Search, title: text(lang, 'Request online', 'Demande en ligne', 'اطلب عبر الإنترنت'), link: href(lang, '/booking'), label: copy.book, internal: true },
    { icon: Headphones, title: text(lang, 'Call the team', 'Appeler l’équipe', 'اتصل بالفريق'), link: PHONE_HREF, label: PHONE },
    { icon: MessageCircle, title: 'WhatsApp', link: WA, label: text(lang, 'Fastest reply', 'Réponse la plus rapide', 'أسرع رد') },
    { icon: Mail, title: 'Email', link: `mailto:${EMAIL}`, label: EMAIL },
    { icon: BriefcaseBusiness, title: text(lang, 'Corporate', 'Entreprises', 'الشركات'), link: href(lang, '/corporate'), label: text(lang, 'Team reservations', 'Réservations d’équipe', 'حجوزات الفرق'), internal: true },
  ];
  return (
    <section className="section contact-band">
      <div className="container">
        <SectionHead center eyebrow={copy.directAssistance} title={copy.quoteTitle} />
        <ul className="contact-band__grid">
          {items.map((item) => {
            const Icon = item.icon;
            const content = <><Icon size={30} strokeWidth={1.5} aria-hidden="true" /><strong>{item.title}</strong><span>{item.label}</span></>;
            return <li key={item.title}>{item.internal ? <Link to={item.link}>{content}</Link> : <a href={item.link}>{content}</a>}</li>;
          })}
        </ul>
      </div>
    </section>
  );
}

export function GuideCard({ image, tag, title, slug, lang }) {
  return (
    <Link className="guide-card" to={href(lang, `/blog/${slug}`)}>
      <span className="guide-card__media"><img src={img(image)} alt="" loading="lazy" /></span>
      <span className="eyebrow">{tag}</span>
      <h3>{title}</h3>
      <span className="guide-card__more">{t(lang).readGuide}<ArrowRight size={15} aria-hidden="true" /></span>
    </Link>
  );
}

export function PointsGrid({ eyebrow, title, intro, points }) {
  return (
    <section className="section points">
      <div className="container points__grid">
        <SectionHead eyebrow={eyebrow} title={title} intro={intro} />
        <ol className="points__list">
          {points.map(([heading, body], index) => (
            <Reveal as="li" key={heading}>
              <span className="points__num">{String(index + 1).padStart(2, '0')}</span>
              <div><h3>{heading}</h3><p>{body}</p></div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
