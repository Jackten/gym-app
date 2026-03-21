# Calendar Scheduler Implementation (v2)

Date: 2026-03-21

## Architecture overview

### Core page
- `web/src/pages/SessionPage.jsx`
  - Rebuilt as calendar-first manual scheduler.
  - Multi-step local flow:
    - `slot` → `equipment` → `recurrence` → `review`

### Feature boundary
- `web/src/features/calendar-scheduler/config.js`
  - Slot templates
  - Capacity constants
  - Equipment category config
  - Recurrence option config
- `web/src/features/calendar-scheduler/utils.js`
  - 2-week range generation
  - Slot availability projection
  - Recurring session generation
  - Series summary builder
- `web/src/features/calendar-scheduler/components/*`
  - `TwoWeekCalendar.jsx`
  - `SlotCardList.jsx`
  - `EquipmentSelector.jsx`
  - `RecurrencePatternPanel.jsx`
  - `RecurrenceReview.jsx`

### App state and booking actions
- `web/src/contexts/AppContext.jsx`
  - Added auth method support for `passkey`.
  - Register/sign-in now redirect to `/home`.
  - Added `getSlotAvailabilityForDay(dateInput)`.
  - Added `createManualBookings({ sessions, equipmentSelection, note, recurrence })`.
  - Added `editBookingTime({ bookingId, newTimeInput, scope })` for one-vs-all recurring edits.

### Navigation/routing
- `web/src/App.jsx`
  - Removed `/welcome` and `/session/confirmed` from active flow.
  - Added `/calendar` alias route to scheduler page.
- `web/src/components/BottomNav.jsx`
  - Session nav item renamed to **Calendar** and points to `/calendar`.

### Dashboard/landing/auth updates
- `web/src/pages/LandingPage.jsx`
  - Simplified to Login/Register landing only.
- `web/src/pages/HubPage.jsx`
  - Dashboard CTA update:
    - Primary: View calendar
    - Secondary: Book a session
- `web/src/pages/AuthPage.jsx`
  - Added Passkey option UI (prototype mock flow via email identity).

### Bookings management updates
- `web/src/pages/BookingsPage.jsx`
  - Added recurring series edit controls (time edit with scope one/all).
  - Keeps cancellation flow.

## Data shapes

### Booking (calendar-v2 source)
```js
{
  id,
  userId,
  startISO,
  endISO,
  durationMinutes,
  workoutType: 'general-training',
  equipment: string[],
  equipmentCategory,
  status: 'confirmed',
  pricing: { finalCredits: 0, ... },
  source: 'calendar-v2',
  bookingNote,
  recurrence: {
    seriesId,
    frequency,
    weekdays,
    endDate,
    skipDates,
    occurrenceIndex,
    totalOccurrences
  } | null
}
```

### Recurrence form model
```js
{
  frequency: 'none' | 'weekly' | 'biweekly',
  weekdays: number[],
  endDate: 'YYYY-MM-DD',
  skipDateInput: 'YYYY-MM-DD',
  skipDates: string[],
  editScope: 'one' | 'all'
}
```

## Maintainability notes
- Scheduler-specific constants and behavior moved into dedicated feature folder.
- Booking creation/edit logic is centralized in `AppContext` to ease API swap later.
- Slot templates and equipment taxonomy are config-driven.

## Next steps (API integration)
1. Replace `getSlotAvailabilityForDay` with backend availability endpoint.
2. Replace `createManualBookings` with transactional booking API.
3. Replace `editBookingTime` with server-side recurring edit endpoint.
4. Add server-assigned recurrence IDs and conflict codes.
5. Add timezone-aware recurrence generation on backend for consistency.
