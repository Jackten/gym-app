// Generate 30-minute slots for 24 hours
export const SLOT_TEMPLATES = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  const id = `${String(hour).padStart(2, '0')}:${min}`;
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const label = `${h12}:${min} ${ampm}`;
  return { id, label };
});

export const SLOT_CAPACITY = 5;

export const EQUIPMENT_FLOW_CATEGORIES = [
  {
    id: 'dont-know',
    label: "Don't know",
    icon: '🤷',
    items: [],
  },
  {
    id: 'weights',
    label: 'Weights',
    icon: '🏋️',
    items: [
      { id: 'barbell-1', label: 'Barbell 1' },
      { id: 'barbell-2', label: 'Barbell 2' },
      { id: 'barbell-3', label: 'Barbell 3' },
      { id: 'bench-1', label: 'Bench 1' },
      { id: 'bench-2', label: 'Bench 2' },
      { id: 'cable-machine', label: 'Cable machine' },
    ],
  },
  {
    id: 'boxing',
    label: 'Boxing',
    icon: '🥊',
    items: [
      { id: 'punching-bag-1', label: 'Punching bag 1' },
      { id: 'punching-bag-2', label: 'Punching bag 2' },
      { id: 'speed-bag', label: 'Speed bag' },
    ],
  },
  {
    id: 'functional',
    label: 'Functional',
    icon: '⚡',
    items: [
      { id: 'box-jump', label: 'Box jump box' },
    ],
  },
  {
    id: 'recovery',
    label: 'Recovery',
    icon: '🧊',
    items: [
      { id: 'sauna', label: 'Sauna' },
      { id: 'cold-plunge', label: 'Cold plunge' },
    ],
  },
];

export const RECURRENCE_FREQUENCIES = [
  { id: 'none', label: 'One-time booking' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Every 2 weeks' },
];

export const WEEKDAY_OPTIONS = [
  { id: 0, short: 'Sun' },
  { id: 1, short: 'Mon' },
  { id: 2, short: 'Tue' },
  { id: 3, short: 'Wed' },
  { id: 4, short: 'Thu' },
  { id: 5, short: 'Fri' },
  { id: 6, short: 'Sat' },
];
