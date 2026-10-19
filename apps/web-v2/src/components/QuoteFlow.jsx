import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Car, Check, Clock3, MapPin, MessageCircle, Plane, ShieldCheck, Users } from 'lucide-react';
import {
  buildWhatsAppQuoteMessage, createQuote, formatCurrency, formatQuoteReference, getStoredUser, initAnalytics,
  quoteErrorMessage, trackEvent, whatsAppUrl,
} from '../../../../libs/web-client/src/index.js';
import { locations, services } from '../content/app1-content.js';
import { languageIndex, locationLabel, t, text } from '../i18n.js';
import { href, navigate } from '../router.jsx';
import { WA } from '../site.js';
import {
  EMPTY_CONTACT, EMPTY_TRIP, clearDraft, readDraft, tripFromQuery, tripToQuery, useCurrency, writeDraft,
} from '../state.jsx';

const SERVICE_ICONS = { car: Car, plane: Plane, users: Users };

export function serviceIcon(service) {
  return SERVICE_ICONS[service?.icon] ?? Car;
}

function serviceHint(key, copy) {
  return key === 'rental' ? copy.serviceSelfDrive : key === 'transfer' ? copy.serviceAirport : copy.serviceHourly;
}

function readFormValues(form) {
  return Object.fromEntries(Array.from(form?.elements ?? []).filter((element) => element.name).map((element) => [element.name, element.value]));
}

/** Same rules and messages as App 1's QuoteWidget `validateTrip`. */
export function validateTrip(trip, lang) {
  if (!trip.pickup || !trip.date) return text(lang, 'Please choose your pick-up point and date.', 'Choisissez votre lieu de départ et votre date.', 'اختر مكان الاستلام والتاريخ.');
  if (trip.service === 'rental' && !trip.endDate) return text(lang, 'Please choose a return date for your rental.', 'Choisissez une date de retour pour votre location.', 'اختر تاريخ عودة السيارة.');
  if (trip.service === 'rental' && trip.endDate < trip.date) return text(lang, 'Your return date must be after the pick-up date.', 'La date de retour doit être postérieure à la date de départ.', 'يجب أن يكون تاريخ العودة بعد تاريخ الاستلام.');
  if (trip.service === 'transfer' && !trip.dropoff) return text(lang, 'Please add your destination for the airport transfer.', 'Ajoutez votre destination pour le transfert aéroport.', 'أضف وجهتك لنقل المطار.');
  if (!trip.passengers || Number(trip.passengers) < 1 || Number(trip.passengers) > 50) return text(lang, 'Please enter the number of passengers.', 'Indiquez le nombre de passagers.', 'أدخل عدد الركاب.');
  return '';
}

export function QuoteSuccess({ lang, request, onReset }) {
  const copy = t(lang);
  const user = getStoredUser();
  return (
    <section className="quote-success" aria-live="polite">
      <span className="quote-success__mark" aria-hidden="true"><Check size={22} /></span>
      <p className="eyebrow">{copy.requestReceived}</p>
      <h3>{copy.successTitle}</h3>
      <p>{copy.successCopy}</p>
      <div className="quote-success__ref"><span>{copy.requestReference}</span><strong>{request.reference}</strong></div>
      {user?.role === 'customer' && (
        <p className="quote-success__account">{text(lang, 'This request is linked to your VIPCAR account and will appear in My bookings once confirmed.', 'Cette demande est liée à votre compte VIPCAR et apparaîtra dans Mes réservations une fois confirmée.', 'هذا الطلب مرتبط بحسابك في VIPCAR وسيظهر في حجوزاتي بعد تأكيده.')}</p>
      )}
      <div className="quote-success__actions">
        <a className="btn btn--accent" href={whatsAppUrl(request.whatsappText, WA)}>{copy.continueWhatsapp}<MessageCircle size={17} /></a>
        <button type="button" className="btn btn--ghost" onClick={onReset}>{copy.anotherRequest}</button>
      </div>
    </section>
  );
}

function TripFields({ lang, trip, update, today, compact }) {
  const copy = t(lang);
  return (
    <div className={`trip-fields${compact ? ' trip-fields--band' : ''}`}>
      <label className="field">
        <span><MapPin size={14} aria-hidden="true" />{copy.whereMeet}</span>
        <select name="pickup" value={trip.pickup} onChange={update} required>
          {locations.map((item) => <option key={item} value={item}>{locationLabel(item, lang)}</option>)}
        </select>
      </label>
      <label className="field">
        <span><MapPin size={14} aria-hidden="true" />{copy.dropoff}</span>
        <select name="dropoff" value={trip.dropoff} onChange={update} required={trip.service === 'transfer'}>
          <option value="">{text(lang, 'Select a destination', 'Sélectionner une destination', 'اختر وجهة')}</option>
          {locations.map((item) => <option key={item} value={item}>{locationLabel(item, lang)}</option>)}
        </select>
      </label>
      <label className="field">
        <span><CalendarDays size={14} aria-hidden="true" />{copy.when}</span>
        <input required name="date" type="date" min={today} value={trip.date} onChange={update} />
      </label>
      {trip.service === 'rental' && (
        <label className="field">
          <span><CalendarDays size={14} aria-hidden="true" />{copy.returnDate}</span>
          <input required name="endDate" type="date" min={trip.date || today} value={trip.endDate} onChange={update} />
        </label>
      )}
      {trip.service === 'chauffeur' && (
        <label className="field">
          <span><Clock3 size={14} aria-hidden="true" />{copy.serviceDuration}</span>
          <select name="duration" value={trip.duration} onChange={update}>
            <option value="hourly">{text(lang, 'By the hour', 'À l’heure', 'بالساعة')}</option>
            <option value="half-day">{text(lang, 'Half day', 'Demi-journée', 'نصف يوم')}</option>
            <option value="full-day">{text(lang, 'Full day', 'Journée complète', 'يوم كامل')}</option>
          </select>
        </label>
      )}
      {trip.service === 'transfer' && (
        <label className="field">
          <span><Plane size={14} aria-hidden="true" />{copy.flightNumber}</span>
          <input name="flightNumber" value={trip.flightNumber} onChange={update} placeholder="TU1234" />
        </label>
      )}
      <label className="field field--narrow">
        <span><Users size={14} aria-hidden="true" />{copy.passengers}</span>
        <input required name="passengers" type="number" min="1" max="50" value={trip.passengers} onChange={update} />
      </label>
    </div>
  );
}

/**
 * Quote request flow on the existing `POST /v1/quotes` endpoint.
 * - `mode="band"`: trip step only (search band); continue opens `/booking` with the trip in the URL.
 * - `mode="full"`: trip step then contact step in place, then the confirmation panel.
 */
export function QuoteFlow({ lang, mode = 'full', serviceType = null, selectedVehicle = null, initialSearch = '', analyticsLocation = 'quote', startAtContact = false }) {
  const copy = t(lang);
  const { currency } = useCurrency();
  const fromQuery = useMemo(() => tripFromQuery(initialSearch), [initialSearch]);
  const [trip, setTrip] = useState(() => {
    const draft = readDraft();
    const base = { ...EMPTY_TRIP, ...(draft?.trip ?? {}), ...fromQuery };
    return serviceType ? { ...base, service: serviceType } : base;
  });
  const [contact, setContact] = useState(() => readDraft()?.contact ?? { ...EMPTY_CONTACT });
  const [step, setStep] = useState(() => (startAtContact && !validateTrip({ ...EMPTY_TRIP, ...(readDraft()?.trip ?? {}), ...fromQuery, ...(serviceType ? { service: serviceType } : {}) }, lang) ? 2 : 1));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const headingRef = useRef(null);
  const today = new Date().toISOString().slice(0, 10);
  const fixedService = serviceType ? services.find((item) => item.key === serviceType) : null;
  const FixedIcon = fixedService ? serviceIcon(fixedService) : null;
  const vehicleForService = trip.service === 'rental' ? selectedVehicle : null;

  useEffect(() => { initAnalytics(); }, []);
  useEffect(() => { if (!success) writeDraft(trip, contact); }, [trip, contact, success]);

  const updateTrip = (event) => setTrip((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const updateContact = (event) => setContact((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const chooseService = (key) => {
    setTrip((previous) => ({ ...previous, service: key }));
    setStep(1);
    setError('');
    trackEvent('service_selected', { service: key, language: lang, location: mode === 'band' ? 'compact_quote' : analyticsLocation });
  };

  const continueTrip = (event, target = 'booking') => {
    const nextTrip = { ...trip, ...pickTrip(readFormValues(event.currentTarget.form)) };
    const problem = validateTrip(nextTrip, lang);
    setTrip(nextTrip);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    if (mode === 'band') {
      const path = target === 'fleet' ? '/fleet' : '/booking';
      navigate(href(lang, `${path}${tripToQuery(nextTrip, target === 'fleet' ? {} : { vehicle: vehicleForService?.slug })}`));
      return;
    }
    setStep(2);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (step === 1) {
      continueTrip({ currentTarget: { form: event.currentTarget } });
      return;
    }
    setError('');
    const values = { ...trip, ...contact, ...readFormValues(event.currentTarget) };
    const service = trip.service;
    const pickup = String(values.pickup || '').trim();
    const dropoff = String(values.dropoff || '').trim() || undefined;
    const startDate = String(values.date || '').trim();
    const endRaw = String(values.endDate || '').trim();
    const name = String(values.name || '').trim();
    const phone = String(values.phone || '').trim();
    const email = String(values.email || '').trim() || undefined;
    const flightNumber = service === 'transfer' ? String(values.flightNumber || '').trim() || undefined : undefined;
    const notes = String(values.notes || '').trim() || undefined;
    const passengers = Number(values.passengers);
    const duration = service === 'chauffeur' ? values.duration : undefined;
    if (!name || !phone) return setError(text(lang, 'Please enter your name and phone number.', 'Indiquez votre nom et votre numéro de téléphone.', 'أدخل اسمك ورقم هاتفك.'));
    if (phone.replace(/\D/g, '').length < 7) return setError(text(lang, 'Please enter a valid phone or WhatsApp number.', 'Indiquez un numéro de téléphone ou WhatsApp valide.', 'أدخل رقماً صالحاً للهاتف أو واتساب.'));
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setError(text(lang, 'Please enter a valid email address or leave it blank.', 'Indiquez une adresse e-mail valide ou laissez le champ vide.', 'أدخل عنوان بريد إلكتروني صالحاً أو اترك الحقل فارغاً.'));
    const tripProblem = validateTrip({ ...trip, pickup, dropoff: dropoff ?? '', date: startDate, endDate: endRaw, passengers: String(values.passengers) }, lang);
    if (tripProblem) {
      setError(tripProblem);
      setStep(1);
      return;
    }
    const body = {
      service,
      ...(vehicleForService ? { vehicleSlug: vehicleForService.slug } : {}),
      pickup,
      ...(dropoff ? { dropoff } : {}),
      startDate,
      ...(service === 'rental' ? { endDate: endRaw } : {}),
      ...(duration ? { duration } : {}),
      ...(Number.isInteger(passengers) ? { passengers } : {}),
      ...(flightNumber ? { flightNumber } : {}),
      ...(notes ? { notes } : {}),
      name,
      phone,
      ...(email ? { email } : {}),
      locale: lang,
      channel: 'web',
    };
    setSubmitting(true);
    try {
      const response = await createQuote(body, { locale: lang });
      const reference = formatQuoteReference(response?.data?.id);
      const whatsappText = `${buildWhatsAppQuoteMessage({
        service, vehicleName: vehicleForService?.name, pickup, dropoff, startDate, endDate: body.endDate,
        duration, passengers, flightNumber, name, phone, email, notes,
      })} Reference: ${reference}.`;
      clearDraft();
      setSuccess({ reference, whatsappText });
      trackEvent('quote_submit', { service, language: lang, location: analyticsLocation, vehicle: vehicleForService?.slug });
    } catch (err) {
      setError(quoteErrorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSuccess(null);
    setError('');
    setStep(1);
    setTrip({ ...EMPTY_TRIP, ...(serviceType ? { service: serviceType } : {}) });
    setContact({ ...EMPTY_CONTACT });
  };

  if (success) return <QuoteSuccess lang={lang} request={success} onReset={reset} />;

  const serviceTitle = services.find((item) => item.key === trip.service)?.title[languageIndex(lang)];

  return (
    <form className={`quote quote--${mode}`} noValidate onSubmit={submit} aria-label={copy.whatArranging}>
      {mode === 'full' && (
        <div className="quote__head">
          <div>
            <p className="eyebrow">{copy.startTrip}</p>
            <h3>{copy.whatArranging}</h3>
          </div>
          <span className="quote__badge"><ShieldCheck size={15} aria-hidden="true" />{copy.noPayment}</span>
        </div>
      )}
      {mode === 'full' && (
        <ol className="quote__steps" aria-label={text(lang, 'Quote steps', 'Étapes du devis', 'خطوات عرض السعر')}>
          <li className={step === 1 ? 'is-active' : 'is-done'} aria-current={step === 1 ? 'step' : undefined}><b>01</b>{copy.tripStep}</li>
          <li className={step === 2 ? 'is-active' : ''} aria-current={step === 2 ? 'step' : undefined}><b>02</b>{copy.contactStep}</li>
        </ol>
      )}
      {vehicleForService && (
        <div className="quote__vehicle">
          <Car size={20} aria-hidden="true" />
          <span><small>{copy.selectedVehicle}</small><strong>{vehicleForService.name}</strong></span>
          <b>{copy.from} {formatCurrency(vehicleForService.price, currency, lang)} {copy.day}</b>
        </div>
      )}
      {step === 1 && (
        <div className="quote__step">
          {fixedService ? (
            <div className="quote__fixed">
              <FixedIcon size={20} aria-hidden="true" />
              <span><small>{text(lang, 'Selected service', 'Service sélectionné', 'الخدمة المختارة')}</small><strong>{fixedService.title[languageIndex(lang)]}</strong></span>
              <b>{serviceHint(fixedService.key, copy)}</b>
            </div>
          ) : (
            <div className="service-tabs" role="group" aria-label={text(lang, 'Choose a service', 'Choisir un service', 'اختر خدمة')}>
              {services.map((item) => {
                const Icon = serviceIcon(item);
                return (
                  <button type="button" key={item.key} className={trip.service === item.key ? 'is-active' : ''} aria-pressed={trip.service === item.key} onClick={() => chooseService(item.key)}>
                    <Icon size={18} aria-hidden="true" />
                    <span><strong>{item.title[languageIndex(lang)]}</strong><small>{serviceHint(item.key, copy)}</small></span>
                  </button>
                );
              })}
            </div>
          )}
          <TripFields lang={lang} trip={trip} update={updateTrip} today={today} compact={mode === 'band'} />
          {error && <p className="feedback feedback--error" role="alert">{error}</p>}
          <div className="quote__actions">
            {mode === 'band' && <p className="quote__note"><ShieldCheck size={15} aria-hidden="true" />{copy.noPayment} · {text(lang, 'Availability and your fixed quote are confirmed by the VIPCAR team.', 'La disponibilité et votre devis fixe sont confirmés par l’équipe VIPCAR.', 'يؤكد فريق VIPCAR التوفر وعرض السعر الثابت.')}</p>}
            {mode === 'band' && trip.service === 'rental' && (
              <button className="btn btn--outline-light" type="button" onClick={(event) => continueTrip(event, 'fleet')}>{text(lang, 'Browse vehicles', 'Voir les véhicules', 'تصفح السيارات')}</button>
            )}
            <button className="btn btn--accent btn--block" type="button" onClick={(event) => continueTrip(event)}>{copy.continueToContact}<ArrowRight size={17} aria-hidden="true" /></button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="quote__step">
          <h4 ref={headingRef} tabIndex={-1} className="sr-only">{copy.contactStep}</h4>
          <div className="quote__review">
            <span>{copy.reviewTrip}</span>
            <strong>{serviceTitle}{vehicleForService ? ` · ${vehicleForService.name}` : ''}</strong>
            <small>{locationLabel(trip.pickup, lang)}{trip.dropoff ? ` → ${locationLabel(trip.dropoff, lang)}` : ''} · {trip.date}{trip.service === 'rental' && trip.endDate ? ` → ${trip.endDate}` : ''} · {trip.passengers} {copy.passengers.toLowerCase()}</small>
            <button type="button" className="link-btn" onClick={() => { setError(''); setStep(1); }}>{text(lang, 'Edit trip', 'Modifier le trajet', 'تعديل الرحلة')}</button>
          </div>
          <div className="contact-fields">
            <label className="field">
              <span><Users size={14} aria-hidden="true" />{copy.yourName}</span>
              <input required name="name" value={contact.name} onChange={updateContact} placeholder={copy.fullName} autoComplete="name" />
            </label>
            <label className="field">
              <span><MessageCircle size={14} aria-hidden="true" />{copy.phoneWhatsapp}</span>
              <input required name="phone" type="tel" value={contact.phone} onChange={updateContact} placeholder="+216…" autoComplete="tel" />
            </label>
            <label className="field">
              <span>{copy.email}</span>
              <input name="email" type="email" value={contact.email} onChange={updateContact} placeholder="name@example.com" autoComplete="email" />
            </label>
            <label className="field field--wide">
              <span><MapPin size={14} aria-hidden="true" />{copy.notesDestination}</span>
              <textarea name="notes" rows="3" value={contact.notes} onChange={updateContact} placeholder={copy.hotelFlightPlaceholder} />
            </label>
          </div>
          {error && <p className="feedback feedback--error" role="alert">{error}</p>}
          <div className="quote__actions quote__actions--split">
            <button className="btn btn--ghost" type="button" onClick={() => { setError(''); setStep(1); }}>{copy.back}</button>
            <button className="btn btn--accent" type="submit" disabled={submitting}>{submitting ? copy.sending : copy.getFixedQuote}{!submitting && <ArrowRight size={17} aria-hidden="true" />}</button>
          </div>
        </div>
      )}
      {mode === 'full' && <p className="quote__note">{copy.saveThenWhatsapp}</p>}
    </form>
  );
}

function pickTrip(values) {
  return Object.fromEntries(Object.keys(EMPTY_TRIP).filter((key) => key in values && key !== 'service').map((key) => [key, values[key]]));
}
