import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { bootApp, dayFromToday, validBooking, withTempStore } from './helpers.js';

let app;
let read;
let cleanup;

beforeAll(async () => {
  // Generous, so the validation tests are not throttled by each other.
  ({ cleanup } = await withTempStore({ RATE_LIMIT_MAX: '1000' }));
  app = await bootApp();
  ({ read } = await import('../src/services/store.js'));
});

afterAll(() => cleanup());

const post = (body) => request(app).post('/api/reservations').send(body);
const stored = (id) => read().reservations.find((r) => r.id === id);

describe('POST /api/reservations', () => {
  it('accepts a complete booking and returns its id', async () => {
    const res = await post(validBooking({ name: 'Nuwan' })).expect(201);

    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(res.body.receivedAt)).not.toBeNaN();
    expect(res.body.message).toMatch(/confirm/i);
  });

  it('persists what was booked, as pending', async () => {
    const booking = validBooking({
      name: 'Ayesha',
      guests: 7,
      email: 'A@Example.com',
      message: 'One vegan',
    });
    const { body } = await post(booking).expect(201);

    expect(stored(body.id)).toMatchObject({
      name: 'Ayesha',
      guests: 7,
      email: 'a@example.com',
      date: booking.date,
      time: 'Sunset',
      message: 'One vegan',
      status: 'pending',
      source: 'website',
    });
  });

  it('trims the name', async () => {
    const { body } = await post(validBooking({ name: '  Priya  ' })).expect(201);
    expect(stored(body.id).name).toBe('Priya');
  });

  it('accepts a bookable space and refuses one that is not', async () => {
    const rooms = read().rooms;
    const open = rooms.find((r) => r.bookingStatus === 'open' && r.available);
    const soon = rooms.find((r) => r.bookingStatus === 'coming_soon');

    const { body } = await post(validBooking({ roomId: open.id })).expect(201);
    expect(stored(body.id).roomId).toBe(open.id);

    const res = await post(validBooking({ roomId: soon.id })).expect(422);
    expect(res.body.errors.roomId).toMatch(/cannot be booked/i);
  });
});

describe('POST /api/reservations — rejections', () => {
  it('requires a name, a date and a way to reach the guest', async () => {
    const res = await post({ guests: 2, time: 'Lunch' }).expect(422);
    expect(res.body.errors.name).toMatch(/who the table is for/i);
    expect(res.body.errors.date).toMatch(/choose a date/i);
    expect(res.body.errors.phone).toMatch(/phone number or email/i);
  });

  it('accepts email alone as the contact', async () => {
    await post(validBooking({ phone: '', email: 'guest@example.com' })).expect(201);
  });

  it('refuses a malformed phone or email', async () => {
    const res = await post(validBooking({ phone: 'call me', email: 'nope' })).expect(422);
    expect(res.body.errors.phone).toBeDefined();
    expect(res.body.errors.email).toBeDefined();
  });

  it('refuses a date in the past', async () => {
    const res = await post(validBooking({ date: '2020-01-01' })).expect(422);
    expect(res.body.errors.date).toMatch(/today or a later date/i);
  });

  it('accepts today', async () => {
    const { localToday } = await import('../src/services/time.js');
    await post(validBooking({ date: localToday() })).expect(201);
  });

  it('refuses a date that does not exist', async () => {
    const res = await post(validBooking({ date: '2030-02-31' })).expect(422);
    expect(res.body.errors.date).toMatch(/not valid/i);
  });

  it('refuses a party size or sitting it does not offer', async () => {
    const res = await post(validBooking({ guests: 0, time: 'Breakfast' })).expect(422);
    expect(res.body.errors.guests).toBeDefined();
    expect(res.body.errors.time).toBeDefined();

    const big = await post(validBooking({ guests: 5000 })).expect(422);
    expect(big.body.errors.guests).toMatch(/message us/i);
  });

  it('refuses dates more than a year ahead', async () => {
    const res = await post(validBooking({ date: '9999-12-31' })).expect(422);
    expect(res.body.errors.date).toMatch(/year ahead/i);
    await post(validBooking({ date: dayFromToday(360) })).expect(201);
  });

  it('only takes a real number of guests', async () => {
    for (const guests of [[3], true, '3e1', '', null]) {
      const res = await post(validBooking({ guests })).expect(422);
      expect(res.body.errors.guests, JSON.stringify(guests)).toBeDefined();
    }
    await post(validBooking({ guests: '6' })).expect(201);
  });

  it('refuses a phone number with no digits to it', async () => {
    const res = await post(validBooking({ phone: '+-----' })).expect(422);
    expect(res.body.errors.phone).toBeDefined();
  });

  it('caps the note instead of storing whatever is sent', async () => {
    const res = await post(validBooking({ message: 'x'.repeat(5000) })).expect(422);
    expect(res.body.errors.message).toMatch(/under 2000/i);
  });

  it('ignores fields it did not ask for', async () => {
    const { body } = await post(
      validBooking({
        id: 'forged',
        receivedAt: '1999-01-01T00:00:00Z',
        status: 'confirmed',
        admin: true,
      })
    ).expect(201);

    const record = stored(body.id);
    expect(record.id).not.toBe('forged');
    expect(record.receivedAt).not.toMatch(/^1999/);
    expect(record.status).toBe('pending');
    expect(record.admin).toBeUndefined();
  });

  it('rejects a body that is not a JSON object', async () => {
    // express.json() is strict, so a bare JSON primitive never reaches the
    // handler. 400 is right: the request is malformed, not merely invalid.
    await request(app)
      .post('/api/reservations')
      .set('Content-Type', 'application/json')
      .send('"just a string"')
      .expect(400);
  });

  it('rejects a body that is not JSON at all', async () => {
    await request(app)
      .post('/api/reservations')
      .set('Content-Type', 'application/json')
      .send('{ not json')
      .expect(400);
  });

  it('does not list bookings to the public', async () => {
    await request(app).get('/api/reservations').expect(404);
  });

  it('refuses online bookings while they are switched off', async () => {
    const { write } = await import('../src/services/store.js');
    await write((d) => {
      d.settings.reservations.acceptingOnline = false;
    });
    const res = await post(validBooking({ date: dayFromToday(5) })).expect(409);
    expect(res.body.error).toMatch(/not taking bookings online/i);
    await write((d) => {
      d.settings.reservations.acceptingOnline = true;
    });
  });
});

describe('rate limiting', () => {
  it('stops a flood of booking attempts', async () => {
    process.env.RATE_LIMIT_MAX = '3';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    // Config reads the environment once, at import time; only a registry
    // reset gets the new limit read. The store comes back up from disk.
    vi.resetModules();
    const { bootApp: boot } = await import('./helpers.js');
    const limited = await boot();

    const codes = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(limited).post('/api/reservations').send(validBooking());
      codes.push(res.status);
    }

    expect(codes.filter((c) => c === 201)).toHaveLength(3);
    expect(codes.filter((c) => c === 429)).toHaveLength(2);
  });
});
