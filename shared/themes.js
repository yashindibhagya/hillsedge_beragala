/*
 * Hillsedge Beragala — the looks the admin can choose between: a design, a
 * font pairing and a colour palette, picked separately.
 *
 * Both the public site and the admin panel read this list. What each choice
 * does lives in CSS: palettes and font pairings in tokens.css (under
 * [data-palette] and [data-fonts]), designs in client/src/styles/designs/.
 * The server checks choices against the ids in
 * server/src/validators/entities.js — add an id there too.
 *
 * The logo never changes: designs restyle layout and shape, fonts the type,
 * palettes the colour.
 */

export const DEFAULT_THEME = Object.freeze({
  design: 'heritage',
  fonts: 'garamond',
  palette: 'olive',
});

const googleFonts = (families) =>
  `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;

/**
 * Designs: the layout itself — header, hero, how sections sit, cards,
 * image shapes, dividers and the footer. `footer` is the path of the
 * footer's top edge, drawn in a 1440 × 120 box stretched to the page width.
 * `fonts` and `palette` are the pairing and colours it was designed with,
 * offered when it is chosen.
 */
export const DESIGNS = [
  {
    id: 'heritage',
    name: 'Heritage',
    description: 'The original: full-bleed photography, editorial rhythm and a domed footer.',
    fonts: 'garamond',
    palette: 'olive',
    footer: 'M0 120V112C360 0 1080 0 1440 112V120Z',
  },
  {
    id: 'roastery',
    name: 'Roastery',
    description:
      'Warm café: torn-paper bands, round dish photos, centred headings, scrapbook gallery.',
    fonts: 'cafe',
    palette: 'espresso',
    footer:
      'M0 120V38L36 30L58 44L96 26L130 40L172 22L206 36L248 28L290 46L322 30L366 38L398 24L440 42L476 30L512 44L556 26L592 40L630 28L668 46L704 32L746 40L780 24L822 42L860 30L896 44L940 26L976 38L1012 28L1052 46L1090 30L1128 40L1164 24L1204 42L1240 30L1276 44L1318 28L1356 40L1396 30L1440 42V120Z',
  },
  {
    id: 'hikari',
    name: 'Hikari',
    description:
      'Japanese calm: centred logo, thin capitals, lattice-patterned dark bands, square frames.',
    fonts: 'zen',
    palette: 'oxblood',
    footer: 'M0 120V119H1440V120Z',
  },
  {
    id: 'savore',
    name: 'Savore',
    description:
      'Fine dining after dark: deep sections, glowing cards, white pills and soft light bands.',
    fonts: 'classic',
    palette: 'noir',
    footer: 'M0 120V119H1440V120Z',
  },
  {
    id: 'heha',
    name: 'Heha',
    description:
      'Luxury retreat: a framed hero with a glass bar, towering capitals and numbered sections.',
    fonts: 'didone',
    palette: 'lagoon',
    footer: 'M0 120V119H1440V120Z',
  },
  {
    id: 'bento',
    name: 'Bento',
    description:
      'Modern tiles: a floating island header and every section in its own rounded panel.',
    fonts: 'grotesk',
    palette: 'ocean',
    footer: 'M0 120V119H1440V120Z',
  },
  {
    id: 'atelier',
    name: 'Atelier',
    description:
      'Swiss studio: a split hero, ruled grid cells, mono labels and an outlined wordmark.',
    fonts: 'swiss',
    palette: 'midnight',
    footer: 'M0 120V119H1440V120Z',
  },
];

/**
 * Font pairings. `display` and `body` are for the picker's specimen; the
 * site sets them from tokens.css. `href` is the stylesheet to load
 * (Garamond Classic's is already in index.html).
 */
export const FONTS = [
  {
    id: 'garamond',
    name: 'Garamond Classic',
    description: 'Cormorant Garamond with Manrope.',
    display: "'Cormorant Garamond', Georgia, serif",
    body: "'Manrope', system-ui, sans-serif",
    href: null,
  },
  {
    id: 'playfair',
    name: 'Playfair',
    description: 'Playfair Display with Karla.',
    display: "'Playfair Display', Georgia, serif",
    body: "'Karla', system-ui, sans-serif",
    href: googleFonts([
      'Playfair+Display:ital,wght@0,400..700;1,400..700',
      'Karla:wght@400;500;600',
    ]),
  },
  {
    id: 'didone',
    name: 'Didone',
    description: 'Instrument Serif with Inter Tight.',
    display: "'Instrument Serif', Georgia, serif",
    body: "'Inter Tight', system-ui, sans-serif",
    href: googleFonts(['Instrument+Serif:ital@0;1', 'Inter+Tight:wght@400;500;600']),
  },
  {
    id: 'zen',
    name: 'Zen',
    description: 'Light Jost capitals, a Garamond accent.',
    display: "'Jost', system-ui, sans-serif",
    body: "'Jost', system-ui, sans-serif",
    href: googleFonts(['Jost:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400']),
  },
  {
    id: 'classic',
    name: 'Fine Dining',
    description: 'EB Garamond with Figtree.',
    display: "'EB Garamond', Georgia, serif",
    body: "'Figtree', system-ui, sans-serif",
    href: googleFonts(['EB+Garamond:ital,wght@0,400..600;1,400..600', 'Figtree:wght@400;500;600']),
  },
  {
    id: 'cafe',
    name: 'Café',
    description: 'Condensed Bricolage Grotesque with Outfit.',
    display: "'Bricolage Grotesque', system-ui, sans-serif",
    body: "'Outfit', system-ui, sans-serif",
    href: googleFonts([
      'Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800',
      'Outfit:wght@400;500;600',
    ]),
  },
  {
    id: 'grotesk',
    name: 'Geometric',
    description: 'Syne with DM Sans.',
    display: "'Syne', system-ui, sans-serif",
    body: "'DM Sans', system-ui, sans-serif",
    href: googleFonts([
      'Syne:wght@400;500;600;700;800',
      'DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400',
    ]),
  },
  {
    id: 'swiss',
    name: 'Swiss',
    description: 'Space Grotesk, Inter and mono labels.',
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    href: googleFonts([
      'Space+Grotesk:wght@400;500;600;700',
      'Inter:wght@400;500;600',
      'JetBrains+Mono:wght@400;500',
    ]),
  },
  {
    id: 'roman',
    name: 'Roman',
    description: 'Cinzel capitals with Jost.',
    display: "'Cinzel', Georgia, serif",
    body: "'Jost', system-ui, sans-serif",
    href: googleFonts(['Cinzel:wght@400;500;600', 'Jost:ital,wght@0,400;0,500;0,600;1,400']),
  },
  {
    id: 'organic',
    name: 'Organic',
    description: 'Soft Fraunces with Outfit.',
    display: "'Fraunces', Georgia, serif",
    body: "'Outfit', system-ui, sans-serif",
    href: googleFonts([
      'Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500',
      'Outfit:wght@400;500;600',
    ]),
  },
];

/**
 * Palettes. `swatches` are for the picker only — brand dark, brand mid,
 * accent, accent light, page tint — and must match tokens.css (a test
 * checks).
 */
export const PALETTES = [
  {
    id: 'olive',
    name: 'Hillside Olive',
    description: 'Mountain olive with burnished gold.',
    swatches: ['#1f2616', '#4a5a32', '#c3a25e', '#ecdcb6', '#faf8f3'],
  },
  {
    id: 'espresso',
    name: 'Espresso & Caramel',
    description: 'Roasted brown and burnt orange.',
    swatches: ['#2f1f17', '#6f4936', '#e39140', '#ffd4b0', '#fbf8f2'],
  },
  {
    id: 'oxblood',
    name: 'Oxblood & Rice Paper',
    description: 'Lacquer red-black on soft paper.',
    swatches: ['#2d1f20', '#6b494c', '#c89b8b', '#f2d7cd', '#faf8f5'],
  },
  {
    id: 'noir',
    name: 'Noir & Champagne',
    description: 'Charcoal and champagne. Evening dress.',
    swatches: ['#242322', '#55534f', '#bda375', '#eadbc1', '#f9f8f6'],
  },
  {
    id: 'lagoon',
    name: 'Charcoal & Lagoon',
    description: 'Slate and sea-glass on sand.',
    swatches: ['#222325', '#505459', '#5cb8b8', '#b8e8e7', '#faf8f4'],
  },
  {
    id: 'midnight',
    name: 'Midnight & Copper',
    description: 'Inky navy lit by warm copper.',
    swatches: ['#1c2331', '#415375', '#e1915f', '#ffd3ba', '#faf8f5'],
  },
  {
    id: 'terracotta',
    name: 'Terracotta & Sand',
    description: 'Fired clay and sun-warmed sand.',
    swatches: ['#311d17', '#754536', '#c99f5d', '#f2dab5', '#fbf7f3'],
  },
  {
    id: 'forest',
    name: 'Forest & Blush',
    description: 'Deep pine softened with rose.',
    swatches: ['#172720', '#345d4c', '#d69293', '#fbd2d2', '#faf7f6'],
  },
  {
    id: 'plum',
    name: 'Plum & Saffron',
    description: 'Ripe plum with a saffron glow.',
    swatches: ['#2c1e29', '#684761', '#d89941', '#fbd6aa', '#faf8f5'],
  },
  {
    id: 'ocean',
    name: 'Ocean & Coral',
    description: 'Deep teal water, coral at dusk.',
    swatches: ['#13262b', '#2a5b67', '#ec8773', '#ffd1c7', '#faf8f6'],
  },
];

const find = (list, id) => list.find((item) => item.id === id) ?? list[0];
export const designById = (id) => find(DESIGNS, id);
export const fontsById = (id) => find(FONTS, id);
export const paletteById = (id) => find(PALETTES, id);

/**
 * A complete theme with any unknown id replaced. A theme saved before fonts
 * were a separate choice gets the fonts its design was made with.
 */
export function normalizeTheme(theme) {
  const design = designById(theme?.design);
  return {
    design: design.id,
    fonts: FONTS.some((f) => f.id === theme?.fonts) ? theme.fonts : design.fonts,
    palette: paletteById(theme?.palette).id,
  };
}
