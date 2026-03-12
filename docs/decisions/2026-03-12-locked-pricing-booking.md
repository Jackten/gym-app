# Locked Decisions — Pricing + Booking (2026-03-12)

These decisions are finalized for v0 and are now the default product rules.

## Dynamic Demand (Prime Time)
- Use trailing 4 weeks of booking history.
- Demand multipliers:
  - Normal = `1.00x`
  - Warm = `1.05x`
  - Hot = `1.10x`
  - Peak = `1.15x`

## Live Occupancy Pricing
- Max occupancy remains 5.
- Occupancy multipliers:
  - 1st person = `1.00x`
  - 2nd person = `1.00x`
  - 3rd person = `1.10x`
  - 4th person = `1.20x`
  - 5th person = `1.35x`

## Quote / Cancellation
- Quote hold duration = 15 minutes.
- Cancellation policy:
  - full refund if cancelled more than 2 hours before session start
  - within 2 hours: no automatic refund
  - admin override available
