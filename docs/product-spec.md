# Product Spec — Gym App (v0)

## 1) Product Goal
Provide a gym booking experience that balances:
1. member convenience,
2. fair but demand-aware pricing,
3. floor/equipment utilization.

## 2) Scope (Initial)
### In scope
- Account creation/login (basic approach to be selected later)
- Session booking calendar
- Capacity enforcement (max concurrent users)
- Credits wallet (purchase and spend)
- Dynamic pricing engine (history + occupancy aware)
- Workout intent capture (type + equipment)

### Out of scope (v0)
- Building access hardware integration
- Advanced authentication methods (passkeys/crypto wallets)
- Full payment processor implementation details beyond placeholders

## 3) Primary User Stories
1. As a member, I can buy credit bundles and see my balance.
2. As a member, I can book a time slot and see the price before confirming.
3. As a member, I can choose session duration (30m, 60m, 120m+).
4. As a member, I can specify workout type and planned equipment to avoid clashes.
5. As an operator, I need occupancy capped at 5 users per overlapping time block.
6. As an operator, I need prices to rise in high-demand periods automatically.

## 4) Key Business Rules
- **Credits value:** 1 credit maps to $1 list value.
- **Base price schedule:**
  - 30 min: 30 credits
  - 60 min: 50 credits
  - 120 min: 75 credits
  - N hours (>1): 50 + (N-1)*25 credits
- **Capacity:** max 5 active overlapping bookings.
- **Prime time (dynamic demand):** computed from the trailing 4 weeks of booking history (not manually fixed).
- **Demand multiplier curve:**
  - Normal = `1.00x`
  - Warm = `1.05x`
  - Hot = `1.10x`
  - Peak = `1.15x`
- **Live occupancy multiplier curve:**
  - 1st person = `1.00x`
  - 2nd person = `1.00x`
  - 3rd person = `1.10x`
  - 4th person = `1.20x`
  - 5th person = `1.35x`
- **Quote hold duration:** 15 minutes.
- **Cancellation policy:**
  - Full refund if cancelled more than 2 hours before session start.
  - Within 2 hours of start: no automatic refund.
  - Admin override available.

## 5) Domain Objects (Draft)
- **User**: profile, auth method(s), preferences
- **CreditsWallet**: balance, transactions, bundle purchases
- **Booking**: start/end, duration, status, price quote, final charge
- **BookingIntent**: workout type, equipment list
- **PricingQuote**: base price, demand multiplier, occupancy surcharge, total
- **DemandProfile**: rolling historical stats by day/time block

## 6) Functional Requirements
### Booking
- Time-slot selection UI with availability and capacity indicators.
- Real-time capacity validation at confirmation time.
- Quote lock window: 15 minutes to prevent stale pricing at checkout.
- Cancellation handling with policy enforcement (>2h full refund, <=2h no automatic refund, admin override path).

### Pricing
- Deterministic quote endpoint returning full breakdown.
- Dynamic demand factor based on rolling historical occupancy/bookings.
- Incremental occupancy adjustments after second booking in same block.

### Conflict Reduction
- Capture workout category (e.g., strength/cardio/conditioning/mobility).
- Capture planned equipment list.
- Warn users when selected slot has high equipment contention.

## 7) Non-Functional Requirements
- Auditability: store quote components per booking.
- Consistency: avoid overbooking under concurrent requests.
- Explainability: user-facing pricing breakdown must be clear.

## 8) Success Metrics (Initial)
- Booking completion rate
- Credit top-up conversion
- Peak-slot utilization
- Equipment conflict warning accuracy/usefulness
- Revenue per booked hour vs baseline static pricing
