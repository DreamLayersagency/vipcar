import { api, ApiError } from './api.js';

const ACCESS_KEY = 'vipcar_access_token';
const REFRESH_KEY = 'vipcar_refresh_token';
const USER_KEY = 'vipcar_user';

/** Staff roles allowed into `/admin`. */
export const STAFF_ROLES = Object.freeze(['ops_agent', 'admin']);

/** @type {Promise<{ accessToken: string, refreshToken: string, user: object }> | null} */
let refreshInFlight = null;

/**
 * @returns {string | null}
 */
export function getAccessToken() {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

/**
 * @returns {string | null}
 */
export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

/**
 * @returns {{ id: string, email: string, name: string, role: string, locale?: string } | null}
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {{ role?: string } | null | undefined} user
 */
export function isStaffUser(user) {
  return Boolean(user?.role && STAFF_ROLES.includes(user.role));
}

/**
 * @param {{ accessToken: string, refreshToken: string, user: object }} session
 */
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

/**
 * @param {unknown} payload
 * @returns {{ accessToken: string, refreshToken: string, user: object }}
 */
function requireAuthResult(payload) {
  const data = payload?.data;
  if (!data?.accessToken || !data?.refreshToken || !data?.user) {
    throw new ApiError({
      status: 502,
      code: 'AUTH_MALFORMED',
      message: 'Auth response missing tokens',
    });
  }
  return data;
}

/**
 * @param {{ email: string, password: string }} body
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [options]
 */
export async function login(body, options = {}) {
  const payload = await api('/v1/auth/login', {
    method: 'POST',
    body,
    locale: options.locale,
    signal: options.signal,
  });
  const data = requireAuthResult(payload);
  storeSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  });
  return data;
}

/**
 * Staff login: same tokens as customer auth, then reject non-staff roles.
 * @param {{ email: string, password: string }} body
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [options]
 */
export async function staffLogin(body, options = {}) {
  const data = await login(body, options);
  if (!isStaffUser(data.user)) {
    clearSession();
    throw new ApiError({
      status: 403,
      code: 'FORBIDDEN_ROLE',
      message: 'Staff role required',
    });
  }
  const me = await fetchMe({
    token: data.accessToken,
    locale: options.locale,
    signal: options.signal,
  });
  if (!isStaffUser(me)) {
    clearSession();
    throw new ApiError({
      status: 403,
      code: 'FORBIDDEN_ROLE',
      message: 'Staff role required',
    });
  }
  storeSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: me,
  });
  return { ...data, user: me };
}

/**
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal, token?: string | null }} [options]
 */
export async function fetchMe(options = {}) {
  const token = options.token ?? getAccessToken();
  if (!token) {
    throw new ApiError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Not signed in',
    });
  }
  const payload = await api('/v1/auth/me', {
    token,
    locale: options.locale,
    signal: options.signal,
  });
  const user = payload?.data;
  if (!user?.id || !user?.role) {
    throw new ApiError({
      status: 502,
      code: 'AUTH_MALFORMED',
      message: 'Me response missing user',
    });
  }
  return user;
}

/**
 * Rotate tokens via `POST /v1/auth/refresh`. Dedupes concurrent callers.
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [options]
 */
/**
 * @param {unknown} err
 * @param {AbortSignal | undefined} signal
 */
function isAbortError(err, signal) {
  return (
    Boolean(signal?.aborted)
    || (err instanceof DOMException && err.name === 'AbortError')
    || (err instanceof Error && err.name === 'AbortError')
  );
}

export async function refreshSession(options = {}) {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSession();
      throw new ApiError({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'No refresh token',
      });
    }
    try {
      const payload = await api('/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        locale: options.locale,
        signal: options.signal,
      });
      const data = requireAuthResult(payload);
      storeSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      return data;
    } catch (err) {
      // Aborted navigations must not wipe a valid refresh token.
      if (!isAbortError(err, options.signal)) {
        clearSession();
      }
      throw err;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Gateway call with Bearer token; on 401, refresh once and retry.
 * @param {string} path
 * @param {Parameters<typeof api>[1] & { _retried?: boolean }} [options]
 */
export async function apiWithAuth(path, options = {}) {
  const { _retried, ...rest } = options;
  const token = rest.token ?? getAccessToken();
  try {
    return await api(path, { ...rest, token });
  } catch (err) {
    if (
      err instanceof ApiError
      && err.status === 401
      && !_retried
      && getRefreshToken()
      && !path.includes('/auth/refresh')
      && !path.includes('/auth/login')
    ) {
      const next = await refreshSession({
        locale: rest.locale,
        signal: rest.signal,
      });
      return api(path, {
        ...rest,
        token: next.accessToken,
      });
    }
    throw err;
  }
}

/**
 * Load current user; refresh access token once if `/me` returns 401.
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [options]
 */
export async function loadSessionUser(options = {}) {
  if (!getAccessToken() && !getRefreshToken()) {
    throw new ApiError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Not signed in',
    });
  }
  try {
    const user = await fetchMe({
      locale: options.locale,
      signal: options.signal,
    });
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    if (accessToken && refreshToken) {
      storeSession({ accessToken, refreshToken, user });
    }
    return user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && getRefreshToken()) {
      const next = await refreshSession({
        locale: options.locale,
        signal: options.signal,
      });
      return next.user;
    }
    throw err;
  }
}

/**
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [options]
 */
export async function logout(options = {}) {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await api('/v1/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        locale: options.locale,
        signal: options.signal,
      });
    }
  } catch {
    /* still clear local session */
  } finally {
    clearSession();
  }
}

/**
 * @param {unknown} error
 * @param {'en' | 'fr' | 'ar'} lang
 */
export function loginErrorMessage(error, lang) {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === 'API_URL_MISSING') {
      return lang === 'en'
        ? 'Sign-in is not configured. Please try again later or contact VIPCAR.'
        : lang === 'ar'
          ? 'تسجيل الدخول غير مهيأ حالياً. حاول لاحقاً أو تواصل مع VIPCAR.'
          : 'La connexion n’est pas configurée. Réessayez plus tard ou contactez VIPCAR.';
    }
    if (error.code === 'FORBIDDEN_ROLE') {
      return lang === 'en'
        ? 'This account is not authorized for the staff backoffice. Ops agents and admins only.'
        : lang === 'ar'
          ? 'هذا الحساب غير مصرح له بالدخول إلى لوحة الموظفين. الدخول مخصص للوكلاء والمديرين.'
          : 'Ce compte n’est pas autorisé pour le back-office. Réservé aux agents ops et admins.';
    }
    if (error.status === 401 || error.status === 403) {
      return lang === 'en'
        ? 'Incorrect email or password.'
        : lang === 'ar'
          ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
          : 'E-mail ou mot de passe incorrect.';
    }
    if (error.status >= 400 && error.status < 500) {
      return error.message
        || (lang === 'en'
          ? 'Please check your details and try again.'
          : lang === 'ar'
            ? 'تحقق من بياناتك وحاول مرة أخرى.'
            : 'Vérifiez vos informations et réessayez.');
    }
  }
  return lang === 'en'
    ? 'We could not sign you in. Please try again in a moment.'
    : lang === 'ar'
      ? 'تعذر تسجيل دخولك. حاول مرة أخرى بعد قليل.'
      : 'Impossible de vous connecter. Réessayez dans un instant.';
}
