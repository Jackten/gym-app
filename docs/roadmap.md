# Roadmap — Gym App

## Phase 0: Foundation (Now)
- [x] Standalone repo and docs scaffold
- [ ] Choose implementation stack (recommended: TypeScript full-stack)
- [ ] Define initial schema (users, wallets, bookings, pricing snapshots)
- [ ] Build pricing engine module + tests

## Phase 1: Core MVP
- [ ] Auth (simple email/password or magic link)
- [ ] Credits wallet (balance + transaction ledger)
- [ ] Credit bundle purchase flow (mock or real provider)
- [ ] Booking calendar + availability
- [ ] Capacity enforcement (max 5)
- [ ] Dynamic pricing (history + occupancy)
- [ ] Booking confirmation and cancellation flows

## Phase 2: Operations & Quality
- [ ] Admin dashboard (bookings, occupancy, revenue)
- [ ] Pricing config controls (multipliers/thresholds)
- [ ] Audit logs + analytics events
- [ ] Reliability hardening (idempotency, race-condition tests)

## Phase 3: Expansion Features
- [ ] Passkeys authentication
- [ ] Email code login
- [ ] Ethereum wallet login
- [ ] Top-up/payment productionization
- [ ] Building access integration
- [ ] Equipment conflict prediction improvements

## Near-Term Decisions Needed
1. Tech stack selection for `/web`
2. Payment provider and compliance approach
3. Exact occupancy surcharge curve
4. Dynamic demand window length and threshold tuning
5. Cancellation policy
