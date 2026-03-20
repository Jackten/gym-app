# Scheduling Prototype Implementation (Agent-led v1)

## What changed

### Main UI replacement
- Replaced `web/src/pages/SessionPage.jsx` with the new agent-led prototype flow.
- Preserved auth gating via existing protected route.

### New feature module
Added `web/src/features/scheduling-agent/`:

1. `config.js`
   - Agent defaults
   - Slot window definitions
   - Equipment category config (category-first UX)
   - Category→equipment mappings
   - Workout keyword mappings
2. `logic.js`
   - Intake parsing/inference (`planFromIntake`)
   - Recommendation generation (`buildRecommendations`)

### Booking backend behavior update (frontend state layer)
Updated `confirmQuote` in `web/src/contexts/AppContext.jsx`:

- Added optional flags:
  - `skipWalletCheck`
  - `skipWalletCharge`
  - `source`
  - `bookingNote`
- Existing flows remain compatible (defaults preserve prior behavior).
- Agent flow now uses deferred-payment mode while still validating slot/capacity.

### Styling
Extended `web/src/styles.css` with agent flow classes:

- conversational bubbles
- intake form layout
- recommendation cards
- equipment advisory card
- mobile-safe spacing for compact action rows

### Home copy update
`web/src/pages/HubPage.jsx` now references the agent booking experience.

---

## Component/logic map

### `SessionPage` state model
Key UI states:
- `stage` (`intake | recommendations | equipment | confirm | success`)
- `requestText`
- `agentMessages`
- `plan`
- `options`
- `selectedOption`
- `equipmentCategory`
- `selectedExactEquipment`
- `equipmentFreeText`
- `advisoryConflicts`

### Core flow handlers
- `handlePlanRequest()`
  - parses request,
  - blocks only when day/time is missing,
  - generates 3 recommendations,
  - updates assistant messages.
- `handleSelectOption()`
  - records chosen card,
  - adds short confirmation message,
  - proceeds to equipment step.
- `handleEquipmentContinue()`
  - resolves equipment selection,
  - checks busy equipment overlap,
  - transitions to confirm/advisory.
- `handleLockSlot()`
  - creates quote,
  - confirms booking with deferred payment,
  - moves to success.

### Data replacement boundary
When backend APIs are ready, likely replacements:

- `planFromIntake` → server-side NLP/parser endpoint.
- `buildRecommendations` → recommendation service.
- `getBusyEquipment` + quote/confirm flow → backend availability + booking lock API.

Current config files are intentionally explicit to keep this swap easy.

---

## Known gaps (intentional for v1)

1. NLP parser is keyword-based (not model-backed yet).
2. Date understanding does not parse arbitrary natural language dates.
3. Recommendation scoring is lightweight heuristic.
4. Payment is deferred in the agent flow (by product decision).
5. No analytics/instrumentation events yet for funnel tracking.

---

## Suggested next implementation steps

1. Add backend endpoint for parser + recommendation generation (same request/response shape as current logic helpers).
2. Store structured equipment intent separately from booking equipment IDs.
3. Add retries/fallback for slot race conditions (automatic re-suggest on conflict).
4. Add event instrumentation per step (`intake_submitted`, `option_selected`, `locked`, advisory outcomes).
5. Add component tests for inference and flow transitions.
