import React from 'react';
import { ApiError } from '../api.js';
import {
  TRANSMISSIONS,
  VEHICLE_CATEGORIES,
  VEHICLE_TIERS,
  emptyVehicleForm,
  formatTnd,
  getOpsVehicle,
  listOpsVehicles,
  slugifyName,
  toUpsertBody,
  upsertOpsVehicle,
  validateVehicleForm,
  vehicleToForm,
} from './opsCatalog.js';

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
            {Array.from({ length: 7 }).map((_, i) => (
              <th key={i}>
                <span className="admin-skel" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: 7 }).map((__, c) => (
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
 * @param {{
 *   locale: 'en' | 'fr',
 *   copy: ReturnType<import('./i18n.js').t>,
 *   navigate: (path: string) => void,
 * }} props
 */
export function VehiclesListPage({ locale, copy, navigate }) {
  const v = copy.vehicles;
  const params = new URLSearchParams(location.search);
  const initialPub = params.get('published') || '';
  const initialCategory = params.get('category') || '';
  const initialPage = Math.max(1, Number(params.get('page')) || 1);

  const [publishedFilter, setPublishedFilter] = React.useState(initialPub);
  const [category, setCategory] = React.useState(initialCategory);
  const [page, setPage] = React.useState(initialPage);
  const [rows, setRows] = React.useState(/** @type {import('./opsCatalog.js').VehicleModel[]} */ ([]));
  const [meta, setMeta] = React.useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const syncUrl = React.useCallback((nextPub, nextCat, nextPage) => {
    const sp = new URLSearchParams();
    if (nextPub) sp.set('published', nextPub);
    if (nextCat) sp.set('category', nextCat);
    if (nextPage > 1) sp.set('page', String(nextPage));
    const qs = sp.toString();
    history.replaceState({}, '', qs ? `/admin/vehicles?${qs}` : '/admin/vehicles');
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

        const result = await listOpsVehicles({
          category: category || undefined,
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
        setError(err instanceof ApiError ? err.message : v.error);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [publishedFilter, category, page, locale, v.error],
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
    syncUrl(value, category, 1);
  };

  const onCategoryChange = (value) => {
    setCategory(value);
    setPage(1);
    syncUrl(publishedFilter, value, 1);
  };

  const goPage = (next) => {
    const p = Math.min(pageCount, Math.max(1, next));
    setPage(p);
    syncUrl(publishedFilter, category, p);
  };

  return (
    <div className="admin-vehicles">
      <p className="admin-lead">{v.subtitle}</p>

      <div className="admin-toolbar">
        <label className="admin-field admin-field--inline">
          <span>{v.filterPublish}</span>
          <select
            value={publishedFilter}
            onChange={(e) => onPublishedChange(e.target.value)}
            disabled={loading}
          >
            <option value="">{v.filterAll}</option>
            <option value="published">{v.filterPublished}</option>
            <option value="draft">{v.filterDraft}</option>
          </select>
        </label>
        <label className="admin-field admin-field--inline">
          <span>{v.filterCategory}</span>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            disabled={loading}
          >
            <option value="">{v.filterAllCategories}</option>
            {VEHICLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={() => load()}
          disabled={loading}
        >
          {v.refresh}
        </button>
        <Link className="admin-btn admin-btn--primary" href="/admin/vehicles/new" navigate={navigate}>
          {v.newVehicle}
        </Link>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => load()} retryLabel={v.retry} /> : null}

      {loading ? <TableSkeleton /> : null}

      {!loading && !error && rows.length === 0 ? (
        <div className="admin-empty">
          <p>{v.empty}</p>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{v.colName}</th>
                  <th>{v.colSlug}</th>
                  <th>{v.colCategory}</th>
                  <th>{v.colTier}</th>
                  <th>{v.colPrice}</th>
                  <th>{v.colStatus}</th>
                  <th>{v.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="admin-cell-stack">
                        <strong>{row.name}</strong>
                        <span className="admin-muted">
                          {row.seats} {v.seatsShort} · {row.bags} {v.bagsShort} · {row.transmission}
                        </span>
                      </div>
                    </td>
                    <td>
                      <code className="admin-mono">{row.slug}</code>
                    </td>
                    <td>{row.category}</td>
                    <td>{row.tier}</td>
                    <td>{formatTnd(row.baseDailyPriceTnd, locale)}</td>
                    <td>
                      <PublishChip
                        published={row.isPublished}
                        labels={{ published: v.published, draft: v.draft }}
                      />
                    </td>
                    <td>
                      <Link
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        href={`/admin/vehicles/${encodeURIComponent(row.slug)}`}
                        navigate={navigate}
                      >
                        {v.edit}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-pager">
            <span className="admin-muted">
              {v.page} {meta.page} {v.of} {pageCount} · {meta.total} {v.total}
            </span>
            <div className="admin-pager__btns">
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                disabled={page <= 1}
                onClick={() => goPage(page - 1)}
              >
                {v.prev}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                disabled={page >= pageCount}
                onClick={() => goPage(page + 1)}
              >
                {v.next}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * @param {Record<string, string>} fieldErrors
 * @param {string} key
 * @param {ReturnType<import('./i18n.js').t>['vehicles']} v
 */
function fieldErrorMessage(fieldErrors, key, v) {
  const code = fieldErrors[key];
  if (!code) return '';
  return v.fieldErrors[code] || v.fieldErrors.required;
}

/**
 * @param {{
 *   slug: string | null,
 *   locale: 'en' | 'fr',
 *   copy: ReturnType<import('./i18n.js').t>,
 *   navigate: (path: string) => void,
 * }} props
 */
export function VehicleFormPage({ slug, locale, copy, navigate }) {
  const v = copy.vehicles;
  const isNew = !slug || slug === 'new';
  const [form, setForm] = React.useState(() => emptyVehicleForm());
  const [fieldErrors, setFieldErrors] = React.useState(/** @type {Record<string, string>} */ ({}));
  const [loading, setLoading] = React.useState(!isNew);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [slugLocked, setSlugLocked] = React.useState(!isNew);
  const [slugTouched, setSlugTouched] = React.useState(false);

  React.useEffect(() => {
    if (isNew) {
      setForm(emptyVehicleForm());
      setLoading(false);
      setLoadFailed(false);
      setError('');
      setSuccess('');
      setFieldErrors({});
      setSlugLocked(false);
      setSlugTouched(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadFailed(false);
    setError('');
    setSuccess('');
    getOpsVehicle(slug, { locale, signal: controller.signal })
      .then((vehicle) => {
        if (controller.signal.aborted) return;
        setForm(vehicleToForm(vehicle));
        setSlugLocked(true);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setLoadFailed(true);
        setError(err instanceof ApiError ? err.message : v.notFound);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [isNew, slug, locale, v.notFound]);

  const setField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (isNew && key === 'name' && !slugTouched) {
        next.slug = slugifyName(String(value));
      }
      return next;
    });
    setFieldErrors((prev) => {
      if (!prev[key] && !(key === 'name' && prev.slug)) return prev;
      const next = { ...prev };
      delete next[key];
      if (key === 'name' && !slugTouched) delete next.slug;
      return next;
    });
    setSuccess('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSuccess('');
    setError('');

    const errors = validateVehicleForm(form, { editing: !isNew });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError(v.validationFailed);
      return;
    }

    const body = toUpsertBody(form);
    setSaving(true);
    try {
      const saved = await upsertOpsVehicle(body.slug, body, { locale });
      setForm(vehicleToForm(saved));
      setSlugLocked(true);
      setSuccess(saved.isPublished ? v.savedPublished : v.savedDraft);
      if (isNew || slug !== saved.slug) {
        navigate(`/admin/vehicles/${encodeURIComponent(saved.slug)}`);
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
        setError(err.message || v.saveError);
      } else {
        setError(v.saveError);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-vehicles">
        <p className="admin-muted" aria-live="polite">
          {v.loadingForm}
        </p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="admin-vehicles">
        <p className="admin-back">
          <Link href="/admin/vehicles" navigate={navigate}>
            ← {v.backToList}
          </Link>
        </p>
        <ErrorBanner message={error || v.notFound} />
      </div>
    );
  }

  return (
    <div className="admin-vehicles">
      <p className="admin-back">
        <Link href="/admin/vehicles" navigate={navigate}>
          ← {v.backToList}
        </Link>
      </p>

      <div className="admin-detail-head">
        <div>
          <p className="admin-muted" style={{ margin: 0 }}>
            {isNew ? v.createTitle : v.editTitle}
          </p>
          {!isNew ? <p className="admin-detail-name">{form.name || form.slug}</p> : null}
        </div>
        {!isNew ? (
          <PublishChip
            published={form.isPublished}
            labels={{ published: v.published, draft: v.draft }}
          />
        ) : null}
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {success ? <SuccessBanner message={success} /> : null}

      <form className="admin-vehicle-form" onSubmit={submit} noValidate>
        <section className="admin-panel">
          <h3>{v.sectionIdentity}</h3>
          <div className="admin-form-grid">
            <label className={`admin-field ${fieldErrors.name ? 'admin-field--invalid' : ''}`}>
              <span>{v.fields.name}</span>
              <input
                name="name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={saving}
                autoFocus={isNew}
                autoComplete="off"
              />
              {fieldErrors.name ? (
                <span className="admin-field__error" role="alert">
                  {fieldErrorMessage(fieldErrors, 'name', v)}
                </span>
              ) : null}
            </label>

            <label className={`admin-field ${fieldErrors.slug ? 'admin-field--invalid' : ''}`}>
              <span>{v.fields.slug}</span>
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
                  {fieldErrorMessage(fieldErrors, 'slug', v)}
                </span>
              ) : (
                <span className="admin-field__hint">{v.slugHint}</span>
              )}
            </label>
          </div>
        </section>

        <section className="admin-panel">
          <h3>{v.sectionSpecs}</h3>
          <div className="admin-form-grid admin-form-grid--4">
            <label className={`admin-field ${fieldErrors.category ? 'admin-field--invalid' : ''}`}>
              <span>{v.fields.category}</span>
              <select
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
                disabled={saving}
              >
                {VEHICLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {fieldErrors.category ? (
                <span className="admin-field__error" role="alert">
                  {fieldErrorMessage(fieldErrors, 'category', v)}
                </span>
              ) : null}
            </label>

            <label className={`admin-field ${fieldErrors.tier ? 'admin-field--invalid' : ''}`}>
              <span>{v.fields.tier}</span>
              <select
                value={form.tier}
                onChange={(e) => setField('tier', e.target.value)}
                disabled={saving}
              >
                {VEHICLE_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {fieldErrors.tier ? (
                <span className="admin-field__error" role="alert">
                  {fieldErrorMessage(fieldErrors, 'tier', v)}
                </span>
              ) : null}
            </label>

            <label className={`admin-field ${fieldErrors.transmission ? 'admin-field--invalid' : ''}`}>
              <span>{v.fields.transmission}</span>
              <select
                value={form.transmission}
                onChange={(e) => setField('transmission', e.target.value)}
                disabled={saving}
              >
                {TRANSMISSIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {fieldErrors.transmission ? (
                <span className="admin-field__error" role="alert">
                  {fieldErrorMessage(fieldErrors, 'transmission', v)}
                </span>
              ) : null}
            </label>

            <label className={`admin-field ${fieldErrors.seats ? 'admin-field--invalid' : ''}`}>
              <span>{v.fields.seats}</span>
              <input
                type="number"
                min={1}
                step={1}
                value={form.seats}
                onChange={(e) => setField('seats', e.target.value === '' ? '' : Number(e.target.value))}
                disabled={saving}
              />
              {fieldErrors.seats ? (
                <span className="admin-field__error" role="alert">
                  {fieldErrorMessage(fieldErrors, 'seats', v)}
                </span>
              ) : null}
            </label>

            <label className={`admin-field ${fieldErrors.bags ? 'admin-field--invalid' : ''}`}>
              <span>{v.fields.bags}</span>
              <input
                type="number"
                min={0}
                step={1}
                value={form.bags}
                onChange={(e) => setField('bags', e.target.value === '' ? '' : Number(e.target.value))}
                disabled={saving}
              />
              {fieldErrors.bags ? (
                <span className="admin-field__error" role="alert">
                  {fieldErrorMessage(fieldErrors, 'bags', v)}
                </span>
              ) : null}
            </label>
          </div>
        </section>

        <section className="admin-panel">
          <h3>{v.sectionPricing}</h3>
          <div className="admin-form-grid">
            <label
              className={`admin-field ${fieldErrors.baseDailyPriceTnd ? 'admin-field--invalid' : ''}`}
            >
              <span>{v.fields.baseDailyPriceTnd}</span>
              <input
                type="number"
                min={0}
                step="0.001"
                value={form.baseDailyPriceTnd}
                onChange={(e) =>
                  setField(
                    'baseDailyPriceTnd',
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
                disabled={saving}
              />
              {fieldErrors.baseDailyPriceTnd ? (
                <span className="admin-field__error" role="alert">
                  {fieldErrorMessage(fieldErrors, 'baseDailyPriceTnd', v)}
                </span>
              ) : (
                <span className="admin-field__hint">{v.priceHint}</span>
              )}
            </label>

            <label className={`admin-field ${fieldErrors.imageKey ? 'admin-field--invalid' : ''}`}>
              <span>{v.fields.imageKey}</span>
              <input
                name="imageKey"
                value={form.imageKey}
                onChange={(e) => setField('imageKey', e.target.value)}
                disabled={saving}
                autoComplete="off"
                spellCheck={false}
                placeholder="fleet-example.png"
              />
              {fieldErrors.imageKey ? (
                <span className="admin-field__error" role="alert">
                  {fieldErrorMessage(fieldErrors, 'imageKey', v)}
                </span>
              ) : (
                <span className="admin-field__hint">{v.imageHint}</span>
              )}
            </label>

            <label
              className={`admin-field admin-form-grid__full ${fieldErrors.defaultHubId ? 'admin-field--invalid' : ''}`}
            >
              <span>{v.fields.defaultHubId}</span>
              <input
                name="defaultHubId"
                value={form.defaultHubId}
                onChange={(e) => setField('defaultHubId', e.target.value.trim())}
                disabled={saving}
                autoComplete="off"
                spellCheck={false}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              {fieldErrors.defaultHubId ? (
                <span className="admin-field__error" role="alert">
                  {fieldErrorMessage(fieldErrors, 'defaultHubId', v)}
                </span>
              ) : (
                <span className="admin-field__hint">{v.hubHint}</span>
              )}
            </label>
          </div>
        </section>

        <section className="admin-panel">
          <h3>{v.sectionPublish}</h3>
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
                {form.isPublished ? v.publishOn : v.publishOff}
              </span>
            </label>
            <p className="admin-field__hint" style={{ margin: 0 }}>
              {v.publishHint}
            </p>
          </div>
        </section>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? v.saving : isNew ? v.create : v.save}
          </button>
          <Link className="admin-btn admin-btn--ghost" href="/admin/vehicles" navigate={navigate}>
            {v.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
