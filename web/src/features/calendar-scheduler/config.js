export const BOOKING_SEGMENT_MINUTES = 30;

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
    id: 'cardio',
    label: 'Cardio',
    icon: '🫀',
    items: [
      { id: 'treadmill', label: 'Treadmill' },
      { id: 'assault-bike', label: 'Assault bike' },
      { id: 'row-machine', label: 'Row machine' },
      { id: 'ski-erg', label: 'Ski erg' },
    ],
  },
  {
    id: 'weights',
    label: 'Weights',
    icon: '🏋️',
    items: [
      { id: 'barbell', label: 'Barbell' },
      { id: 'bench', label: 'Bench' },
      { id: 'cable-machine', label: 'Cable machine' },
      { id: 'dumbbell', label: 'Dumbbells' },
      { id: 'kettlebell', label: 'Kettlebell' },
    ],
  },
  {
    id: 'bodyweight',
    label: 'Bodyweight',
    icon: '💪',
    items: [
      { id: 'pull-up-bar', label: 'Pull-up bar' },
      { id: 'rings', label: 'Rings' },
      { id: 'dip-station', label: 'Dip station' },
      { id: 'mat', label: 'Mat area' },
    ],
  },
  {
    id: 'boxing',
    label: 'Boxing',
    icon: '🥊',
    items: [
      { id: 'punching-bag', label: 'Punching bag' },
      { id: 'speed-bag', label: 'Speed bag' },
    ],
  },
  {
    id: 'functional',
    label: 'Functional',
    icon: '⚡',
    items: [
      { id: 'box-jump', label: 'Box jump box' },
      { id: 'sled', label: 'Sled' },
      { id: 'battle-ropes', label: 'Battle ropes' },
      { id: 'sandbags', label: 'Sandbags' },
      { id: 'med-ball', label: 'Medicine balls' },
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
