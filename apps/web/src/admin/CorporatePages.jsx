import React from 'react';
import { ArrowUpRight, Building2, Mail, Phone, RefreshCw, UsersRound } from 'lucide-react';
import { ApiError } from '../api.js';
import {
  formatDateRange,
  formatDateTime,
  listOpsQuotes,
  quoteReference,
} from './opsQuotes.js';
import { WorkflowStatusBadge } from './WorkflowStatus.jsx';

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

function parseCorporateNotes(notes) {
  const fields = {};
  for (const line of String(notes || '').split('\n')) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key && value) fields[key] = value;
  }
  return fields;
}

function isCorporateLead(quote) {
  return quote.channel === 'contact' && /^company\s*:/im.test(String(quote.notes || ''));
}

function corporateLeadFromQuote(quote) {
  const fields = parseCorporateNotes(quote.notes);
  return {
    ...quote,
    fields,
    company: fields.company || '—',
    teamSize: fields['team size'] || (quote.passengers ? String(quote.passengers) : '—'),
    pickup: fields['pick-up'] || quote.pickupLabel || '—',
    destination: fields['destination / return'] || quote.dropoffLabel || '—',
    requestDate: fields['requested date'] || fields['rental dates'] || null,
    additionalNotes: fields['additional notes'] || null,
  };
}

function serviceLabel(service, copy) {
  return copy.services?.[service] || service || '—';
}

function LeadCard({ lead, copy, navigate }) {
  const c = copy.corporate;
  const leadLocale = lead.language === 'fr' ? 'fr' : 'en';
  return (
    <article className="admin-corporate__lead-card">
      <header className="admin-corporate__lead-head">
        <div className="admin-corporate__lead-identity">
          <span className="admin-corporate__company-icon" aria-hidden="true">
            <Building2 size={17} />
          </span>
          <div>
            <p className="admin-eyebrow">{lead.company}</p>
            <h2>{lead.customerName}</h2>
            <span className="admin-corporate__reference" title={lead.id}>
              {quoteReference(lead.id)}
            </span>
          </div>
        </div>
        <WorkflowStatusBadge recordId={lead.id} copy={copy} />
      </header>

      <div className="admin-corporate__contact-row">
        <a
          href={lead.customerEmail ? `mailto:${lead.customerEmail}` : undefined}
          className={!lead.customerEmail ? 'is-disabled' : undefined}
        >
          <Mail size={14} aria-hidden="true" />
          {lead.customerEmail || c.noEmail}
        </a>
        <a href={lead.customerPhone ? `tel:${lead.customerPhone}` : undefined}>
          <Phone size={14} aria-hidden="true" />
          {lead.customerPhone || c.noPhone}
        </a>
      </div>

      <div className="admin-corporate__lead-facts">
        <div>
          <span>{c.service}</span>
          <strong>{serviceLabel(lead.service, c)}</strong>
        </div>
        <div>
          <span>{c.teamSize}</span>
          <strong>{lead.teamSize}</strong>
        </div>
        <div className="admin-corporate__lead-fact--wide">
          <span>{c.route}</span>
          <strong title={`${lead.pickup} → ${lead.destination}`}>
            {lead.pickup} → {lead.destination}
          </strong>
        </div>
        <div className="admin-corporate__lead-fact--wide">
          <span>{c.dates}</span>
          <strong>
            {lead.requestDate || formatDateRange(lead.startAt, lead.endAt, leadLocale)}
          </strong>
        </div>
      </div>

      {lead.additionalNotes ? (
        <p className="admin-corporate__lead-notes">{lead.additionalNotes}</p>
      ) : null}

      <footer className="admin-corporate__lead-foot">
        <time dateTime={lead.createdAt}>
          {c.received} {formatDateTime(lead.createdAt, leadLocale)}
        </time>
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-btn--sm"
          onClick={() => navigate(`/admin/quotes/${lead.id}`)}
        >
          {c.openRequest}
          <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}

export function CorporatePage({ locale, copy, navigate }) {
  const c = copy.corporate;
  const [leads, setLeads] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [reloadKey, setReloadKey] = React.useState(0);

  const refresh = React.useCallback(() => setReloadKey((key) => key + 1), []);

  const load = React.useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const result = await listOpsQuotes({
        channel: 'contact',
        page: 1,
        limit: 100,
        locale,
        signal,
      });
      setLeads(result.data.filter(isCorporateLead).map(corporateLeadFromQuote));
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setLeads([]);
      setError(err instanceof ApiError ? err.message || c.error : c.error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [c.error, locale]);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, reloadKey]);

  return (
    <div className="admin-corporate admin-corporate--leads">
      <section className="admin-corporate__hero">
        <div>
          <p className="admin-eyebrow">{c.eyebrow}</p>
          <h2>{c.title}</h2>
          <p>{c.subtitle}</p>
        </div>
        <div className="admin-corporate__hero-count">
          <UsersRound size={20} aria-hidden="true" />
          <strong>{leads.length}</strong>
          <span>{c.total}</span>
        </div>
      </section>

      {error ? <ErrorBanner message={error} onRetry={refresh} retryLabel={c.retry} /> : null}

      <div className="admin-corporate__toolbar">
        <div>
          <span className="admin-corporate__toolbar-label">{c.inboxLabel}</span>
          <strong>{c.inboxHint}</strong>
        </div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={refresh} disabled={loading}>
          <RefreshCw size={14} aria-hidden="true" />
          {c.refresh}
        </button>
      </div>

      {loading ? (
        <div className="admin-corporate__loading" aria-live="polite">
          <span className="admin-skel" />
          <span className="admin-skel" />
          <span className="admin-skel" />
        </div>
      ) : null}

      {!loading && !error && !leads.length ? (
        <div className="admin-corporate__empty">
          <Building2 size={24} aria-hidden="true" />
          <strong>{c.emptyTitle}</strong>
          <p>{c.empty}</p>
        </div>
      ) : null}

      {!loading && leads.length ? (
        <div className="admin-corporate__lead-grid">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} copy={copy} navigate={navigate} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
