# Gym Booking + Credits Prototype (Local)

Runnable local prototype for:
- demo sign-in
- credit wallet + top-up packages
- booking with workout type + equipment plan
- transparent pricing breakdown (base + demand + occupancy + final)
- occupancy cap (5)
- 15-minute quote hold
- cancellation policy + admin override
- seeded data for immediate demand/capacity testing

## Stack
- React 18
- Vite 5
- LocalStorage persistence for app data
- Real email OTP via external backend (`VITE_AUTH_API_BASE_URL`)

## Run locally
```bash
cd /root/clawd/projects/gym-app/web
cp .env.example .env.local
# set VITE_AUTH_API_BASE_URL to the deployed OTP API URL
npm install
npm run dev
```

Then open the URL shown by Vite (normally http://localhost:5173).

## Build check
```bash
npm run build
```

## Demo data highlights
- Demo users: Jack (Demo), Maya, Leo, Sam, Nina
- Wallet top-up packages:
  - Starter: +100 credits for $100
  - Builder: +250 credits for $235
  - Athlete: +500 credits for $450
- Seeded historical demand (trailing 4 weeks for same recurring slot):
  - ~16:00 pattern -> Warm (1.05)
  - ~17:00 pattern -> Hot (1.10)
  - ~18:00 pattern -> Peak (1.15)
- Seeded upcoming occupancy:
  - tomorrow around 18:00 has existing bookings
  - tomorrow around 19:00 is heavily occupied
- Seeded Jack bookings include both cancellation paths:
  - one near-term booking (within 2h behavior)
  - one farther booking (>2h behavior)

## Pricing/Rules in prototype
- Base prices:
  - 30m = 30 credits
  - 60m = 50 credits
  - each additional hour = +25 credits
- Demand tiers (from trailing 4-week count):
  - Normal 1.00 / Warm 1.05 / Hot 1.10 / Peak 1.15
- Occupancy multipliers:
  - #1 1.00 / #2 1.00 / #3 1.10 / #4 1.20 / #5 1.35
- Final credits:
  - `round(base * demandMultiplier * occupancyMultiplier)`
- Max occupancy: 5
- Quote hold: 15 minutes
- Cancellation:
  - >2h before start => full refund
  - <=2h => no automatic refund
  - admin override refund available

## Notes
- App/session data is stored in browser LocalStorage (`gym-booking-prototype-v2`).
- Email OTP is verified against the backend configured by `VITE_AUTH_API_BASE_URL`.
- Use **Reset seeded data** in the app to restore clean demo state.
