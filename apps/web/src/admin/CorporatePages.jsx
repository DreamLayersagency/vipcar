import React from 'react';
import { ApiError } from '../api.js';
import {
  createCorporateAccount,
  isUuid,
  linkCorporateManager,
  listCorporateAccounts,
  shortId,
  validateCreateForm,
  validateLinkForm,
} from './opsCorporate.js';

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
          {Array.from({ length: 4 }).map((_, r) => (
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
 * @param {{ active: boolean, labels: { active: string, inactive: string } }} props
 */
function ActiveChip({ active, labels }) {
  return (
    <span
      className={`admin-chip ${active ? 'admin-chip--quoted' : 'admin-chip--expired'}`}
      title={active ? 'active' : 'inactive'}
    >
      {active ? labels.active : labels.inactive}
    </span>
  );
}

/**
 * @param {unknown} err
 * @param {string} fallback
 * @param {string} [adminOnly]
 */
function errorMessage(err, fallback, adminOnly) {
  if (err instanceof ApiError) {
    if (err.status === 403 && adminOnly) return adminOnly;
    return err.message || fallback;
  }
  return fallback;
}

/**
 * @param {{
 *   locale: 'en' | 'fr',
 *   copy: ReturnType<import('./i18n.js').t>,
 * }} props
 */
export function CorporatePage({ locale, copy }) {
  const c = copy.corporate;

  const [rows, setRows] = React.useState(
    /** @type {import('./opsCorporate.js').CorporateAccount[]} */ ([]),
  );
  const [meta, setMeta] = React.useState({ page: 1, limit: 20, total: 0 });
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [listError, setListError] = React.useState('');
  const [selectedId, setSelectedId] = React.useState('');

  const [createForm, setCreateForm] = React.useState({
    name: '',
    billingEmail: '',
    notes: '',
  });
  const [createErrors, setCreateErrors] = React.useState(
    /** @type {Record<string, string>} */ ({}),
  );
  const [createBusy, setCreateBusy] = React.useState(false);
  const [createError, setCreateError] = React.useState('');
  const [createOk, setCreateOk] = React.useState('');

  const [linkMode, setLinkMode] = React.useState(/** @type {'link' | 'invite'} */ ('link'));
  const [linkForm, setLinkForm] = React.useState({
    corporateAccountId: '',
    userId: '',
    email: '',
    name: '',
    password: '',
    phone: '',
    locale: /** @type {'en' | 'fr'} */ (locale),
  });
  const [linkErrors, setLinkErrors] = React.useState(
    /** @type {Record<string, string>} */ ({}),
  );
  const [linkBusy, setLinkBusy] = React.useState(false);
  const [linkError, setLinkError] = React.useState('');
  const [linkOk, setLinkOk] = React.useState('');

  const [reloadKey, setReloadKey] = React.useState(0);
  const refresh = () => setReloadKey((k) => k + 1);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError('');
    listCorporateAccounts({
      page,
      limit: 20,
      locale,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(result.data);
        setMeta(result.meta);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setListError(errorMessage(err, c.error, c.adminOnly));
        setRows([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, locale, c.error, c.adminOnly, reloadKey]);

  const selectAccount = (account) => {
    setSelectedId(account.id);
    setLinkForm((prev) => ({ ...prev, corporateAccountId: account.id }));
    setLinkErrors((prev) => {
      if (!prev.corporateAccountId) return prev;
      const next = { ...prev };
      delete next.corporateAccountId;
      return next;
    });
  };

  const onCreate = async (e) => {
    e.preventDefault();
    if (createBusy) return;
    setCreateOk('');
    setCreateError('');
    const errors = validateCreateForm(createForm);
    setCreateErrors(errors);
    if (Object.keys(errors).length) return;

    setCreateBusy(true);
    try {
      const account = await createCorporateAccount(createForm, { locale });
      setCreateOk(c.createdOk.replace('{name}', account?.name || createForm.name));
      setCreateForm({ name: '', billingEmail: '', notes: '' });
      if (account?.id) {
        setSelectedId(account.id);
        setLinkForm((prev) => ({ ...prev, corporateAccountId: account.id }));
      }
      setPage(1);
      refresh();
    } catch (err) {
      setCreateError(errorMessage(err, c.createError, c.adminOnly));
    } finally {
      setCreateBusy(false);
    }
  };

  const onLink = async (e) => {
    e.preventDefault();
    if (linkBusy) return;
    setLinkOk('');
    setLinkError('');
    const errors = validateLinkForm({ ...linkForm, mode: linkMode });
    setLinkErrors(errors);
    if (Object.keys(errors).length) return;

    const accountId = linkForm.corporateAccountId.trim();
    setLinkBusy(true);
    try {
      const manager = await linkCorporateManager(
        accountId,
        linkMode === 'invite'
          ? {
              email: linkForm.email,
              name: linkForm.name,
              password: linkForm.password,
              phone: linkForm.phone || undefined,
              locale: linkForm.locale,
            }
          : {
              userId: linkForm.userId || undefined,
              email: linkForm.email || undefined,
            },
        { locale },
      );
      setLinkOk(
        c.linkedOk.replace('{email}', manager?.email || linkForm.email || manager?.id || ''),
      );
      setLinkForm((prev) => ({
        ...prev,
        userId: '',
        email: '',
        name: '',
        password: '',
        phone: '',
      }));
    } catch (err) {
      setLinkError(errorMessage(err, c.linkError, c.adminOnly));
    } finally {
      setLinkBusy(false);
    }
  };

  const fieldError = (map, key) => {
    const code = map[key];
    if (!code) return '';
    return c.fieldErrors[code] || c.fieldErrors.invalid;
  };

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 20)));

  return (
    <div className="admin-corporate">
      <p className="admin-muted admin-lead">{c.subtitle}</p>
      <p className="admin-muted" style={{ marginTop: '-0.35rem', marginBottom: '1rem' }}>
        {c.adminHint}
      </p>

      {listError ? (
        <ErrorBanner message={listError} onRetry={refresh} retryLabel={c.retry} />
      ) : null}

      <div className="admin-toolbar">
        <span className="admin-muted">
          {meta.total} {c.total}
        </span>
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={refresh}
          disabled={loading}
        >
          {c.refresh}
        </button>
      </div>

      {loading ? <TableSkeleton /> : null}

      {!loading && !listError && rows.length === 0 ? (
        <p className="admin-empty">{c.empty}</p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{c.colName}</th>
                <th>{c.colBilling}</th>
                <th>{c.colStatus}</th>
                <th>{c.colCreated}</th>
                <th>{c.colId}</th>
                <th>{c.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={selectedId === row.id ? 'admin-table__row--selected' : undefined}
                >
                  <td>
                    <strong>{row.name}</strong>
                    {row.notes ? (
                      <div className="admin-muted" style={{ fontSize: '0.8rem' }}>
                        {row.notes}
                      </div>
                    ) : null}
                  </td>
                  <td>{row.billingEmail}</td>
                  <td>
                    <ActiveChip
                      active={row.isActive}
                      labels={{ active: c.active, inactive: c.inactive }}
                    />
                  </td>
                  <td>
                    {new Date(row.createdAt).toLocaleString(locale === 'fr' ? 'fr-TN' : 'en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td>
                    <code title={row.id}>{shortId(row.id)}</code>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      onClick={() => selectAccount(row)}
                    >
                      {c.useForLink}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && meta.total > meta.limit ? (
        <div className="admin-pager">
          <span>
            {c.page} {meta.page} {c.of} {totalPages}
          </span>
          <div className="admin-pager__btns">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {c.prev}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {c.next}
            </button>
          </div>
        </div>
      ) : null}

      <div className="admin-detail-grid" style={{ marginTop: '1.25rem' }}>
        <section className="admin-panel">
          <h3>{c.createTitle}</h3>
          <p className="admin-muted" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
            {c.createHint}
          </p>
          {createError ? <ErrorBanner message={createError} /> : null}
          {createOk ? <SuccessBanner message={createOk} /> : null}
          <form className="admin-form" onSubmit={onCreate} noValidate>
            <label className="admin-field">
              {c.fields.name}
              <input
                name="name"
                value={createForm.name}
                onChange={(e) => {
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }));
                  setCreateErrors((prev) => {
                    if (!prev.name) return prev;
                    const next = { ...prev };
                    delete next.name;
                    return next;
                  });
                }}
                aria-invalid={Boolean(createErrors.name)}
                disabled={createBusy}
                autoComplete="organization"
              />
              {createErrors.name ? (
                <span className="admin-field__error">{fieldError(createErrors, 'name')}</span>
              ) : null}
            </label>
            <label className="admin-field">
              {c.fields.billingEmail}
              <input
                name="billingEmail"
                type="email"
                value={createForm.billingEmail}
                onChange={(e) => {
                  setCreateForm((prev) => ({ ...prev, billingEmail: e.target.value }));
                  setCreateErrors((prev) => {
                    if (!prev.billingEmail) return prev;
                    const next = { ...prev };
                    delete next.billingEmail;
                    return next;
                  });
                }}
                aria-invalid={Boolean(createErrors.billingEmail)}
                disabled={createBusy}
                autoComplete="email"
              />
              {createErrors.billingEmail ? (
                <span className="admin-field__error">{fieldError(createErrors, 'billingEmail')}</span>
              ) : null}
            </label>
            <label className="admin-field">
              {c.fields.notes}
              <textarea
                name="notes"
                rows={3}
                value={createForm.notes}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                disabled={createBusy}
              />
              <span className="admin-field__hint">{c.notesHint}</span>
            </label>
            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn--primary" disabled={createBusy}>
                {createBusy ? c.creating : c.create}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-panel">
          <h3>{c.linkTitle}</h3>
          <p className="admin-muted" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
            {c.linkHint}
          </p>
          {linkError ? <ErrorBanner message={linkError} /> : null}
          {linkOk ? <SuccessBanner message={linkOk} /> : null}

          <div className="admin-locale-tabs" role="group" aria-label={c.modeLabel}>
            <button
              type="button"
              className={linkMode === 'link' ? 'is-active' : ''}
              onClick={() => setLinkMode('link')}
              disabled={linkBusy}
            >
              {c.modeLink}
            </button>
            <button
              type="button"
              className={linkMode === 'invite' ? 'is-active' : ''}
              onClick={() => setLinkMode('invite')}
              disabled={linkBusy}
            >
              {c.modeInvite}
            </button>
          </div>

          <form className="admin-form" onSubmit={onLink} noValidate>
            <label className="admin-field">
              {c.fields.accountId}
              <input
                name="corporateAccountId"
                value={linkForm.corporateAccountId}
                onChange={(e) => {
                  const value = e.target.value;
                  setLinkForm((prev) => ({ ...prev, corporateAccountId: value }));
                  setSelectedId(isUuid(value) ? value.trim() : '');
                  setLinkErrors((prev) => {
                    if (!prev.corporateAccountId) return prev;
                    const next = { ...prev };
                    delete next.corporateAccountId;
                    return next;
                  });
                }}
                aria-invalid={Boolean(linkErrors.corporateAccountId)}
                disabled={linkBusy}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                spellCheck={false}
              />
              {linkErrors.corporateAccountId ? (
                <span className="admin-field__error">
                  {fieldError(linkErrors, 'corporateAccountId')}
                </span>
              ) : (
                <span className="admin-field__hint">{c.accountIdHint}</span>
              )}
            </label>

            {linkMode === 'link' ? (
              <>
                <label className="admin-field">
                  {c.fields.userId}
                  <input
                    name="userId"
                    value={linkForm.userId}
                    onChange={(e) => {
                      setLinkForm((prev) => ({ ...prev, userId: e.target.value }));
                      setLinkErrors((prev) => {
                        if (!prev.userId && !prev.email) return prev;
                        const next = { ...prev };
                        delete next.userId;
                        delete next.email;
                        return next;
                      });
                    }}
                    aria-invalid={Boolean(linkErrors.userId)}
                    disabled={linkBusy}
                    spellCheck={false}
                  />
                  {linkErrors.userId ? (
                    <span className="admin-field__error">{fieldError(linkErrors, 'userId')}</span>
                  ) : (
                    <span className="admin-field__hint">{c.userIdHint}</span>
                  )}
                </label>
                <label className="admin-field">
                  {c.fields.email}
                  <input
                    name="email"
                    type="email"
                    value={linkForm.email}
                    onChange={(e) => {
                      setLinkForm((prev) => ({ ...prev, email: e.target.value }));
                      setLinkErrors((prev) => {
                        if (!prev.userId && !prev.email) return prev;
                        const next = { ...prev };
                        delete next.userId;
                        delete next.email;
                        return next;
                      });
                    }}
                    aria-invalid={Boolean(linkErrors.email)}
                    disabled={linkBusy}
                    autoComplete="off"
                  />
                  {linkErrors.email ? (
                    <span className="admin-field__error">{fieldError(linkErrors, 'email')}</span>
                  ) : (
                    <span className="admin-field__hint">{c.emailLinkHint}</span>
                  )}
                </label>
              </>
            ) : (
              <>
                <label className="admin-field">
                  {c.fields.email}
                  <input
                    name="email"
                    type="email"
                    value={linkForm.email}
                    onChange={(e) => {
                      setLinkForm((prev) => ({ ...prev, email: e.target.value }));
                      setLinkErrors((prev) => {
                        if (!prev.email) return prev;
                        const next = { ...prev };
                        delete next.email;
                        return next;
                      });
                    }}
                    aria-invalid={Boolean(linkErrors.email)}
                    disabled={linkBusy}
                    autoComplete="off"
                  />
                  {linkErrors.email ? (
                    <span className="admin-field__error">{fieldError(linkErrors, 'email')}</span>
                  ) : null}
                </label>
                <label className="admin-field">
                  {c.fields.managerName}
                  <input
                    name="name"
                    value={linkForm.name}
                    onChange={(e) => {
                      setLinkForm((prev) => ({ ...prev, name: e.target.value }));
                      setLinkErrors((prev) => {
                        if (!prev.name) return prev;
                        const next = { ...prev };
                        delete next.name;
                        return next;
                      });
                    }}
                    aria-invalid={Boolean(linkErrors.name)}
                    disabled={linkBusy}
                    autoComplete="name"
                  />
                  {linkErrors.name ? (
                    <span className="admin-field__error">{fieldError(linkErrors, 'name')}</span>
                  ) : null}
                </label>
                <label className="admin-field">
                  {c.fields.password}
                  <input
                    name="password"
                    type="password"
                    value={linkForm.password}
                    onChange={(e) => {
                      setLinkForm((prev) => ({ ...prev, password: e.target.value }));
                      setLinkErrors((prev) => {
                        if (!prev.password) return prev;
                        const next = { ...prev };
                        delete next.password;
                        return next;
                      });
                    }}
                    aria-invalid={Boolean(linkErrors.password)}
                    disabled={linkBusy}
                    minLength={8}
                    autoComplete="new-password"
                  />
                  {linkErrors.password ? (
                    <span className="admin-field__error">{fieldError(linkErrors, 'password')}</span>
                  ) : (
                    <span className="admin-field__hint">{c.passwordHint}</span>
                  )}
                </label>
                <label className="admin-field">
                  {c.fields.phone}
                  <input
                    name="phone"
                    type="tel"
                    value={linkForm.phone}
                    onChange={(e) => setLinkForm((prev) => ({ ...prev, phone: e.target.value }))}
                    disabled={linkBusy}
                    placeholder="+216…"
                    autoComplete="tel"
                  />
                </label>
                <label className="admin-field">
                  {c.fields.locale}
                  <select
                    name="locale"
                    value={linkForm.locale}
                    onChange={(e) =>
                      setLinkForm((prev) => ({
                        ...prev,
                        locale: /** @type {'en' | 'fr'} */ (e.target.value),
                      }))
                    }
                    disabled={linkBusy}
                  >
                    <option value="en">EN</option>
                    <option value="fr">FR</option>
                  </select>
                </label>
              </>
            )}

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn--primary" disabled={linkBusy}>
                {linkBusy ? c.linking : linkMode === 'invite' ? c.invite : c.link}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
