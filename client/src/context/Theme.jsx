import { createContext, useContext, useEffect, useState } from 'react';
import { normalizeTheme } from '../../../shared/themes.js';
import {
  PREVIEW_MESSAGE,
  applyTheme,
  initialTheme,
  isThemePreview,
  rememberTheme,
} from '../lib/theme';
import { useSite } from './SiteData';

const ThemeContext = createContext(initialTheme());

/**
 * Applies the design, fonts and palette saved in the admin.
 *
 * Until the site data arrives the page keeps the theme it was painted with
 * (the last one seen, or the default), so a returning visitor never sees the
 * default flash first. In the admin's preview frame the theme comes from the
 * URL and then from the admin's messages, and the saved one is ignored.
 */
export function ThemeProvider({ children }) {
  const { status, settings } = useSite();
  const [theme, setTheme] = useState(initialTheme);

  const live = status === 'ready' ? normalizeTheme(settings.theme) : null;
  const liveKey = live && `${live.design}/${live.fonts}/${live.palette}`;

  useEffect(() => {
    if (isThemePreview || !live) return;
    setTheme(live);
    rememberTheme(live);
    // liveKey stands for `live`, which is a new object every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);

  useEffect(() => {
    if (!isThemePreview) return undefined;
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== PREVIEW_MESSAGE) return;
      setTheme(normalizeTheme(event.data));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** The look in force: `{ design, fonts, palette }`. */
export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;
