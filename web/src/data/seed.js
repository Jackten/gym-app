const USERS = [
  { id: 'u1', name: 'Jack (Demo)', email: 'jack@example.com' },
  { id: 'u2', name: 'Maya', email: 'maya@example.com' },
  { id: 'u3', name: 'Leo', email: 'leo@example.com' },
  { id: 'u4', name: 'Sam', email: 'sam@example.com' },
  { id: 'u5', name: 'Nina', email: 'nina@example.com' },
];

const TOP_UP_PACKAGES = [
  { id: 'p1', label: 'Starter', credits: 100, cash: 100 },
  { id: 'p2', label: 'Builder', credits: 250, cash: 235 },
  { id: 'p3', label: 'Athlete', credits: 500, cash: 450 },
];

function plusMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function dateWithOffset(base, dayOffset, hour, minute) {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function alignToHalfHour(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  if (m === 0 || m === 30) return d;
  if (m < 30) {
    d.setMinutes(30);
  } else {
    d.setHours(d.getHours() + 1, 0);
  }
  return d;
}

function makePricing(finalCredits = 50) {
  return {
    baseCredits: 50,
    demandMultiplier: 1,
    demandTier: 'Normal',
    demandCount: 0,
    occupancyMultiplier: 1,
    occupancyAtQuote: 1,
    finalCredits,
  };
}

function makeBooking({
  id,
  userId,
  start,
  durationMinutes,
  workoutType = 'strength',
  equipment = ['dumbbells'],
  status = 'confirmed',
  pricing = makePricing(),
  createdAt,
  source = 'seed',
}) {
  const end = plusMinutes(start, durationMinutes);
  return {
    id,
    userId,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    durationMinutes,
    workoutType,
    equipment,
    status,
    pricing,
    createdAt: (createdAt || plusMinutes(start, -180)).toISOString(),
    source,
  };
}

function seedHistoricalDemandBookings(baseNow, idStart = 1000) {
  let idCounter = idStart;
  const historical = [];

  for (let week = 1; week <= 4; week += 1) {
    const dayOffset = 1 - week * 7;

    // 16:00 -> 4 bookings in trailing 4 weeks (Warm: 1.05)
    historical.push(
      makeBooking({
        id: `b${idCounter++}`,
        userId: 'u2',
        start: dateWithOffset(baseNow, dayOffset, 16, 0),
        durationMinutes: 60,
        workoutType: 'mobility',
        equipment: ['mat'],
        status: 'completed',
      }),
    );

    // 17:00 -> 8 bookings in trailing 4 weeks (Hot: 1.10)
    historical.push(
      makeBooking({
        id: `b${idCounter++}`,
        userId: 'u2',
        start: dateWithOffset(baseNow, dayOffset, 17, 0),
        durationMinutes: 60,
        workoutType: 'conditioning',
        equipment: ['bike'],
        status: 'completed',
      }),
    );
    historical.push(
      makeBooking({
        id: `b${idCounter++}`,
        userId: 'u3',
        start: dateWithOffset(baseNow, dayOffset, 17, 0),
        durationMinutes: 60,
        workoutType: 'cardio',
        equipment: ['rower'],
        status: 'completed',
      }),
    );

    // 18:00 -> 12 bookings in trailing 4 weeks (Peak: 1.15)
    historical.push(
      makeBooking({
        id: `b${idCounter++}`,
        userId: 'u2',
        start: dateWithOffset(baseNow, dayOffset, 18, 0),
        durationMinutes: 60,
        workoutType: 'strength',
        equipment: ['rack', 'barbell'],
        status: 'completed',
      }),
    );
    historical.push(
      makeBooking({
        id: `b${idCounter++}`,
        userId: 'u3',
        start: dateWithOffset(baseNow, dayOffset, 18, 0),
        durationMinutes: 60,
        workoutType: 'strength',
        equipment: ['rack'],
        status: 'completed',
      }),
    );
    historical.push(
      makeBooking({
        id: `b${idCounter++}`,
        userId: 'u4',
        start: dateWithOffset(baseNow, dayOffset, 18, 0),
        durationMinutes: 60,
        workoutType: 'conditioning',
        equipment: ['sled'],
        status: 'completed',
      }),
    );
  }

  return { historical, idCounter };
}

export function createSeedState() {
  const now = new Date();
  let counter = 1;

  const { historical, idCounter } = seedHistoricalDemandBookings(now, 200);
  counter = idCounter;

  const soonStart = alignToHalfHour(plusMinutes(now, 90));
  const laterStart = alignToHalfHour(plusMinutes(now, 360));

  const upcoming = [
    // Demo occupancy slots for tomorrow
    makeBooking({
      id: `b${counter++}`,
      userId: 'u2',
      start: dateWithOffset(now, 1, 18, 0),
      durationMinutes: 60,
      workoutType: 'strength',
      equipment: ['rack'],
    }),
    makeBooking({
      id: `b${counter++}`,
      userId: 'u3',
      start: dateWithOffset(now, 1, 18, 0),
      durationMinutes: 30,
      workoutType: 'cardio',
      equipment: ['bike'],
    }),
    makeBooking({
      id: `b${counter++}`,
      userId: 'u2',
      start: dateWithOffset(now, 1, 19, 0),
      durationMinutes: 60,
      workoutType: 'conditioning',
      equipment: ['sled'],
    }),
    makeBooking({
      id: `b${counter++}`,
      userId: 'u3',
      start: dateWithOffset(now, 1, 19, 0),
      durationMinutes: 60,
      workoutType: 'strength',
      equipment: ['barbell'],
    }),
    makeBooking({
      id: `b${counter++}`,
      userId: 'u4',
      start: dateWithOffset(now, 1, 19, 0),
      durationMinutes: 60,
      workoutType: 'mobility',
      equipment: ['mat'],
    }),
    makeBooking({
      id: `b${counter++}`,
      userId: 'u5',
      start: dateWithOffset(now, 1, 19, 0),
      durationMinutes: 30,
      workoutType: 'cardio',
      equipment: ['rower'],
    }),

    // Jack demo cancellation cases
    makeBooking({
      id: `b${counter++}`,
      userId: 'u1',
      start: soonStart,
      durationMinutes: 60,
      workoutType: 'strength',
      equipment: ['rack', 'barbell'],
      pricing: { ...makePricing(66), demandMultiplier: 1.1, demandTier: 'Hot', occupancyMultiplier: 1.2, occupancyAtQuote: 4 },
    }),
    makeBooking({
      id: `b${counter++}`,
      userId: 'u1',
      start: laterStart,
      durationMinutes: 60,
      workoutType: 'cardio',
      equipment: ['bike'],
      pricing: { ...makePricing(53), demandMultiplier: 1.05, demandTier: 'Warm', occupancyMultiplier: 1, occupancyAtQuote: 2 },
    }),
  ];

  return {
    version: 1,
    users: USERS,
    currentUserId: 'u1',
    wallets: {
      u1: 120,
      u2: 210,
      u3: 90,
      u4: 330,
      u5: 165,
    },
    packages: TOP_UP_PACKAGES,
    bookings: [...historical, ...upcoming],
    transactions: [
      {
        id: 't1',
        userId: 'u1',
        type: 'topup',
        credits: 250,
        cash: 235,
        createdAt: plusMinutes(now, -60 * 24 * 6).toISOString(),
        note: 'Seeded Builder package purchase',
      },
      {
        id: 't2',
        userId: 'u1',
        type: 'charge',
        credits: -66,
        createdAt: plusMinutes(now, -20).toISOString(),
        note: 'Seeded recent booking charge',
      },
    ],
    activeQuote: null,
    clockOffsetMinutes: 0,
    nextBookingId: counter,
    nextTransactionId: 3,
  };
}
