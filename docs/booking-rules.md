# Booking Rules — Draft v0

## 1) Time Model
- Bookings are created in 30-minute granularity.
- Supported durations:
  - 30 min
  - 60 min
  - 120 min+
- Longer sessions may span multiple contiguous blocks.

## 2) Capacity Rules
- Global concurrent capacity = **5 users**.
- For any proposed booking, check overlap across all blocks it spans.
- If any block would exceed 5 after insertion -> reject booking.

## 3) Occupancy Pricing Trigger
- Occupancy in each relevant block is evaluated at quote/confirm time.
- No occupancy surcharge for first 2 users.
- Occupancy multiplier curve:
  - occupancy 1 -> `1.00x`
  - occupancy 2 -> `1.00x`
  - occupancy 3 -> `1.10x`
  - occupancy 4 -> `1.20x`
  - occupancy 5 -> `1.35x`
- If booking spans multiple blocks, use the highest applicable occupancy tier or block-weighted method (implementation decision; highest-tier is simplest for v0).

## 4) Availability and Locking
- Availability shown in UI is advisory until confirmation.
- Use transactional re-check on confirm to prevent race-condition overbooking.
- Quote hold duration is 15 minutes to preserve displayed price before payment.

## 5) Booking Intent & Conflict Reduction
Collect at booking time:
- workout type (strength/cardio/conditioning/mobility/other)
- equipment planned (multi-select)

### Conflict handling
- Hard conflict rules are optional for v0.
- Required v0 behavior: show warnings when equipment demand is likely to overlap heavily.
- Future enhancement: smart scheduling suggestions for alternative nearby slots.

## 6) Lifecycle States (suggested)
- `draft` -> `quoted` -> `confirmed` -> `completed`
- cancellation branch: `cancelled`
- no-show branch (optional): `no_show`

## 7) Cancellation / Refund Policy (locked)
- Full refund if cancelled more than 2 hours before start.
- Within 2 hours of start: no automatic refund.
- Admin override is available for exceptions.

## 8) Data to Persist Per Booking
- User ID
- Start/end timestamps
- Duration
- Occupancy at quote time
- Demand score/multiplier used
- Occupancy multiplier used
- Final charged credits
- Intent metadata (workout/equipment)
- Status transition timestamps
