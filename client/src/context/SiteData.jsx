import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fetchMenu, fetchSite } from '../api/client';
import { fallbackSettings } from '../data/site';

/**
 * Live content from the admin panel, shared by every page.
 *
 * The site document (settings, rooms, gallery, promotions…) is fetched once
 * per visit; the menu is fetched the first time something asks for it, so a
 * guest who only reads the home page does not download every dish.
 *
 * Until the server answers — or if it never does — `settings` falls back to
 * the static facts in data/site.js, so the header, footer and contact details
 * are never empty. Sections that have no static equivalent (rooms, gallery,
 * dishes) show their own loading and error states instead.
 */
const SiteDataContext = createContext(null);

/** Merges each settings group over its fallback, ignoring blank values. */
function mergeSettings(live) {
  const merged = {};
  for (const [group, defaults] of Object.entries(fallbackSettings)) {
    const incoming = live?.[group] ?? {};
    const out = { ...defaults };
    for (const [key, value] of Object.entries(incoming)) {
      if (value !== '' && value !== null && value !== undefined) out[key] = value;
    }
    merged[group] = out;
  }
  return merged;
}

const EMPTY = Object.freeze({
  categories: [],
  featured: [],
  rooms: [],
  gallery: [],
  promotions: [],
  testimonials: [],
  media: {},
});

function useResource(loader, { eager }) {
  const [state, setState] = useState({
    status: eager ? 'loading' : 'idle',
    data: null,
    error: null,
  });
  const started = useRef(false);

  const load = useCallback(() => {
    started.current = true;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    const controller = new AbortController();
    loader({ signal: controller.signal })
      .then((data) => setState({ status: 'ready', data, error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState((s) => ({ ...s, status: 'error', error }));
      });
    return () => controller.abort();
  }, [loader]);

  const ensure = useCallback(() => {
    if (!started.current) load();
  }, [load]);

  useEffect(() => {
    if (eager) load();
  }, [eager, load]);

  return { ...state, retry: load, ensure };
}

export function SiteDataProvider({ children, loadSite = fetchSite, loadMenu = fetchMenu }) {
  const site = useResource(loadSite, { eager: true });
  const menu = useResource(loadMenu, { eager: false });

  const value = useMemo(() => {
    const data = site.data ?? EMPTY;
    return {
      status: site.status,
      error: site.error,
      retry: site.retry,
      settings: mergeSettings(site.data?.settings),
      categories: data.categories ?? [],
      featured: data.featured ?? [],
      rooms: data.rooms ?? [],
      gallery: data.gallery ?? [],
      promotions: data.promotions ?? [],
      testimonials: data.testimonials ?? [],
      media: { ...(data.media ?? {}), ...(menu.data?.media ?? {}) },
      menu,
    };
  }, [site, menu]);

  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export function useSite() {
  const value = useContext(SiteDataContext);
  if (!value) throw new Error('useSite must be used inside <SiteDataProvider>.');
  return value;
}

/** Resolves a media id against everything loaded so far. */
export function useMediaLookup() {
  const { media } = useSite();
  return useCallback((id) => (id ? (media[id] ?? null) : null), [media]);
}

/** The menu, fetched on first use. */
export function useMenu() {
  const { menu } = useSite();
  const { ensure } = menu;
  useEffect(() => {
    ensure();
  }, [ensure]);
  return menu;
}

export default SiteDataProvider;
