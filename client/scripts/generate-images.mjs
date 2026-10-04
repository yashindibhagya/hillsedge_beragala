/**
 * Derives responsive WebP and AVIF variants from the full-size photographs in
 * src/assets/images.
 *
 *   npm run images
 *
 * Output lands in src/assets/images/generated/ and is picked up automatically
 * by src/data/images.js — nothing needs registering by hand. Re-running is
 * cheap: a variant is only rebuilt when its source is newer.
 *
 * AVIF is emitted only where it earns its place. Measured across this set it
 * beats WebP by 14-19% on the smoother frames but merely ties on the noisy
 * ones, so it is checked rather than assumed: an AVIF must match the WebP's
 * structural similarity AND come out smaller.
 *
 * Each photograph also gets an LQIP: a 20px-wide blurred JPEG inlined into
 * the manifest as a data URI. It costs a few hundred bytes inside the bundle
 * and gives every image slot something to show from the first paint, instead
 * of a dark rectangle while the full file streams in.
 *
 * The AVIF decision is per photograph, not per width. `<picture>` commits to the
 * first source type the browser supports and then chooses a width from that
 * srcset alone — it will not drop back to the WebP for a width the AVIF ladder
 * happens to be missing. A ladder with holes therefore pushes the browser up
 * to a larger file than it needed: leaving the 480px rung out of the gallery
 * images doubled what that page transferred. So unless every width wins, the
 * photograph ships as WebP only.
 */
import { readdir, mkdir, stat, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ssim } from './ssim.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src/assets/images');
const outDir = path.join(srcDir, 'generated');

/** Rendered widths that matter: phone, retina phone / tablet, desktop. */
const WIDTHS = [480, 960, 1440];

/** Tried in order until the WebP is smaller than the source it replaces. */
const QUALITY_LADDER = [72, 64, 56];

/**
 * AVIF qualities to try, cheapest first. A variant takes the first one that
 * reaches the WebP's SSIM; if none does, AVIF is skipped for that variant.
 */
const AVIF_LADDER = [55, 62, 68];

/** SSIM is not perfectly stable across encoders; this much below is a tie. */
const SSIM_TOLERANCE = 0.002;

const isStale = async (source, target) => {
  if (!existsSync(target)) return true;
  const [a, b] = await Promise.all([stat(source), stat(target)]);
  return a.mtimeMs > b.mtimeMs;
};

await mkdir(outDir, { recursive: true });

const files = (await readdir(srcDir)).filter((f) => /\.(jpe?g|png)$/i.test(f));
const manifest = {};
let written = 0;
let avifKept = 0;
let avifSkipped = 0;

for (const file of files) {
  const source = path.join(srcDir, file);
  const name = path.parse(file).name;
  const meta = await sharp(source).metadata();

  // Never upscale: an 800px original gets no 1440px variant.
  const widths = WIDTHS.filter((w) => w < meta.width);
  widths.push(meta.width);

  /*
   * Deliberately tiny and heavily blurred: it is a colour impression to sit
   * under the real photograph, not a thumbnail, and every byte here ships in
   * the JS bundle on first load.
   */
  const lqip = await sharp(source).resize({ width: 20 }).blur(1.5).jpeg({ quality: 40 }).toBuffer();

  manifest[name] = {
    width: meta.width,
    height: meta.height,
    widths,
    lqip: `data:image/jpeg;base64,${lqip.toString('base64')}`,
  };

  const sourceBytes = (await stat(source)).size;
  const original = await sharp(source).toBuffer();
  const stale = await isStale(source, path.join(outDir, `${name}-${widths[0]}.webp`));

  const avifCandidates = [];
  let avifWinsEverywhere = stale;

  for (const width of widths) {
    const webpTarget = path.join(outDir, `${name}-${width}.webp`);
    if (!stale) continue;

    // At full width WebP does not always beat an already well-compressed
    // JPEG, so step the quality down until it does. Downscaled tiers are a
    // fraction of the size either way and take the first setting.
    let webp;
    for (const quality of QUALITY_LADDER) {
      webp = await sharp(source)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 6 })
        .toBuffer();
      if (width < meta.width || webp.length < sourceBytes) break;
    }

    await writeFile(webpTarget, webp);
    written += 1;

    if (!avifWinsEverywhere) continue;

    const webpScore = await ssim(original, webp, width);

    let chosen = null;
    for (const quality of AVIF_LADDER) {
      const avif = await sharp(source)
        .resize({ width, withoutEnlargement: true })
        .avif({ quality, effort: 4 })
        .toBuffer();
      if ((await ssim(original, avif, width)) >= webpScore - SSIM_TOLERANCE) {
        // Reaching parity is not enough — it has to actually save bytes.
        if (avif.length < webp.length) chosen = avif;
        break;
      }
    }

    if (chosen) avifCandidates.push({ width, buffer: chosen });
    else avifWinsEverywhere = false;
  }

  if (stale) {
    for (const width of widths) {
      const avifTarget = path.join(outDir, `${name}-${width}.avif`);
      const candidate = avifWinsEverywhere && avifCandidates.find((c) => c.width === width);
      if (candidate) {
        await writeFile(avifTarget, candidate.buffer);
        avifKept += 1;
      } else {
        // A partial ladder left over from an earlier run would be worse than
        // none, so anything already on disk goes.
        if (existsSync(avifTarget)) await unlink(avifTarget);
        avifSkipped += 1;
      }
    }
  }
}

await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const total = Object.values(manifest).reduce((n, m) => n + m.widths.length, 0);
console.log(
  `${files.length} sources -> ${total} variants (${written} written this run); ` +
    `AVIF kept for ${avifKept}, skipped as no better for ${avifSkipped}`
);
