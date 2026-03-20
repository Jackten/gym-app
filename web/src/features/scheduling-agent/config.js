import { EQUIPMENT_TAXONOMY } from '../../lib/constants';

export const AGENT_DEFAULT_DURATION = 60;

export const EQUIPMENT_CATEGORIES = [
  { id: 'no-preference', label: "Don't know / no preference", icon: '🤷' },
  { id: 'cardio', label: 'Cardio', icon: '🫀' },
  { id: 'weights', label: 'Weights', icon: '🏋️' },
  { id: 'body-weight', label: 'Bodyweight', icon: '💪' },
  { id: 'functional', label: 'Functional / performance', icon: '⚡' },
];

export const SLOT_WINDOWS = {
  early_morning: { id: 'early_morning', label: 'Early morning', hours: [6, 7, 8] },
  morning: { id: 'morning', label: 'Morning', hours: [8, 9, 10, 11] },
  afternoon: { id: 'afternoon', label: 'Afternoon', hours: [12, 13, 14, 15, 16] },
  evening: { id: 'evening', label: 'Evening', hours: [17, 18, 19, 20] },
  night: { id: 'night', label: 'Night', hours: [20, 21] },
  any: { id: 'any', label: 'Flexible', hours: [8, 10, 12, 15, 17, 18, 19] },
};

export const EQUIPMENT_BY_CATEGORY = EQUIPMENT_TAXONOMY.reduce((acc, group) => {
  acc[group.id] = group.items;
  return acc;
}, {});

export const CATEGORY_DEFAULT_EQUIPMENT = {
  cardio: ['treadmill', 'row-machine'],
  weights: ['dumbbell', 'barbell'],
  'body-weight': ['pull-up-bar', 'rings'],
  functional: ['sled', 'battle-ropes'],
};

export const WORKOUT_KEYWORDS = {
  strength: ['strength', 'lift', 'lifting', 'powerlifting', 'barbell', 'weights', 'leg day'],
  cardio: ['cardio', 'run', 'running', 'zone 2', 'bike', 'conditioning base'],
  conditioning: ['conditioning', 'hiit', 'metcon', 'circuit'],
  mobility: ['mobility', 'stretch', 'yoga', 'recovery flow'],
  boxing: ['boxing', 'bag work', 'sparring', 'fight'],
  recovery: ['recovery', 'rehab', 'deload', 'restore'],
};

export const AGENT_OPENING_MESSAGE =
  "Tell me what you want in plain language (ex: 'tomorrow evening strength, around an hour'). I'll infer details and suggest the best 3 options.";
