export const SLOT_TEMPLATES = [
  { id: '06:00', label: '6:00 AM' },
  { id: '06:30', label: '6:30 AM' },
  { id: '07:00', label: '7:00 AM' },
  { id: '07:30', label: '7:30 AM' },
  { id: '08:00', label: '8:00 AM' },
  { id: '08:30', label: '8:30 AM' },
  { id: '09:00', label: '9:00 AM' },
  { id: '09:30', label: '9:30 AM' },
  { id: '10:00', label: '10:00 AM' },
  { id: '10:30', label: '10:30 AM' },
  { id: '11:00', label: '11:00 AM' },
  { id: '11:30', label: '11:30 AM' },
  { id: '12:00', label: '12:00 PM' },
  { id: '12:30', label: '12:30 PM' },
  { id: '13:00', label: '1:00 PM' },
  { id: '13:30', label: '1:30 PM' },
  { id: '14:00', label: '2:00 PM' },
  { id: '14:30', label: '2:30 PM' },
  { id: '15:00', label: '3:00 PM' },
  { id: '15:30', label: '3:30 PM' },
  { id: '16:00', label: '4:00 PM' },
  { id: '16:30', label: '4:30 PM' },
  { id: '17:00', label: '5:00 PM' },
  { id: '17:30', label: '5:30 PM' },
  { id: '18:00', label: '6:00 PM' },
  { id: '18:30', label: '6:30 PM' },
  { id: '19:00', label: '7:00 PM' },
  { id: '19:30', label: '7:30 PM' },
  { id: '20:00', label: '8:00 PM' },
  { id: '20:30', label: '8:30 PM' },
  { id: '21:00', label: '9:00 PM' },
];

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
      { id: 'dumbbell', label: 'Dumbbells' },
      { id: 'bench', label: 'Bench' },
      { id: 'kettlebell', label: 'Kettlebell' },
      { id: 'cable-machine', label: 'Cable machine' },
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
    id: 'functional',
    label: 'Functional',
    icon: '⚡',
    items: [
      { id: 'sled', label: 'Sled' },
      { id: 'battle-ropes', label: 'Battle ropes' },
      { id: 'sandbags', label: 'Sandbags' },
      { id: 'med-ball', label: 'Medicine balls' },
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
