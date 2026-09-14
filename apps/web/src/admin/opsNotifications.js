import { apiWithAuth } from '../auth.js';

export async function listOpsNotifications(opts = {}) {
  const params = new URLSearchParams({ limit: String(opts.limit ?? 50) });
  const payload = await apiWithAuth(`/v1/ops/notifications?${params}`, {
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload?.data || [];
}

export async function markOpsNotificationsRead(notificationIds, opts = {}) {
  if (!notificationIds?.length) return { ok: true, count: 0 };
  return apiWithAuth('/v1/ops/notifications/read', {
    method: 'POST',
    body: { notificationIds },
    locale: opts.locale,
    signal: opts.signal,
  });
}
