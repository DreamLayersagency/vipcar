import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ApiError } from '../api.js';
import { getOpsAnalytics } from './opsAnalytics.js';

const numberFormat = new Intl.NumberFormat('en-US');

function normalizedPath(path) {
  const value = String(path || '/').split('?')[0].replace(/^\/(en|fr|ar)(?=\/|$)/, '');
  return value || '/';
}

function segmentLabel(value) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function pageLabel(path, c) {
  const route = normalizedPath(path);
  if (c.pageNames[route]) return c.pageNames[route];
  if (route.startsWith('/fleet/')) return `${c.pageNames['/fleet']} · ${segmentLabel(route.split('/').pop())}`;
  if (route.startsWith('/services/')) return `${c.pageNames['/services']} · ${segmentLabel(route.split('/').pop())}`;
  if (route.startsWith('/blog/')) return `${c.pageNames['/blog']} · ${segmentLabel(route.split('/').pop())}`;
  return route === '/' ? c.pageNames['/'] : segmentLabel(route.replace(/^\//, '').replaceAll('/', ' · '));
}

function Metric({ label, value, hint, tone = '' }) {
  return (
    <article className={`admin-analytics__metric${tone ? ` admin-analytics__metric--${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{typeof value === 'number' ? numberFormat.format(value) : value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function ChartCard({ title, hint, children, className = '' }) {
  return (
    <section className={`admin-panel admin-analytics__card ${className}`}>
      <div className="admin-panel__heading">
        <div>
          <h2>{title}</h2>
          <p>{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function AnalyticsOverview({ locale, copy, embedded = false }) {
  const c = copy.analytics;
  const [days, setDays] = React.useState(30);
  const [summary, setSummary] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      setSummary(await getOpsAnalytics(days, { locale, signal }));
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err instanceof ApiError ? err.message : c.error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [days, locale, c.error]);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const totals = { pageViews: 0, uniqueVisitors: 0, quoteStarts: 0, quoteRequests: 0, quoteAbandons: 0, contactRequests: 0, ...(summary?.totals || {}) };
  const conversion = totals.quoteStarts ? (totals.quoteRequests / totals.quoteStarts) * 100 : 0;
  const daily = (summary?.daily || []).map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' }).format(new Date(`${point.date}T12:00:00Z`)),
  }));
  const topPages = React.useMemo(() => {
    const pages = new Map();
    for (const page of summary?.topPages || []) {
      const route = normalizedPath(page.path);
      const existing = pages.get(route);
      if (existing) {
        existing.views += page.views;
      } else {
        pages.set(route, { path: route, views: page.views });
      }
    }
    return [...pages.values()].sort((a, b) => b.views - a.views).slice(0, 8);
  }, [summary]);

  return (
    <div className={`admin-analytics${embedded ? ' admin-analytics--embedded' : ''}`}>
      <div className="admin-analytics__intro">
        {!embedded ? <p className="admin-lead">{c.subtitle}</p> : <span aria-hidden="true" />}
        <div className="admin-segmented" role="group" aria-label="Analytics range">
          <button type="button" className={days === 7 ? 'is-active' : ''} onClick={() => setDays(7)}>{c.range7}</button>
          <button type="button" className={days === 30 ? 'is-active' : ''} onClick={() => setDays(30)}>{c.range30}</button>
        </div>
      </div>

      {error ? <div className="admin-banner admin-banner--error" role="alert"><span>{error}</span><button type="button" className="admin-btn admin-btn--ghost" onClick={() => load()}>{c.retry}</button></div> : null}
      {loading && !summary ? <p className="admin-muted">{c.loading}</p> : null}

      <div className="admin-analytics__metrics">
        <Metric label={c.pageViews} value={totals.pageViews} hint={c.pageViewsHint} tone="accent" />
        <Metric label={c.uniqueVisitors} value={totals.uniqueVisitors} hint={c.uniqueVisitorsHint} />
        <Metric label={c.quoteStarts} value={totals.quoteStarts} hint={c.quoteStartsHint} />
        <Metric label={c.quoteRequests} value={totals.quoteRequests} hint={c.quoteRequestsHint} />
        <Metric label={c.contactRequests} value={totals.contactRequests} hint={c.contactRequestsHint} />
        <Metric label={c.conversion} value={`${conversion.toFixed(1)}%`} hint={c.conversionHint} tone="dark" />
      </div>

      <div className="admin-analytics__grid">
        <ChartCard title={c.trendTitle} hint={c.trendHint} className="admin-analytics__trend">
          {daily.length ? (
            <ResponsiveContainer width="100%" height={290}>
              <AreaChart data={daily} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="visitorFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b6432d" stopOpacity={0.28} /><stop offset="100%" stopColor="#b6432d" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#ebe8df" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#77766f', fontSize: 11 }} minTickGap={28} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#77766f', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ border: '1px solid #e3dfd4', borderRadius: 12, boxShadow: '0 10px 24px rgba(8,10,9,.08)' }} />
                <Area type="monotone" dataKey="views" name={c.views} stroke="#b6432d" strokeWidth={2.5} fill="url(#visitorFill)" />
                <Area type="monotone" dataKey="visitors" name={c.visitors} stroke="#1b2522" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="admin-analytics__empty">{c.noData}</div>}
        </ChartCard>

        <ChartCard title={c.pagesTitle} hint={c.pagesHint} className="admin-analytics__pages">
          {topPages.length ? (
            <ol className="admin-analytics__pages-list">
              {topPages.map((page, index) => {
                const share = totals.pageViews ? (page.views / totals.pageViews) * 100 : 0;
                const route = normalizedPath(page.path);
                return (
                  <li key={page.path} className="admin-analytics__page-row">
                    <span className="admin-analytics__page-rank">{String(index + 1).padStart(2, '0')}</span>
                    <div className="admin-analytics__page-main">
                      <div className="admin-analytics__page-title">
                        <strong>{pageLabel(page.path, c)}</strong>
                        <span>{numberFormat.format(page.views)} {c.views}</span>
                      </div>
                      <span className="admin-analytics__page-route" title={route}>{route}</span>
                      <div className="admin-analytics__page-bar" aria-hidden="true">
                        <span style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
                      </div>
                    </div>
                    <span className="admin-analytics__page-share">{share.toFixed(0)}%<small>{c.share}</small></span>
                  </li>
                );
              })}
            </ol>
          ) : <div className="admin-analytics__empty">{c.noData}</div>}
        </ChartCard>
      </div>
      <div className="admin-analytics__grid admin-analytics__grid--secondary">
        <ChartCard title={c.sourcesTitle} hint={c.sourcesHint}>
          {summary?.topSources?.length ? (
            <ol className="admin-analytics__rank-list">
              {summary.topSources.map((source, index) => <li key={source.source}><span>{String(index + 1).padStart(2, '0')}</span><strong>{source.source}</strong><em>{numberFormat.format(source.events)} {c.events}</em></li>)}
            </ol>
          ) : <div className="admin-analytics__empty admin-analytics__empty--short">{c.noData}</div>}
        </ChartCard>
        <ChartCard title={c.landingTitle} hint={c.landingHint}>
          {summary?.topLandingPages?.length ? (
            <ol className="admin-analytics__rank-list">
              {summary.topLandingPages.map((page, index) => <li key={page.path}><span>{String(index + 1).padStart(2, '0')}</span><strong>{pageLabel(page.path, c)}</strong><em>{numberFormat.format(page.views)} {c.views}</em></li>)}
            </ol>
          ) : <div className="admin-analytics__empty admin-analytics__empty--short">{c.noData}</div>}
        </ChartCard>
      </div>
      {summary?.generatedAt ? <p className="admin-analytics__updated">{c.generated} · {new Date(summary.generatedAt).toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p> : null}
    </div>
  );
}

export function AnalyticsPage(props) {
  return <AnalyticsOverview {...props} />;
}
