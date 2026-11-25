import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { navLinks } from './routes';
import { fullTitle, pageSeo } from './seo';
import { fallbackSettings } from './site';
import { buildStructuredData } from '../lib/structuredData';

describe('page SEO', () => {
  it('covers every route in the sitemap, and nothing else', () => {
    expect(Object.keys(pageSeo).sort()).toEqual(navLinks.map((link) => link.to).sort());
  });

  it.each(Object.entries(pageSeo))('%s fits a search result', (_path, seo) => {
    // Results cut a title at roughly 60 characters and a description at 160.
    expect(fullTitle(seo.title, seo.brandSuffix).length).toBeLessThanOrEqual(65);
    expect(seo.description.length).toBeGreaterThanOrEqual(70);
    expect(seo.description.length).toBeLessThanOrEqual(160);
  });

  it('gives every page its own title and description', () => {
    const titles = Object.values(pageSeo).map((seo) => fullTitle(seo.title, seo.brandSuffix));
    const descriptions = Object.values(pageSeo).map((seo) => seo.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});

describe('vercel.json', () => {
  it('serves every prerendered page from its own file', () => {
    // The rewrite lists the routes by name; a page missing from it would be
    // answered with the not-found shell, which is marked noindex.
    const vercel = JSON.parse(readFileSync(path.resolve(process.cwd(), '../vercel.json'), 'utf8'));
    const [pages, fallback] = vercel.services.client.rewrites;
    const listed = pages.source.match(/\((.+)\)/)[1].split('|');
    const expected = navLinks.filter((link) => link.to !== '/').map((link) => link.to.slice(1));
    expect(listed.sort()).toEqual(expected.sort());
    expect(fallback.destination).toBe('/404.html');
  });
});

describe('structured data', () => {
  const build = (pathname) =>
    buildStructuredData({
      origin: 'https://example.test',
      pathname,
      settings: fallbackSettings,
      fallbackImage: '/assets/share.jpg',
    });

  it('describes the restaurant on every page, with absolute URLs', () => {
    const [restaurant] = build('/menu');
    expect(restaurant['@type']).toBe('Restaurant');
    expect(restaurant.image).toBe('https://example.test/assets/share.jpg');
    expect(restaurant.address).toMatchObject({
      addressLocality: 'Haldummulla',
      postalCode: '90180',
      addressCountry: 'LK',
    });
    // No hours are published yet; a half-filled block is worse than none.
    expect(restaurant.openingHoursSpecification).toBeUndefined();
  });

  it('adds the graphs that belong to the page', () => {
    const types = (pathname) => build(pathname).map((graph) => graph['@type']);
    expect(types('/')).toEqual(['Restaurant', 'WebSite']);
    expect(types('/menu')).toEqual(['Restaurant', 'BreadcrumbList']);
    expect(types('/contact')).toEqual(['Restaurant', 'BreadcrumbList', 'FAQPage', 'ItemList']);
  });
});
