import React from 'react';
import { ApiError, apiBaseUrl } from '../api';
import {
  clearSession,
  getAccessToken,
  getStoredUser,
  isStaffUser,
  loadSessionUser,
  loginErrorMessage,
  logout,
  staffLogin,
} from '../auth';
import { getAdminLocale, setAdminLocale, t } from './i18n.js';
import { CorporatePage } from './CorporatePages.jsx';
import { DispatchPage } from './DispatchPages.jsx';
import { FleetPage } from './FleetPages.jsx';
import { DashboardPage } from './DashboardPage.jsx';
import { ReservationDetailPage, ReservationsListPage } from './ReservationsPages.jsx';
import { ArticleFormPage, ArticlesListPage } from './ArticlesPages.jsx';
import { QuoteDetailPage, QuotesListPage } from './QuotesPages.jsx';
import { VehicleFormPage, VehiclesListPage } from './VehiclesPages.jsx';

/** @typedef {'dashboard' | 'login' | 'reservations' | 'reservation-detail' | 'quotes' | 'quote-detail' | 'vehicles' | 'vehicle-form' | 'articles' | 'article-form' | 'fleet' | 'dispatch' | 'corporate' | 'unknown'} AdminPage */
/** @typedef {'loading' | 'ready' | 'denied'} AuthStatus */

/**
 * @param {string} pathname
 * @returns {{ page: AdminPage, path: string, reservationId?: string, quoteId?: string, vehicleSlug?: string, articleSlug?: string }}
 */
export function parseAdminRoute(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'admin') {
    return { page: 'unknown', path: pathname };
  }
  const rest = parts.slice(1);
  if (!rest.length) return { page: 'dashboard', path: '/admin' };
  if (rest[0] === 'login') return { page: 'login', path: '/admin/login' };
  if (rest[0] === 'reservations') {
    if (rest[1]) {
      return {
        page: 'reservation-detail',
        path: `/admin/reservations/${rest[1]}`,
        reservationId: rest[1],
      };
    }
    return { page: 'reservations', path: '/admin/reservations' };
  }
  if (rest[0] === 'quotes') {
    if (rest[1]) {
      return {
        page: 'quote-detail',
        path: `/admin/quotes/${rest[1]}`,
        quoteId: rest[1],
      };
    }
    return { page: 'quotes', path: '/admin/quotes' };
  }
  if (rest[0] === 'vehicles') {
    if (rest[1]) {
      return {
        page: 'vehicle-form',
        path: `/admin/vehicles/${rest[1]}`,
        vehicleSlug: decodeURIComponent(rest[1]),
      };
    }
    return { page: 'vehicles', path: '/admin/vehicles' };
  }
  if (rest[0] === 'articles') {
    if (rest[1]) {
      return {
        page: 'article-form',
        path: `/admin/articles/${rest[1]}`,
        articleSlug: decodeURIComponent(rest[1]),
      };
    }
    return { page: 'articles', path: '/admin/articles' };
  }
  if (rest[0] === 'fleet') return { page: 'fleet', path: '/admin/fleet' };
  if (rest[0] === 'dispatch') return { page: 'dispatch', path: '/admin/dispatch' };
  if (rest[0] === 'corporate') return { page: 'corporate', path: '/admin/corporate' };
  return { page: 'unknown', path: pathname };
}

function go(path) {
  history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Only allow same-origin admin paths as post-login redirects.
 * @param {string | null} raw
 */
function safeAdminNext(raw) {
  if (!raw || typeof raw !== 'string') return '/admin/quotes';
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded === '/admin' || decoded.startsWith('/admin/')) {
      if (decoded.startsWith('/admin/login')) return '/admin/quotes';
      return decoded;
    }
  } catch {
    /* ignore */
  }
  return '/admin/quotes';
}

function loginRedirectUrl(nextPath, reason) {
  const params = new URLSearchParams();
  if (nextPath && nextPath !== '/admin' && nextPath !== '/admin/quotes') {
    params.set('next', nextPath);
  }
  if (reason) params.set('reason', reason);
  const q = params.toString();
  return q ? `/admin/login?${q}` : '/admin/login';
}

function AdminLink({ href, children, className = '', onClick, ...props }) {
  return (
    <a
      {...props}
      className={className}
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        go(href);
      }}
    >
      {children}
    </a>
  );
}

function LocaleToggle({ locale, onLocale, id }) {
  return (
    <div className="admin-locale" role="group" aria-label="Language" id={id}>
      <button
        type="button"
        className={locale === 'en' ? 'is-active' : ''}
        aria-pressed={locale === 'en'}
        onClick={() => onLocale('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={locale === 'fr' ? 'is-active' : ''}
        aria-pressed={locale === 'fr'}
        onClick={() => onLocale('fr')}
      >
        FR
      </button>
    </div>
  );
}

/**
 * @param {{
 *   page: AdminPage,
 *   title: string,
 *   user: { name?: string, email?: string, role?: string } | null,
 *   locale: 'en' | 'fr',
 *   onLocale: (locale: 'en' | 'fr') => void,
 *   onLogout: () => void,
 *   children?: React.ReactNode,
 * }} props
 */
function AdminShell({ page, title, user, locale, onLocale, onLogout, children }) {
  const copy = t(locale);
  const [navOpen, setNavOpen] = React.useState(false);
  const navPage =
    page === 'reservation-detail'
      ? 'reservations'
      : page === 'quote-detail'
      ? 'quotes'
      : page === 'vehicle-form'
        ? 'vehicles'
        : page === 'article-form'
          ? 'articles'
          : page;
  const NAV = [
    { id: 'dashboard', href: '/admin', label: copy.nav.dashboard },
    { id: 'reservations', href: '/admin/reservations', label: copy.nav.reservations },
    { id: 'quotes', href: '/admin/quotes', label: copy.nav.quotes },
    { id: 'vehicles', href: '/admin/vehicles', label: copy.nav.vehicles },
    { id: 'articles', href: '/admin/articles', label: copy.nav.articles },
    { id: 'fleet', href: '/admin/fleet', label: copy.nav.fleet },
    { id: 'dispatch', href: '/admin/dispatch', label: copy.nav.dispatch },
    { id: 'corporate', href: '/admin/corporate', label: copy.nav.corporate },
  ];

  React.useEffect(() => {
    setNavOpen(false);
  }, [page]);

  React.useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  return (
    <div className={`admin-shell${navOpen ? ' admin-shell--nav-open' : ''}`}>
      {navOpen ? (
        <button
          type="button"
          className="admin-nav-backdrop"
          aria-label={locale === 'fr' ? 'Fermer le menu' : 'Close menu'}
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <aside className="admin-sidebar" id="admin-sidebar">
        <div className="admin-brand">
          <img src="/images/vipcar-logo.png" alt="VIPCAR Tunisia" />
          <span>Ops</span>
        </div>
        <nav className="admin-nav" aria-label="Staff navigation">
          {NAV.map((item) => (
            <AdminLink
              key={item.id}
              href={item.href}
              aria-current={navPage === item.id ? 'page' : undefined}
              onClick={() => setNavOpen(false)}
            >
              {item.label}
            </AdminLink>
          ))}
        </nav>
      </aside>
      <div className="admin-body">
        <header className="admin-topbar">
          <div className="admin-topbar__start">
            <button
              type="button"
              className="admin-nav-toggle"
              aria-expanded={navOpen}
              aria-controls="admin-sidebar"
              onClick={() => setNavOpen((open) => !open)}
            >
              <span className="admin-nav-toggle__bars" aria-hidden="true" />
              {locale === 'fr' ? 'Menu' : 'Menu'}
            </button>
            <p className="admin-topbar__title">{copy.staffBackoffice}</p>
          </div>
          <div className="admin-topbar__meta">
            <LocaleToggle locale={locale} onLocale={onLocale} />
            <span className="admin-topbar__user" title={user?.email || undefined}>
              {user?.name || user?.email || 'Staff'}
              {user?.role ? (
                <span className="admin-topbar__role">{user.role}</span>
              ) : null}
            </span>
            <button type="button" className="admin-topbar__logout" onClick={onLogout}>
              {copy.signOut}
            </button>
          </div>
        </header>
        <main className="admin-main">
          <h1>{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   banner?: string,
 *   locale: 'en' | 'fr',
 *   onLocale: (locale: 'en' | 'fr') => void,
 * }} props
 */
function LoginPage({ banner, locale, onLocale }) {
  const [error, setError] = React.useState(banner || '');
  const [submitting, setSubmitting] = React.useState(false);
  const next = safeAdminNext(new URLSearchParams(location.search).get('next'));

  React.useEffect(() => {
    if (banner) setError(banner);
  }, [banner]);

  React.useEffect(() => {
    if (!getAccessToken()) return undefined;
    const controller = new AbortController();
    loadSessionUser({ signal: controller.signal, locale })
      .then((user) => {
        if (isStaffUser(user)) go(next);
      })
      .catch(() => {
        /* stay on login */
      });
    return () => controller.abort();
  }, [next, locale]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    if (!email || password.length < 8) {
      setError(
        locale === 'fr'
          ? 'Saisissez votre e-mail et un mot de passe d’au moins 8 caractères.'
          : 'Enter your email and a password of at least 8 characters.',
      );
      return;
    }
    setSubmitting(true);
    try {
      await staffLogin({ email, password }, { locale });
      go(next);
    } catch (err) {
      setError(loginErrorMessage(err, locale));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__panel">
        <div className="admin-login__head">
          <div className="admin-login__brand">
            <img src="/images/vipcar-logo.png" alt="VIPCAR Tunisia" />
            <span>Ops</span>
          </div>
          <LocaleToggle locale={locale} onLocale={onLocale} />
        </div>
        <h1>{locale === 'fr' ? 'Connexion staff' : 'Staff sign in'}</h1>
        <p className="admin-muted admin-login__lead">
          {locale === 'fr'
            ? 'Agents ops et admins uniquement. Même origine que le site public (pas de second port).'
            : 'Ops agents and admins only. Same origin as the public site (no second port).'}
        </p>
        <form className="admin-login__form" onSubmit={submit} noValidate>
          <label className="admin-field">
            {locale === 'fr' ? 'E-mail' : 'Email'}
            <input
              required
              name="email"
              type="email"
              autoComplete="username"
              autoFocus
              disabled={submitting}
            />
          </label>
          <label className="admin-field">
            {locale === 'fr' ? 'Mot de passe' : 'Password'}
            <input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              disabled={submitting}
            />
          </label>
          {error ? (
            <p className="admin-login__error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="admin-login__submit" type="submit" disabled={submitting}>
            {submitting
              ? locale === 'fr'
                ? 'Connexion…'
                : 'Signing in…'
              : locale === 'fr'
                ? 'Se connecter'
                : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function reasonBanner(reason, locale) {
  if (reason === 'forbidden') {
    return locale === 'fr'
      ? 'Ce compte n’est pas autorisé pour le back-office. Réservé aux agents ops et admins.'
      : 'This account is not authorized for the staff backoffice. Ops agents and admins only.';
  }
  if (reason === 'session') {
    return locale === 'fr'
      ? 'Votre session a expiré. Reconnectez-vous pour continuer.'
      : 'Your session expired. Sign in again to continue.';
  }
  return '';
}

/**
 * @param {{ pathname: string }} props
 */
export function AdminApp({ pathname }) {
  const route = parseAdminRoute(pathname);
  const { page, path, reservationId, quoteId, vehicleSlug, articleSlug } = route;
  const [locale, setLocale] = React.useState(() => getAdminLocale());
  const [authStatus, setAuthStatus] = React.useState(
    /** @type {AuthStatus} */ (page === 'login' ? 'ready' : 'loading'),
  );
  const [user, setUser] = React.useState(() => getStoredUser());
  const copy = t(locale);

  React.useEffect(() => {
    document.title =
      page === 'login'
        ? locale === 'fr'
          ? 'Connexion staff | VIPCAR Ops'
          : 'Staff sign in | VIPCAR Ops'
        : page === 'reservations' || page === 'reservation-detail'
          ? `${copy.reservations.title} | VIPCAR Ops`
          : page === 'quotes' || page === 'quote-detail'
          ? `${copy.quotes.title} | VIPCAR Ops`
          : page === 'vehicles' || page === 'vehicle-form'
            ? `${copy.vehicles.title} | VIPCAR Ops`
            : page === 'articles' || page === 'article-form'
              ? `${copy.articles.title} | VIPCAR Ops`
              : page === 'fleet'
                ? `${copy.fleet.title} | VIPCAR Ops`
                : page === 'dispatch'
                  ? `${copy.dispatch.title} | VIPCAR Ops`
                  : page === 'corporate'
                    ? `${copy.corporate.title} | VIPCAR Ops`
                    : `${pageTitle(page, copy)} | VIPCAR Ops`;
    document.documentElement.lang = locale;

    let robots = document.head.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, nofollow');

    return () => {
      robots?.remove();
    };
  }, [page, locale, copy]);

  // Re-check auth when entering/leaving login or changing locale — not on every
  // in-app navigation (that aborted mid-refresh and cleared the session).
  const onLoginPage = page === 'login';
  React.useEffect(() => {
    if (onLoginPage) {
      setAuthStatus('ready');
      return undefined;
    }

    const controller = new AbortController();
    const intendedPath = path;
    setAuthStatus('loading');

    loadSessionUser({ signal: controller.signal, locale })
      .then((me) => {
        if (controller.signal.aborted) return;
        if (!isStaffUser(me)) {
          setAuthStatus('denied');
          go(loginRedirectUrl(intendedPath, 'forbidden'));
          return;
        }
        setUser(me);
        setAuthStatus('ready');
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === 'AbortError') return;
        const cached = getStoredUser();
        // Keep working through brief gateway/identity blips when tokens remain.
        if (
          err instanceof ApiError
          && err.status !== 401
          && err.status !== 403
          && isStaffUser(cached)
        ) {
          setUser(cached);
          setAuthStatus('ready');
          return;
        }
        clearSession();
        setAuthStatus('denied');
        go(loginRedirectUrl(intendedPath, 'session'));
      });

    return () => controller.abort();
    // path is only used for post-logout redirect; omit from deps on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-auth on each admin route
  }, [onLoginPage, locale]);

  const handleLocale = (next) => {
    setAdminLocale(next);
    setLocale(next);
  };

  const handleLogout = async () => {
    await logout({ locale });
    setUser(null);
    go('/admin/login');
  };

  if (page === 'login') {
    const reason = new URLSearchParams(location.search).get('reason');
    return (
      <div className="admin-root">
        <LoginPage
          banner={reasonBanner(reason, locale)}
          locale={locale}
          onLocale={handleLocale}
        />
      </div>
    );
  }

  if (authStatus !== 'ready') {
    return (
      <div className="admin-root">
        <div className="admin-login">
          <p className="admin-muted" aria-live="polite">
            {authStatus === 'denied' ? copy.redirectingSignIn : copy.checkingSession}
          </p>
        </div>
      </div>
    );
  }

  const title =
    page === 'dashboard'
      ? copy.dashboard.title
      : page === 'reservations' || page === 'reservation-detail'
        ? copy.reservations.title
      : page === 'quotes' || page === 'quote-detail'
      ? page === 'quote-detail'
        ? copy.quotes.detailTitle
        : copy.quotes.title
      : page === 'vehicles' || page === 'vehicle-form'
        ? page === 'vehicle-form'
          ? vehicleSlug === 'new'
            ? copy.vehicles.createTitle
            : copy.vehicles.editTitle
          : copy.vehicles.title
        : page === 'articles' || page === 'article-form'
          ? page === 'article-form'
            ? articleSlug === 'new'
              ? copy.articles.createTitle
              : copy.articles.editTitle
            : copy.articles.title
          : page === 'fleet'
            ? copy.fleet.title
            : page === 'dispatch'
              ? copy.dispatch.title
              : page === 'corporate'
                ? copy.corporate.title
                : pageTitle(page, copy);

  return (
    <div className="admin-root">
      <AdminShell
        page={page}
        title={title}
        user={user}
        locale={locale}
        onLocale={handleLocale}
        onLogout={handleLogout}
      >
        {page === 'dashboard' ? (
          <DashboardPage locale={locale} copy={copy} navigate={go} />
        ) : null}
        {page === 'reservations' ? (
          <ReservationsListPage locale={locale} copy={copy} navigate={go} />
        ) : null}
        {page === 'reservation-detail' && reservationId ? (
          <ReservationDetailPage reservationId={reservationId} locale={locale} copy={copy} navigate={go} />
        ) : null}
        {page === 'quotes' ? (
          <QuotesListPage locale={locale} copy={copy} navigate={go} />
        ) : null}
        {page === 'quote-detail' && quoteId ? (
          <QuoteDetailPage quoteId={quoteId} locale={locale} copy={copy} navigate={go} />
        ) : null}
        {page === 'vehicles' ? (
          <VehiclesListPage locale={locale} copy={copy} navigate={go} />
        ) : null}
        {page === 'vehicle-form' && vehicleSlug ? (
          <VehicleFormPage
            slug={vehicleSlug === 'new' ? null : vehicleSlug}
            locale={locale}
            copy={copy}
            navigate={go}
          />
        ) : null}
        {page === 'articles' ? (
          <ArticlesListPage locale={locale} copy={copy} navigate={go} />
        ) : null}
        {page === 'article-form' && articleSlug ? (
          <ArticleFormPage
            slug={articleSlug === 'new' ? null : articleSlug}
            locale={locale}
            copy={copy}
            navigate={go}
          />
        ) : null}
        {page === 'fleet' ? <FleetPage locale={locale} copy={copy} /> : null}
        {page === 'dispatch' ? <DispatchPage locale={locale} copy={copy} /> : null}
        {page === 'corporate' ? <CorporatePage locale={locale} copy={copy} /> : null}
        {page === 'unknown' ? (
          <>
            <p className="admin-muted">{copy.stubs.unknown}</p>
            <p className="admin-muted" style={{ marginTop: '1rem' }}>
              Gateway: <code>{apiBaseUrl || '(set VITE_API_URL)'}</code>
            </p>
            <p className="admin-muted" style={{ marginTop: '1rem' }}>
              <AdminLink href="/admin/quotes">{copy.stubs.backDashboard}</AdminLink>
            </p>
          </>
        ) : null}
      </AdminShell>
    </div>
  );
}

/**
 * @param {AdminPage} page
 * @param {ReturnType<typeof t>} copy
 */
function pageTitle(page, copy) {
  if (page === 'dashboard') return copy.dashboard.title;
  if (page === 'vehicles' || page === 'vehicle-form') return copy.vehicles.title;
  if (page === 'articles' || page === 'article-form') return copy.articles.title;
  if (page === 'fleet') return copy.fleet.title;
  if (page === 'dispatch') return copy.dispatch.title;
  if (page === 'corporate') return copy.corporate.title;
  return 'Admin';
}

export function isAdminPathname(pathname = location.pathname) {
  return pathname.split('/').filter(Boolean)[0] === 'admin';
}
