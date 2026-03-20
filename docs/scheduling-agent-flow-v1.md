# Pelayo Scheduling Agent Flow v1 (Prototype)

## Goal
First maintainable prototype for the new **agent-led scheduling** flow in the frontend.

This v1 intentionally focuses on scheduling UX. Pricing and payments are deferred in this flow.

## Locked product decisions represented

- Agent-led intake with free text.
- Sign-in required before scheduling options are shown (route is auth-protected).
- Mixed strategy:
  - infer what we can (workout type, duration, day/window),
  - show strong options when possible,
  - ask only when blocked (missing day/time context).
- Missing duration defaults to **60 min**.
- Vague request like “tomorrow evening” produces **3 recommendations**.
- Recommendations appear as:
  1. conversational assistant message,
  2. visual option cards.
- Option cards show:
  - friendly window label,
  - exact start time,
  - duration,
  - one-line note.
- Card tap does **not** lock immediately; it triggers a short confirmation message and moves to equipment question.
- Equipment question happens **after slot selection** and **before lock**.
- Equipment UI:
  - category-first visual choices:
    - Don’t know / no preference
    - Cardio
    - Weights
    - Bodyweight
    - Functional / performance
  - optional exact equipment selection
  - optional open-text note
- Equipment conflict handling:
  - if selected equipment is already reserved, user sees advisory state,
  - user can still keep slot,
  - or choose different equipment/time.
- Explicit confirmation boundary is the slot lock step.
- Success state appears after lock.

## State flow

1. `intake`
2. `recommendations`
3. `equipment`
4. `confirm` (includes advisory branch when conflicts found)
5. `success`

## Inference and recommendation notes

Inference currently uses simple keyword/date parsing in `features/scheduling-agent/logic.js`:

- Workout keyword mapping
- Duration extraction from text (`30m`, `1 hour`, etc.)
- Day inference (`tomorrow`, weekdays, weekend, next week)
- Time-window inference (`morning`, `afternoon`, `evening`, etc.)

Recommendations are ranked from available slots using current occupancy + demand metadata from `getSlotInfo`, and top 3 non-full slots are returned.

## Payment behavior in prototype

The new agent flow still uses booking infrastructure (`buildQuote`/`confirmQuote`) for capacity safety, but confirms with:

- wallet check skipped,
- wallet charge skipped,
- notice says payment is deferred.

This keeps scheduling realistic while deferring payment UX.
