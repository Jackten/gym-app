import {
  AGENT_DEFAULT_DURATION,
  SLOT_WINDOWS,
  WORKOUT_KEYWORDS,
} from './config';
import { formatDateInput } from '../../lib/helpers';

const DEMAND_RANK = { Cool: 0, Normal: 1, Warm: 2, Hot: 3, Peak: 4 };

const WEEKDAY_LOOKUP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseDurationMinutes(text) {
  const lower = text.toLowerCase();

  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)/);
  if (hourMatch) {
    return Math.max(30, Math.round(Number(hourMatch[1]) * 60));
  }

  const minMatch = lower.match(/(\d+)\s*(m|min|mins|minute|minutes)/);
  if (minMatch) {
    return Math.max(30, Number(minMatch[1]));
  }

  if (lower.includes('quick')) return 30;
  if (lower.includes('long') || lower.includes('extended')) return 90;

  return AGENT_DEFAULT_DURATION;
}

function inferWorkoutType(text) {
  const lower = text.toLowerCase();
  for (const [workout, keywords] of Object.entries(WORKOUT_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return workout;
    }
  }
  return 'strength';
}

function inferWindowId(text) {
  const lower = text.toLowerCase();
  if (lower.includes('early')) return 'early_morning';
  if (lower.includes('morning') || lower.includes('am')) return 'morning';
  if (lower.includes('afternoon') || lower.includes('midday') || lower.includes('lunch')) return 'afternoon';
  if (lower.includes('evening') || lower.includes('after work') || lower.includes('pm')) return 'evening';
  if (lower.includes('night') || lower.includes('late')) return 'night';
  return 'any';
}

function nextWeekday(baseDate, targetWeekday) {
  const current = baseDate.getDay();
  let delta = targetWeekday - current;
  if (delta <= 0) delta += 7;
  const copy = new Date(baseDate);
  copy.setDate(baseDate.getDate() + delta);
  return copy;
}

function inferTargetDate(text, now) {
  const lower = text.toLowerCase();

  if (lower.includes('today')) {
    return { date: new Date(now), inferredFrom: 'today' };
  }

  if (lower.includes('tomorrow')) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return { date, inferredFrom: 'tomorrow' };
  }

  for (const [weekday, index] of Object.entries(WEEKDAY_LOOKUP)) {
    if (lower.includes(weekday)) {
      return { date: nextWeekday(now, index), inferredFrom: weekday };
    }
  }

  if (lower.includes('this weekend')) {
    return { date: nextWeekday(now, 6), inferredFrom: 'this weekend' };
  }

  if (lower.includes('next week')) {
    const date = new Date(now);
    date.setDate(date.getDate() + 7);
    return { date, inferredFrom: 'next week' };
  }

  return null;
}

function formatTime(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function dayLabel(targetDate, now) {
  const currentDay = formatDateInput(now);
  const targetDay = formatDateInput(targetDate);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (targetDay === currentDay) return 'Today';
  if (targetDay === formatDateInput(tomorrow)) return 'Tomorrow';
  return targetDate.toLocaleDateString([], { weekday: 'long' });
}

function buildOptionNote(slot, position) {
  if (slot.nextOccupancy <= 2) return 'Lighter floor traffic for smoother setup.';
  if (slot.demandTier.name === 'Peak' || slot.demandTier.name === 'Hot') {
    return 'Popular hour with strong training energy.';
  }
  if (position === 0) return 'Best balance of availability and momentum.';
  return 'Solid fallback if your first pick changes.';
}

function buildFriendlyWindowLabel({ targetDate, now, windowLabel, hour }) {
  const day = dayLabel(targetDate, now);
  return `${day} · ${windowLabel} · ${formatTime(hour)}`;
}

export function planFromIntake(rawRequest, now) {
  const request = (rawRequest || '').trim();
  if (!request) {
    return { blocked: true, blockerMessage: 'Tell me roughly when you want to train so I can suggest options.' };
  }

  const target = inferTargetDate(request, now);
  if (!target) {
    return {
      blocked: true,
      blockerMessage:
        "I can plan this quickly — what day should I target? (ex: tomorrow evening, Saturday morning)",
    };
  }

  return {
    blocked: false,
    request,
    durationMinutes: parseDurationMinutes(request),
    workoutType: inferWorkoutType(request),
    windowId: inferWindowId(request),
    targetDate: target.date,
    targetSource: target.inferredFrom,
  };
}

export function buildRecommendations({ plan, getSlotInfo, now }) {
  const dateInput = formatDateInput(plan.targetDate);
  const slotWindow = SLOT_WINDOWS[plan.windowId] || SLOT_WINDOWS.any;

  const ranked = slotWindow.hours
    .map((hour) => {
      const slot = getSlotInfo(dateInput, hour);
      const demandWeight = DEMAND_RANK[slot.demandTier.name] ?? 5;
      return {
        hour,
        slot,
        score: demandWeight * 3 + slot.nextOccupancy,
      };
    })
    .filter((entry) => !entry.slot.isFull)
    .sort((a, b) => a.score - b.score);

  const topThree = ranked.slice(0, 3).map((entry, index) => {
    const { hour, slot } = entry;
    const start = new Date(plan.targetDate);
    start.setHours(hour, 0, 0, 0);

    return {
      id: `option-${dateInput}-${hour}`,
      dateInput,
      timeInput: `${String(hour).padStart(2, '0')}:00`,
      durationMinutes: plan.durationMinutes,
      workoutType: plan.workoutType,
      startISO: start.toISOString(),
      windowLabel: buildFriendlyWindowLabel({
        targetDate: plan.targetDate,
        now,
        windowLabel: slotWindow.label,
        hour,
      }),
      exactTimeLabel: start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      note: buildOptionNote(slot, index),
    };
  });

  return topThree;
}
