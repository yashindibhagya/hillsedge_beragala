import manifest from '../assets/images/generated/manifest.json';

/**
 * Every photograph, resolved once at build time and keyed in camelCase
 * (`after-dark.jpg` → `images.afterDark`).
 *
 * The full-size JPEG is the fallback source; `npm run images` derives the WebP
 * ladder beside it and Vite fingerprints both. Because both sets are globbed,
 * adding a photograph means dropping the file in and re-running that script —
 * nothing here needs editing.
 *
 * @typedef {object} ImageAsset
 * @property {string} src     full-size JPEG, used as the fallback
 * @property {number} width   intrinsic width, so the browser can reserve space
 * @property {number} height  intrinsic height
 * @property {string} srcSet  the WebP ladder, ready for `<source srcset>`
 * @property {string} avifSrcSet  the AVIF ladder, or '' where AVIF never won
 * @property {string} lqip    a 20px blurred data URI, shown until the real file arrives
 */

const originals = import.meta.glob('../assets/images/*.{jpg,jpeg,png}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const webp = import.meta.glob('../assets/images/generated/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

/*
 * Sparse by design: the image script writes an AVIF only where it beat the
 * WebP at equal quality, so a photograph may have AVIF at some widths and
 * none at others.
 */
const avif = import.meta.glob('../assets/images/generated/*.avif', {
  eager: true,
  query: '?url',
  import: 'default',
});

const basename = (filePath) => filePath.slice(filePath.lastIndexOf('/') + 1);
const camelCase = (name) => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

/** `after-dark-480.webp` → grouped under `after-dark` at width 480. */
const group = (entries, extension) => {
  const ladders = {};
  for (const [filePath, url] of Object.entries(entries)) {
    const match = basename(filePath).match(new RegExp(`^(.+)-(\\d+)\\.${extension}$`));
    if (!match) continue;
    (ladders[match[1]] ??= []).push({ width: Number(match[2]), url });
  }
  for (const ladder of Object.values(ladders)) ladder.sort((a, b) => a.width - b.width);
  return ladders;
};

const ladders = group(webp, 'webp');
const avifLadders = group(avif, 'avif');

const toSrcSet = (ladder) => (ladder ?? []).map(({ url, width }) => `${url} ${width}w`).join(', ');

/** @type {Record<string, ImageAsset>} */
export const images = {};

for (const [filePath, url] of Object.entries(originals)) {
  const name = basename(filePath).replace(/\.[^.]+$/, '');
  const meta = manifest[name] ?? {};

  images[camelCase(name)] = {
    src: url,
    width: meta.width,
    height: meta.height,
    srcSet: toSrcSet(ladders[name]),
    avifSrcSet: toSrcSet(avifLadders[name]),
    lqip: meta.lqip,
  };
}

export default images;
