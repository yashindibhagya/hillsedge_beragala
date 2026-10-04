import { describe, expect, it } from 'vitest';
import { fallbackSettings, photos, shareImage, site } from './site';
import { navLinks, redirects } from './routes';
import { images } from './images';
import { galleryOrder, cuisines, faqs, routes } from './content';
import { routes as appRoutes } from '../App';

describe('photographs', () => {
  it('every photograph resolves to a real asset', () => {
    for (const [key, photo] of Object.entries(photos)) {
      expect(photo.src, key).toBeTruthy();
      expect(photo.width, key).toBeGreaterThan(0);
      expect(photo.height, key).toBeGreaterThan(0);
    }
  });

  it('every photograph carries alt text and a caption', () => {
    for (const [key, photo] of Object.entries(photos)) {
      expect(photo.alt, key).toMatch(/\S/);
      expect(photo.caption, key).toMatch(/\S/);
    }
  });

  it('offers a responsive WebP ladder, widest last', () => {
    for (const [key, photo] of Object.entries(photos)) {
      const widths = photo.srcSet
        .split(',')
        .map((candidate) => Number(candidate.trim().split(' ')[1].replace('w', '')));
      expect(widths.length, key).toBeGreaterThan(0);
      expect(widths, key).toStrictEqual([...widths].sort((a, b) => a - b));
      expect(Math.max(...widths), key).toBeLessThanOrEqual(photo.width);
    }
  });

  it('uses every image that exists, and every image it uses exists', () => {
    expect(new Set(Object.keys(photos))).toStrictEqual(new Set(Object.keys(images)));
  });

  it('the offline gallery lists every photograph exactly once', () => {
    expect(new Set(galleryOrder)).toStrictEqual(new Set(Object.keys(photos)));
    expect(galleryOrder.length).toBe(new Set(galleryOrder).size);
  });
});

describe('routes', () => {
  const routed = new Set(
    appRoutes[0].children.filter((r) => r.path && r.path !== '*').map((r) => `/${r.path}`)
  );
  routed.add('/');

  it('numbers the menu in order, with no gaps', () => {
    expect(navLinks.map((link) => Number(link.index))).toStrictEqual(navLinks.map((_, i) => i + 1));
  });

  it('every navigation link has a page behind it', () => {
    for (const { to } of navLinks) expect(routed, to).toContain(to);
  });

  it('every old URL redirects to a page that exists', () => {
    for (const { from, to } of redirects) {
      expect(routed, from).toContain(from);
      expect(
        navLinks.map((l) => l.to),
        from
      ).toContain(to);
    }
  });
});

describe('fallback settings', () => {
  it('cover every group the live settings have', () => {
    expect(Object.keys(fallbackSettings).sort()).toStrictEqual(
      ['about', 'home', 'hours', 'menu', 'reservations', 'restaurant', 'social'].sort()
    );
  });

  it('publish no opening times that nobody has confirmed', () => {
    expect(fallbackSettings.hours.days).toStrictEqual([]);
  });

  it('use one telephone number everywhere', () => {
    expect(site.phone.href).toBe('tel:+94742373394');
    expect(fallbackSettings.restaurant.whatsapp).toBe(site.whatsapp);
  });
});

describe('copy', () => {
  it('has the full set the pages expect', () => {
    expect(cuisines).toHaveLength(9);
    expect(faqs.length).toBeGreaterThan(0);
    expect(routes).toHaveLength(3);
  });

  it('has a real image with alt text for link previews', () => {
    expect(shareImage.src).toBeTruthy();
    expect(shareImage.alt).toMatch(/\S/);
  });
});
