import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { bootApp, dayFromToday, signIn, withTempStore } from './helpers.js';

let app;
let admin;
let dir;
let cleanup;

beforeAll(async () => {
  ({ dir, cleanup } = await withTempStore());
  app = await bootApp();
  admin = await signIn(app);
});

afterAll(() => cleanup());

const firstCategory = async () => (await admin.get('/api/admin/categories')).body.items[0];

describe('seed', () => {
  it('starts from the restaurant’s own menu sections, with no invented prices', async () => {
    const { body } = await admin.get('/api/admin/menu-items').expect(200);
    expect(body.items.length).toBeGreaterThan(20);
    expect(body.items.every((i) => i.price === null)).toBe(true);
    const cats = (await admin.get('/api/admin/categories')).body.items.map((c) => c.name);
    expect(cats).toContain('Smokehouse & BBQ');
  });

  it('publishes no testimonials until real ones are added', async () => {
    const { body } = await request(app).get('/api/public/site').expect(200);
    expect(body.testimonials).toEqual([]);
  });
});

describe('menu items', () => {
  it('creates, updates, duplicates and deletes a dish', async () => {
    const category = await firstCategory();
    const created = await admin
      .post('/api/admin/menu-items')
      .send({
        name: 'Truffle Pasta',
        description: 'Creamy.',
        price: '2400',
        categoryId: category.id,
        vegetarian: true,
        dietary: 'Signature, Signature',
      })
      .expect(201);
    const dish = created.body.item;
    expect(dish).toMatchObject({
      slug: 'truffle-pasta',
      price: 2400,
      availability: 'available',
      dietary: ['Signature'],
    });

    const updated = await admin
      .patch(`/api/admin/menu-items/${dish.id}`)
      .send({ price: 2600, name: 'Truffle Gnocchi' })
      .expect(200);
    expect(updated.body.item).toMatchObject({
      price: 2600,
      slug: 'truffle-gnocchi',
      vegetarian: true,
    });

    const copy = (await admin.post(`/api/admin/menu-items/${dish.id}/duplicate`).expect(201)).body
      .item;
    expect(copy.name).toBe('Truffle Gnocchi (copy)');
    expect(copy.hidden).toBe(true);
    expect(copy.slug).not.toBe(dish.slug);

    await admin.delete(`/api/admin/menu-items/${copy.id}`).expect(204);
    await admin.delete(`/api/admin/menu-items/${copy.id}`).expect(404);
  });

  it('rejects bad input field by field', async () => {
    const res = await admin
      .post('/api/admin/menu-items')
      .send({ price: -1, availability: 'maybe' })
      .expect(422);
    expect(Object.keys(res.body.errors).sort()).toEqual([
      'availability',
      'categoryId',
      'name',
      'price',
    ]);

    // A well-formed id that points at nothing is caught too.
    const ghost = await admin
      .post('/api/admin/menu-items')
      .send({ name: 'X', categoryId: 'nope' })
      .expect(422);
    expect(ghost.body.errors.categoryId).toMatch(/no longer exists/i);
  });

  it('rejects a vegan dish marked not vegetarian', async () => {
    const category = await firstCategory();
    const res = await admin
      .post('/api/admin/menu-items')
      .send({ name: 'X', categoryId: category.id, vegan: true, vegetarian: false })
      .expect(422);
    expect(res.body.errors.vegetarian).toBeDefined();
  });

  it('shows availability changes on the public menu immediately', async () => {
    const { body } = await admin.get('/api/admin/menu-items');
    const dish = body.items[0];
    await admin
      .patch(`/api/admin/menu-items/${dish.id}/availability`)
      .send({ availability: 'sold_out' })
      .expect(200);

    const menu = (await request(app).get('/api/public/menu').expect(200)).body;
    expect(menu.items.find((i) => i.id === dish.id).availability).toBe('sold_out');

    // With hideUnavailable on, it disappears instead.
    await admin.patch('/api/admin/settings/menu').send({ hideUnavailable: true }).expect(200);
    const hidden = (await request(app).get('/api/public/menu')).body;
    expect(hidden.items.some((i) => i.id === dish.id)).toBe(false);
    await admin.patch('/api/admin/settings/menu').send({ hideUnavailable: false }).expect(200);
  });

  it('keeps hidden dishes and inactive categories off the public site', async () => {
    const { body } = await admin.get('/api/admin/menu-items');
    const dish = body.items[1];
    await admin
      .patch(`/api/admin/menu-items/${dish.id}/availability`)
      .send({ hidden: true })
      .expect(200);
    let menu = (await request(app).get('/api/public/menu')).body;
    expect(menu.items.some((i) => i.id === dish.id)).toBe(false);

    const category = (await admin.get('/api/admin/categories')).body.items.at(-1);
    await admin.patch(`/api/admin/categories/${category.id}`).send({ active: false }).expect(200);
    menu = (await request(app).get('/api/public/menu')).body;
    expect(menu.categories.some((c) => c.id === category.id)).toBe(false);
    expect(menu.items.some((i) => i.categoryId === category.id)).toBe(false);
  });

  it('exposes no admin-only fields publicly', async () => {
    const menu = (await request(app).get('/api/public/menu')).body;
    const item = menu.items[0];
    expect(item).not.toHaveProperty('hidden');
    expect(item).not.toHaveProperty('views');
    expect(item).not.toHaveProperty('createdAt');
  });

  it('counts a dish being opened', async () => {
    const menu = (await request(app).get('/api/public/menu')).body;
    const dish = menu.items[0];
    await request(app).post(`/api/public/menu/${dish.id}/view`).expect(202);
    await request(app).post('/api/public/menu/nope/view').expect(404);
    const { flushViews } = await import('../src/routes/public.js');
    await flushViews();
    const dash = (await admin.get('/api/admin/dashboard')).body;
    expect(dash.popular[0]).toMatchObject({ id: dish.id, views: 1 });
  });
});

describe('categories', () => {
  it('refuses to delete a category that still has dishes', async () => {
    const category = await firstCategory();
    const res = await admin.delete(`/api/admin/categories/${category.id}`).expect(409);
    expect(res.body.error).toMatch(/move or delete/i);
  });

  it('reorders', async () => {
    const items = (await admin.get('/api/admin/categories')).body.items;
    const reversed = items.map((c) => c.id).reverse();
    const res = await admin
      .put('/api/admin/categories/reorder')
      .send({ ids: reversed })
      .expect(200);
    expect(res.body.items.map((c) => c.id)).toEqual(reversed);
  });

  it('creates with a unique slug', async () => {
    const a = (await admin.post('/api/admin/categories').send({ name: 'Wine' }).expect(201)).body
      .item;
    const b = (await admin.post('/api/admin/categories').send({ name: 'Wine' }).expect(201)).body
      .item;
    expect([a.slug, b.slug]).toEqual(['wine', 'wine-2']);
    await admin.delete(`/api/admin/categories/${b.id}`).expect(204);
  });
});

describe('reservations', () => {
  it('lists by view, changes status, and takes a phone booking', async () => {
    const { localToday } = await import('../src/services/time.js');
    const today = localToday();
    await request(app)
      .post('/api/reservations')
      .send({ name: 'Today', phone: '0771234567', date: today, time: 'Lunch', guests: 2 })
      .expect(201);
    await request(app)
      .post('/api/reservations')
      .send({
        name: 'Later',
        phone: '0771234567',
        date: dayFromToday(6),
        time: 'Dinner',
        guests: 5,
      })
      .expect(201);

    const todayList = (await admin.get('/api/admin/reservations?view=today').expect(200)).body;
    expect(todayList.items.map((r) => r.name)).toEqual(['Today']);

    const later = (await admin.get('/api/admin/reservations?q=later')).body.items[0];
    await admin
      .patch(`/api/admin/reservations/${later.id}`)
      .send({ status: 'confirmed' })
      .expect(200);
    await admin
      .patch(`/api/admin/reservations/${later.id}`)
      .send({ status: 'teleported' })
      .expect(422);

    const phone = await admin
      .post('/api/admin/reservations')
      .send({
        name: 'Phone guest',
        phone: '0779999999',
        date: dayFromToday(2),
        time: 'Sunset',
        guests: 3,
        status: 'confirmed',
      })
      .expect(201);
    expect(phone.body.item.source).toBe('admin');

    const dash = (await admin.get('/api/admin/dashboard')).body;
    expect(dash.reservations.today).toBe(1);
    expect(dash.days).toHaveLength(14);
    expect(dash.days.reduce((s, d) => s + d.bookings, 0)).toBe(3);
  });
});

describe('media', () => {
  const png = () =>
    sharp({ create: { width: 1200, height: 800, channels: 3, background: '#4a5a32' } })
      .png()
      .toBuffer();

  it('turns an upload into a WebP ladder with a placeholder', async () => {
    const res = await admin
      .post('/api/admin/media')
      .attach('file', await png(), 'olive.png')
      .field('alt', 'An olive square')
      .field('category', 'place')
      .expect(201);
    const item = res.body.item;
    expect(item).toMatchObject({
      kind: 'image',
      width: 1200,
      height: 800,
      alt: 'An olive square',
      category: 'place',
    });
    expect(item.variants.map((v) => v.width)).toEqual([480, 960, 1200]);
    expect(item.lqip).toMatch(/^data:image\/webp;base64,/);
    await request(app).get(item.url).expect(200).expect('Content-Type', /webp/);
  });

  it('refuses SVG, which can carry script', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>'
    );
    const res = await admin.post('/api/admin/media').attach('file', svg, 'x.svg').expect(422);
    expect(res.body.errors.file).toBeDefined();
  });

  it('refuses a "video" that is not one', async () => {
    const res = await admin
      .post('/api/admin/media')
      .attach('file', Buffer.from('not a video at all'), {
        filename: 'x.mp4',
        contentType: 'video/mp4',
      })
      .expect(422);
    expect(res.body.error).toMatch(/MP4|WebM/);
  });

  it('accepts an MP4 by its signature and keeps it out of the gallery by default', async () => {
    const mp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 0x18]),
      Buffer.from('ftypisom'),
      Buffer.alloc(64),
    ]);
    const res = await admin
      .post('/api/admin/media')
      .attach('file', mp4, { filename: 'hero.mp4', contentType: 'video/mp4' })
      .expect(201);
    expect(res.body.item).toMatchObject({ kind: 'video', mime: 'video/mp4', inGallery: false });
  });

  it('clears references to a deleted photograph and removes its files', async () => {
    const item = (
      await admin
        .post('/api/admin/media')
        .attach('file', await png(), 'hero.png')
        .expect(201)
    ).body.item;
    await admin.patch('/api/admin/settings/home').send({ heroImageId: item.id }).expect(200);
    const category = await firstCategory();
    await admin
      .patch(`/api/admin/categories/${category.id}`)
      .send({ imageId: item.id })
      .expect(200);

    await admin.delete(`/api/admin/media/${item.id}`).expect(204);
    const settings = (await admin.get('/api/admin/settings')).body.settings;
    expect(settings.home.heroImageId).toBeNull();
    expect((await admin.get(`/api/admin/categories/${category.id}`)).body.item.imageId).toBeNull();
    expect(existsSync(path.join(dir, 'uploads', item.id))).toBe(false);
  });

  it('refuses to point a setting at media that does not exist', async () => {
    const res = await admin
      .patch('/api/admin/settings/home')
      .send({ heroImageId: 'ghost' })
      .expect(422);
    expect(res.body.errors.heroImageId).toBeDefined();
  });
});

describe('promotions', () => {
  it('shows only active promotions inside their dates', async () => {
    const live = { title: 'Sunset set menu', startsOn: dayFromToday(-1), endsOn: dayFromToday(5) };
    const future = { title: 'Christmas', startsOn: dayFromToday(30), endsOn: dayFromToday(31) };
    const off = { title: 'Off', active: false };
    for (const p of [live, future, off])
      await admin.post('/api/admin/promotions').send(p).expect(201);

    const site = (await request(app).get('/api/public/site')).body;
    expect(site.promotions.map((p) => p.title)).toEqual(['Sunset set menu']);
  });

  it('refuses an end date before the start', async () => {
    const res = await admin
      .post('/api/admin/promotions')
      .send({ title: 'Bad', startsOn: dayFromToday(5), endsOn: dayFromToday(1) })
      .expect(422);
    expect(res.body.errors.endsOn).toBeDefined();
  });
});

describe('settings', () => {
  it('validates a section and merges it', async () => {
    const res = await admin
      .patch('/api/admin/settings/hours')
      .send({ days: [{ day: 'Monday', opens: '11:30', closes: '22:00' }] })
      .expect(200);
    expect(res.body.settings.hours.days[0]).toMatchObject({
      day: 'Monday',
      opens: '11:30',
      closes: '22:00',
      closed: false,
    });
    expect(res.body.settings.hours.summary).toBe('Lunch & dinner, daily');

    await admin
      .patch('/api/admin/settings/hours')
      .send({ days: [{ day: 'Monday', opens: '25:00' }] })
      .expect(422);
    await admin
      .patch('/api/admin/settings/social')
      .send({ instagram: 'javascript:alert(1)' })
      .expect(422);
    await admin.patch('/api/admin/settings/nope').send({}).expect(404);
  });
});

describe('the store', () => {
  it('rolls back a write that fails, in memory as well as on disk', async () => {
    const { read, write } = await import('../src/services/store.js');
    const before = read().categories.length;
    await expect(
      write((data) => {
        data.categories.push({ id: 'half-made' });
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(read().categories.length).toBe(before);
    // And the queue still works afterwards.
    await write((data) => data.categories.length);
  });
});

describe('media kinds', () => {
  it('refuses a video where a photograph belongs', async () => {
    const mp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 0x18]),
      Buffer.from('ftypisom'),
      Buffer.alloc(64),
    ]);
    const video = (
      await admin
        .post('/api/admin/media')
        .attach('file', mp4, { filename: 'v.mp4', contentType: 'video/mp4' })
        .expect(201)
    ).body.item;
    const category = await firstCategory();
    const res = await admin
      .post('/api/admin/menu-items')
      .send({ name: 'Y', categoryId: category.id, imageId: video.id })
      .expect(422);
    expect(res.body.errors.imageId).toMatch(/photograph/i);
    const ok = await admin
      .post('/api/admin/menu-items')
      .send({ name: 'Y', categoryId: category.id, videoId: video.id })
      .expect(201);
    expect(ok.body.item.views).toBe(0);
  });
});

describe('review fixes', () => {
  it('refuses links that only look like site paths', async () => {
    for (const ctaHref of [
      '/\\evil.com',
      '/\t/evil.com',
      '//evil.com',
      'javascript:alert(1)',
      '/a\u0000b',
    ]) {
      const res = await admin
        .post('/api/admin/promotions')
        .send({ title: 'X', ctaHref })
        .expect(422);
      expect(res.body.errors.ctaHref, JSON.stringify(ctaHref)).toBeDefined();
    }
    await admin
      .post('/api/admin/promotions')
      .send({ title: 'Ok', ctaHref: '/menu?x=1#y', active: false })
      .expect(201);
  });

  it('refuses a video as a poster', async () => {
    const mp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 0x18]),
      Buffer.from('ftypisom'),
      Buffer.alloc(64),
    ]);
    const a = (
      await admin
        .post('/api/admin/media')
        .attach('file', mp4, { filename: 'a.mp4', contentType: 'video/mp4' })
        .expect(201)
    ).body.item;
    const b = (
      await admin
        .post('/api/admin/media')
        .attach('file', mp4, { filename: 'b.mp4', contentType: 'video/mp4' })
        .expect(201)
    ).body.item;
    const res = await admin.patch(`/api/admin/media/${a.id}`).send({ posterId: b.id }).expect(422);
    expect(res.body.errors.posterId).toMatch(/photograph/i);
  });

  it('keeps public bookings out of the staff activity log', async () => {
    const { read } = await import('../src/services/store.js');
    const before = read().activity.length;
    await request(app)
      .post('/api/reservations')
      .send({ name: 'Quiet', phone: '0771234567', date: dayFromToday(3), time: 'Lunch', guests: 2 })
      .expect(201);
    expect(read().activity.length).toBe(before);
  });
});
