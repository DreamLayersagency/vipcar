import React from 'react';
import { ApiError } from '../api.js';
import {
  assignDriver,
  formatDateTime,
  isUuid,
  nextTripStatuses,
  shortId,
  updateTripStatus,
} from './opsDispatch.js';

/**
 * @param {{ status: string, labels: Record<string, string> }} props
 */
function AssignmentStatusChip({ status, labels }) {
  return (
    <span className={`admin-chip admin-chip--assign-${status}`} title={status}>
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
        aria-labelledby="admin-dispatch-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="admin-dispatch-confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="admin-dialog__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{ message: string }} props
 */
function ErrorBanner({ message }) {
  return (
    <div className="admin-banner admin-banner--error" role="alert">
      <span>{message}</span>
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

/**
 * @param {{
 *   assignment: import('./opsDispatch.js').Assignment,
 *   locale: 'en' | 'fr',
 *   copy: ReturnType<import('./i18n.js').t>['dispatch'],
 *   busy: boolean,
 *   onTripStatus: (status: import('./opsDispatch.js').TripProgressStatus) => void,
 * }} props
 */
function AssignmentPanel({ assignment, locale, copy: d, busy, onTripStatus }) {
  const next = nextTripStatuses(assignment.status);
  return (
    <section className="admin-panel admin-dispatch-result">
      <div className="admin-detail-head" style={{ marginBottom: '0.85rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>{d.assignmentTitle}</h3>
          <p className="admin-muted" style={{ margin: '0.25rem 0 0' }}>
            {d.assignmentId}:{' '}
            <code className="admin-mono" title={assignment.id}>
              {assignment.id}
            </code>
          </p>
        </div>
        <AssignmentStatusChip status={assignment.status} labels={d.statuses} />
      </div>

      <dl className="admin-dl">
        <div>
          <dt>{d.bookingId}</dt>
          <dd>
            <code className="admin-mono" title={assignment.bookingId}>
              {shortId(assignment.bookingId)}
            </code>
          </dd>
        </div>
        <div>
          <dt>{d.driverId}</dt>
          <dd>
            {assignment.driverId ? (
              <code className="admin-mono" title={assignment.driverId}>
                {shortId(assignment.driverId)}
              </code>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt>{d.type}</dt>
          <dd>{d.types[assignment.type] || assignment.type}</dd>
        </div>
        <div>
          <dt>{d.scheduledAt}</dt>
          <dd>{formatDateTime(assignment.scheduledAt, locale)}</dd>
        </div>
        {assignment.flightNumber ? (
          <div>
            <dt>{d.flight}</dt>
            <dd>{assignment.flightNumber}</dd>
          </div>
        ) : null}
        {assignment.duration ? (
          <div>
            <dt>{d.duration}</dt>
            <dd>{assignment.duration}</dd>
          </div>
        ) : null}
      </dl>

      <div className="admin-trip-actions">
        <p className="admin-muted" style={{ margin: '0 0 0.55rem' }}>
          {d.tripHint}
        </p>
        <div className="admin-chip-row" aria-label={d.tripStatusesLabel}>
          {['en_route', 'arrived', 'completed'].map((s) => (
            <AssignmentStatusChip key={s} status={s} labels={d.statuses} />
          ))}
        </div>
        {next.length > 0 ? (
          <div className="admin-form-actions" style={{ marginTop: '0.85rem' }}>
            {next.map((status) => (
              <button
                key={status}
                type="button"
                className={`admin-btn ${status === 'completed' ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
                disabled={busy}
                onClick={() => onTripStatus(status)}
              >
                {busy ? d.updating : d.setStatus[status]}
              </button>
            ))}
          </div>
        ) : (
          <p className="admin-muted" style={{ marginTop: '0.75rem' }}>
            {assignment.status === 'completed' || assignment.status === 'cancelled'
              ? d.tripDone
              : d.tripBlocked}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * @param {{
 *   locale: 'en' | 'fr',
 *   copy: ReturnType<import('./i18n.js').t>,
 * }} props
 */
export function DispatchPage({ locale, copy }) {
  const d = copy.dispatch;
  const params = new URLSearchParams(location.search);
  const initialBooking = params.get('bookingId') || '';

  /** @type {'booking' | 'driver' | 'confirm'} */
  const [step, setStep] = React.useState(initialBooking && isUuid(initialBooking) ? 'driver' : 'booking');
  const [bookingId, setBookingId] = React.useState(initialBooking);
  const [driverId, setDriverId] = React.useState('');
  const [fieldError, setFieldError] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [assignment, setAssignment] = React.useState(
    /** @type {import('./opsDispatch.js').Assignment | null} */ (null),
  );

  const syncBookingUrl = (id) => {
    const sp = new URLSearchParams(location.search);
    if (id) sp.set('bookingId', id);
    else sp.delete('bookingId');
    const qs = sp.toString();
    history.replaceState({}, '', qs ? `/admin/dispatch?${qs}` : '/admin/dispatch');
  };

  const goBooking = () => {
    setStep('booking');
    setFieldError('');
    setError('');
    setSuccess('');
  };

  const goDriver = () => {
    const id = bookingId.trim();
    if (!isUuid(id)) {
      setFieldError(d.invalidUuid);
      return;
    }
    setBookingId(id);
    syncBookingUrl(id);
    setFieldError('');
    setError('');
    setStep('driver');
  };

  const goConfirm = () => {
    const id = driverId.trim();
    if (!isUuid(id)) {
      setFieldError(d.invalidUuid);
      return;
    }
    setDriverId(id);
    setFieldError('');
    setError('');
    setStep('confirm');
  };

  const doAssign = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await assignDriver(
        { bookingId: bookingId.trim(), driverId: driverId.trim() },
        { locale },
      );
      setAssignment(result);
      setDialogOpen(false);
      setSuccess(d.assignSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.assignError);
      setDialogOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const doTripStatus = async (status) => {
    if (!assignment?.id || busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await updateTripStatus(
        { assignmentId: assignment.id, status },
        { locale },
      );
      setAssignment(result);
      setSuccess(d.tripSuccess[status] || d.tripUpdated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.tripError);
    } finally {
      setBusy(false);
    }
  };

  const resetWizard = () => {
    setAssignment(null);
    setSuccess('');
    setError('');
    setDriverId('');
    setStep('booking');
  };

  const steps = [
    { id: 'booking', label: d.steps.booking },
    { id: 'driver', label: d.steps.driver },
    { id: 'confirm', label: d.steps.confirm },
  ];

  return (
    <div className="admin-dispatch">
      <p className="admin-lead">{d.subtitle}</p>

      <ol className="admin-steps" aria-label={d.stepsLabel}>
        {steps.map((s, i) => {
          const active = step === s.id;
          const done =
            (s.id === 'booking' && (step === 'driver' || step === 'confirm' || assignment)) ||
            (s.id === 'driver' && (step === 'confirm' || assignment)) ||
            (s.id === 'confirm' && assignment);
          return (
            <li
              key={s.id}
              className={`admin-steps__item${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}
            >
              <span className="admin-steps__num" aria-hidden="true">
                {i + 1}
              </span>
              <span>{s.label}</span>
            </li>
          );
        })}
      </ol>

      {error ? <ErrorBanner message={error} /> : null}
      {success ? <SuccessBanner message={success} /> : null}

      {!assignment ? (
        <section className="admin-panel">
          {step === 'booking' ? (
            <>
              <h3>{d.stepBookingTitle}</h3>
              <p className="admin-field__hint" style={{ marginTop: 0 }}>
                {d.stepBookingHint}
              </p>
              <label className={`admin-field ${fieldError ? 'admin-field--invalid' : ''}`}>
                <span>{d.bookingId}</span>
                <input
                  value={bookingId}
                  onChange={(e) => {
                    setBookingId(e.target.value.trim());
                    setFieldError('');
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
                {fieldError ? (
                  <span className="admin-field__error" role="alert">
                    {fieldError}
                  </span>
                ) : null}
              </label>
              <div className="admin-form-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="admin-btn admin-btn--primary" onClick={goDriver}>
                  {d.nextDriver}
                </button>
              </div>
            </>
          ) : null}

          {step === 'driver' ? (
            <>
              <h3>{d.stepDriverTitle}</h3>
              <p className="admin-field__hint" style={{ marginTop: 0 }}>
                {d.stepDriverHint}
              </p>
              <p className="admin-muted">
                {d.bookingId}:{' '}
                <code className="admin-mono" title={bookingId}>
                  {bookingId}
                </code>
              </p>
              <label className={`admin-field ${fieldError ? 'admin-field--invalid' : ''}`}>
                <span>{d.driverId}</span>
                <input
                  value={driverId}
                  onChange={(e) => {
                    setDriverId(e.target.value.trim());
                    setFieldError('');
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
                {fieldError ? (
                  <span className="admin-field__error" role="alert">
                    {fieldError}
                  </span>
                ) : null}
              </label>
              <div className="admin-form-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="admin-btn admin-btn--ghost" onClick={goBooking}>
                  {d.back}
                </button>
                <button type="button" className="admin-btn admin-btn--primary" onClick={goConfirm}>
                  {d.nextConfirm}
                </button>
              </div>
            </>
          ) : null}

          {step === 'confirm' ? (
            <>
              <h3>{d.stepConfirmTitle}</h3>
              <p className="admin-field__hint" style={{ marginTop: 0 }}>
                {d.stepConfirmHint}
              </p>
              <dl className="admin-dl">
                <div>
                  <dt>{d.bookingId}</dt>
                  <dd>
                    <code className="admin-mono">{bookingId}</code>
                  </dd>
                </div>
                <div>
                  <dt>{d.driverId}</dt>
                  <dd>
                    <code className="admin-mono">{driverId}</code>
                  </dd>
                </div>
              </dl>
              <div className="admin-form-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="admin-btn admin-btn--ghost" onClick={goDriver}>
                  {d.back}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => setDialogOpen(true)}
                  disabled={busy}
                >
                  {d.assign}
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : (
        <>
          <AssignmentPanel
            assignment={assignment}
            locale={locale}
            copy={d}
            busy={busy}
            onTripStatus={doTripStatus}
          />
          <div className="admin-form-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={resetWizard}>
              {d.assignAnother}
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={dialogOpen}
        title={d.confirmDialogTitle}
        body={d.confirmDialogBody}
        cancelLabel={d.confirmCancel}
        confirmLabel={d.confirmOk}
        busy={busy}
        onCancel={() => setDialogOpen(false)}
        onConfirm={doAssign}
      />
    </div>
  );
}
