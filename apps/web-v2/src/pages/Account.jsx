import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, LogOut } from 'lucide-react';
import {
  bookingServiceLabel, bookingStatusLabel, bookingsErrorMessage, clearSession, formatBookingDate, formatCurrency,
  getAccessToken, getStoredUser, isAbortError, listMyBookings, login, loginErrorMessage, safeNextPath,
} from '../../../../libs/web-client/src/index.js';
import { t, text } from '../i18n.js';
import { href, Link, navigate, useQuery } from '../router.jsx';
import { useCurrency } from '../state.jsx';
import { EmptyState, ErrorState, LoadingState, PageHero } from '../components/Blocks.jsx';

const BASE = import.meta.env.BASE_URL;

export function LoginPage({ lang }) {
  const query = useQuery();
  const next = safeNextPath(query.get('next'), { lang, basePath: BASE });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (getAccessToken()) navigate(next, { replace: true });
  }, [next]);
  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    if (!email || password.length < 8) {
      setError(text(lang, 'Enter your email and a password of at least 8 characters.', 'Saisissez votre e-mail et un mot de passe d’au moins 8 caractères.', 'أدخل بريدك الإلكتروني وكلمة مرور من 8 أحرف على الأقل.'));
      return;
    }
    setSubmitting(true);
    try {
      await login({ email, password }, { locale: lang });
      navigate(next);
    } catch (err) {
      setError(loginErrorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main>
      <PageHero image="interior.jpg" eyebrow={text(lang, 'VIPCAR account', 'Compte VIPCAR', 'حساب VIPCAR')} title={text(lang, 'Sign in to your account.', 'Connectez-vous à votre compte.', 'سجّل الدخول إلى حسابك.')} intro={text(lang, 'View your confirmed bookings, trip details and status in one place.', 'Consultez vos réservations confirmées, les détails de trajet et leur statut.', 'اطّلع على حجوزاتك المؤكدة وتفاصيل رحلاتك وحالتها في مكان واحد.')} />
      <section className="section">
        <div className="container container--form">
          <div className="panel">
            <h2 className="panel__title">{text(lang, 'Sign in', 'Connexion', 'تسجيل الدخول')}</h2>
            <p className="panel__lead">{text(lang, 'Use the email and password from your VIPCAR customer account.', 'Utilisez l’e-mail et le mot de passe de votre compte client VIPCAR.', 'استخدم البريد الإلكتروني وكلمة المرور الخاصين بحسابك لدى VIPCAR.')}</p>
            <form className="form-stack" onSubmit={submit} noValidate>
              <label className="field"><span>{text(lang, 'Email', 'E-mail', 'البريد الإلكتروني')}</span><input required name="email" type="email" autoComplete="email" /></label>
              <label className="field"><span>{text(lang, 'Password', 'Mot de passe', 'كلمة المرور')}</span><input required name="password" type="password" autoComplete="current-password" minLength={8} /></label>
              {error && <p className="feedback feedback--error" role="alert">{error}</p>}
              <button className="btn btn--accent" type="submit" disabled={submitting}>
                {submitting ? text(lang, 'Signing in…', 'Connexion…', 'جارٍ تسجيل الدخول…') : text(lang, 'Sign in', 'Se connecter', 'تسجيل الدخول')}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

export function MyBookingsPage({ lang }) {
  const { currency } = useCurrency();
  const token = getAccessToken();
  const user = getStoredUser();
  const [state, setState] = useState({ status: 'loading', bookings: [], error: null });
  const loginPath = href(lang, `/login?next=${encodeURIComponent(href(lang, '/my-bookings'))}`);

  useEffect(() => {
    if (!token) {
      navigate(loginPath, { replace: true });
      return undefined;
    }
    const controller = new AbortController();
    setState({ status: 'loading', bookings: [], error: null });
    listMyBookings({ locale: lang, signal: controller.signal, token })
      .then((payload) => setState({ status: 'success', bookings: Array.isArray(payload?.data) ? payload.data : [], error: null }))
      .catch((err) => {
        if (isAbortError(err, controller.signal)) return;
        if (err?.status === 401 || err?.status === 403) {
          clearSession();
          navigate(loginPath, { replace: true });
          return;
        }
        setState({ status: 'error', bookings: [], error: bookingsErrorMessage(err, lang) });
      });
    return () => controller.abort();
  }, [lang, token, loginPath]);

  if (!token) {
    return <main className="section"><div className="container"><LoadingState label={text(lang, 'Redirecting to sign in…', 'Redirection vers la connexion…', 'جارٍ تحويلك إلى صفحة تسجيل الدخول…')} /></div></main>;
  }

  const signOut = () => {
    clearSession();
    navigate(href(lang, '/login'));
  };

  return (
    <main>
      <PageHero image="luxury-rear.jpg" eyebrow={text(lang, 'My bookings', 'Mes réservations', 'حجوزاتي')} title={text(lang, 'Your VIPCAR journeys.', 'Vos trajets VIPCAR.', 'رحلاتك مع VIPCAR.')} intro={text(lang, 'Confirmed bookings for your account. Prices shown are the amounts recorded with your booking.', 'Les réservations confirmées de votre compte. Les montants affichés sont ceux enregistrés avec la réservation.', 'حجوزات حسابك المؤكدة. الأسعار المعروضة هي المبالغ المسجلة في حجزك.')} />
      <section className="section">
        <div className="container">
          <div className="account-bar">
            <div>
              <p className="eyebrow">{text(lang, 'Customer account', 'Compte client', 'حساب العميل')}</p>
              <h2>{user?.name || user?.email || text(lang, 'Your bookings', 'Vos réservations', 'حجوزاتك')}</h2>
            </div>
            <button type="button" className="btn btn--ghost-dark btn--sm" onClick={signOut}><LogOut size={15} aria-hidden="true" />{text(lang, 'Sign out', 'Se déconnecter', 'تسجيل الخروج')}</button>
          </div>
          {state.status === 'loading' && <LoadingState label={text(lang, 'Loading bookings…', 'Chargement des réservations…', 'جارٍ تحميل الحجوزات…')} />}
          {state.status === 'error' && <ErrorState lang={lang} message={state.error} />}
          {state.status === 'success' && state.bookings.length === 0 && (
            <EmptyState>
              <p>{text(lang, 'No bookings yet. Request a quote and our team will confirm your trip.', 'Aucune réservation pour le moment. Demandez un devis et notre équipe confirmera votre trajet.', 'لا توجد حجوزات بعد. اطلب عرض سعر وسيؤكد فريقنا رحلتك.')}</p>
              <Link className="btn btn--accent btn--sm" to={href(lang, '/booking')}>{t(lang).book}<ArrowRight size={15} aria-hidden="true" /></Link>
            </EmptyState>
          )}
          {state.status === 'success' && state.bookings.length > 0 && (
            <ul className="booking-list">
              {state.bookings.map((booking) => (
                <li key={booking.id} className="booking-item">
                  <div>
                    <p className="eyebrow">{bookingServiceLabel(booking.type, lang)}</p>
                    <strong>{booking.pickupLabel || '—'}</strong>
                    {booking.dropoffLabel && <span className="booking-item__route">→ {booking.dropoffLabel}</span>}
                    <div className="booking-item__meta">
                      <span><CalendarDays size={15} aria-hidden="true" />{formatBookingDate(booking.startAt, lang)}</span>
                      {booking.endAt && booking.endAt !== booking.startAt && <span><Clock3 size={15} aria-hidden="true" />{formatBookingDate(booking.endAt, lang)}</span>}
                    </div>
                  </div>
                  <div className="booking-item__side">
                    <span className={`status status--${booking.status}`}>{bookingStatusLabel(booking.status, lang)}</span>
                    <span className="booking-item__price">{formatCurrency(booking.priceTnd, currency, lang)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
