import React from 'react';
import { ApiError } from '../api.js';
import { QUOTE_STATUSES } from './i18n.js';
import {
  confirmOpsQuote,
  findOpsQuote,
  formatDateRange,
  formatDateTime,
  formatTnd,
  listOpsQuotes,
  patchOpsQuotePrice,
  shortId,
} from './opsQuotes.js';

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
 * @param {{ status: string, labels: Record<string, string> }} props
 */
export function StatusChip({ status, labels }) {
  return (
    <span className={`admin-chip admin-chip--${status}`} title={status}>
      {labels[status] || status}
    </span>
  );
}

/**
 * @param {{
 *   open: boolean,
 *   title: string,
 *   body: string,
 *   cancelLabel: string,
 *   confirmLabel: string,
 *   busy?: boolean,
 *   onCancel: () => void,
 *   onConfirm: () => void,
 * }} props
 */
function ConfirmDialog({
  open,
  title,
  body,
  cancelLabel,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;
  return (
    <div className="admin-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="admin-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="admin-confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="admin-dialog__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={onConfirm} disabled={busy}>
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
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
            {Array.from({ length: 6 }).map((_, i) => (
              <th key={i}>
                <span className="admin-skel" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: 6 }).map((__, c) => (
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
 * Quotes inbox list.
 * @param {{
 *   locale: 'en' | 'fr',
 *   copy: ReturnType<import('./i18n.js').t>,
 *   navigate: (path: string) => void,
 * }} props
 */
export function QuotesListPage({ locale, copy, navigate }) {
  const q = copy.quotes;
  const params = new URLSearchParams(location.search);
  const initialStatus = params.get('status') || '';
  const initialPage = Math.max(1, Number(params.get('page')) || 1);

  const [status, setStatus] = React.useState(initialStatus);
  const [page, setPage] = React.useState(initialPage);
  const [rows, setRows] = React.useState(/** @type {import('./opsQuotes.js').Quote[]} */ ([]));
  const [meta, setMeta] = React.useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const syncUrl = React.useCallback(
    (nextStatus, nextPage) => {
      const sp = new URLSearchParams();
      if (nextStatus) sp.set('status', nextStatus);
      if (nextPage > 1) sp.set('page', String(nextPage));
      const qs = sp.toString();
      const path = qs ? `/admin/quotes?${qs}` : '/admin/quotes';
      history.replaceState({}, '', path);
    },
    [],
  );

  const load = React.useCallback(
    async (signal) => {
      setLoading(true);
      setError('');
      try {
        const result = await listOpsQuotes({
          status: status || undefined,
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
        setError(
          err instanceof ApiError && err.code === 'SERVICE_UNAVAILABLE'
            ? q.unavailable
            : err instanceof ApiError
              ? err.message
              : q.error,
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [status, page, locale, q.error, q.unavailable],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.limit) || 1);

  const onStatusChange = (value) => {
    setStatus(value);
    setPage(1);
    syncUrl(value, 1);
  };

  const goPage = (next) => {
    const p = Math.min(pageCount, Math.max(1, next));
    setPage(p);
    syncUrl(status, p);
  };

  return (
    <div className="admin-quotes">
      <p className="admin-lead">{q.subtitle}</p>

      <div className="admin-toolbar">
        <label className="admin-field admin-field--inline">
          <span>{q.filterStatus}</span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            disabled={loading}
          >
            <option value="">{q.filterAll}</option>
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {q.statuses[s]}
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
          {q.refresh}
        </button>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => load()} retryLabel={q.retry} /> : null}

      {loading ? <TableSkeleton /> : null}

      {!loading && !error && rows.length === 0 ? (
        <div className="admin-empty">
          <p>{q.empty}</p>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{q.colCreated}</th>
                  <th>{q.colCustomer}</th>
                  <th>{q.colService}</th>
                  <th>{q.colPickup}</th>
                  <th>{q.colDates}</th>
                  <th>{q.colStatus}</th>
                  <th>{q.colPrice}</th>
                  <th>{q.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <time dateTime={row.createdAt}>{formatDateTime(row.createdAt, locale)}</time>
                    </td>
                    <td>
                      <div className="admin-cell-stack">
                        <strong>{row.customerName}</strong>
                        <span className="admin-muted">{row.customerPhone}</span>
                      </div>
                    </td>
                    <td>{q.services[row.service] || row.service}</td>
                    <td className="admin-cell-clamp">{row.pickupLabel || '—'}</td>
                    <td className="admin-cell-clamp">
                      {formatDateRange(row.startAt, row.endAt, locale)}
                    </td>
                    <td>
                      <StatusChip status={row.status} labels={q.statuses} />
                    </td>
                    <td>
                      {row.confirmedPriceTnd != null
                        ? formatTnd(row.confirmedPriceTnd, locale)
                        : row.indicativePriceTnd != null
                          ? `~${formatTnd(row.indicativePriceTnd, locale)}`
                          : '—'}
                    </td>
                    <td>
                      <Link
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        href={`/admin/quotes/${row.id}`}
                        navigate={navigate}
                      >
                        {q.open}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-pager">
            <span className="admin-muted">
              {q.page} {meta.page} {q.of} {pageCount} · {meta.total} {q.total}
            </span>
            <div className="admin-pager__btns">
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                disabled={page <= 1}
                onClick={() => goPage(page - 1)}
              >
                {q.prev}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                disabled={page >= pageCount}
                onClick={() => goPage(page + 1)}
              >
                {q.next}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * Quote detail: price + confirm.
 * @param {{
 *   quoteId: string,
 *   locale: 'en' | 'fr',
 *   copy: ReturnType<import('./i18n.js').t>,
 *   navigate: (path: string) => void,
 * }} props
 */
export function QuoteDetailPage({ quoteId, locale, copy, navigate }) {
  const q = copy.quotes;
  const [quote, setQuote] = React.useState(/** @type {import('./opsQuotes.js').Quote | null} */ (null));
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [priceInput, setPriceInput] = React.useState('');
  const [unitId, setUnitId] = React.useState('');
  const [customerId, setCustomerId] = React.useState('');
  const [deposit, setDeposit] = React.useState('');
  const [priceBusy, setPriceBusy] = React.useState(false);
  const [confirmBusy, setConfirmBusy] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [banner, setBanner] = React.useState(/** @type {{ type: 'ok' | 'err', text: string } | null} */ (null));
  const [booking, setBooking] = React.useState(/** @type {object | null} */ (null));

  const load = React.useCallback(
    async (signal) => {
      setLoading(true);
      setError('');
      try {
        const found = await findOpsQuote(quoteId, { locale, signal });
        if (!found) {
          setQuote(null);
          setError(q.notFound);
          return;
        }
        setQuote(found);
        setPriceInput(
          found.confirmedPriceTnd != null
            ? String(found.confirmedPriceTnd)
            : found.indicativePriceTnd != null
              ? String(found.indicativePriceTnd)
              : '',
        );
        if (found.customerId) setCustomerId(found.customerId);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setQuote(null);
        setError(
          err instanceof ApiError && err.code === 'SERVICE_UNAVAILABLE'
            ? q.unavailable
            : err instanceof ApiError
              ? err.message
              : q.error,
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [quoteId, locale, q.notFound, q.error, q.unavailable],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const canPrice =
    quote && !['expired', 'cancelled', 'converted'].includes(quote.status);

  const savePrice = async (e) => {
    e.preventDefault();
    if (!quote || !canPrice || priceBusy) return;
    const value = Number(priceInput);
    if (!Number.isFinite(value) || value < 0) {
      setBanner({ type: 'err', text: q.priceError });
      return;
    }
    setPriceBusy(true);
    setBanner(null);
    try {
      const updated = await patchOpsQuotePrice(quote.id, value, { locale });
      setQuote(updated);
      setPriceInput(String(updated.confirmedPriceTnd ?? value));
      setBanner({ type: 'ok', text: q.priceSaved });
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof ApiError ? err.message : q.priceError,
      });
    } finally {
      setPriceBusy(false);
    }
  };

  const runConfirm = async () => {
    if (!quote || confirmBusy) return;
    const uid = unitId.trim();
    if (!uid) {
      setBanner({ type: 'err', text: q.cannotConfirm });
      setDialogOpen(false);
      return;
    }
    if (!quote.customerId && !customerId.trim()) {
      setBanner({ type: 'err', text: q.needCustomer });
      setDialogOpen(false);
      return;
    }
    const priceFallback = Number(priceInput);
    const hasPrice =
      quote.confirmedPriceTnd != null
      || (priceInput.trim() !== '' && Number.isFinite(priceFallback) && priceFallback >= 0);
    if (!hasPrice) {
      setBanner({ type: 'err', text: q.cannotConfirm });
      setDialogOpen(false);
      return;
    }

    setConfirmBusy(true);
    setBanner(null);
    try {
      /** @type {Record<string, unknown>} */
      const body = { unitId: uid };
      if (!quote.customerId && customerId.trim()) body.customerId = customerId.trim();
      if (deposit.trim() !== '' && Number.isFinite(Number(deposit))) {
        body.depositTnd = Number(deposit);
      }
      if (quote.confirmedPriceTnd == null) {
        body.priceTnd = priceFallback;
      }
      const result = await confirmOpsQuote(quote.id, body, { locale });
      setBooking(result);
      setQuote({ ...quote, status: 'converted' });
      setBanner({ type: 'ok', text: q.confirmSuccess });
      setDialogOpen(false);
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof ApiError ? err.message : q.confirmError,
      });
      setDialogOpen(false);
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div className="admin-quotes admin-quotes--detail">
      <p className="admin-back">
        <Link href="/admin/quotes" navigate={navigate}>
          ← {q.backToList}
        </Link>
      </p>

      {banner?.type === 'ok' ? <SuccessBanner message={banner.text} /> : null}
      {banner?.type === 'err' ? <ErrorBanner message={banner.text} /> : null}

      {loading ? (
        <p className="admin-muted" aria-live="polite">
          {q.loading}
        </p>
      ) : null}

      {!loading && error && !quote ? (
        <ErrorBanner message={error} onRetry={() => load()} retryLabel={q.retry} />
      ) : null}

      {!loading && quote ? (
        <>
          <header className="admin-detail-head">
            <div>
              <p className="admin-muted admin-mono">{quote.id}</p>
              <h2 className="admin-detail-name">{quote.customerName}</h2>
            </div>
            <StatusChip status={quote.status} labels={q.statuses} />
          </header>

          <div className="admin-detail-grid">
            <section className="admin-panel">
              <h3>{q.contact}</h3>
              <dl className="admin-dl">
                <div>
                  <dt>{q.phone}</dt>
                  <dd>
                    <a href={`tel:${quote.customerPhone}`}>{quote.customerPhone}</a>
                  </dd>
                </div>
                {quote.customerEmail ? (
                  <div>
                    <dt>{q.email}</dt>
                    <dd>
                      <a href={`mailto:${quote.customerEmail}`}>{quote.customerEmail}</a>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>{q.channel}</dt>
                  <dd>{quote.channel}</dd>
                </div>
                <div>
                  <dt>{q.locale}</dt>
                  <dd>{quote.language}</dd>
                </div>
                {quote.customerId ? (
                  <div>
                    <dt>{q.customerId}</dt>
                    <dd className="admin-mono">{shortId(quote.customerId)}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="admin-panel">
              <h3>{q.trip}</h3>
              <dl className="admin-dl">
                <div>
                  <dt>{q.colService}</dt>
                  <dd>{q.services[quote.service] || quote.service}</dd>
                </div>
                <div>
                  <dt>{q.colPickup}</dt>
                  <dd>{quote.pickupLabel || '—'}</dd>
                </div>
                <div>
                  <dt>{q.dropoff}</dt>
                  <dd>{quote.dropoffLabel || '—'}</dd>
                </div>
                <div>
                  <dt>{q.colDates}</dt>
                  <dd>{formatDateRange(quote.startAt, quote.endAt, locale)}</dd>
                </div>
                {quote.passengers != null ? (
                  <div>
                    <dt>{q.passengers}</dt>
                    <dd>{quote.passengers}</dd>
                  </div>
                ) : null}
                {quote.duration ? (
                  <div>
                    <dt>{q.duration}</dt>
                    <dd>{quote.duration}</dd>
                  </div>
                ) : null}
                {quote.flightNumber ? (
                  <div>
                    <dt>{q.flight}</dt>
                    <dd>{quote.flightNumber}</dd>
                  </div>
                ) : null}
                {quote.vehicleModelId ? (
                  <div>
                    <dt>{q.vehicleModel}</dt>
                    <dd className="admin-mono">{shortId(quote.vehicleModelId)}</dd>
                  </div>
                ) : null}
                {quote.notes ? (
                  <div className="admin-dl--full">
                    <dt>{q.notes}</dt>
                    <dd>{quote.notes}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="admin-panel">
              <h3>{q.pricing}</h3>
              <dl className="admin-dl">
                <div>
                  <dt>{q.indicative}</dt>
                  <dd>{formatTnd(quote.indicativePriceTnd, locale)} TND</dd>
                </div>
                <div>
                  <dt>{q.confirmed}</dt>
                  <dd>
                    <strong>{formatTnd(quote.confirmedPriceTnd, locale)} TND</strong>
                  </dd>
                </div>
              </dl>

              {canPrice ? (
                <form className="admin-form" onSubmit={savePrice}>
                  <label className="admin-field">
                    {q.priceLabel}
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      inputMode="decimal"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      disabled={priceBusy}
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    className="admin-btn admin-btn--primary"
                    disabled={priceBusy}
                  >
                    {priceBusy ? q.savingPrice : q.savePrice}
                  </button>
                </form>
              ) : (
                <p className="admin-muted">{q.cannotPrice}</p>
              )}
            </section>

            <section className="admin-panel">
              <h3>{q.confirmSection}</h3>
              {quote.status === 'converted' || booking ? (
                <div>
                  <p className="admin-muted">{q.confirmSuccess}</p>
                  {booking ? (
                    <dl className="admin-dl">
                      <div>
                        <dt>{q.bookingId}</dt>
                        <dd className="admin-mono">{booking.id}</dd>
                      </div>
                      <div>
                        <dt>{q.bookingStatus}</dt>
                        <dd>{booking.status}</dd>
                      </div>
                    </dl>
                  ) : null}
                </div>
              ) : (
                <form
                  className="admin-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setDialogOpen(true);
                  }}
                >
                  <label className="admin-field">
                    {q.unitId}
                    <input
                      type="text"
                      name="unitId"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      required
                    />
                    <span className="admin-field__hint">{q.unitIdHint}</span>
                  </label>
                  {!quote.customerId ? (
                    <label className="admin-field">
                      {q.customerId}
                      <input
                        type="text"
                        name="customerId"
                        autoComplete="off"
                        spellCheck={false}
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        required
                      />
                      <span className="admin-field__hint">{q.customerIdHint}</span>
                    </label>
                  ) : null}
                  <label className="admin-field">
                    {q.deposit}
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      inputMode="decimal"
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    className="admin-btn admin-btn--primary"
                    disabled={
                      confirmBusy
                      || !unitId.trim()
                      || (quote.confirmedPriceTnd == null && priceInput.trim() === '')
                    }
                  >
                    {q.confirmBooking}
                  </button>
                  {quote.confirmedPriceTnd == null ? (
                    <p className="admin-muted">{q.cannotConfirm}</p>
                  ) : null}
                </form>
              )}
            </section>
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={dialogOpen}
        title={q.confirmDialogTitle}
        body={q.confirmDialogBody}
        cancelLabel={q.confirmCancel}
        confirmLabel={q.confirmOk}
        busy={confirmBusy}
        onCancel={() => setDialogOpen(false)}
        onConfirm={runConfirm}
      />
    </div>
  );
}
