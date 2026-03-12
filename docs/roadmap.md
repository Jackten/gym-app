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
3. Demand-score threshold tuning/validation once real booking data accumulates
4. Initial login method (email/password vs magic link)

## Locked Product Decisions (Mar 2026)
- Dynamic demand window: trailing 4 weeks of bookings.
- Demand multipliers: Normal `1.00x`, Warm `1.05x`, Hot `1.10x`, Peak `1.15x`.
- Occupancy multipliers: 1st `1.00x`, 2nd `1.00x`, 3rd `1.10x`, 4th `1.20x`, 5th `1.35x`.
- Quote hold duration: 15 minutes.
- Cancellation policy: full refund if cancelled >2h before start; <=2h no automatic refund; admin override available.
