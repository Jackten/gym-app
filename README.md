# Gym App

Standalone product repository for Jack’s gym booking + prepaid credits web app.

## Purpose
Build a web app where members can:
- book gym sessions,
- purchase and spend prepaid credits (1 credit = $1 equivalent),
- see transparent pricing that adjusts with demand and occupancy.

This repo is intentionally separate from OpenClaw and other work.

## Core Product Requirements (v0)
- Session booking with capacity limit: **max 5 people at the same time**.
- Credits wallet and top-ups with bulk discount support.
- Base prices:
  - 30 min = **$30 / 30 credits**
  - 60 min = **$50 / 50 credits**
  - each additional hour = **+$25 / +25 credits**
- Prime-time behavior must be **dynamic from booking history** (not manually hard-coded time ranges).
- Occupancy pricing should increase once demand builds:
  - after **2 people** are booked in the same block, each additional booking increases price incrementally.
- During booking, users indicate planned:
  - workout type,
  - equipment they expect to use,
  so conflicts can be reduced.

## Documents
- `docs/product-spec.md` — product requirements and domain model
- `docs/pricing-engine.md` — pricing logic, formulas, and examples
- `docs/booking-rules.md` — booking constraints and conflict handling
- `docs/roadmap.md` — phased implementation plan + future features
- `docs/workshop/technical-pass.md` — technical architecture pass (data model, pricing rules, booking concurrency model)

## Minimal Scaffold
- `web/README.md` contains a stack-agnostic placeholder for app implementation.

## Setup
```bash
cd /root/clawd/projects/gym-app
# choose your stack and initialize under /web when ready
```

## Repository Status
- Local git repo: initialized
- GitHub remote: https://github.com/Jackten/gym-app
- Default branch pushed: `main`
