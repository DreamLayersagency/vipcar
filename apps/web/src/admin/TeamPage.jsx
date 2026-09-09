import React from 'react';
import { ApiError } from '../api.js';
import { createOpsStaff, listOpsStaff, validateStaffForm } from './opsStaff.js';

function ErrorBanner({ message }) {
  return <div className="admin-banner admin-banner--error" role="alert">{message}</div>;
}

function SuccessBanner({ message }) {
  return <div className="admin-banner admin-banner--ok" role="status">{message}</div>;
}

function roleLabel(role, copy) {
  return role === 'admin' ? copy.adminRole : copy.opsRole;
}

export function TeamPage({ locale, copy }) {
  const c = copy.team;
  const [staff, setStaff] = React.useState([]);
  const [form, setForm] = React.useState({ name: '', email: '', phone: '', password: '', locale });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState({});

  const load = React.useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      setStaff(await listOpsStaff({ locale, signal }));
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err instanceof ApiError && err.status === 403 ? c.adminOnly : err?.message || c.loadError);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [locale, c.adminOnly, c.loadError]);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSuccess('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSuccess('');
    setError('');
    const errors = validateStaffForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError(c.validationFailed);
      return;
    }
    setSaving(true);
    try {
      const created = await createOpsStaff(form, { locale });
      setStaff((current) => [created, ...current]);
      setForm({ name: '', email: '', phone: '', password: '', locale });
      setFieldErrors({});
      setSuccess(c.created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : c.createError);
    } finally {
      setSaving(false);
    }
  };

  const fieldMessage = (key) => {
    const code = fieldErrors[key];
    if (!code) return '';
    return c.fieldErrors[code] || c.fieldErrors.required;
  };

  return (
    <div className="admin-team">
      <p className="admin-lead">{c.subtitle}</p>
      <div className="admin-team__layout">
        <section className="admin-panel admin-team__create">
          <div className="admin-panel__heading">
            <div>
              <p className="admin-eyebrow">{c.createEyebrow}</p>
              <h2>{c.createTitle}</h2>
            </div>
            <span className="admin-team__badge">ops_agent</span>
          </div>
          {error ? <ErrorBanner message={error} /> : null}
          {success ? <SuccessBanner message={success} /> : null}
          <form className="admin-team__form" onSubmit={submit} noValidate>
            <label className={`admin-field ${fieldErrors.name ? 'admin-field--invalid' : ''}`}>
              <span>{c.name}</span>
              <input value={form.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" disabled={saving} />
              {fieldErrors.name ? <span className="admin-field__error">{fieldMessage('name')}</span> : null}
            </label>
            <label className={`admin-field ${fieldErrors.email ? 'admin-field--invalid' : ''}`}>
              <span>{c.email}</span>
              <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" disabled={saving} />
              {fieldErrors.email ? <span className="admin-field__error">{fieldMessage('email')}</span> : null}
            </label>
            <label className="admin-field">
              <span>{c.phone}</span>
              <input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" disabled={saving} />
            </label>
            <label className={`admin-field ${fieldErrors.password ? 'admin-field--invalid' : ''}`}>
              <span>{c.password}</span>
              <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} autoComplete="new-password" disabled={saving} />
              {fieldErrors.password ? <span className="admin-field__error">{fieldMessage('password')}</span> : <span className="admin-field__hint">{c.passwordHint}</span>}
            </label>
            <label className="admin-field">
              <span>{c.language}</span>
              <select value={form.locale} onChange={(event) => update('locale', event.target.value)} disabled={saving}>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
            </label>
            <div className="admin-form-actions admin-team__actions">
              <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>{saving ? c.creating : c.create}</button>
            </div>
          </form>
        </section>

        <section className="admin-panel admin-team__list">
          <div className="admin-panel__heading">
            <div>
              <p className="admin-eyebrow">{c.listEyebrow}</p>
              <h2>{c.listTitle}</h2>
            </div>
            <span className="admin-team__count">{staff.length}</span>
          </div>
          {loading ? <p className="admin-muted">{c.loading}</p> : null}
          {!loading && !staff.length && !error ? <p className="admin-muted">{c.empty}</p> : null}
          {!loading && staff.length ? (
            <div className="admin-team__members">
              {staff.map((member) => (
                <article className="admin-team__member" key={member.id}>
                  <span className="admin-team__avatar">{String(member.name || member.email).slice(0, 1).toUpperCase()}</span>
                  <div className="admin-team__member-copy">
                    <strong>{member.name}</strong>
                    <span>{member.email}</span>
                    {member.phone ? <small>{member.phone}</small> : null}
                  </div>
                  <span className={`admin-chip ${member.isActive === false ? 'admin-chip--expired' : 'admin-chip--quoted'}`}>{member.isActive === false ? c.inactive : roleLabel(member.role, c)}</span>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
