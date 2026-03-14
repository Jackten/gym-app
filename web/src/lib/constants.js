export const DURATION_OPTIONS = [30, 60, 120, 180];

export const WORKOUT_TYPES = [
  { id: 'strength', label: 'Strength', icon: '🏋️' },
  { id: 'cardio', label: 'Cardio', icon: '🫀' },
  { id: 'conditioning', label: 'Conditioning', icon: '⚡' },
  { id: 'mobility', label: 'Mobility', icon: '🧘' },
  { id: 'boxing', label: 'Boxing', icon: '🥊' },
  { id: 'recovery', label: 'Recovery', icon: '💆' },
];

export const AUTH_METHODS = [
  { id: 'google', title: 'Google', subtitle: 'Continue with your Google account', icon: '🔑' },
  { id: 'ethereum', title: 'Ethereum', subtitle: 'Connect wallet to sign in', icon: '⬡' },
  { id: 'phone', title: 'Phone', subtitle: 'SMS verification code', icon: '📱' },
  { id: 'email', title: 'Email', subtitle: 'Magic-code sign-in', icon: '✉️' },
];

export const AUTH_VIEW_COPY = {
  signin: {
    eyebrow: 'Member Sign-in',
    title: 'Welcome back',
    blurb: 'Choose your preferred method to access your account.',
    ctaLabel: 'Continue',
    modeCopy: 'Sign in',
    switchText: 'New here? Create an account →',
  },
  register: {
    eyebrow: 'Create Account',
    title: 'Join Pelayo Wellness',
    blurb: 'Create your account to start booking premium training sessions.',
    ctaLabel: 'Create account',
    modeCopy: 'Register',
    switchText: 'Already have an account? Sign in →',
  },
};

export const EQUIPMENT_TAXONOMY = [
  {
    id: 'cardio',
    title: 'Cardio',
    icon: '🫀',
    items: [
      { id: 'treadmill', label: 'Treadmill' },
      { id: 'assault-bike', label: 'Assault Bike' },
      { id: 'row-machine', label: 'Row Machine' },
      { id: 'ski-erg', label: 'Ski Erg' },
      { id: 'boxing', label: 'Boxing' },
      { id: 'cardio-other', label: 'Other Cardio' },
    ],
  },
  {
    id: 'weights',
    title: 'Weights',
    icon: '🏋️',
    items: [
      { id: 'dumbbell', label: 'Dumbbell' },
      { id: 'barbell', label: 'Barbell' },
      { id: 'kettlebell', label: 'Kettlebell' },
      { id: 'cable-machine', label: 'Cable Machine' },
      { id: 'benches', label: 'Benches' },
      { id: 'weights-other', label: 'Other Weights' },
    ],
  },
  {
    id: 'body-weight',
    title: 'Body Weight',
    icon: '💪',
    items: [
      { id: 'dips', label: 'Dips Station' },
      { id: 'rings', label: 'Rings' },
      { id: 'pull-up-bar', label: 'Pull-up Bar' },
      { id: 'ghd-machine', label: 'GHD Machine' },
      { id: 'bodyweight-other', label: 'Other Body Weight' },
    ],
  },
  {
    id: 'functional',
    title: 'Functional / Performance',
    icon: '⚡',
    items: [
      { id: 'sled', label: 'Sled' },
      { id: 'battle-ropes', label: 'Battle Ropes' },
      { id: 'mobility-zone', label: 'Mobility Zone' },
      { id: 'functional-other', label: 'Other Functional' },
    ],
  },
];

export const EQUIPMENT_LABELS = EQUIPMENT_TAXONOMY.flatMap((g) => g.items).reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {});

export const LEGACY_EQUIPMENT_LABELS = {
  rack: 'Squat Rack',
  barbell: 'Barbell',
  dumbbells: 'Dumbbell',
  bike: 'Assault Bike',
  rower: 'Row Machine',
  sled: 'Sled',
  mat: 'Mobility Mat',
  bench: 'Benches',
};

export const EMPTY_AUTH_FORM = {
  name: '',
  email: '',
  phone: '',
  code: '',
  walletAddress: '',
  waiverAccepted: false,
};
