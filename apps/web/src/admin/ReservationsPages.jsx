import React from 'react';
import { ApiError } from '../api.js';
import { StatusChip } from './QuotesPages.jsx';
import { RESERVATION_STATUSES } from './i18n.js';
import {
  assignOpsReservationUnit,
  confirmOpsReservation,
  formatDateRange,
  formatDateTime,
  formatTnd,
  getOpsReservation,
  listOpsReservations,
  patchOpsReservationPrice,
  shortId,
  updateOpsReservationStatus,
} from './opsReservations.js';

const SERVICES = ['rental', 'transfer', 'chauffeur'];
const CHANNELS = ['web', 'whatsapp', 'staff', 'contact'];

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

function ErrorBanner({ message, onRetry, retryLabel }) {
  return (
    <div className="admin-banner admin-banner--error" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
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
              <th key={i}><span className="admin-skel" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, row) => (
            <tr key={row}>
              {Array.from({ length: 7 }).map((__, cell) => (
                <td key={cell}><span className="admin-skel" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Unified reservation inbox. It deliberately uses the reservation API rather
 * than stitching together quote and booking calls in the browser.
 */
export function ReservationsListPage({ locale, copy, navigate }) {
  const q = copy.reservations;
  const params = new URLSearchParams(location.search);
  const [search, setSearch] = React.useState(params.get('search') || '');
  const [activeSearch, setActiveSearch] = React.useState(params.get('search') || '');
  const [status, setStatus] = React.useState(params.get('status') || '');
  const [service, setService] = React.useState(params.get('service') || '');
  const [channel, setChannel] = React.useState(params.get('channel') || '');
  const [page, setPage] = React.useState(Math.max(1, Number(params.get('page')) || 1));
  const [rows, setRows] = React.useState([]);
  const [meta, setMeta] = React.useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const syncUrl = React.useCallback((next = {}) => {
    const sp = new URLSearchParams();
    const values = {
      search: activeSearch,
      status,
      service,
      channel,
      page: page > 1 ? String(page) : '',
      ...next,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value) sp.set(key, String(value));
    }
    const query = sp.toString();
    history.replaceState({}, '', `/admin/reservations${query ? `?${query}` : ''}`);
  }, [activeSearch, channel, page, service, status]);

  const load = React.useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const result = await listOpsReservations({
        search: activeSearch || undefined,
        status: status || undefined,
        service: service || undefined,
        channel: channel || undefined,
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
      setError(err instanceof ApiError ? err.message : q.error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [activeSearch, channel, locale, page, q.error, service, status]);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.limit) || 1);

  const applySearch = (event) => {
    event.preventDefault();
    const value = search.trim();
    setActiveSearch(value);
    setPage(1);
    syncUrl({ search: value, page: '' });
  };

  const changeFilter = (key, value, setter) => {
    setter(value);
    setPage(1);
    syncUrl({ [key]: value, page: '' });
  };

  const goPage = (next) => {
    const nextPage = Math.min(pageCount, Math.max(1, next));
    setPage(nextPage);
    syncUrl({ page: nextPage > 1 ? String(nextPage) : '' });
  };

  return (
    <div className="admin-reservations">
      <p className="admin-lead">{q.subtitle}</p>

      <form className="admin-reservation-toolbar" onSubmit={applySearch}>
        <label className="admin-field admin-reservation-search">
          <span className="sr-only">{q.search}</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={q.search}
            type="search"
            disabled={loading}
          />
        </label>
        <label className="admin-field admin-field--inline">
          <span>{q.filterStatus}</span>
          <select value={status} onChange={(e) => changeFilter('status', e.target.value, setStatus)} disabled={loading}>
            <option value="">{q.filterAllStatuses}</option>
            {RESERVATION_STATUSES.map((value) => <option key={value} value={value}>{q.statuses[value]}</option>)}
          </select>
        </label>
        <label className="admin-field admin-field--inline">
          <span>{q.filterService}</span>
          <select value={service} onChange={(e) => changeFilter('service', e.target.value, setService)} disabled={loading}>
            <option value="">{q.filterAllServices}</option>
            {SERVICES.map((value) => <option key={value} value={value}>{q.services[value]}</option>)}
          </select>
        </label>
        <label className="admin-field admin-field--inline">
          <span>{q.filterChannel}</span>
          <select value={channel} onChange={(e) => changeFilter('channel', e.target.value, setChannel)} disabled={loading}>
            <option value="">{q.filterAllChannels}</option>
            {CHANNELS.map((value) => <option key={value} value={value}>{q.channels[value]}</option>)}
          </select>
        </label>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={loading}>{q.searchAction || 'Search'}</button>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => load()} disabled={loading}>{q.refresh}</button>
      </form>

      {error ? <ErrorBanner message={error} onRetry={() => load()} retryLabel={q.retry} /> : null}
      {loading ? <TableSkeleton /> : null}
      {!loading && !error && rows.length === 0 ? <div className="admin-empty"><p>{q.empty}</p></div> : null}

      {!loading && rows.length > 0 ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table admin-reservation-table">
              <thead>
                <tr>
                  <th>{q.colReference}</th>
                  <th>{q.colCustomer}</th>
                  <th>{q.colTrip}</th>
                  <th>{q.colDates}</th>
                  <th>{q.colStatus}</th>
                  <th>{q.colPrice}</th>
                  <th>{q.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const quote = row.quote || {};
                  const trip = row.trip || {};
                  const value = row.booking?.priceTnd ?? quote.confirmedPriceTnd ?? quote.indicativePriceTnd;
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="admin-cell-stack">
                          <strong className="admin-mono">{shortId(row.id)}</strong>
                          <span className="admin-muted">{formatDateTime(row.createdAt, locale)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-cell-stack">
                          <strong>{row.customer?.name || '—'}</strong>
                          <span className="admin-muted">{row.customer?.phone || row.customer?.email || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-cell-stack">
                          <strong>{q.services[trip.service] || trip.service || '—'}</strong>
                          <span className="admin-muted">{trip.pickupLabel || '—'}{trip.dropoffLabel ? ` → ${trip.dropoffLabel}` : ''}</span>
                        </div>
                      </td>
                      <td className="admin-cell-clamp">{formatDateRange(trip.startAt, trip.endAt, locale)}</td>
                      <td><StatusChip status={row.status} labels={q.statuses} /></td>
                      <td>{value != null ? formatTnd(value, locale) : <span className="admin-muted">{q.noValue}</span>}</td>
                      <td>
                        <Link className="admin-btn admin-btn--ghost admin-btn--sm" href={`/admin/reservations/${row.id}`} navigate={navigate}>{q.open}</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="admin-pager">
            <span className="admin-muted">{q.page} {meta.page} {q.of} {pageCount} · {meta.total} {q.total}</span>
            <div className="admin-pager__btns">
              <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>{q.prev}</button>
              <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" disabled={page >= pageCount} onClick={() => goPage(page + 1)}>{q.next}</button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Definition({ label, children, wide = false }) {
  return <div className={`admin-definition${wide ? ' admin-definition--wide' : ''}`}><dt>{label}</dt><dd>{children || '—'}</dd></div>;
}

function ReservationSection({ title, children, className = '' }) {
  return <section className={`admin-panel admin-reservation-section ${className}`}><div className="admin-section-heading"><h2>{title}</h2></div>{children}</section>;
}

export function ReservationDetailPage({ reservationId, locale, copy, navigate }) {
  const q = copy.reservations;
  const [reservation, setReservation] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [banner, setBanner] = React.useState(null);
  const [priceInput, setPriceInput] = React.useState('');
  const [unitId, setUnitId] = React.useState('');
  const [customerId, setCustomerId] = React.useState('');
  const [deposit, setDeposit] = React.useState('');
  const [statusInput, setStatusInput] = React.useState('');
  const [busy, setBusy] = React.useState('');

  const load = React.useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const data = await getOpsReservation(reservationId, { locale, signal });
      if (!data) {
        setReservation(null);
        setError(q.notFound);
        return;
      }
      setReservation(data);
      setPriceInput(data.quote?.confirmedPriceTnd != null ? String(data.quote.confirmedPriceTnd) : data.quote?.indicativePriceTnd != null ? String(data.quote.indicativePriceTnd) : '');
      setUnitId(data.fleetUnit?.id || '');
      setCustomerId(data.customer?.id || '');
      setStatusInput(data.booking?.status || data.status || '');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setReservation(null);
      setError(err instanceof ApiError ? err.message : q.error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [locale, q.error, q.notFound, reservationId]);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const updateReservation = (data, message) => {
    if (data) {
      setReservation(data);
      setUnitId(data.fleetUnit?.id || '');
      setStatusInput(data.booking?.status || data.status || '');
    }
    setBanner({ type: 'ok', text: message });
  };

  const savePrice = async (event) => {
    event.preventDefault();
    if (!reservation || busy) return;
    const value = Number(priceInput);
    if (!Number.isFinite(value) || value < 0) {
      setBanner({ type: 'err', text: q.priceError });
      return;
    }
    setBusy('price');
    setBanner(null);
    try {
      const data = await patchOpsReservationPrice(reservation.id, value, { locale });
      updateReservation(data, q.priceSaved);
    } catch (err) {
      setBanner({ type: 'err', text: err instanceof ApiError ? err.message : q.priceError });
    } finally {
      setBusy('');
    }
  };

  const assignUnit = async (event) => {
    event.preventDefault();
    if (!reservation || !unitId.trim() || busy) return;
    setBusy('assign');
    setBanner(null);
    try {
      const data = await assignOpsReservationUnit(reservation.id, unitId.trim(), { locale });
      updateReservation(data, q.assigned);
    } catch (err) {
      setBanner({ type: 'err', text: err instanceof ApiError ? err.message : q.assignError });
    } finally {
      setBusy('');
    }
  };

  const confirmReservation = async (event) => {
    event.preventDefault();
    if (!reservation || busy) return;
    const selectedUnit = unitId.trim();
    const value = Number(priceInput);
    if (!selectedUnit || !Number.isFinite(value) || value < 0) {
      setBanner({ type: 'err', text: q.confirmHint });
      return;
    }
    if (!reservation.customer?.id && !customerId.trim()) {
      setBanner({ type: 'err', text: q.customerIdHint });
      return;
    }
    setBusy('confirm');
    setBanner(null);
    try {
      const body = { unitId: selectedUnit };
      if (!reservation.customer?.id && customerId.trim()) body.customerId = customerId.trim();
      if (reservation.quote?.confirmedPriceTnd == null) body.priceTnd = value;
      if (deposit.trim() && Number.isFinite(Number(deposit))) body.depositTnd = Number(deposit);
      const data = await confirmOpsReservation(reservation.id, body, { locale });
      updateReservation(data, q.confirmSuccess);
    } catch (err) {
      setBanner({ type: 'err', text: err instanceof ApiError ? err.message : q.confirmError });
    } finally {
      setBusy('');
    }
  };

  const updateStatus = async (event) => {
    event.preventDefault();
    if (!reservation?.booking || !statusInput || busy) return;
    setBusy('status');
    setBanner(null);
    try {
      const data = await updateOpsReservationStatus(reservation.id, { status: statusInput }, { locale });
      updateReservation(data, q.statusUpdated);
    } catch (err) {
      setBanner({ type: 'err', text: err instanceof ApiError ? err.message : q.statusError });
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return <div className="admin-reservation-detail"><div className="admin-detail-head"><span className="admin-skel admin-skel--title" /></div><div className="admin-detail-grid"><div className="admin-panel admin-detail-skeleton" /><div className="admin-panel admin-detail-skeleton" /></div></div>;
  }

  if (!reservation) {
    return <div className="admin-reservation-detail"><ErrorBanner message={error || q.notFound} onRetry={() => load()} retryLabel={q.retry} /><Link className="admin-btn admin-btn--ghost" href="/admin/reservations" navigate={navigate}>{q.backToList}</Link></div>;
  }

  const r = reservation;
  const trip = r.trip || {};
  const booking = r.booking;
  const canPrice = !['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'].includes(r.status) && r.quote?.status !== 'converted';
  const canConfirm = !['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'].includes(r.status);
  const canAssign = booking && ['quote_requested', 'quoted', 'awaiting_payment'].includes(booking.status);

  return (
    <div className="admin-reservation-detail">
      <div className="admin-detail-head admin-reservation-detail__head">
        <div>
          <p className="admin-overline">{q.reference} · <span className="admin-mono">{shortId(r.id)}</span></p>
          <p className="admin-lead">{q.created} {formatDateTime(r.createdAt, locale)} · {q.updated} {formatDateTime(r.updatedAt, locale)}</p>
        </div>
        <div className="admin-detail-head__actions">
          <StatusChip status={r.status} labels={q.statuses} />
          <Link className="admin-btn admin-btn--ghost" href="/admin/reservations" navigate={navigate}>{q.backToList}</Link>
        </div>
      </div>

      {banner ? <div className={`admin-banner admin-banner--${banner.type === 'ok' ? 'ok' : 'error'}`} role={banner.type === 'ok' ? 'status' : 'alert'}>{banner.text}</div> : null}

      <div className="admin-detail-grid admin-reservation-detail__grid">
        <ReservationSection title={q.customerSection}>
          <dl className="admin-definition-grid">
            <Definition label={q.contact}>{r.customer?.name}</Definition>
            <Definition label={q.phone}>{r.customer?.phone}</Definition>
            <Definition label={q.email}>{r.customer?.email}</Definition>
            <Definition label={q.language}>{r.customer?.language?.toUpperCase()}</Definition>
          </dl>
        </ReservationSection>
        <ReservationSection title={q.tripSection}>
          <dl className="admin-definition-grid">
            <Definition label={q.service}>{q.services[trip.service] || trip.service}</Definition>
            <Definition label={q.dates}>{formatDateRange(trip.startAt, trip.endAt, locale)}</Definition>
            <Definition label={q.pickup}>{trip.pickupLabel}</Definition>
            <Definition label={q.dropoff}>{trip.dropoffLabel}</Definition>
            <Definition label={q.passengers}>{trip.passengers}</Definition>
            <Definition label={q.duration}>{trip.duration}</Definition>
            <Definition label={q.flight}>{trip.flightNumber}</Definition>
            <Definition label={q.notes} wide>{trip.notes}</Definition>
          </dl>
        </ReservationSection>
        <ReservationSection title={q.bookingSection} className="admin-reservation-section--wide">
          {booking ? (
            <dl className="admin-definition-grid">
              <Definition label={q.bookingId}><span className="admin-mono">{booking.id}</span></Definition>
              <Definition label={q.bookingStatus}><StatusChip status={booking.status} labels={q.statuses} /></Definition>
              <Definition label={q.quotePrice}>{r.quote?.confirmedPriceTnd != null ? formatTnd(r.quote.confirmedPriceTnd, locale) : '—'}</Definition>
              <Definition label={q.bookingPrice}>{formatTnd(booking.priceTnd, locale)}</Definition>
            </dl>
          ) : <p className="admin-muted">{q.noBooking}</p>}
        </ReservationSection>
        <ReservationSection title={q.resourcesSection} className="admin-reservation-section--wide">
          <dl className="admin-definition-grid">
            <Definition label={q.vehicleModel}><span className="admin-mono">{r.vehicleModel?.id}</span></Definition>
            <Definition label={q.fleetUnit}><span className="admin-mono">{r.fleetUnit?.id}</span></Definition>
            <Definition label={q.driver}><span className="admin-mono">{r.driver?.id}</span></Definition>
          </dl>
        </ReservationSection>
      </div>

      <div className="admin-reservation-actions">
        <ReservationSection title={q.priceSection}>
          <form className="admin-form-stack" onSubmit={savePrice}>
            <label className="admin-field"><span>{q.priceLabel}</span><input type="number" min="0" step="0.001" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} disabled={!canPrice || Boolean(busy)} /></label>
            <p className="admin-field__hint">{q.indicativePrice}: {formatTnd(r.quote?.indicativePriceTnd, locale)}</p>
            <button className="admin-btn admin-btn--primary" type="submit" disabled={!canPrice || Boolean(busy)}>{busy === 'price' ? q.savingPrice : q.savePrice}</button>
          </form>
        </ReservationSection>

        <ReservationSection title={q.confirm}>
          <form className="admin-form-stack" onSubmit={confirmReservation}>
            <label className="admin-field"><span>{q.unitId}</span><input value={unitId} onChange={(e) => setUnitId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" disabled={!canConfirm || Boolean(busy)} /></label>
            {!r.customer?.id ? <label className="admin-field"><span>{q.customerId}</span><input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" disabled={!canConfirm || Boolean(busy)} /></label> : null}
            <label className="admin-field"><span>{q.deposit}</span><input type="number" min="0" step="0.001" value={deposit} onChange={(e) => setDeposit(e.target.value)} disabled={!canConfirm || Boolean(busy)} /></label>
            <p className="admin-field__hint">{q.confirmHint}</p>
            <button className="admin-btn admin-btn--primary" type="submit" disabled={!canConfirm || Boolean(busy)}>{busy === 'confirm' ? q.confirming : q.confirm}</button>
          </form>
        </ReservationSection>

        {booking ? <ReservationSection title={q.assignSection}>
          <form className="admin-form-stack" onSubmit={assignUnit}>
            <label className="admin-field"><span>{q.unitId}</span><input value={unitId} onChange={(e) => setUnitId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" disabled={!canAssign || Boolean(busy)} /></label>
            <p className="admin-field__hint">{q.unitIdHint}</p>
            <button className="admin-btn admin-btn--ghost" type="submit" disabled={!canAssign || Boolean(busy)}>{busy === 'assign' ? q.assigning : q.assign}</button>
          </form>
        </ReservationSection> : null}

        {booking ? <ReservationSection title={q.statusSection}>
          <form className="admin-form-stack" onSubmit={updateStatus}>
            <label className="admin-field"><span>{q.statusLabel}</span><select value={statusInput} onChange={(e) => setStatusInput(e.target.value)} disabled={Boolean(busy)}>{RESERVATION_STATUSES.map((value) => <option key={value} value={value}>{q.statuses[value]}</option>)}</select></label>
            <button className="admin-btn admin-btn--ghost" type="submit" disabled={Boolean(busy) || statusInput === booking.status}>{busy === 'status' ? q.updatingStatus : q.updateStatus}</button>
          </form>
        </ReservationSection> : null}
      </div>
    </div>
  );
}
