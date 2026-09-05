import React from 'react';
import { ApiError } from '../api.js';
import {
  articleToForm,
  emptyArticleForm,
  emptySection,
  formatPublishedAt,
  getOpsArticle,
  listOpsArticles,
  slugifyTitle,
  toUpsertBody,
  upsertOpsArticle,
  validateArticleForm,
} from './opsCms.js';

/**
 * @param {string} href
 * @param {(path: string) => void} navigate
 * @param {React.ReactNode} children
 * @param {string} [className]
 */
function Link({ href, navigate, children, className = '' }) {
  return (
    <a
      className={className}
      href={href}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

/**
 * @param {{ message: string, onRetry?: () => void, retryLabel?: string }} props
 */
function ErrorBanner({ message, onRetry, retryLabel }) {
  return (
    <div className="admin-banner admin-banner--error" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onRetry}>
          {retryLabel || 'Retry'}
        </button>
      ) : null}
    </div>
  );
}

/**
 * @param {{ message: string }} props
 */
function SuccessBanner({ message }) {
  return (
    <div className="admin-banner admin-banner--ok" role="status">
      {message}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="admin-table-wrap" aria-hidden="true">
      <table className="admin-table admin-table--skeleton">
        <thead>
          <tr>
            {Array.from({ length: 5 }).map((_, i) => (
              <th key={i}>
                <span className="admin-skel" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: 5 }).map((__, c) => (
                <td key={c}>
                  <span className="admin-skel" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * @param {{ published: boolean, labels: { published: string, draft: string } }} props
 */
function PublishChip({ published, labels }) {
  return (
    <span
      className={`admin-chip ${published ? 'admin-chip--quoted' : 'admin-chip--expired'}`}
      title={published ? 'published' : 'draft'}
    >
      {published ? labels.published : labels.draft}
    </span>
  );
}

/**
 * @param {Record<string, string>} fieldErrors
 * @param {string} key
 * @param {ReturnType<import('./i18n.js').t>['articles']} a
 */
function fieldErrorMessage(fieldErrors, key, a) {
  const code = fieldErrors[key];
  if (!code) return '';
  return a.fieldErrors[code] || a.fieldErrors.required;
}

/**
 * @param {{
 *   locale: 'en' | 'fr',
 *   copy: ReturnType<import('./i18n.js').t>,
 *   navigate: (path: string) => void,
 * }} props
 */
export function ArticlesListPage({ locale, copy, navigate }) {
  const a = copy.articles;
  const params = new URLSearchParams(location.search);
  const initialPub = params.get('published') || '';
  const initialPage = Math.max(1, Number(params.get('page')) || 1);

  const [publishedFilter, setPublishedFilter] = React.useState(initialPub);
  const [page, setPage] = React.useState(initialPage);
  const [rows, setRows] = React.useState(/** @type {import('./opsCms.js').AdminArticle[]} */ ([]));
  const [meta, setMeta] = React.useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const syncUrl = React.useCallback((nextPub, nextPage) => {
    const sp = new URLSearchParams();
    if (nextPub) sp.set('published', nextPub);
    if (nextPage > 1) sp.set('page', String(nextPage));
    const qs = sp.toString();
    history.replaceState({}, '', qs ? `/admin/articles?${qs}` : '/admin/articles');
  }, []);

  const load = React.useCallback(
    async (signal) => {
      setLoading(true);
      setError('');
      try {
        /** @type {boolean | undefined} */
        let isPublished;
        if (publishedFilter === 'published') isPublished = true;
        else if (publishedFilter === 'draft') isPublished = false;

        const result = await listOpsArticles({
          isPublished,
          page,
          limit: 20,
          locale,
          signal,
        });
        setRows(result.data);
        setMeta(result.meta);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setRows([]);
        setError(err instanceof ApiError ? err.message : a.error);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [publishedFilter, page, locale, a.error],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.limit) || 1);

  const onPublishedChange = (value) => {
    setPublishedFilter(value);
    setPage(1);
    syncUrl(value, 1);
  };

  const goPage = (next) => {
    const p = Math.min(pageCount, Math.max(1, next));
    setPage(p);
    syncUrl(publishedFilter, p);
  };

  return (
    <div className="admin-articles">
      <p className="admin-lead">{a.subtitle}</p>

      <div className="admin-toolbar">
        <label className="admin-field admin-field--inline">
          <span>{a.filterPublish}</span>
          <select
            value={publishedFilter}
            onChange={(e) => onPublishedChange(e.target.value)}
            disabled={loading}
          >
            <option value="">{a.filterAll}</option>
            <option value="published">{a.filterPublished}</option>
            <option value="draft">{a.filterDraft}</option>
          </select>
        </label>
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={() => load()}
          disabled={loading}
        >
          {a.refresh}
        </button>
        <Link className="admin-btn admin-btn--primary" href="/admin/articles/new" navigate={navigate}>
          {a.newArticle}
        </Link>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => load()} retryLabel={a.retry} /> : null}

      {loading ? <TableSkeleton /> : null}

      {!loading && !error && rows.length === 0 ? (
        <div className="admin-empty">
          <p>{a.empty}</p>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{a.colTitle}</th>
                  <th>{a.colSlug}</th>
                  <th>{a.colPublishedAt}</th>
                  <th>{a.colStatus}</th>
                  <th>{a.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="admin-cell-stack">
                        <strong>{locale === 'fr' ? row.titleFr : row.titleEn}</strong>
                        <span className="admin-muted">
                          {locale === 'fr' ? row.titleEn : row.titleFr}
                        </span>
                      </div>
                    </td>
                    <td>
                      <code className="admin-mono">{row.slug}</code>
                    </td>
                    <td>{formatPublishedAt(row.publishedAt, locale)}</td>
                    <td>
                      <PublishChip
                        published={row.isPublished}
                        labels={{ published: a.published, draft: a.draft }}
                      />
                    </td>
                    <td>
                      <Link
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        href={`/admin/articles/${encodeURIComponent(row.slug)}`}
                        navigate={navigate}
                      >
                        {a.edit}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-pager">
            <span className="admin-muted">
              {a.page} {meta.page} {a.of} {pageCount} · {meta.total} {a.total}
            </span>
            <div className="admin-pager__btns">
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                disabled={page <= 1}
                onClick={() => goPage(page - 1)}
              >
                {a.prev}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                disabled={page >= pageCount}
                onClick={() => goPage(page + 1)}
              >
                {a.next}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * @param {{
 *   sections: { heading: string, text: string }[],
 *   lang: 'en' | 'fr',
 *   disabled: boolean,
 *   errorKey: string,
 *   fieldErrors: Record<string, string>,
 *   a: ReturnType<import('./i18n.js').t>['articles'],
 *   onChange: (sections: { heading: string, text: string }[]) => void,
 * }} props
 */
function SectionsEditor({ sections, lang, disabled, errorKey, fieldErrors, a, onChange }) {
  const update = (index, key, value) => {
    onChange(sections.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  };

  const add = () => onChange([...sections, emptySection()]);

  const remove = (index) => {
    if (sections.length <= 1) {
      onChange([emptySection()]);
      return;
    }
    onChange(sections.filter((_, i) => i !== index));
  };

  return (
    <div className={`admin-sections ${fieldErrors[errorKey] ? 'admin-sections--invalid' : ''}`}>
      <div className="admin-sections__head">
        <h4>{a.sectionsTitle}</h4>
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-btn--sm"
          onClick={add}
          disabled={disabled}
        >
          {a.addSection}
        </button>
      </div>
      {fieldErrors[errorKey] ? (
        <p className="admin-field__error" role="alert">
          {fieldErrorMessage(fieldErrors, errorKey, a)}
        </p>
      ) : (
        <p className="admin-field__hint">{a.sectionsHint}</p>
      )}
      {sections.map((section, index) => (
        <div key={`${lang}-sec-${index}`} className="admin-section-card">
          <div className="admin-section-card__bar">
            <span className="admin-muted">
              {a.sectionLabel} {index + 1}
            </span>
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm"
              onClick={() => remove(index)}
              disabled={disabled}
            >
              {a.removeSection}
            </button>
          </div>
          <label className="admin-field">
            <span>{a.fields.heading}</span>
            <input
              value={section.heading}
              onChange={(e) => update(index, 'heading', e.target.value)}
              disabled={disabled}
              autoComplete="off"
            />
          </label>
          <label className="admin-field">
            <span>{a.fields.body}</span>
            <textarea
              rows={5}
              value={section.text}
              onChange={(e) => update(index, 'text', e.target.value)}
              disabled={disabled}
            />
          </label>
        </div>
      ))}
    </div>
  );
}

/**
 * @param {{
 *   slug: string | null,
 *   locale: 'en' | 'fr',
 *   copy: ReturnType<import('./i18n.js').t>,
 *   navigate: (path: string) => void,
 * }} props
 */
export function ArticleFormPage({ slug, locale, copy, navigate }) {
  const a = copy.articles;
  const isNew = !slug || slug === 'new';
  const [form, setForm] = React.useState(() => emptyArticleForm());
  const [fieldErrors, setFieldErrors] = React.useState(/** @type {Record<string, string>} */ ({}));
  const [loading, setLoading] = React.useState(!isNew);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [slugLocked, setSlugLocked] = React.useState(!isNew);
  const [slugTouched, setSlugTouched] = React.useState(false);
  /** @type {'en' | 'fr' | 'both'} */
  const [localeTab, setLocaleTab] = React.useState('en');

  React.useEffect(() => {
    if (isNew) {
      setForm(emptyArticleForm());
      setLoading(false);
      setLoadFailed(false);
      setError('');
      setSuccess('');
      setFieldErrors({});
      setSlugLocked(false);
      setSlugTouched(false);
      setLocaleTab('en');
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadFailed(false);
    setError('');
    setSuccess('');
    getOpsArticle(slug, { locale, signal: controller.signal })
      .then((article) => {
        if (controller.signal.aborted) return;
        setForm(articleToForm(article));
        setSlugLocked(true);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setLoadFailed(true);
        setError(err instanceof ApiError ? err.message : a.notFound);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [isNew, slug, locale, a.notFound]);

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (isNew && key === 'titleEn' && !slugTouched) {
        next.slug = slugifyTitle(String(value));
      }
      return next;
    });
    clearFieldError(key);
    if (key === 'titleEn' && !slugTouched) clearFieldError('slug');
    setSuccess('');
  };

  const setSections = (lang, sections) => {
    const key = lang === 'fr' ? 'sectionsFr' : 'sectionsEn';
    setForm((prev) => ({ ...prev, [key]: sections }));
    clearFieldError(key);
    setSuccess('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSuccess('');
    setError('');

    const errors = validateArticleForm(form, { editing: !isNew });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError(a.validationFailed);
      if (errors.titleFr || errors.summaryFr || errors.sectionsFr) {
        if (!(errors.titleEn || errors.summaryEn || errors.sectionsEn)) setLocaleTab('fr');
        else if (localeTab === 'en') setLocaleTab('both');
      } else if (errors.titleEn || errors.summaryEn || errors.sectionsEn) {
        if (localeTab === 'fr') setLocaleTab('en');
      }
      return;
    }

    const body = toUpsertBody(form);
    setSaving(true);
    try {
      const saved = await upsertOpsArticle(body.slug, body, { locale });
      setForm(articleToForm(saved));
      setSlugLocked(true);
      setSuccess(saved.isPublished ? a.savedPublished : a.savedDraft);
      if (isNew || slug !== saved.slug) {
        navigate(`/admin/articles/${encodeURIComponent(saved.slug)}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const details = Array.isArray(err.details) ? err.details : [];
        /** @type {Record<string, string>} */
        const nextErrors = {};
        for (const d of details) {
          const field = typeof d === 'object' && d && 'field' in d ? String(d.field) : '';
          if (field) nextErrors[field] = 'invalid';
        }
        if (Object.keys(nextErrors).length) setFieldErrors(nextErrors);
        setError(err.message || a.saveError);
      } else {
        setError(a.saveError);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-articles">
        <p className="admin-muted" aria-live="polite">
          {a.loadingForm}
        </p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="admin-articles">
        <p className="admin-back">
          <Link href="/admin/articles" navigate={navigate}>
            ← {a.backToList}
          </Link>
        </p>
        <ErrorBanner message={error || a.notFound} />
      </div>
    );
  }

  const showEn = localeTab === 'en' || localeTab === 'both';
  const showFr = localeTab === 'fr' || localeTab === 'both';

  return (
    <div className="admin-articles">
      <p className="admin-back">
        <Link href="/admin/articles" navigate={navigate}>
          ← {a.backToList}
        </Link>
      </p>

      <div className="admin-detail-head">
        <div>
          <p className="admin-muted" style={{ margin: 0 }}>
            {isNew ? a.createTitle : a.editTitle}
          </p>
          {!isNew ? (
            <p className="admin-detail-name">
              {locale === 'fr' ? form.titleFr || form.slug : form.titleEn || form.slug}
            </p>
          ) : null}
        </div>
        {!isNew ? (
          <PublishChip
            published={form.isPublished}
            labels={{ published: a.published, draft: a.draft }}
          />
        ) : null}
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {success ? <SuccessBanner message={success} /> : null}

      <form className="admin-article-form" onSubmit={submit} noValidate>
        <section className="admin-panel">
          <h3>{a.sectionIdentity}</h3>
          <div className="admin-form-grid">
            <label className={`admin-field ${fieldErrors.slug ? 'admin-field--invalid' : ''}`}>
              <span>{a.fields.slug}</span>
              <input
                name="slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'));
                }}
                disabled={saving || slugLocked}
                autoComplete="off"
                spellCheck={false}
              />
              {fieldErrors.slug ? (
                <span className="admin-field__error" role="alert">
                  {fieldErrorMessage(fieldErrors, 'slug', a)}
                </span>
              ) : (
                <span className="admin-field__hint">{a.slugHint}</span>
              )}
            </label>

            <label className={`admin-field ${fieldErrors.imageKey ? 'admin-field--invalid' : ''}`}>
              <span>{a.fields.imageKey}</span>
              <input
                name="imageKey"
                value={form.imageKey}
                onChange={(e) => setField('imageKey', e.target.value)}
                disabled={saving}
                autoComplete="off"
                spellCheck={false}
                placeholder="blog-example.jpg"
              />
              {fieldErrors.imageKey ? (
                <span className="admin-field__error" role="alert">
                  {fieldErrorMessage(fieldErrors, 'imageKey', a)}
                </span>
              ) : (
                <span className="admin-field__hint">{a.imageHint}</span>
              )}
            </label>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-locale-editor__head">
            <h3>{a.sectionLocales}</h3>
            <div className="admin-locale-tabs" role="tablist" aria-label={a.localeTabsLabel}>
              <button
                type="button"
                role="tab"
                aria-selected={localeTab === 'en'}
                className={localeTab === 'en' ? 'is-active' : ''}
                onClick={() => setLocaleTab('en')}
              >
                EN
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={localeTab === 'fr'}
                className={localeTab === 'fr' ? 'is-active' : ''}
                onClick={() => setLocaleTab('fr')}
              >
                FR
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={localeTab === 'both'}
                className={localeTab === 'both' ? 'is-active' : ''}
                onClick={() => setLocaleTab('both')}
              >
                {a.sideBySide}
              </button>
            </div>
          </div>

          <div
            className={`admin-locale-columns ${localeTab === 'both' ? 'admin-locale-columns--both' : ''}`}
          >
            {showEn ? (
              <div className="admin-locale-pane" role="tabpanel" data-locale="en">
                <p className="admin-locale-pane__label">English</p>
                <label
                  className={`admin-field ${fieldErrors.titleEn ? 'admin-field--invalid' : ''}`}
                >
                  <span>{a.fields.title}</span>
                  <input
                    value={form.titleEn}
                    onChange={(e) => setField('titleEn', e.target.value)}
                    disabled={saving}
                    autoFocus={isNew}
                    autoComplete="off"
                  />
                  {fieldErrors.titleEn ? (
                    <span className="admin-field__error" role="alert">
                      {fieldErrorMessage(fieldErrors, 'titleEn', a)}
                    </span>
                  ) : null}
                </label>
                <label
                  className={`admin-field ${fieldErrors.summaryEn ? 'admin-field--invalid' : ''}`}
                >
                  <span>{a.fields.summary}</span>
                  <textarea
                    rows={3}
                    value={form.summaryEn}
                    onChange={(e) => setField('summaryEn', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.summaryEn ? (
                    <span className="admin-field__error" role="alert">
                      {fieldErrorMessage(fieldErrors, 'summaryEn', a)}
                    </span>
                  ) : null}
                </label>
                <SectionsEditor
                  sections={form.sectionsEn}
                  lang="en"
                  disabled={saving}
                  errorKey="sectionsEn"
                  fieldErrors={fieldErrors}
                  a={a}
                  onChange={(sections) => setSections('en', sections)}
                />
              </div>
            ) : null}

            {showFr ? (
              <div className="admin-locale-pane" role="tabpanel" data-locale="fr">
                <p className="admin-locale-pane__label">Français</p>
                <label
                  className={`admin-field ${fieldErrors.titleFr ? 'admin-field--invalid' : ''}`}
                >
                  <span>{a.fields.title}</span>
                  <input
                    value={form.titleFr}
                    onChange={(e) => setField('titleFr', e.target.value)}
                    disabled={saving}
                    autoComplete="off"
                  />
                  {fieldErrors.titleFr ? (
                    <span className="admin-field__error" role="alert">
                      {fieldErrorMessage(fieldErrors, 'titleFr', a)}
                    </span>
                  ) : null}
                </label>
                <label
                  className={`admin-field ${fieldErrors.summaryFr ? 'admin-field--invalid' : ''}`}
                >
                  <span>{a.fields.summary}</span>
                  <textarea
                    rows={3}
                    value={form.summaryFr}
                    onChange={(e) => setField('summaryFr', e.target.value)}
                    disabled={saving}
                  />
                  {fieldErrors.summaryFr ? (
                    <span className="admin-field__error" role="alert">
                      {fieldErrorMessage(fieldErrors, 'summaryFr', a)}
                    </span>
                  ) : null}
                </label>
                <SectionsEditor
                  sections={form.sectionsFr}
                  lang="fr"
                  disabled={saving}
                  errorKey="sectionsFr"
                  fieldErrors={fieldErrors}
                  a={a}
                  onChange={(sections) => setSections('fr', sections)}
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="admin-panel">
          <h3>{a.sectionPublish}</h3>
          <div className="admin-publish-toggle">
            <label className="admin-switch">
              <input
                type="checkbox"
                checked={Boolean(form.isPublished)}
                onChange={(e) => setField('isPublished', e.target.checked)}
                disabled={saving}
              />
              <span className="admin-switch__ui" aria-hidden="true" />
              <span className="admin-switch__label">
                {form.isPublished ? a.publishOn : a.publishOff}
              </span>
            </label>
            <p className="admin-field__hint" style={{ margin: 0 }}>
              {a.publishHint}
            </p>
          </div>
        </section>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? a.saving : isNew ? a.create : a.save}
          </button>
          <Link className="admin-btn admin-btn--ghost" href="/admin/articles" navigate={navigate}>
            {a.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
