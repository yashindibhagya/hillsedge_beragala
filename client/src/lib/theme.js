import { DEFAULT_THEME, fontsById, normalizeTheme } from '../../../shared/themes.js';

/*
 * The site's design, fonts and palette, as chosen in the admin.
 *
 * They are attributes on <html> — data-design, data-fonts, data-palette —
 * which the stylesheets answer: designs/ restyles the layout, tokens.css the
 * type and the colour ramps. A pairing's webfonts load on demand, so a
 * visitor downloads only the faces in use.
 */

const STORAGE_KEY = 'hs-theme';
const FONT_LINK_ID = 'theme-fonts';

/** The message the admin's live preview sends into the site's frame. */
export const PREVIEW_MESSAGE = 'hillsedge:theme';

/*
 * The admin previews a theme by loading the site in a frame with
 * ?preview=theme&design=…&fonts=…&palette=…. That mode is decided once per page
 * load: links inside the frame navigate without reloading, so it survives
 * moving between pages.
 */
const params = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
export const isThemePreview = params?.get('preview') === 'theme';
const previewStart = isThemePreview
  ? normalizeTheme({
      design: params.get('design'),
      fonts: params.get('fonts'),
      palette: params.get('palette'),
    })
  : null;

function remembered() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? normalizeTheme(saved) : null;
  } catch {
    return null;
  }
}

/** Kept so the next visit paints in the right theme before the API answers. */
export function rememberTheme(theme) {
  if (isThemePreview) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeTheme(theme)));
  } catch {
    // Private mode or storage blocked: the theme still applies, a beat later.
  }
}

/** The theme to paint before the live settings arrive. */
export function initialTheme() {
  return previewStart ?? remembered() ?? DEFAULT_THEME;
}

function loadFonts(href) {
  let link = document.getElementById(FONT_LINK_ID);
  if (!href) {
    link?.remove();
    return;
  }
  if (link?.getAttribute('href') === href) return;
  if (!link) {
    link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    document.head.append(link);
  }
  link.href = href;
}

export function applyTheme(theme) {
  const { design, fonts, palette } = normalizeTheme(theme);
  const root = document.documentElement;
  root.dataset.design = design;
  root.dataset.fonts = fonts;
  root.dataset.palette = palette;
  loadFonts(fontsById(fonts).href);

  // The browser chrome on phones follows the brand colour.
  const meta = document.querySelector('meta[name="theme-color"]');
  const brand = getComputedStyle(root).getPropertyValue('--olive-900').trim();
  if (meta && brand) meta.setAttribute('content', brand);
}
