# Pricing Engine — Draft v0

## Objectives
1. Keep base pricing simple and transparent.
2. Reflect demand automatically using historical booking behavior.
3. Add occupancy-based scarcity pricing once a block is no longer lightly booked.

---

## 1) Base Price Function
Credits and dollars are numerically aligned at list value.

- 30 min => 30 credits ($30)
- 60 min => 50 credits ($50)
- Each additional full hour beyond first hour => +25 credits (+$25)

### Formula
Let `durationHours` be in 0.5 increments:
- if 0.5 -> `base = 30`
- if 1.0 -> `base = 50`
- if >1.0 -> `base = 50 + 25 * (durationHours - 1)`

---

## 2) Historical Demand (Dynamic Prime Time)
Prime time is not a manually fixed schedule. Instead compute a demand score by time block from recent history.

### Locked v0 approach
- Bucket bookings into weekly recurring blocks (e.g., Mon 6:00-6:30 PM).
- Use a trailing 4-week booking-history window.
- Compute demand score using:
  - average occupancy ratio,
  - booking lead-time (earlier fill implies higher demand),
  - full-slot frequency.

### Demand multiplier (locked bands)
Map score to multiplier using named demand tiers:
- Normal: `1.00x`
- Warm: `1.05x`
- Hot: `1.10x`
- Peak: `1.15x`

This provides dynamic prime-time behavior without static manually maintained time lists.

---

## 3) Occupancy-Based Incremental Pricing
Rule requirement: once occupancy in a block exceeds 2 users, each added booking increases price incrementally.

### Locked occupancy multipliers
- 1st booking (occupancy 1): `1.00x`
- 2nd booking (occupancy 2): `1.00x`
- 3rd booking (occupancy 3): `1.10x`
- 4th booking (occupancy 4): `1.20x`
- 5th booking (occupancy 5): `1.35x`

This surcharge applies to the booking being quoted/confirmed at that occupancy level.

---

## 4) Total Quote Calculation
`totalCredits = round(basePrice * demandMultiplier * occupancyMultiplier)`

Where:
- `demandMultiplier` from historical demand profile
- `occupancyMultiplier` from current booked count in overlapping block

Equivalent dollar display:
`totalDollars = totalCredits` (list parity)

---

## 5) Credit Bundle Discounts
Credits are purchased in bundles; bundle discount lowers effective cash per credit while keeping booking debits in credits.

### Example bundles (placeholder, editable)
- 100 credits -> $100 (0% bonus)
- 250 credits -> $235 (6% effective discount)
- 500 credits -> $450 (10% effective discount)

Store:
- paid cash amount,
- credits granted,
- effective $/credit for accounting.

---

## 6) Examples
1. **60 min slot, Warm demand, occupancy=2**
   - base 50 * 1.05 * 1.00 = 52.5 -> 53 credits

2. **60 min slot, Hot demand, occupancy=4**
   - base 50 * 1.10 * 1.20 = 66.0 -> 66 credits

3. **120 min slot, Peak demand, occupancy=5**
   - base 75 * 1.15 * 1.35 = 116.44 -> 116 credits

---

## 7) Guardrails
- Max occupancy hard cap: 5 (reject beyond cap)
- Quote expiry window: 15 minutes to avoid stale occupancy/race conditions
- Persist pricing breakdown snapshot per booking for auditability

---

## 8) Tunable Config Surface (future)
Locked for v0 launch: trailing 4-week demand window, demand multipliers, occupancy multipliers, and 15-minute quote hold.

Future tuning (if needed post-launch):
- Demand band score thresholds
- Rounding mode (nearest/up/down)
- Min/max total multiplier caps
