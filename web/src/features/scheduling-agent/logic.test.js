import { describe, expect, it } from 'vitest';
import { buildRecommendations, planFromIntake } from './logic';

describe('scheduling agent logic', () => {
  it('asks for a day when the request is too vague', () => {
    const result = planFromIntake('would like to train soon', new Date('2026-04-11T12:00:00.000Z'));
    expect(result.blocked).toBe(true);
    expect(result.blockerMessage).toMatch(/what day/i);
  });

  it('infers timing, workout, duration, and day from plain language', () => {
    const result = planFromIntake(
      'Tomorrow evening strength for 90 minutes',
      new Date('2026-04-11T12:00:00.000Z'),
    );

    expect(result.blocked).toBe(false);
    expect(result.windowId).toBe('evening');
    expect(result.workoutType).toBe('strength');
    expect(result.durationMinutes).toBe(90);
    expect(result.targetDate.toISOString().slice(0, 10)).toBe('2026-04-12');
  });

  it('ranks the best available slot recommendations', () => {
    const plan = {
      durationMinutes: 60,
      workoutType: 'strength',
      windowId: 'evening',
      targetDate: new Date('2026-04-12T00:00:00.000Z'),
    };

    const ranked = buildRecommendations({
      plan,
      now: new Date('2026-04-11T12:00:00.000Z'),
      getSlotInfo: (_dateInput, hour) => {
        const fixtures = {
          17: { isFull: false, nextOccupancy: 2, demandTier: { name: 'Warm' } },
          18: { isFull: false, nextOccupancy: 1, demandTier: { name: 'Normal' } },
          19: { isFull: false, nextOccupancy: 3, demandTier: { name: 'Hot' } },
          20: { isFull: true, nextOccupancy: 5, demandTier: { name: 'Peak' } },
        };
        return fixtures[hour];
      },
    });

    expect(ranked).toHaveLength(3);
    expect(ranked[0].timeInput).toBe('18:00');
    expect(ranked[1].timeInput).toBe('17:00');
    expect(ranked[2].timeInput).toBe('19:00');
  });
});
