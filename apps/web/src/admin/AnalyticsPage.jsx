import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ApiError } from '../api.js';
import { getOpsAnalytics } from './opsAnalytics.js';

const numberFormat = new Intl.NumberFormat('en-US');

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

export function AnalyticsPage({ locale, copy }) {
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

  const totals = summary?.totals || { pageViews: 0, uniqueVisitors: 0, quoteRequests: 0 };
  const conversion = totals.pageViews ? (totals.quoteRequests / totals.pageViews) * 100 : 0;
  const daily = (summary?.daily || []).map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' }).format(new Date(`${point.date}T12:00:00Z`)),
  }));
  const topPages = summary?.topPages || [];

  return (
    <div className="admin-analytics">
      <div className="admin-analytics__intro">
        <p className="admin-lead">{c.subtitle}</p>
        <div className="admin-segmented" role="group" aria-label="Analytics range">
          <button type="button" className={days === 7 ? 'is-active' : ''} onClick={() => setDays(7)}>{c.range7}</button>
          <button type="button" className={days === 30 ? 'is-active' : ''} onClick={() => setDays(30)}>{c.range30}</button>
        </div>
      </div>

      {error ? <div className="admin-banner admin-banner--error" role="alert"><span>{error}</span><button type="button" className="admin-btn admin-btn--ghost" onClick={() => load()}>{c.retry}</button></div> : null}
      {loading && !summary ? <p className="admin-muted">{c.loading}</p> : null}

      <div className="admin-analytics__metrics">
        <Metric label={c.pageViews} value={totals.pageViews} hint={c.trendHint} tone="accent" />
        <Metric label={c.uniqueVisitors} value={totals.uniqueVisitors} hint={c.pagesHint} />
        <Metric label={c.quoteRequests} value={totals.quoteRequests} hint={c.quoteRequests} />
        <Metric label={c.conversion} value={`${conversion.toFixed(1)}%`} hint={`${days} ${days === 1 ? 'day' : 'days'}`} tone="dark" />
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
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={topPages} layout="vertical" margin={{ top: 4, right: 12, left: 12, bottom: 4 }}>
                <CartesianGrid stroke="#ebe8df" horizontal={false} />
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="path" width={112} tickLine={false} axisLine={false} tick={{ fill: '#77766f', fontSize: 11 }} />
                <Tooltip contentStyle={{ border: '1px solid #e3dfd4', borderRadius: 12, boxShadow: '0 10px 24px rgba(8,10,9,.08)' }} />
                <Bar dataKey="views" name={c.views} fill="#b99a63" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="admin-analytics__empty">{c.noData}</div>}
        </ChartCard>
      </div>
      {summary?.generatedAt ? <p className="admin-analytics__updated">{c.generated} · {new Date(summary.generatedAt).toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p> : null}
    </div>
  );
}
