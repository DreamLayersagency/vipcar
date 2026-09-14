import React from 'react';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { formatDateTime } from './opsQuotes.js';
import { listOpsNotifications, markOpsNotificationsRead } from './opsNotifications.js';

const POLL_INTERVAL_MS = 30_000;

function notificationCopy(item, copy) {
  const payload = item.payload || {};
  const title = item.kind === 'new_contact'
    ? copy.notifications.newContact
    : item.kind === 'new_reservation'
      ? copy.notifications.newReservation
      : item.kind === 'new_quote'
        ? copy.notifications.newQuote
        : copy.notifications.newRequest;
  const detail = payload.customerName || payload.customerEmail || payload.service || copy.notifications.request;
  return { ...item, title, detail };
}

export function AdminNotifications({ locale, copy, navigate }) {
  const c = copy.notifications;
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [error, setError] = React.useState('');
  const rootRef = React.useRef(null);

  const load = React.useCallback(async (signal) => {
    setLoading(true);
    try {
      const data = await listOpsNotifications({ limit: 50, locale, signal });
      if (signal?.aborted) return;
      setItems(data.map((item) => notificationCopy(item, copy)));
      setError('');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(c.error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [c.error, copy, locale]);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const timer = window.setInterval(() => load(), POLL_INTERVAL_MS);
    const onVisibility = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const unreadItems = items.filter((item) => !item.isRead);
  const unreadCount = unreadItems.length;

  const markRead = async (notificationIds) => {
    if (!notificationIds.length) return;
    setItems((current) => current.map((item) => (
      notificationIds.includes(item.id) ? { ...item, isRead: true } : item
    )));
    try {
      await markOpsNotificationsRead(notificationIds, { locale });
    } catch {
      setError(c.markError || c.error);
      await load();
    }
  };

  return (
    <div className="admin-notifications" ref={rootRef}>
      <button
        type="button"
        className="admin-notifications__trigger"
        aria-label={`${c.title}${unreadCount ? ` (${unreadCount})` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={17} strokeWidth={1.9} />
        {unreadCount ? <span className="admin-notifications__badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
      </button>

      {open ? (
        <section className="admin-notifications__panel" aria-label={c.title}>
          <div className="admin-notifications__head">
            <div>
              <strong>{c.title}</strong>
              <span>{unreadCount ? `${unreadCount} ${c.unread}` : c.allCaughtUp}</span>
            </div>
            <button type="button" className="admin-notifications__refresh" onClick={() => load()} aria-label={c.refresh} title={c.refresh}>
              <RefreshCw size={14} className={loading ? 'is-spinning' : ''} />
            </button>
          </div>
          {error ? <p className="admin-notifications__error">{error}</p> : null}
          {loading && !items.length ? <p className="admin-notifications__empty">{c.loading}</p> : null}
          {!loading && !items.length && !error ? <p className="admin-notifications__empty">{c.empty}</p> : null}
          {items.length ? (
            <div className="admin-notifications__list">
              {items.map((item) => (
                <button
                  type="button"
                  className={`admin-notifications__item${item.isRead ? '' : ' is-unread'}`}
                  key={item.id}
                  onClick={async () => {
                    if (!item.isRead) await markRead([item.id]);
                    setOpen(false);
                    navigate(item.href);
                  }}
                >
                  <span className="admin-notifications__dot" aria-hidden="true" />
                  <span className="admin-notifications__item-copy">
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                    <time dateTime={item.createdAt}>{formatDateTime(item.createdAt, locale)}</time>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" className="admin-notifications__mark" onClick={() => markRead(unreadItems.map((item) => item.id))} disabled={!unreadCount}>
            <Check size={14} />
            {c.markRead}
          </button>
        </section>
      ) : null}
    </div>
  );
}
