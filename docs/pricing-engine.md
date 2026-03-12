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

### Suggested approach
- Bucket bookings into weekly recurring blocks (e.g., Mon 6:00-6:30 PM).
- Use rolling window (e.g., last 8-12 weeks).
- Compute demand score using:
  - average occupancy ratio,
  - booking lead-time (earlier fill implies higher demand),
  - waitlist/full-slot frequency.

### Demand multiplier
Map score to multiplier, example bands:
- low demand: `1.00x`
- medium demand: `1.05x`
- high demand: `1.10x`
- very high demand: `1.15x`

This provides dynamic prime-time behavior without static manually maintained time lists.

---

## 3) Occupancy-Based Incremental Pricing
Rule requirement: once occupancy in a block exceeds 2 users, each added booking increases price incrementally.

### Suggested occupancy increments (configurable)
- 1st booking (occupancy 1): +0%
- 2nd booking (occupancy 2): +0%
- 3rd booking (occupancy 3): +5%
- 4th booking (occupancy 4): +10%
- 5th booking (occupancy 5): +15%

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
1. **60 min slot, medium demand, occupancy=2**
   - base 50 * 1.05 * 1.00 = 52.5 -> 53 credits

2. **60 min slot, high demand, occupancy=4**
   - base 50 * 1.10 * 1.10 = 60.5 -> 61 credits

3. **120 min slot, very high demand, occupancy=5**
   - base 75 * 1.15 * 1.15 = 99.19 -> 99 credits

---

## 7) Guardrails
- Max occupancy hard cap: 5 (reject beyond cap)
- Quote expiry window to avoid stale occupancy/race conditions
- Persist pricing breakdown snapshot per booking for auditability

---

## 8) Tunable Config Surface (future)
- Demand window length (weeks)
- Demand band thresholds
- Occupancy increment percentages
- Rounding mode (nearest/up/down)
- Min/max total multiplier caps
