import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DESIGNS, FONTS, PALETTES, normalizeTheme } from '../../../shared/themes.js';
import {
  THEME_DESIGNS,
  THEME_FONTS,
  THEME_PALETTES,
} from '../../../server/src/validators/entities.js';
import { applyTheme } from './theme';

// Read from disk: under the test runner a CSS import comes back empty.
const tokens = readFileSync(path.resolve(__dirname, '../../../shared/tokens.css'), 'utf8');

/** The custom properties a [data-…='id'] block sets, or :root's for the default. */
function block(selector) {
  const start = tokens.indexOf(`${selector} {`);
  if (start < 0) return null;
  const body = tokens.slice(start, tokens.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
}

describe('the theme catalogue', () => {
  it('offers exactly what the server accepts', () => {
    expect(DESIGNS.map((d) => d.id)).toStrictEqual(THEME_DESIGNS);
    expect(FONTS.map((f) => f.id)).toStrictEqual(THEME_FONTS);
    expect(PALETTES.map((p) => p.id)).toStrictEqual(THEME_PALETTES);
  });

  it('has colours in tokens.css for every palette but the default', () => {
    for (const { id } of PALETTES.slice(1)) {
      expect(block(`[data-palette='${id}']`), id).not.toBeNull();
    }
  });

  it('has faces in tokens.css for every font pairing but the default', () => {
    for (const { id } of FONTS.slice(1)) {
      expect(block(`[data-fonts='${id}']`)?.['--font-display'], id).toBeTruthy();
    }
  });

  it('has a stylesheet for every design but the default, imported by the site', () => {
    const index = readFileSync(path.resolve(__dirname, '../styles/index.css'), 'utf8');
    for (const { id } of DESIGNS.slice(1)) {
      const file = path.resolve(__dirname, `../styles/designs/${id}.css`);
      expect(readFileSync(file, 'utf8'), id).toContain(`[data-design='${id}']`);
      expect(index, id).toContain(`./designs/${id}.css`);
    }
  });

  it('recommends fonts and colours that exist for every design', () => {
    for (const d of DESIGNS) {
      expect(
        FONTS.map((f) => f.id),
        d.id
      ).toContain(d.fonts);
      expect(
        PALETTES.map((p) => p.id),
        d.id
      ).toContain(d.palette);
    }
  });

  it('shows the picker the colours the site will really use', () => {
    const root = block(':root');
    for (const { id, swatches } of PALETTES) {
      const vars = id === 'olive' ? root : block(`[data-palette='${id}']`);
      const [ink, mid, accent, accentLight, paper] = swatches;
      expect([ink, mid, accent, accentLight, paper], id).toStrictEqual([
        vars['--olive-900'],
        vars['--olive-600'],
        vars['--gold-500'],
        vars['--gold-200'],
        vars['--ivory'],
      ]);
    }
  });

  it('gives every design a footer edge', () => {
    for (const { id, footer } of DESIGNS) expect(footer, id).toMatch(/^M0 120.*Z$/);
  });

  it('falls back to the default for anything it does not know', () => {
    expect(normalizeTheme({ design: 'brutalist', fonts: 'comic', palette: 'ocean' })).toStrictEqual(
      { design: 'heritage', fonts: 'garamond', palette: 'ocean' }
    );
    expect(normalizeTheme(undefined)).toStrictEqual({
      design: 'heritage',
      fonts: 'garamond',
      palette: 'olive',
    });
  });

  it('gives a theme saved before fonts were separate its design’s own fonts', () => {
    expect(normalizeTheme({ design: 'hikari', palette: 'olive' }).fonts).toBe('zen');
  });
});

describe('applyTheme', () => {
  it('marks the page and loads only the fonts the design needs', () => {
    applyTheme({ design: 'heha', fonts: 'roman', palette: 'plum' });
    const root = document.documentElement;
    expect(root.dataset.design).toBe('heha');
    expect(root.dataset.fonts).toBe('roman');
    expect(root.dataset.palette).toBe('plum');
    expect(document.getElementById('theme-fonts').getAttribute('href')).toMatch(/Cinzel/);

    applyTheme({ design: 'heritage', fonts: 'garamond', palette: 'olive' });
    expect(root.dataset.design).toBe('heritage');
    expect(document.getElementById('theme-fonts')).toBeNull();
  });
});
