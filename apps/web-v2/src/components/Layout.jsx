import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Clock3, Mail, Menu, MessageCircle, Phone, UserRound, X } from 'lucide-react';
import { CURRENCIES, getCurrency, trackEvent, whatsAppUrl } from '../../../../libs/web-client/src/index.js';
import { LANGUAGES, t, text } from '../i18n.js';
import { href, Link, localeRelativePath, navigate } from '../router.jsx';
import { ADDRESS, EMAIL, HUBS, LOGO_LIGHT, PHONE, PHONE_HREF, WA } from '../site.js';
import { useCurrency } from '../state.jsx';

export const NAV_PATHS = ['/services/rental', '/services/transfer', '/services/chauffeur', '/fleet', '/corporate', '/destinations', '/about'];

function useDismiss(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen, ref]);
}

function Dropdown({ label, value, options, onSelect, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(open, setOpen, ref);
  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className="dropdown__trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen((previous) => !previous)}>
        {label}<ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <ul className="dropdown__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <li key={option.value}>
              <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? 'is-active' : ''} onClick={() => { setOpen(false); onSelect(option.value); }}>
                <span>{option.short}</span><small>{option.long}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UtilityBar({ lang }) {
  const copy = t(lang);
  const { currency, setCurrency } = useCurrency();
  const selected = getCurrency(currency);
  return (
    <div className="utility">
      <div className="utility__inner">
        <div className="utility__contact">
          <span className="utility__hours"><Clock3 size={13} aria-hidden="true" /> 24/7 · {HUBS}</span>
          <a href={PHONE_HREF} onClick={() => trackEvent('phone_click', { location: 'utility', language: lang })}><Phone size={13} aria-hidden="true" />{PHONE}</a>
          <a className="utility__email" href={`mailto:${EMAIL}`} onClick={() => trackEvent('email_click', { location: 'utility', language: lang })}><Mail size={13} aria-hidden="true" />{EMAIL}</a>
        </div>
        <div className="utility__tools">
          <Link to={href(lang, '/my-bookings')} className="utility__account"><UserRound size={13} aria-hidden="true" />{copy.myBookings}</Link>
          <Dropdown
            label={lang.toUpperCase()}
            value={lang}
            ariaLabel={text(lang, 'Select language', 'Choisir la langue', 'اختيار اللغة')}
            options={LANGUAGES.map((item) => ({ value: item.code, short: item.code.toUpperCase(), long: item.native }))}
            onSelect={(next) => navigate(href(next, localeRelativePath()), { scroll: false })}
          />
          <Dropdown
            label={selected.code}
            value={selected.code}
            ariaLabel={`${copy.currencyLabel}: ${selected.code}`}
            options={CURRENCIES.map((item) => ({ value: item.code, short: item.code, long: item.name[lang] || item.name.en }))}
            onSelect={(code) => { setCurrency(code); trackEvent('currency_change', { currency: code, language: lang }); }}
          />
        </div>
      </div>
    </div>
  );
}

export function Header({ lang, parts }) {
  const copy = t(lang);
  const [open, setOpen] = useState(false);
  const current = `/${parts.join('/')}`;
  useEffect(() => { setOpen(false); }, [current]);
  useEffect(() => {
    document.body.classList.toggle('is-locked', open);
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.classList.remove('is-locked'); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <header className="header">
      <div className="header__inner">
        <Link to={href(lang)} className="header__logo" aria-label="VIPCAR Tunisia home"><img src={LOGO_LIGHT} alt="VIPCAR Tunisia" width="150" height="40" /></Link>
        <nav id="primary-nav" className={`nav${open ? ' is-open' : ''}`} aria-label={text(lang, 'Primary navigation', 'Navigation principale', 'التنقل الرئيسي')}>
          {copy.nav.map((label, index) => {
            const path = NAV_PATHS[index];
            const active = current === path || current.startsWith(`${path}/`);
            return <Link key={path} to={href(lang, path)} aria-current={active ? 'page' : undefined}>{label}</Link>;
          })}
          <Link className="nav__mobile-only" to={href(lang, '/contact')}>{copy.contactLabel}</Link>
        </nav>
        <div className="header__actions">
          <a className="header__wa" href={WA} aria-label="WhatsApp" onClick={() => trackEvent('whatsapp_click', { location: 'header', language: lang })}><MessageCircle size={19} aria-hidden="true" /></a>
          <Link className="btn btn--accent btn--sm header__cta" to={href(lang, '/booking')}>{copy.book}<ArrowRight size={15} aria-hidden="true" /></Link>
          <button type="button" className="header__menu" aria-label={text(lang, 'Toggle menu', 'Ouvrir le menu', 'فتح القائمة')} aria-expanded={open} aria-controls="primary-nav" onClick={() => setOpen((previous) => !previous)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer({ lang }) {
  const copy = t(lang);
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Link to={href(lang)} aria-label="VIPCAR Tunisia home"><img src={LOGO_LIGHT} alt="VIPCAR Tunisia" width="150" height="40" /></Link>
          <p>{copy.footer}</p>
        </div>
        <nav className="footer__col" aria-label={copy.servicesLabel}>
          <h2>{copy.servicesLabel}</h2>
          <Link to={href(lang, '/services/rental')}>{copy.nav[0]}</Link>
          <Link to={href(lang, '/services/transfer')}>{copy.nav[1]}</Link>
          <Link to={href(lang, '/services/chauffeur')}>{copy.nav[2]}</Link>
        </nav>
        <nav className="footer__col" aria-label={copy.exploreLabel}>
          <h2>{copy.exploreLabel}</h2>
          <Link to={href(lang, '/fleet')}>{copy.nav[3]}</Link>
          <Link to={href(lang, '/corporate')}>{copy.nav[4]}</Link>
          <Link to={href(lang, '/my-bookings')}>{copy.myBookings}</Link>
          <Link to={href(lang, '/blog')}>{copy.journal}</Link>
          <Link to={href(lang, '/about')}>{copy.nav[6]}</Link>
          <Link to={href(lang, '/faq')}>FAQ</Link>
        </nav>
        <div className="footer__col">
          <h2>{copy.contactLabel}</h2>
          <a href={PHONE_HREF} onClick={() => trackEvent('phone_click', { location: 'footer', language: lang })}>{PHONE}</a>
          <a href={WA} onClick={() => trackEvent('whatsapp_click', { location: 'footer', language: lang })}>WhatsApp</a>
          <a href={`mailto:${EMAIL}`} onClick={() => trackEvent('email_click', { location: 'footer', language: lang })}>{EMAIL}</a>
          <address>{ADDRESS[0]}<br />{ADDRESS[1]}</address>
        </div>
      </div>
      <p className="footer__note">{copy.currencyNote}</p>
      <div className="footer__bottom">
        <span>© 2026 VIPCAR Tunisia</span>
        <nav aria-label={text(lang, 'Legal', 'Mentions légales', 'قانوني')}>
          <Link to={href(lang, '/legal/terms-conditions')}>{copy.terms}</Link>
          <Link to={href(lang, '/legal/privacy-policy')}>{copy.privacy}</Link>
          <Link to={href(lang, '/legal/cancellation-policy')}>{copy.cancellation}</Link>
        </nav>
      </div>
    </footer>
  );
}

export function FloatingWhatsApp({ lang }) {
  const copy = t(lang);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(copy.whatsappDefault);
  const ref = useRef(null);
  useDismiss(open, setOpen, ref);
  useEffect(() => { setMessage(copy.whatsappDefault); }, [copy.whatsappDefault]);
  const send = () => {
    trackEvent('whatsapp_click', { location: 'floating', language: lang });
    window.location.href = whatsAppUrl(message.trim() || copy.whatsappDefault, WA);
  };
  return (
    <div className={`float-wa${open ? ' is-open' : ''}`} ref={ref}>
      {open && (
        <div id="float-wa-panel" className="float-wa__panel" role="dialog" aria-labelledby="float-wa-title">
          <div className="float-wa__head">
            <div><p className="eyebrow">{copy.contactLabel}</p><h3 id="float-wa-title">{copy.whatsappTitle}</h3></div>
            <button type="button" className="icon-btn" aria-label={copy.whatsappClose} onClick={() => setOpen(false)}><X size={17} /></button>
          </div>
          <textarea autoFocus rows="4" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={copy.whatsappPlaceholder} aria-label={copy.whatsappPlaceholder} />
          <p className="float-wa__hint">{copy.whatsappHint}</p>
          <button type="button" className="btn btn--wa btn--block" onClick={send}>{copy.whatsappSend}<MessageCircle size={17} aria-hidden="true" /></button>
        </div>
      )}
      <button type="button" className="float-wa__toggle" aria-expanded={open} aria-controls="float-wa-panel" aria-label={open ? copy.whatsappClose : copy.whatsapp} onClick={() => setOpen((previous) => !previous)}>
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}

export function MobileBookBar({ lang }) {
  return <Link className="mobile-book" to={href(lang, '/booking')}>{t(lang).book}<ArrowRight size={18} aria-hidden="true" /></Link>;
}
