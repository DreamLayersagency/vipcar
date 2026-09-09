import { apiWithAuth } from '../auth.js';

export async function getOpsAnalytics(days = 30, opts = {}) {
  const params = new URLSearchParams({ days: String(days) });
  const payload = await apiWithAuth(`/v1/ops/analytics/summary?${params}`, {
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload?.data || {
    days,
    totals: { pageViews: 0, uniqueVisitors: 0, quoteRequests: 0 },
    daily: [],
    topPages: [],
  };
}
