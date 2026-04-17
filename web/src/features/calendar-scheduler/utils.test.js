import { describe, expect, it } from 'vitest';
import {
  buildSeriesSummary,
  findOverlappingSessions,
  generateRecurringSessions,
  getSlotAvailability,
  getTwoWeekRange,
  normalizeSkipDates,
} from './utils';

function booking({ startISO, endISO, status = 'confirmed' }) {
  return { startISO, endISO, status };
}

describe('calendar scheduler utils', () => {
  it('builds a two-week range starting at the given day', () => {
    const range = getTwoWeekRange(new Date('2026-04-11T15:00:00.000Z'));
    expect(range).toHaveLength(14);
    expect(range[0].id).toBe('2026-04-11');
    expect(range[13].id).toBe('2026-04-24');
  });

  it('calculates slot availability from overlapping bookings', () => {
    const slots = getSlotAvailability({
      bookings: [
        booking({ startISO: '2026-04-21T18:00:00.000Z', endISO: '2026-04-21T19:00:00.000Z' }),
        booking({ startISO: '2026-04-21T18:30:00.000Z', endISO: '2026-04-21T19:30:00.000Z' }),
      ],
      dateInput: '2026-04-21',
      now: new Date('2026-04-21T12:00:00.000Z'),
    });

    const sixPm = slots.find((slot) => slot.id === '18:00');
    const sixThirty = slots.find((slot) => slot.id === '18:30');

    expect(sixPm.reserved).toBe(1);
    expect(sixThirty.reserved).toBe(2);
    expect(sixThirty.remaining).toBe(3);
  });

  it('normalizes skip dates and removes duplicates', () => {
    expect(normalizeSkipDates(['2026-04-15', '2026-04-15', '', '2026-04-22'])).toEqual([
      '2026-04-15',
      '2026-04-22',
    ]);
  });

  it('generates weekly recurring sessions with skip dates', () => {
    const sessions = generateRecurringSessions({
      selectedDate: '2026-04-13',
      time: '18:00',
      durationMinutes: 60,
      recurrence: {
        frequency: 'weekly',
        weekdays: [1, 3],
        endDate: '2026-04-27',
        skipDates: ['2026-04-20'],
      },
    });

    expect(sessions).toEqual([
      { dateInput: '2026-04-13', timeInput: '18:00', durationMinutes: 60 },
      { dateInput: '2026-04-15', timeInput: '18:00', durationMinutes: 60 },
      { dateInput: '2026-04-22', timeInput: '18:00', durationMinutes: 60 },
      { dateInput: '2026-04-27', timeInput: '18:00', durationMinutes: 60 },
    ]);
  });

  it('builds a readable review summary', () => {
    const summary = buildSeriesSummary(
      [
        { dateInput: '2026-04-13' },
        { dateInput: '2026-04-27' },
      ],
      { frequency: 'weekly' },
    );

    expect(summary).toBe('2 sessions from 2026-04-13 to 2026-04-27.');
  });

  it('detects overlapping session windows', () => {
    const overlap = findOverlappingSessions([
      { dateInput: '2026-04-16', timeInput: '08:00', durationMinutes: 30 },
      { dateInput: '2026-04-16', timeInput: '08:15', durationMinutes: 30 },
      { dateInput: '2026-04-16', timeInput: '10:00', durationMinutes: 30 },
    ]);

    expect(overlap).toEqual([
      { dateInput: '2026-04-16', timeInput: '08:00', durationMinutes: 30 },
      { dateInput: '2026-04-16', timeInput: '08:15', durationMinutes: 30 },
    ]);
  });
});
