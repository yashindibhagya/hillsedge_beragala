import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';

/**
 * Loads `{ items }` from an admin endpoint and keeps it in state.
 *
 * `setItems` lets a screen apply a change optimistically (an availability
 * switch should feel instant on a phone); `reload` re-reads from the server
 * after anything whose result is easier to fetch than to compute.
 */
export function useResource(path, { key = 'items' } = {}) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const controller = useRef(null);

  const reload = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setError(null);
    try {
      const payload = await api.get(path, { signal: current.signal });
      if (current.signal.aborted) return;
      setData(payload);
      setStatus('ready');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err);
      setStatus('error');
    }
  }, [path]);

  useEffect(() => {
    setStatus('loading');
    reload();
    return () => controller.current?.abort();
  }, [reload]);

  const items = data?.[key] ?? [];
  const setItems = useCallback(
    (update) =>
      setData((prev) => ({
        ...prev,
        [key]: typeof update === 'function' ? update(prev?.[key] ?? []) : update,
      })),
    [key]
  );

  return { data, items, setItems, status, error, reload };
}

export default useResource;
