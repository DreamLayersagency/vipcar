import { apiWithAuth } from '../auth.js';

/**
 * @typedef {{ heading: string, text: string }} ArticleSection
 */

/**
 * @typedef {{
 *   id: string,
 *   slug: string,
 *   titleEn: string,
 *   titleFr: string,
 *   summaryEn: string,
 *   summaryFr: string,
 *   sectionsEn: ArticleSection[],
 *   sectionsFr: ArticleSection[],
 *   imageKey: string,
 *   publishedAt: string | null,
 *   isPublished: boolean,
 * }} AdminArticle
 */

/**
 * @typedef {{ page: number, limit: number, total: number }} PaginationMeta
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * @param {{
 *   isPublished?: boolean,
 *   page?: number,
 *   limit?: number,
 *   locale?: 'en' | 'fr',
 *   signal?: AbortSignal,
 * }} [opts]
 * @returns {Promise<{ data: AdminArticle[], meta: PaginationMeta }>}
 */
export async function listOpsArticles(opts = {}) {
  const params = new URLSearchParams();
  if (typeof opts.isPublished === 'boolean') {
    params.set('isPublished', opts.isPublished ? 'true' : 'false');
  }
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  const payload = await apiWithAuth(`/v1/ops/cms/articles${q ? `?${q}` : ''}`, {
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
 * @param {string} slug
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts]
 * @returns {Promise<AdminArticle>}
 */
export async function getOpsArticle(slug, opts = {}) {
  const payload = await apiWithAuth(`/v1/ops/cms/articles/${encodeURIComponent(slug)}`, {
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload.data;
}

/**
 * @param {string} slug
 * @param {Omit<AdminArticle, 'id' | 'publishedAt'> & { slug: string }} body
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts]
 * @returns {Promise<AdminArticle>}
 */
export async function upsertOpsArticle(slug, body, opts = {}) {
  const payload = await apiWithAuth(`/v1/ops/cms/articles/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body,
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload.data;
}

/**
 * @param {string} name
 */
export function slugifyTitle(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * @returns {ArticleSection}
 */
export function emptySection() {
  return { heading: '', text: '' };
}

export function emptyArticleForm() {
  return {
    slug: '',
    titleEn: '',
    titleFr: '',
    summaryEn: '',
    summaryFr: '',
    sectionsEn: [emptySection()],
    sectionsFr: [emptySection()],
    imageKey: '',
    isPublished: false,
  };
}

/**
 * @param {AdminArticle} article
 */
export function articleToForm(article) {
  return {
    slug: article.slug,
    titleEn: article.titleEn,
    titleFr: article.titleFr,
    summaryEn: article.summaryEn,
    summaryFr: article.summaryFr,
    sectionsEn:
      Array.isArray(article.sectionsEn) && article.sectionsEn.length
        ? article.sectionsEn.map((s) => ({ heading: s.heading || '', text: s.text || '' }))
        : [emptySection()],
    sectionsFr:
      Array.isArray(article.sectionsFr) && article.sectionsFr.length
        ? article.sectionsFr.map((s) => ({ heading: s.heading || '', text: s.text || '' }))
        : [emptySection()],
    imageKey: article.imageKey || '',
    isPublished: Boolean(article.isPublished),
  };
}

/**
 * @param {ArticleSection[]} sections
 */
function normalizeSections(sections) {
  return (Array.isArray(sections) ? sections : [])
    .map((s) => ({
      heading: String(s?.heading || '').trim(),
      text: String(s?.text || '').trim(),
    }))
    .filter((s) => s.heading || s.text);
}

/**
 * @param {Record<string, unknown>} form
 */
export function toUpsertBody(form) {
  return {
    slug: String(form.slug || '').trim(),
    titleEn: String(form.titleEn || '').trim(),
    titleFr: String(form.titleFr || '').trim(),
    summaryEn: String(form.summaryEn || '').trim(),
    summaryFr: String(form.summaryFr || '').trim(),
    sectionsEn: normalizeSections(/** @type {ArticleSection[]} */ (form.sectionsEn)),
    sectionsFr: normalizeSections(/** @type {ArticleSection[]} */ (form.sectionsFr)),
    imageKey: String(form.imageKey || '').trim(),
    isPublished: Boolean(form.isPublished),
  };
}

/**
 * Client-side validation aligned with UpsertArticleDto.
 * @param {Record<string, unknown>} form
 * @param {{ editing?: boolean }} [opts]
 * @returns {Record<string, string>}
 */
export function validateArticleForm(form, opts = {}) {
  /** @type {Record<string, string>} */
  const errors = {};
  const slug = String(form.slug || '').trim();
  const titleEn = String(form.titleEn || '').trim();
  const titleFr = String(form.titleFr || '').trim();
  const summaryEn = String(form.summaryEn || '').trim();
  const summaryFr = String(form.summaryFr || '').trim();
  const imageKey = String(form.imageKey || '').trim();
  const sectionsEn = normalizeSections(/** @type {ArticleSection[]} */ (form.sectionsEn));
  const sectionsFr = normalizeSections(/** @type {ArticleSection[]} */ (form.sectionsFr));

  if (!slug) errors.slug = 'required';
  else if (!SLUG_RE.test(slug)) errors.slug = 'slug';
  else if (!opts.editing && slug === 'new') errors.slug = 'reserved';

  if (!titleEn) errors.titleEn = 'required';
  if (!titleFr) errors.titleFr = 'required';
  if (!summaryEn) errors.summaryEn = 'required';
  if (!summaryFr) errors.summaryFr = 'required';
  if (!imageKey) errors.imageKey = 'required';

  if (!sectionsEn.length) errors.sectionsEn = 'sections';
  else if (sectionsEn.some((s) => !s.heading || !s.text)) errors.sectionsEn = 'sectionFields';

  if (!sectionsFr.length) errors.sectionsFr = 'sections';
  else if (sectionsFr.some((s) => !s.heading || !s.text)) errors.sectionsFr = 'sectionFields';

  return errors;
}

/**
 * @param {string | null | undefined} iso
 * @param {'en' | 'fr'} locale
 */
export function formatPublishedAt(iso, locale) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-TN' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}
