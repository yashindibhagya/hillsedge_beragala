import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const MediaContext = createContext(null);

/**
 * The media library, loaded once and shared: every form with an image field
 * shows thumbnails, and the picker lists the whole library, so fetching it
 * per field would be a request for every thumbnail on the page.
 */
export function MediaProvider({ children }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');

  const reload = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    try {
      const payload = await api.get('/admin/media');
      setItems(payload.items);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      items,
      status,
      reload,
      byId: (id) => items.find((m) => m.id === id) ?? null,
      add: (item) => setItems((list) => [...list, item]),
      replace: (item) => setItems((list) => list.map((m) => (m.id === item.id ? item : m))),
      remove: (id) => setItems((list) => list.filter((m) => m.id !== id)),
      setAll: setItems,
    }),
    [items, status, reload]
  );

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

export function useMediaLibrary() {
  const context = useContext(MediaContext);
  if (!context) throw new Error('useMediaLibrary must be used inside <MediaProvider>.');
  return context;
}
