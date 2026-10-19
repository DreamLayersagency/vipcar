import { useCallback, useEffect, useState } from 'react';
import { isAbortError } from '../../../libs/web-client/src/index.js';

/**
 * Run an abortable request and expose `{ status, data, error, retry }`.
 * `status` is `loading` | `success` | `error`.
 * @param {(signal: AbortSignal) => Promise<any>} load
 * @param {unknown[]} deps
 */
export function useRequest(load, deps) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, status: 'loading', error: null }));
    load(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ status: 'success', data, error: null }); })
      .catch((error) => {
        if (isAbortError(error, controller.signal)) return;
        setState({ status: 'error', data: null, error });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, retry };
}
