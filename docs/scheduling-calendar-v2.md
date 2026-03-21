# Scheduling Calendar v2 (Locked Product Rules)

Date: 2026-03-21
Status: Implemented in prototype

## What changed
The chat-led scheduling flow has been replaced as primary UX.
Calendar-first manual scheduling is now the default booking surface.

## Product rules implemented

### Landing
- Landing only presents **Login** and **Register**.
- Auth methods supported: **Passkey, Google, Email, Phone, Ethereum**.
- Remembered session behavior: app state persists in browser storage so returning users stay signed in until sign-out.

### Post-login
- After sign-in/register, users land on **Dashboard** (`/home`).
- Dashboard CTA order:
  1. **View calendar** (primary)
  2. **Book a session** (secondary)

### Scheduler
- Default scheduler route: `/session` (also mapped from `/calendar`).
- Default surface is a **2-week day strip**.
- Selecting a day reveals **slot cards** (mobile friendly).

### Booking flow
1. Select day from 2-week calendar strip
2. Select time slot card
3. Optional equipment selection (category-first)
4. Set recurring pattern
5. Review generated sessions
6. Confirm booking
7. Redirect to upcoming bookings (`/bookings`)

### Equipment rules
- Category-first flow options:
  - Don’t know
  - Cardio
  - Weights
  - Bodyweight
  - Functional
- Optional exact equipment picks inside category.
- Conflicts are advisory only: booking is still allowed.

### Recurring bookings v1
- Frequency: one-time / weekly / every 2 weeks
- Weekday selection
- End date
- Skip specific dates
- Flow is **pattern first, then review generated sessions**
- Review includes:
  - Summary card first
  - Expandable full list of generated sessions
- Edit scope model included: **edit one** vs **edit all in series**
  - Exposed in recurring setup and applied in bookings page edit controls.

## Deferred
- Pricing/payments are deferred in this pass (bookings store `finalCredits: 0` for calendar-v2 source).
- Chatbot booking UX deferred to future secondary surface.
