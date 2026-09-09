import React from 'react';
import { ApiError } from '../api.js';
import {
  formatDateTime,
  formatTnd,
  listOpsQuotes,
  shortId,
} from './opsQuotes.js';
import { StatusChip } from './QuotesPages.jsx';

function Link({ href, navigate, children, className = '' }) {
  return (
    <a
      className={className}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

function Metric({ label, value, tone = '' }) {
  return (
    <div className={`admin-dashboard__metric${tone ? ` admin-dashboard__metric--${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/**
 * Operational landing view. It uses the existing quotes endpoint as a first
 * bridge while the dedicated reservations API is delivered in R2.
 *
 * @param {{
 *   locale: 'en' | 'fr',
 *   copy: ReturnType<import('./i18n.js').t>,
 *   navigate: (path: string) => void,
 * }} props
 */
export function DashboardPage({ locale, copy, navigate }) {
  const d = copy.dashboard;
  const q = copy.quotes;
  const [state, setState] = React.useState({
    loading: true,
    error: '',
    recent: [],
    counts: { total: 0, received: 0, quoted: 0, converted: 0 },
  });

  const load = React.useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [recent, received, quoted, converted] = await Promise.all([
        listOpsQuotes({ limit: 8, locale, signal }),
        listOpsQuotes({ status: 'received', limit: 1, locale, signal }),
        listOpsQuotes({ status: 'quoted', limit: 1, locale, signal }),
        listOpsQuotes({ status: 'converted', limit: 1, locale, signal }),
      ]);
      setState({
        loading: false,
        error: '',
        recent: recent.data,
        counts: {
          total: recent.meta.total,
          received: received.meta.total,
          quoted: quoted.meta.total,
          converted: converted.meta.total,
        },
      });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof ApiError && error.code === 'SERVICE_UNAVAILABLE'
            ? q.unavailable
            : error instanceof ApiError
              ? error.message
              : d.error,
      }));
    }
  }, [d.error, locale, q.unavailable]);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (state.loading && !state.recent.length) {
    return (
      <div className="admin-dashboard" aria-busy="true">
        <div className="admin-dashboard__intro">
          <p className="admin-lead">{d.loading}</p>
        </div>
        <div className="admin-dashboard__metrics" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="admin-dashboard__metric admin-dashboard__metric--loading" key={index}>
              <span className="admin-skel" />
              <strong className="admin-skel" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__intro">
        <div>
          <p className="admin-overline">VIPCAR · OPS</p>
          <p className="admin-lead">{d.subtitle}</p>
        </div>
        <Link className="admin-btn admin-btn--primary" href="/admin/quotes" navigate={navigate}>
          {d.viewAll}
        </Link>
      </div>

      {state.error ? (
        <div className="admin-banner admin-banner--error" role="alert">
          <span>{state.error}</span>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => load()}>
            {d.retry}
          </button>
        </div>
      ) : null}

      <div className="admin-dashboard__metrics">
        <Metric label={d.totalLabel} value={state.counts.total} />
        <Metric label={d.receivedLabel} value={state.counts.received} tone="accent" />
        <Metric label={d.quotedLabel} value={state.counts.quoted} tone="soft" />
        <Metric label={d.convertedLabel} value={state.counts.converted} tone="dark" />
      </div>

      <div className="admin-dashboard__grid">
        <section className="admin-panel admin-dashboard__recent">
          <div className="admin-dashboard__section-head">
            <div>
              <h2>{d.recentTitle}</h2>
              <p>{d.recentHint}</p>
            </div>
            <Link className="admin-text-link" href="/admin/quotes" navigate={navigate}>
              {d.viewAll}
            </Link>
          </div>

          {state.recent.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table admin-dashboard__table">
                <thead>
                  <tr>
                    <th>{d.created}</th>
                    <th>{d.customer}</th>
                    <th>{d.service}</th>
                    <th>{d.status}</th>
                    <th>{d.price}</th>
                  </tr>
                </thead>
                <tbody>
                  {state.recent.slice(0, 6).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link href={`/admin/quotes/${row.id}`} navigate={navigate}>
                          <time dateTime={row.createdAt}>{formatDateTime(row.createdAt, locale)}</time>
                        </Link>
                      </td>
                      <td>
                        <div className="admin-cell-stack">
                          <strong>{row.customerName}</strong>
                          <span className="admin-muted">{shortId(row.id)}</span>
                        </div>
                      </td>
                      <td>{q.services[row.service] || row.service}</td>
                      <td><StatusChip status={row.status} labels={q.statuses} /></td>
                      <td>
                        {row.confirmedPriceTnd != null
                          ? formatTnd(row.confirmedPriceTnd, locale)
                          : row.indicativePriceTnd != null
                            ? `~${formatTnd(row.indicativePriceTnd, locale)}`
                            : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">{d.empty}</div>
          )}
        </section>

        <section className="admin-panel admin-dashboard__next">
          <div className="admin-dashboard__section-head">
            <div>
              <h2>{d.quickTitle}</h2>
              <p>{d.quickHint}</p>
            </div>
          </div>
          <div className="admin-dashboard__actions">
            <Link href="/admin/quotes?status=received" navigate={navigate}>
              <span>01</span>
              <strong>{d.review}</strong>
              <b aria-hidden="true">↗</b>
            </Link>
            <Link href="/admin/fleet" navigate={navigate}>
              <span>02</span>
              <strong>{d.fleet}</strong>
              <b aria-hidden="true">↗</b>
            </Link>
            <Link href="/admin/dispatch" navigate={navigate}>
              <span>03</span>
              <strong>{d.dispatch}</strong>
              <b aria-hidden="true">↗</b>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
