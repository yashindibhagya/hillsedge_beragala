import { describe, expect, it } from 'vitest';
import { formatPrice, formatTime, groupHours, isBookable, telHref } from './format';

describe('formatPrice', () => {
  it('formats in the restaurant’s currency', () => {
    expect(formatPrice(6500, 'LKR')).toMatch(/6,500/);
  });

  it('returns nothing for a price that is not set, rather than zero', () => {
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(undefined)).toBeNull();
  });

  it('survives a currency code the browser does not know', () => {
    expect(formatPrice(10, 'NOPE')).toMatch(/10/);
  });
});

describe('opening hours', () => {
  const day = (name, opens, closes, closed = false) => ({ day: name, opens, closes, closed });

  it('groups consecutive days with the same hours', () => {
    const rows = groupHours([
      day('Monday', '12:00', '22:00'),
      day('Tuesday', '12:00', '22:00'),
      day('Wednesday', null, null, true),
      day('Thursday', '12:00', '22:00'),
    ]);
    expect(rows).toStrictEqual([
      { label: 'Monday – Tuesday', value: '12 pm – 10 pm' },
      { label: 'Wednesday', value: 'Closed' },
      { label: 'Thursday', value: '12 pm – 10 pm' },
    ]);
  });

  it('leaves out days with no times rather than inventing them', () => {
    expect(groupHours([day('Monday', null, null)])).toStrictEqual([]);
  });

  it('reads 24-hour times as a guest would say them', () => {
    expect(formatTime('18:30')).toBe('6:30 pm');
    expect(formatTime('00:00')).toBe('12 am');
  });
});

describe('telHref', () => {
  it('turns a local number into an international link', () => {
    expect(telHref('074 237 3394')).toBe('tel:+94742373394');
    expect(telHref('+94 74 237 3394')).toBe('tel:+94742373394');
  });
});

describe('isBookable', () => {
  it('needs the space to be open and available', () => {
    expect(isBookable({ bookingStatus: 'open', available: true })).toBe(true);
    expect(isBookable({ bookingStatus: 'open', available: false })).toBe(false);
    expect(isBookable({ bookingStatus: 'coming_soon', available: true })).toBe(false);
  });
});
