import { formatDateInput, createLocalDate } from '../../lib/helpers';
import { SLOT_CAPACITY, SLOT_TEMPLATES } from './config';

export function toStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getTwoWeekRange(startDate = new Date()) {
  const base = toStartOfDay(startDate);
  return Array.from({ length: 14 }, (_, idx) => {
    const date = addDays(base, idx);
    return {
      date,
      id: formatDateInput(date),
      dayName: date.toLocaleDateString([], { weekday: 'short' }),
      monthDay: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    };
  });
}

export function getSlotAvailability({ bookings, dateInput, now }) {
  return SLOT_TEMPLATES.map((slot) => {
    const start = createLocalDate(dateInput, slot.id);
    const end = new Date(start.getTime() + 60 * 60_000);

    const reserved = bookings.filter((booking) => {
      if (booking.status !== 'confirmed') return false;
      const bStart = new Date(booking.startISO);
      const bEnd = new Date(booking.endISO);
      return bStart < end && start < bEnd;
    }).length;

    const remaining = Math.max(0, SLOT_CAPACITY - reserved);
    return {
      ...slot,
      startISO: start.toISOString(),
      isPast: start <= now,
      reserved,
      remaining,
      isFull: remaining <= 0,
    };
  });
}

export function normalizeSkipDates(skipDates) {
  return [...new Set(skipDates.filter(Boolean))].sort();
}

export function generateRecurringSessions({
  selectedDate,
  time,
  durationMinutes,
  recurrence,
}) {
  const startDate = toStartOfDay(createLocalDate(selectedDate, time));
  const sessionTime = time;

  if (recurrence.frequency === 'none') {
    return [{ dateInput: selectedDate, timeInput: sessionTime, durationMinutes }];
  }

  const endDate = toStartOfDay(createLocalDate(recurrence.endDate, '00:00'));
  if (endDate < startDate) return [];

  const selectedWeekdays = new Set(recurrence.weekdays || []);
  const skipSet = new Set(normalizeSkipDates(recurrence.skipDates || []));

  const sessions = [];
  const totalDays = Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000));

  for (let offset = 0; offset <= totalDays; offset += 1) {
    const current = addDays(startDate, offset);
    const weekday = current.getDay();
    if (!selectedWeekdays.has(weekday)) continue;

    const weekDiff = Math.floor(offset / 7);
    if (recurrence.frequency === 'biweekly' && weekDiff % 2 !== 0) continue;

    const currentDateInput = formatDateInput(current);
    if (skipSet.has(currentDateInput)) continue;

    sessions.push({
      dateInput: currentDateInput,
      timeInput: sessionTime,
      durationMinutes,
    });

    if (sessions.length >= 64) break;
  }

  return sessions;
}

export function buildSeriesSummary(sessions = [], recurrence) {
  if (sessions.length === 0) {
    return 'No sessions generated. Adjust end date, weekdays, or skip list.';
  }
  if (recurrence.frequency === 'none') {
    return `1 one-time session selected.`;
  }

  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  return `${sessions.length} sessions from ${first.dateInput} to ${last.dateInput}.`;
}
