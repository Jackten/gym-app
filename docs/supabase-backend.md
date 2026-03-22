# Supabase Backend Integration (Pelayo Wellness v1)

Date: 2026-03-22  
Status: Implemented in codebase, migration ready

## Overview
This project now has a Supabase-backed path for:
- Real auth (Google OAuth + Email OTP)
- Real bookings and recurring groups
- Real equipment catalog and equipment reservations
- RLS-protected multi-user reads/writes for scheduler workflows

The frontend still keeps local mock/state fallback for features not yet migrated (wallet, admin demo controls, and legacy auth methods).

---

## Environment variables (Vite client)
Set in `web/.env`:

```bash
VITE_SUPABASE_URL=https://rgcnvghjmdkannkgocrj.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

These are safe for browser usage (anon key is public by design).

> Do **not** put `SUPABASE_SERVICE_ROLE_KEY` in frontend code or Vite env.

---

## Schema + migration
Migration file:

- `supabase/migrations/20260322_pelayo_backend.sql`

### Tables
- `profiles`
  - Linked to `auth.users` (`id uuid primary key references auth.users(id)`)
  - Stores profile metadata and auth method list
- `recurring_groups`
  - Recurrence pattern/frequency/weekdays/end/skip dates
- `bookings`
  - `user_id`, `slot_date`, `start_time`, `end_time`, `duration_minutes`, `status`
  - `equipment_categories`, `equipment_items`, `notes`, `recurring_group_id`
- `equipment`
  - Equipment catalog (`id`, `name`, `category`, `is_available`)
- `equipment_reservations`
  - Link table for equipment holds per booking/time

### Indexes
Added for:
- booking lookup by user/date
- booking conflict windows (date/start/end)
- booking status
- recurring group joins
- equipment availability/category
- equipment reservation time windows

### Triggers/functions
- `set_updated_at()` trigger function for `updated_at`
- `handle_new_auth_user()` trigger to create/update profile rows on new auth users

### Seed data
`equipment` is seeded/upserted in migration with current catalog items used by the frontend.

---

## RLS policies
RLS enabled on all new tables.

### Profiles
- Users can select/insert/update only their own profile (`id = auth.uid()`).

### Recurring groups
- Users can CRUD only their own rows (`user_id = auth.uid()`).

### Bookings
- Authenticated users can read:
  - their own bookings, and
  - any `confirmed` bookings (for availability display)
- Users can insert/update/delete only their own bookings.

### Equipment
- Authenticated users can read catalog entries.
- No client-side write policy enabled.

### Equipment reservations
- Authenticated users can read reservations.
- Insert/update/delete allowed only when reservation is attached to a booking owned by `auth.uid()`.

---

## Auth setup
Frontend now uses Supabase Auth for:
- Google OAuth
- Email OTP

### Frontend behavior
- Google: `signInWithOAuth({ provider: 'google' })`
- Email: `signInWithOtp` + `verifyOtp`
- Session persistence: handled by Supabase JS client (`persistSession: true`)

### Manual Google provider setup (Supabase dashboard)
Because Google OAuth credentials are project-specific, complete this once in dashboard:

1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Add Google OAuth Client ID + Secret
4. Add redirect URLs:
   - Local dev example: `http://localhost:5173`
   - GitHub Pages production URL (actual site URL)
5. Save and test sign-in

> Google provider cannot be fully completed without those external OAuth credentials.

### Email auth
- Supabase email provider must be enabled (usually enabled by default).
- OTP email templates/config can be adjusted in Authentication settings.

---

## Frontend integration details
New files:
- `web/src/lib/supabaseClient.js`
- `web/src/lib/supabaseBackend.js`

Updated major flow:
- `web/src/contexts/AppContext.jsx`
  - Detects Supabase config
  - Listens to auth state/session
  - Upserts profile
  - Loads bookings/equipment from DB
  - Writes booking + recurring + equipment reservation records
  - Uses fallback mock data when Supabase is unavailable

Other updated files:
- `web/src/features/calendar-scheduler/components/EquipmentSelector.jsx`
  - Accepts dynamic categories from DB
- `web/src/pages/SessionPage.jsx`
  - Uses dynamic equipment catalog from context
- `web/src/pages/CalendarPage.jsx`
  - Uses `allBookings` source (supports DB-backed bookings)
- `web/src/pages/AuthPage.jsx`
  - Google flow now handled through Supabase OAuth UX

---

## Migration approach
### Recommended
Use Supabase migration workflow (`supabase migration up`) or run SQL in dashboard SQL Editor.

### Note on service role key
The service role key is intended for backend/admin/migration automation only.
If you automate migrations from CLI/scripts, keep that key in server-only env (never Vite/client).

---

## What is still manual
- Applying migration SQL to the hosted project (if not already applied)
- Supplying Google OAuth client credentials and enabling provider in dashboard
- Optional: tightening/expanding RLS visibility model as product policy evolves

---

## Security checks completed
- `service_role` key is not used in frontend bundle
- `web/.env` uses only `VITE_SUPABASE_URL` + anon key
- `.env.local.d/` remains ignored by git
