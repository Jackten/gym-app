import { describe, expect, it } from 'vitest';
import {
  abbreviateWallet,
  createLocalDate,
  deriveNameFromEmail,
  equipmentLabel,
  formatDuration,
  normalizePhone,
  pickNextUpcomingBooking,
  sortByStartAsc,
  sortByStartDesc,
} from './helpers';

describe('helpers', () => {
  it('creates a local date from date and time input', () => {
    const date = createLocalDate('2026-04-11', '17:30');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(11);
    expect(date.getHours()).toBe(17);
    expect(date.getMinutes()).toBe(30);
  });

  it('derives a friendly member name from email', () => {
    expect(deriveNameFromEmail('maria.pelayo@example.com')).toBe('Maria Pelayo');
    expect(deriveNameFromEmail('')).toBe('Pelayo Member');
  });

  it('normalizes phone numbers and abbreviates wallets', () => {
    expect(normalizePhone('+1 (787) 555-0199')).toBe('+17875550199');
    expect(abbreviateWallet('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x12345…5678');
  });

  it('maps equipment labels including legacy ids', () => {
    expect(equipmentLabel('row-machine')).toBe('Row Machine');
    expect(equipmentLabel('bench')).toBe('Benches');
  });

  it('formats durations cleanly', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(90)).toBe('1 hr 30 min');
  });

  it('sorts bookings by start time in both directions', () => {
    const bookings = [
      { startISO: '2026-04-20T10:00:00.000Z' },
      { startISO: '2026-04-18T10:00:00.000Z' },
      { startISO: '2026-04-19T10:00:00.000Z' },
    ];

    expect([...bookings].sort(sortByStartAsc).map((booking) => booking.startISO)).toEqual([
      '2026-04-18T10:00:00.000Z',
      '2026-04-19T10:00:00.000Z',
      '2026-04-20T10:00:00.000Z',
    ]);

    expect([...bookings].sort(sortByStartDesc).map((booking) => booking.startISO)).toEqual([
      '2026-04-20T10:00:00.000Z',
      '2026-04-19T10:00:00.000Z',
      '2026-04-18T10:00:00.000Z',
    ]);
  });

  it('picks the earliest upcoming booking as the next session', () => {
    const bookings = [
      { startISO: '2026-04-18T12:00:00.000Z' },
      { startISO: '2026-04-19T12:00:00.000Z' },
      { startISO: '2026-04-20T12:00:00.000Z' },
    ];

    expect(pickNextUpcomingBooking(bookings)?.startISO).toBe('2026-04-18T12:00:00.000Z');
    expect(pickNextUpcomingBooking([])).toBeNull();
  });
});
