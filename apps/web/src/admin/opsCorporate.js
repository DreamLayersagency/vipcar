import { apiWithAuth } from '../auth.js';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   billingEmail: string,
 *   notes: string | null,
 *   isActive: boolean,
 *   createdAt: string,
 *   updatedAt: string,
 * }} CorporateAccount
 */

/**
 * @typedef {{
 *   id: string,
 *   email: string,
 *   name: string,
 *   phone: string | null,
 *   locale: string,
 *   role: string,
 *   corporateAccountId: string | null,
 *   isActive: boolean,
 * }} CorporateManager
 */

/**
 * @typedef {{ page: number, limit: number, total: number }} PaginationMeta
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {string} value
 */
export function isUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

/**
 * @param {string} id
 */
export function shortId(id) {
  const s = String(id || '');
  if (s.length <= 12) return s;
  return `${s.slice(0, 8)}…`;
}

/**
 * @param {{
 *   page?: number,
 *   limit?: number,
 *   locale?: 'en' | 'fr',
 *   signal?: AbortSignal,
 * }} [opts]
 * @returns {Promise<{ data: CorporateAccount[], meta: PaginationMeta }>}
 */
export async function listCorporateAccounts(opts = {}) {
  const params = new URLSearchParams();
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  const payload = await apiWithAuth(`/v1/ops/corporate-accounts${q ? `?${q}` : ''}`, {
    locale: opts.locale,
    signal: opts.signal,
  });
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: {
      page: payload?.meta?.page ?? opts.page ?? 1,
      limit: payload?.meta?.limit ?? opts.limit ?? 20,
      total: payload?.meta?.total ?? 0,
    },
  };
}

/**
 * @param {{
 *   name: string,
 *   billingEmail: string,
 *   notes?: string,
 * }} body
 * @param {{ locale?: 'en' | 'fr' }} [opts]
 * @returns {Promise<CorporateAccount>}
 */
export async function createCorporateAccount(body, opts = {}) {
  const payload = await apiWithAuth('/v1/ops/corporate-accounts', {
    method: 'POST',
    locale: opts.locale,
    body: JSON.stringify({
      name: body.name.trim(),
      billingEmail: body.billingEmail.trim().toLowerCase(),
      ...(body.notes?.trim() ? { notes: body.notes.trim() } : {}),
    }),
  });
  return payload?.data;
}

/**
 * @param {string} corporateAccountId
 * @param {{
 *   userId?: string,
 *   email?: string,
 *   name?: string,
 *   password?: string,
 *   phone?: string,
 *   locale?: 'en' | 'fr',
 * }} body
 * @param {{ locale?: 'en' | 'fr' }} [opts]
 * @returns {Promise<CorporateManager>}
 */
export async function linkCorporateManager(corporateAccountId, body, opts = {}) {
  /** @type {Record<string, string>} */
  const payloadBody = {};
  if (body.userId?.trim()) payloadBody.userId = body.userId.trim();
  if (body.email?.trim()) payloadBody.email = body.email.trim().toLowerCase();
  if (body.name?.trim()) payloadBody.name = body.name.trim();
  if (body.password) payloadBody.password = body.password;
  if (body.phone?.trim()) payloadBody.phone = body.phone.trim();
  if (body.locale) payloadBody.locale = body.locale;

  const payload = await apiWithAuth(
    `/v1/ops/corporate-accounts/${encodeURIComponent(corporateAccountId)}/managers`,
    {
      method: 'POST',
      locale: opts.locale,
      body: JSON.stringify(payloadBody),
    },
  );
  return payload?.data;
}

/**
 * @param {{ name: string, billingEmail: string }} form
 * @returns {Record<string, string>}
 */
export function validateCreateForm(form) {
  /** @type {Record<string, string>} */
  const errors = {};
  if (!form.name?.trim()) errors.name = 'required';
  if (!form.billingEmail?.trim()) errors.billingEmail = 'required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.billingEmail.trim())) {
    errors.billingEmail = 'email';
  }
  return errors;
}

/**
 * @param {{
 *   corporateAccountId: string,
 *   mode: 'link' | 'invite',
 *   userId: string,
 *   email: string,
 *   name: string,
 *   password: string,
 * }} form
 * @returns {Record<string, string>}
 */
export function validateLinkForm(form) {
  /** @type {Record<string, string>} */
  const errors = {};
  if (!isUuid(form.corporateAccountId)) errors.corporateAccountId = 'uuid';

  if (form.mode === 'link') {
    const hasUserId = Boolean(form.userId?.trim());
    const hasEmail = Boolean(form.email?.trim());
    if (!hasUserId && !hasEmail) {
      errors.userId = 'identity';
      errors.email = 'identity';
    }
    if (hasUserId && !isUuid(form.userId)) errors.userId = 'uuid';
    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'email';
    }
  } else {
    if (!form.email?.trim()) errors.email = 'required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'email';
    }
    if (!form.name?.trim()) errors.name = 'required';
    if (!form.password || form.password.length < 8) errors.password = 'password';
  }
  return errors;
}
