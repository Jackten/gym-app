const HALF_HOUR_MS = 30 * 60 * 1000;
const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;

export const OCCUPANCY_MULTIPLIERS = {
  1: 1.0,
  2: 1.0,
  3: 1.1,
  4: 1.2,
  5: 1.35,
};

export function getBaseCredits(durationMinutes) {
  if (durationMinutes === 30) return 30;
  if (durationMinutes === 60) return 50;
  if (durationMinutes > 60 && durationMinutes % 60 === 0) {
    return 50 + ((durationMinutes / 60) - 1) * 25;
  }

  throw new Error('Unsupported duration. Use 30m, 60m, or full hours above 60m.');
}

export function getDemandTier(count) {
  if (count >= 12) return { name: 'Peak', multiplier: 1.15 };
  if (count >= 8) return { name: 'Hot', multiplier: 1.1 };
  if (count >= 4) return { name: 'Warm', multiplier: 1.05 };
  return { name: 'Normal', multiplier: 1.0 };
}

export function getOccupancyMultiplier(occupancyAfter) {
  return OCCUPANCY_MULTIPLIERS[occupancyAfter] || OCCUPANCY_MULTIPLIERS[5];
}

export function parseISO(iso) {
  return new Date(iso);
}

export function getHalfHourBlocks(startDate, endDate) {
  const blocks = [];
  for (let t = startDate.getTime(); t < endDate.getTime(); t += HALF_HOUR_MS) {
    blocks.push(new Date(t));
  }
  return blocks;
}

export function overlapsRange(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

export function isHoldActive(hold, now) {
  if (!hold) return false;
  return new Date(hold.holdExpiresAt).getTime() > now.getTime();
}

function bookingActiveForCapacity(booking) {
  return booking.status === 'confirmed';
}

export function getOccupancyByBlock({
  bookings,
  startDate,
  endDate,
  now,
  hold,
  includeHold = true,
}) {
  const blocks = getHalfHourBlocks(startDate, endDate);

  return blocks.map((blockStart) => {
    const blockEnd = new Date(blockStart.getTime() + HALF_HOUR_MS);

    let count = 0;

    for (const booking of bookings) {
      if (!bookingActiveForCapacity(booking)) continue;
      const bookingStart = parseISO(booking.startISO);
      const bookingEnd = parseISO(booking.endISO);
      if (overlapsRange(bookingStart, bookingEnd, blockStart, blockEnd)) {
        count += 1;
      }
    }

    if (includeHold && isHoldActive(hold, now)) {
      const holdStart = parseISO(hold.startISO);
      const holdEnd = parseISO(hold.endISO);
      if (overlapsRange(holdStart, holdEnd, blockStart, blockEnd)) {
        count += 1;
      }
    }

    return {
      blockStart,
      existingCount: count,
      afterNewBookingCount: count + 1,
    };
  });
}

function toRecurringKey(date) {
  const dow = date.getDay();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${dow}-${hh}:${mm}`;
}

function bookingHasRecurringBlock(booking, recurringKey) {
  const start = parseISO(booking.startISO);
  const end = parseISO(booking.endISO);
  const blocks = getHalfHourBlocks(start, end);

  for (const block of blocks) {
    if (toRecurringKey(block) === recurringKey) {
      return true;
    }
  }

  return false;
}

export function getDemandCount({ bookings, targetStartDate, targetEndDate, now }) {
  const trailingStart = new Date(now.getTime() - FOUR_WEEKS_MS);
  const targetBlocks = getHalfHourBlocks(targetStartDate, targetEndDate);
  const targetRecurringKeys = targetBlocks.map((b) => toRecurringKey(b));

  const counts = targetRecurringKeys.map((key) => {
    let c = 0;

    for (const booking of bookings) {
      if (booking.status === 'cancelled') continue;
      const bookingStart = parseISO(booking.startISO);
      if (bookingStart < trailingStart || bookingStart > now) continue;

      if (bookingHasRecurringBlock(booking, key)) {
        c += 1;
      }
    }

    return c;
  });

  return counts.length > 0 ? Math.max(...counts) : 0;
}

export function calculateQuote({
  bookings,
  startDate,
  durationMinutes,
  now,
  activeHold,
}) {
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);

  const occupancyByBlock = getOccupancyByBlock({
    bookings,
    startDate,
    endDate,
    now,
    hold: activeHold,
  });

  const maxAfterCount = Math.max(...occupancyByBlock.map((b) => b.afterNewBookingCount));
  const maxExistingCount = Math.max(...occupancyByBlock.map((b) => b.existingCount));

  if (maxAfterCount > 5) {
    return {
      ok: false,
      reason: 'Capacity exceeded: slot already at max occupancy (5).',
      occupancyByBlock,
      maxExistingCount,
    };
  }

  const baseCredits = getBaseCredits(durationMinutes);
  const demandCount = getDemandCount({
    bookings,
    targetStartDate: startDate,
    targetEndDate: endDate,
    now,
  });
  const demandTier = getDemandTier(demandCount);
  const occupancyMultiplier = getOccupancyMultiplier(maxAfterCount);
  const finalCredits = Math.round(baseCredits * demandTier.multiplier * occupancyMultiplier);

  return {
    ok: true,
    startDate,
    endDate,
    durationMinutes,
    occupancyByBlock,
    maxExistingCount,
    occupancyAfter: maxAfterCount,
    baseCredits,
    demandCount,
    demandTier,
    occupancyMultiplier,
    finalCredits,
  };
}

export function minutesUntil(startISO, now) {
  const start = parseISO(startISO);
  return Math.floor((start.getTime() - now.getTime()) / 60_000);
}
