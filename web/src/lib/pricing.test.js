import { describe, expect, it } from 'vitest';
import {
  calculateQuote,
  getBaseCredits,
  getDemandCount,
  getDemandTier,
  getOccupancyByBlock,
  getOccupancyMultiplier,
  isHoldActive,
  minutesUntil,
} from './pricing';

function booking({ id, startISO, endISO, status = 'confirmed' }) {
  return {
    id,
    startISO,
    endISO,
    status,
  };
}

describe('pricing', () => {
  it('returns the expected base credits for supported durations', () => {
    expect(getBaseCredits(30)).toBe(30);
    expect(getBaseCredits(60)).toBe(50);
    expect(getBaseCredits(120)).toBe(75);
    expect(getBaseCredits(180)).toBe(100);
  });

  it('maps demand tiers correctly', () => {
    expect(getDemandTier(0)).toEqual({ name: 'Normal', multiplier: 1 });
    expect(getDemandTier(4)).toEqual({ name: 'Warm', multiplier: 1.05 });
    expect(getDemandTier(8)).toEqual({ name: 'Hot', multiplier: 1.1 });
    expect(getDemandTier(12)).toEqual({ name: 'Peak', multiplier: 1.15 });
  });

  it('caps occupancy multiplier at the highest configured value', () => {
    expect(getOccupancyMultiplier(1)).toBe(1);
    expect(getOccupancyMultiplier(4)).toBe(1.2);
    expect(getOccupancyMultiplier(8)).toBe(1.35);
  });

  it('counts overlapping bookings by half-hour block', () => {
    const startDate = new Date('2026-04-20T18:00:00.000Z');
    const endDate = new Date('2026-04-20T19:00:00.000Z');
    const occupancy = getOccupancyByBlock({
      bookings: [
        booking({
          id: 'b1',
          startISO: '2026-04-20T18:00:00.000Z',
          endISO: '2026-04-20T19:00:00.000Z',
        }),
        booking({
          id: 'b2',
          startISO: '2026-04-20T18:30:00.000Z',
          endISO: '2026-04-20T19:30:00.000Z',
        }),
      ],
      startDate,
      endDate,
      now: new Date('2026-04-20T12:00:00.000Z'),
      hold: null,
    });

    expect(occupancy).toHaveLength(2);
    expect(occupancy[0].existingCount).toBe(1);
    expect(occupancy[1].existingCount).toBe(2);
  });

  it('counts recurring demand from the trailing four weeks', () => {
    const now = new Date('2026-04-29T12:00:00.000Z');
    const targetStartDate = new Date('2026-04-30T18:00:00.000Z');
    const targetEndDate = new Date('2026-04-30T19:00:00.000Z');

    const bookings = [
      booking({ id: '1', startISO: '2026-04-23T18:00:00.000Z', endISO: '2026-04-23T19:00:00.000Z' }),
      booking({ id: '2', startISO: '2026-04-16T18:00:00.000Z', endISO: '2026-04-16T19:00:00.000Z' }),
      booking({ id: '3', startISO: '2026-04-09T18:00:00.000Z', endISO: '2026-04-09T19:00:00.000Z' }),
      booking({ id: '4', startISO: '2026-04-02T18:00:00.000Z', endISO: '2026-04-02T19:00:00.000Z' }),
      booking({ id: '5', startISO: '2026-03-05T18:00:00.000Z', endISO: '2026-03-05T19:00:00.000Z' }),
    ];

    expect(getDemandCount({ bookings, targetStartDate, targetEndDate, now })).toBe(4);
  });

  it('produces a successful quote with occupancy and demand baked in', () => {
    const now = new Date('2026-04-29T12:00:00.000Z');
    const startDate = new Date('2026-04-30T18:00:00.000Z');
    const bookings = [
      booking({ id: '1', startISO: '2026-04-30T18:00:00.000Z', endISO: '2026-04-30T19:00:00.000Z' }),
      booking({ id: '2', startISO: '2026-04-30T18:30:00.000Z', endISO: '2026-04-30T19:30:00.000Z' }),
      booking({ id: '3', startISO: '2026-04-23T18:00:00.000Z', endISO: '2026-04-23T19:00:00.000Z' }),
      booking({ id: '4', startISO: '2026-04-16T18:00:00.000Z', endISO: '2026-04-16T19:00:00.000Z' }),
      booking({ id: '5', startISO: '2026-04-09T18:00:00.000Z', endISO: '2026-04-09T19:00:00.000Z' }),
      booking({ id: '6', startISO: '2026-04-02T18:00:00.000Z', endISO: '2026-04-02T19:00:00.000Z' }),
    ];

    const quote = calculateQuote({
      bookings,
      startDate,
      durationMinutes: 60,
      now,
      activeHold: null,
    });

    expect(quote.ok).toBe(true);
    expect(quote.baseCredits).toBe(50);
    expect(quote.demandTier.name).toBe('Warm');
    expect(quote.occupancyAfter).toBe(3);
    expect(quote.finalCredits).toBe(58);
  });

  it('rejects quotes that exceed capacity', () => {
    const now = new Date('2026-04-29T12:00:00.000Z');
    const startDate = new Date('2026-04-30T18:00:00.000Z');
    const bookings = Array.from({ length: 5 }, (_, index) => booking({
      id: `b${index}`,
      startISO: '2026-04-30T18:00:00.000Z',
      endISO: '2026-04-30T19:00:00.000Z',
    }));

    const quote = calculateQuote({
      bookings,
      startDate,
      durationMinutes: 60,
      now,
      activeHold: null,
    });

    expect(quote.ok).toBe(false);
    expect(quote.reason).toMatch(/Capacity exceeded/);
  });

  it('tracks holds and minutes until start', () => {
    const now = new Date('2026-04-29T12:00:00.000Z');
    const hold = { holdExpiresAt: '2026-04-29T12:10:00.000Z' };

    expect(isHoldActive(hold, now)).toBe(true);
    expect(minutesUntil('2026-04-29T12:45:00.000Z', now)).toBe(45);
  });
});
