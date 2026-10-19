import { api, ApiError, isAbortError } from './api.js';

/**
 * Customer session helpers. Storage keys and token format are identical to
 * App 1 (`apps/web/src/auth.js`), so on a shared origin both views see the
 * same signed-in customer without passing tokens around.
 */
const ACCESS_KEY = 'vipcar_access_token';
const REFRESH_KEY = 'vipcar_refresh_token';
const USER_KEY = 'vipcar_user';

/** @type {Promise<{ accessToken: string, refreshToken: string, user: object }> | null} */
let refreshInFlight = null;

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return read(ACCESS_KEY);
}

export function getRefreshToken() {
  return read(REFRESH_KEY);
}

/** @returns {{ id: string, email: string, name: string, role: string, locale?: string } | null} */
export function getStoredUser() {
  try {
    const raw = read(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @param {{ accessToken: string, refreshToken: string, user: object }} session */
export function storeSession({ accessToken, refreshToken, user }) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

function requireAuthResult(payload) {
  const data = payload?.data;
  if (!data?.accessToken || !data?.refreshToken || !data?.user) {
    throw new ApiError({ status: 502, code: 'AUTH_MALFORMED', message: 'Auth response missing tokens' });
  }
  return data;
}

/**
 * @param {{ email: string, password: string }} body
 * @param {{ locale?: string, signal?: AbortSignal }} [options]
 */
export async function login(body, options = {}) {
  const payload = await api('/v1/auth/login', { method: 'POST', body, locale: options.locale, signal: options.signal });
  const data = requireAuthResult(payload);
  storeSession(data);
  return data;
}

/** Rotate tokens via `POST /v1/auth/refresh`; concurrent callers share one request. */
export async function refreshSession(options = {}) {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSession();
      throw new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'No refresh token' });
    }
    try {
      const payload = await api('/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        locale: options.locale,
        signal: options.signal,
      });
      const data = requireAuthResult(payload);
      storeSession(data);
      return data;
    } catch (err) {
      // Aborted navigations must not wipe a valid refresh token.
      if (!isAbortError(err, options.signal)) clearSession();
      throw err;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/**
 * Gateway call with the stored Bearer token; on 401, refresh once and retry.
 * @param {string} path
 * @param {Parameters<typeof api>[1]} [options]
 */
export async function apiWithAuth(path, options = {}) {
  const token = options.token ?? getAccessToken();
  try {
    return await api(path, { ...options, token });
  } catch (err) {
    if (
      err instanceof ApiError
      && err.status === 401
      && getRefreshToken()
      && !path.includes('/auth/refresh')
      && !path.includes('/auth/login')
    ) {
      const next = await refreshSession({ locale: options.locale, signal: options.signal });
      return api(path, { ...options, token: next.accessToken });
    }
    throw err;
  }
}

/**
 * Only same-view, same-locale paths are accepted as a post-login redirect.
 * @param {string | null | undefined} raw value of `?next=`
 * @param {{ lang: string, basePath?: string, fallback?: string }} options
 */
export function safeNextPath(raw, { lang, basePath = '/', fallback = '/my-bookings' }) {
  const base = `/${String(basePath).replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '');
  const home = `${base}/${lang}`;
  const defaultPath = `${home}${fallback}`;
  if (!raw || typeof raw !== 'string') return defaultPath;
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith('//') || decoded.includes(String.fromCharCode(92))) return defaultPath;
    if (decoded === home || decoded.startsWith(`${home}/`) || decoded.startsWith(`${home}?`)) return decoded;
  } catch {
    /* ignore */
  }
  return defaultPath;
}

/**
 * @param {unknown} error
 * @param {'en' | 'fr' | 'ar'} lang
 */
export function loginErrorMessage(error, lang) {
  const pick = (en, fr, ar) => (lang === 'ar' ? ar : lang === 'fr' ? fr : en);
  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === 'API_URL_MISSING') {
      return pick(
        'Sign-in is not configured. Please try again later or contact VIPCAR.',
        'La connexion n’est pas configurée. Réessayez plus tard ou contactez VIPCAR.',
        'تسجيل الدخول غير مهيأ حالياً. حاول لاحقاً أو تواصل مع VIPCAR.',
      );
    }
    if (error.status === 401 || error.status === 403) {
      return pick('Incorrect email or password.', 'E-mail ou mot de passe incorrect.', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }
    if (error.status >= 400 && error.status < 500) {
      return error.message || pick('Please check your details and try again.', 'Vérifiez vos informations et réessayez.', 'تحقق من بياناتك وحاول مرة أخرى.');
    }
  }
  return pick(
    'We could not sign you in. Please try again in a moment.',
    'Impossible de vous connecter. Réessayez dans un instant.',
    'تعذر تسجيل دخولك. حاول مرة أخرى بعد قليل.',
  );
}
