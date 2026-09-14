import React from 'react';
import { apiWithAuth } from '../auth.js';

export const OPS_WORKFLOW_STATUSES = [
  'new',
  'replied',
  'awaiting_customer',
  'confirmed',
  'closed',
];

async function loadStatus(recordId, options = {}) {
  const payload = await apiWithAuth(`/v1/ops/follow-up/${recordId}`, options);
  return payload?.data?.status || 'new';
}

async function saveStatus(recordId, status, options = {}) {
  const payload = await apiWithAuth(`/v1/ops/follow-up/${recordId}`, {
    ...options,
    method: 'PATCH',
    body: { status },
  });
  return payload?.data?.status || status;
}

export function useOpsWorkflowStatus(recordId) {
  const [status, setStatus] = React.useState('new');
  const [loading, setLoading] = React.useState(Boolean(recordId));
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!recordId) {
      setStatus('new');
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    loadStatus(recordId, { signal: controller.signal })
      .then((next) => {
        if (!controller.signal.aborted && OPS_WORKFLOW_STATUSES.includes(next)) setStatus(next);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError' && !controller.signal.aborted) setError('load');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [recordId]);

  const update = React.useCallback(async (nextStatus) => {
    if (!recordId || !OPS_WORKFLOW_STATUSES.includes(nextStatus)) return false;
    const previous = status;
    setStatus(nextStatus);
    setError('');
    try {
      const savedStatus = await saveStatus(recordId, nextStatus);
      setStatus(OPS_WORKFLOW_STATUSES.includes(savedStatus) ? savedStatus : nextStatus);
      return true;
    } catch (err) {
      setStatus(previous);
      setError('save');
      throw err;
    }
  }, [recordId, status]);

  return [status, update, { loading, error }];
}
