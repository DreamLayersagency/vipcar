import React from 'react';
import { ApiError } from '../api.js';
import { listOpsVehicles } from './opsCatalog.js';
import {
  defaultAvailabilityWindow,
  formatTnd,
  isUuid,
  localInputToIso,
  searchFleetAvailability,
  shortId,
} from './opsFleet.js';

/**
 * @param {{ status: string, labels: Record<string, string> }} props
 */
function UnitStatusChip({ status, labels }) {
  return (
    <span className={`admin-chip admin-chip--unit-${status}`} title={status}>
      {labels[status] || status}
    </span>
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
 * @param {{
 *   locale: 'en' | 'fr',
 *   copy: ReturnType<import('./i18n.js').t>,
 * }} props
 */
export function FleetPage({ locale, copy }) {
  const f = copy.fleet;
  const defaults = defaultAvailabilityWindow();

  const [vehicles, setVehicles] = React.useState(
    /** @type {import('./opsCatalog.js').VehicleModel[]} */ ([]),
  );
  const [modelsLoading, setModelsLoading] = React.useState(true);
  const [modelsError, setModelsError] = React.useState('');

  const [modelId, setModelId] = React.useState('');
  const [hubId, setHubId] = React.useState('');
  const [startLocal, setStartLocal] = React.useState(defaults.start);
  const [endLocal, setEndLocal] = React.useState(defaults.end);
  const [fieldErrors, setFieldErrors] = React.useState(/** @type {Record<string, string>} */ ({}));

  const [rows, setRows] = React.useState(/** @type {import('./opsFleet.js').VehicleUnit[]} */ ([]));
  const [searched, setSearched] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const controller = new AbortController();
    setModelsLoading(true);
    setModelsError('');
    listOpsVehicles({ page: 1, limit: 100, locale, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setVehicles(result.data);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setModelsError(err instanceof ApiError ? err.message : f.modelsError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setModelsLoading(false);
      });
    return () => controller.abort();
  }, [locale, f.modelsError]);

  const onModelChange = (id) => {
    setModelId(id);
    setFieldErrors((prev) => {
      if (!prev.modelId) return prev;
      const next = { ...prev };
      delete next.modelId;
      return next;
    });
    const match = vehicles.find((v) => v.id === id);
    if (match?.defaultHubId) {
      setHubId(match.defaultHubId);
      setFieldErrors((prev) => {
        if (!prev.hubId) return prev;
        const next = { ...prev };
        delete next.hubId;
        return next;
      });
    }
  };

  const validate = () => {
    /** @type {Record<string, string>} */
    const errors = {};
    if (!isUuid(modelId)) errors.modelId = 'uuid';
    if (!isUuid(hubId)) errors.hubId = 'uuid';
    const startIso = localInputToIso(startLocal);
    const endIso = localInputToIso(endLocal);
    if (!startIso) errors.start = 'required';
    if (!endIso) errors.end = 'required';
    if (startIso && endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      errors.end = 'range';
    }
    setFieldErrors(errors);
    return { ok: !Object.keys(errors).length, startIso, endIso };
  };

  const search = async (e) => {
    e?.preventDefault?.();
    const { ok, startIso, endIso } = validate();
    if (!ok || !startIso || !endIso) {
      setError(f.validationFailed);
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const result = await searchFleetAvailability({
        modelId: modelId.trim(),
        hubId: hubId.trim(),
        start: startIso,
        end: endIso,
        locale,
      });
      setRows(result.data);
    } catch (err) {
      setRows([]);
      setError(err instanceof ApiError ? err.message : f.error);
    } finally {
      setLoading(false);
    }
  };

  const fieldMsg = (key) => {
    const code = fieldErrors[key];
    if (!code) return '';
    return f.fieldErrors[code] || f.fieldErrors.required;
  };

  return (
    <div className="admin-fleet">
      <p className="admin-lead">{f.subtitle}</p>

      {modelsError ? (
        <ErrorBanner
          message={modelsError}
          onRetry={() => window.location.reload()}
          retryLabel={f.retry}
        />
      ) : null}

      <form className="admin-panel admin-fleet-form" onSubmit={search} noValidate>
        <h3>{f.searchTitle}</h3>
        <p className="admin-field__hint" style={{ marginTop: 0 }}>
          {f.rangeHint}
        </p>
        <div className="admin-form-grid">
          <label className={`admin-field ${fieldErrors.modelId ? 'admin-field--invalid' : ''}`}>
            <span>{f.fields.model}</span>
            <select
              value={modelId}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={modelsLoading || loading}
            >
              <option value="">{modelsLoading ? f.loadingModels : f.selectModel}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.slug})
                </option>
              ))}
            </select>
            {fieldErrors.modelId ? (
              <span className="admin-field__error" role="alert">
                {fieldMsg('modelId')}
              </span>
            ) : null}
          </label>

          <label className={`admin-field ${fieldErrors.hubId ? 'admin-field--invalid' : ''}`}>
            <span>{f.fields.hubId}</span>
            <input
              value={hubId}
              onChange={(e) => {
                setHubId(e.target.value.trim());
                setFieldErrors((prev) => {
                  if (!prev.hubId) return prev;
                  const next = { ...prev };
                  delete next.hubId;
                  return next;
                });
              }}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            {fieldErrors.hubId ? (
              <span className="admin-field__error" role="alert">
                {fieldMsg('hubId')}
              </span>
            ) : (
              <span className="admin-field__hint">{f.hubHint}</span>
            )}
          </label>

          <label className={`admin-field ${fieldErrors.start ? 'admin-field--invalid' : ''}`}>
            <span>{f.fields.start}</span>
            <input
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              disabled={loading}
            />
            {fieldErrors.start ? (
              <span className="admin-field__error" role="alert">
                {fieldMsg('start')}
              </span>
            ) : null}
          </label>

          <label className={`admin-field ${fieldErrors.end ? 'admin-field--invalid' : ''}`}>
            <span>{f.fields.end}</span>
            <input
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              disabled={loading}
            />
            {fieldErrors.end ? (
              <span className="admin-field__error" role="alert">
                {fieldMsg('end')}
              </span>
            ) : null}
          </label>
        </div>

        <div className="admin-form-actions" style={{ marginTop: '1rem' }}>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={loading}>
            {loading ? f.searching : f.search}
          </button>
        </div>
      </form>

      {error ? <ErrorBanner message={error} onRetry={() => search()} retryLabel={f.retry} /> : null}

      {loading ? <TableSkeleton /> : null}

      {!loading && searched && !error && rows.length === 0 ? (
        <div className="admin-empty">
          <p>{f.empty}</p>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{f.colPlate}</th>
                <th>{f.colStatus}</th>
                <th>{f.colDeposit}</th>
                <th>{f.colUnitId}</th>
                <th>{f.colHub}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.plate}</strong>
                  </td>
                  <td>
                    <UnitStatusChip status={row.status} labels={f.unitStatuses} />
                  </td>
                  <td>{formatTnd(row.depositAmountTnd, locale)}</td>
                  <td>
                    <code className="admin-mono" title={row.id}>
                      {shortId(row.id)}
                    </code>
                  </td>
                  <td>
                    <code className="admin-mono" title={row.hubId}>
                      {shortId(row.hubId)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="admin-muted" style={{ marginTop: '0.75rem' }}>
            {rows.length} {f.unitsFound}
          </p>
        </div>
      ) : null}
    </div>
  );
}
