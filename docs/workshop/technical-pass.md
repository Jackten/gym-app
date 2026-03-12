# Technical Workshop Pass — Architecture & Rules (v1-oriented)

## 1) Goal of this pass
Turn the current product spec into an implementation-ready architecture that stays simple, auditable, and easy to tune.

This pass preserves the non-negotiables:
- Credits are effectively dollars at list value (1 credit = $1 list), with bundle discounts on purchase.
- Base pricing:
  - 30 min = 30 credits
  - 60 min = 50 credits
  - each additional hour = +25 credits
- Prime time is **dynamic** from historical demand (not fixed time windows).
- Max occupancy is 5 concurrent users.
- After 2 users are booked in a time block, price increases with each additional booking.
- Users provide workout type + planned equipment to reduce conflicts.

---

## 2) Pragmatic architecture recommendation
Use a single deployable web app + relational DB first.

- **Application**: one TypeScript app (API + web) or one backend + one frontend repo folder, but one logical service.
- **Database**: PostgreSQL (strong transactional guarantees for capacity enforcement).
- **Background jobs**: lightweight scheduler/worker for demand profile recompute.
- **No microservices in v1**.

Why: the hard parts here are rules consistency + race-safe booking, not horizontal scale.

---

## 3) Proposed data model (entities + responsibilities)

### 3.1 Core identity/auth
1. **users**
   - `id`, `email`, `name`, `status`, `created_at`
2. **auth_identities** (future-ready)
   - `id`, `user_id`, `provider` (`email_code`, `password`, `passkey`, `ethereum`), `provider_subject`, `meta_json`, `created_at`

> Supports future email code / passkey / Ethereum login without schema rewrite.

### 3.2 Wallet and credits
3. **wallets**
   - `id`, `user_id` (1:1), `balance_credits`, `updated_at`
4. **wallet_ledger_entries** (source of truth)
   - `id`, `wallet_id`, `entry_type` (`topup`, `booking_debit`, `refund`, `adjustment`), `credits_delta`, `cash_amount_cents` (nullable), `reference_type`, `reference_id`, `idempotency_key`, `created_at`
5. **credit_packages**
   - `id`, `name`, `credits_granted`, `cash_price_cents`, `active`, `created_at`
6. **payments** (can start as mocked)
   - `id`, `user_id`, `provider`, `provider_ref`, `amount_cents`, `status`, `created_at`

> Keep `wallet_ledger_entries` immutable. Wallet balance is a cached projection.

### 3.3 Booking and occupancy
7. **bookings**
   - `id`, `user_id`, `start_at`, `end_at`, `duration_minutes`, `status` (`draft`,`quoted`,`confirmed`,`cancelled`,`completed`,`no_show`), `quote_id`, `final_charge_credits`, `created_at`, `updated_at`
8. **booking_slots** (one row per 30-minute block spanned)
   - `booking_id`, `slot_start_at`
9. **slot_occupancy** (counter rows for lock-safe increments)
   - `slot_start_at` (PK), `confirmed_count`, `updated_at`

> `booking_slots` makes overlap checks and analytics simple. `slot_occupancy` allows row-level locking during confirmation.

### 3.4 Intent and conflict signals
10. **equipment_catalog**
    - `id`, `code`, `display_name`, `active`
11. **booking_intents**
    - `booking_id`, `workout_type`, `notes`
12. **booking_intent_equipment**
    - `booking_id`, `equipment_id`

### 3.5 Pricing and demand auditability
13. **pricing_rule_sets** (versioned config)
    - `id`, `name`, `base_rules_json`, `occupancy_rules_json`, `demand_rules_json`, `effective_from`, `effective_to`, `created_by`
14. **pricing_quotes**
    - `id`, `user_id`, `start_at`, `end_at`, `duration_minutes`, `rule_set_id`, `base_credits`, `demand_multiplier`, `occupancy_multiplier`, `total_credits`, `breakdown_json`, `expires_at`, `created_at`
15. **demand_profiles**
    - `week_minute_index` (0..10079), `window_start`, `window_end`, `demand_score`, `demand_band`, `multiplier`, `sample_size`, `updated_at`

### 3.6 Ops and governance
16. **admin_audit_events**
    - `id`, `actor_user_id`, `event_type`, `target_type`, `target_id`, `before_json`, `after_json`, `created_at`

---

## 4) Pricing engine structure (deterministic + tunable)

### 4.1 Quote pipeline
Given `(user, start, duration)`:
1. Validate duration increment (30-minute granularity).
2. Compute **base credits** from duration rule.
3. Resolve **demand multiplier** from `demand_profiles` by recurring weekly bucket.
4. Determine **current occupancy tier** for the requested slot span.
5. Apply occupancy multiplier (no uplift for occupancy 1-2; uplift from 3+).
6. Round once at the end (recommend: nearest int, halves up).
7. Persist `pricing_quotes` with full breakdown + `rule_set_id` + expiry.

`total_credits = round(base_credits * demand_multiplier * occupancy_multiplier)`

### 4.2 Occupancy tier recommendation (v1)
Keep existing shape and make values admin-configurable:
- occupancy 1: `1.00`
- occupancy 2: `1.00`
- occupancy 3: `1.05`
- occupancy 4: `1.10`
- occupancy 5: `1.15`

For bookings spanning multiple 30-min slots in v1: use the **highest occupancy tier across spanned slots**.
- Pros: simple, deterministic, fast.
- Tradeoff: slight pricing coarseness at slot boundaries.

### 4.3 Dynamic prime-time implementation
- Run nightly job to recompute `demand_profiles` from trailing 8–12 weeks.
- Inputs per weekly bucket:
  - average occupancy ratio,
  - early-booking tendency (lead time),
  - full-slot frequency.
- Map demand score into discrete multipliers (e.g., 1.00 / 1.05 / 1.10 / 1.15).

No manual “prime-time schedule” table in v1.

### 4.4 Confirmation-time consistency
At booking confirm:
- Re-load quote, ensure not expired.
- In a single DB transaction, lock relevant `slot_occupancy` rows (`SELECT ... FOR UPDATE`).
- Re-check capacity (all slots must remain <=5 after increment).
- Recompute occupancy multiplier if needed and compare with quoted total.
  - If changed materially, return `PRICE_CHANGED` and issue a refreshed quote.
- Debit wallet + write booking + increment occupancy atomically.

---

## 5) Booking conflict model (capacity + equipment)

### 5.1 Hard constraints (must enforce)
- Max concurrent occupancy = 5.
- Booking must pass for **all** 30-minute slots it spans.
- Capacity check repeated at confirmation transaction time.

### 5.2 Soft conflicts (warn, don’t block in v1)
- Use `booking_intents` + `booking_intent_equipment` to estimate contention.
- Compute per-slot equipment load count and warning level:
  - `low`, `medium`, `high` based on equipment-specific thresholds.
- Show warnings in UI before confirm, with optional “show nearby lower-conflict times.”

### 5.3 Why warnings only in v1
Hard-blocking on equipment quickly becomes policy-heavy and frustrating. Warnings deliver value without needing perfect taxonomy or strict enforcement logic.

---

## 6) Admin tooling assumptions (v1)
Minimal internal admin panel (or protected admin routes) should allow:
1. Manage credit packages (credits granted, cash price, active/inactive).
2. Manage pricing rule set versions (occupancy percentages, demand band mapping).
3. View bookings timeline + occupancy heatmap.
4. View quote breakdown/audit per booking.
5. Apply wallet adjustments with required reason (logged in `admin_audit_events`).

Keep admin edits versioned and auditable; avoid direct DB edits as a normal workflow.

---

## 7) Recommended v1 implementation sequence

1. **Schema + invariants**
   - Create all core tables + indexes, especially time-slot and ledger indexes.
   - Add DB constraints for valid durations and non-negative occupancy counts.

2. **Wallet ledger first**
   - Implement ledger writes + projected balance updates + idempotency keys.
   - Add tests around double-charge protection.

3. **Booking slot expansion + capacity transaction**
   - Implement slot expansion helper (30-minute buckets).
   - Implement transactional confirm path with row locks on `slot_occupancy`.

4. **Pricing engine (base + occupancy) with rule-set versioning**
   - Start with demand multiplier fixed at 1.00.
   - Persist quotes and expiry behavior.

5. **Demand profile job**
   - Add nightly recompute + demand band lookup.
   - Turn on dynamic multiplier in quote flow after validation.

6. **Intent capture + conflict warnings**
   - Add workout/equipment fields and warning indicators.

7. **Admin ops surface**
   - Packages, pricing configs, audit views, wallet adjustments.

8. **Polish + analytics**
   - Cancellation/refund rules, no-show policy, metrics dashboards.

---

## 8) Risk/complexity notes (what to avoid)

1. **Avoid over-engineering demand scoring**
   - Don’t start with ML. Use weighted heuristics and discrete bands.

2. **Avoid distributed locking**
   - Use PostgreSQL row-level locks in one transactional system.

3. **Avoid mutable financial records**
   - Never edit ledger rows in place; add compensating entries.

4. **Avoid pricing black boxes**
   - Every quote must be reproducible from stored rule set + inputs.

5. **Avoid premature hard conflict enforcement**
   - Equipment warnings first; hard constraints later if operationally necessary.

6. **Avoid auth overbuild in v1**
   - Start with one login method; keep `auth_identities` extensible for passkeys/Ethereum later.

---

## 9) Open decisions to finalize before build kickoff
1. Exact occupancy uplift percentages (defaults above are acceptable starter values).
2. Demand window length (8 vs 12 weeks).
3. Quote expiry length (recommended: 3–5 minutes).
4. Cancellation/refund policy (credit refund windows and no-show penalties).
5. Initial login method (email code is likely best friction/scope tradeoff).

This set of decisions is enough to begin implementation without architecture churn.