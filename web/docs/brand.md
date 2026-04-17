# Pelayo Wellness — Brand Foundation

Version 0.1 · Living document · Owner: Jack · Last updated 2026-04-16

This is the source of truth for Pelayo's visual identity. Every design decision in the app should be able to point to a rule on this page. When the code and this doc disagree, fix the code.

---

## Positioning

Pelayo is a **private training studio**, not a gym. Sessions are booked, intentional, one-on-one or small-group. The brand should read like a well-kept member's club: confident, quiet, exacting.

Reference points: Equinox (confidence, dark palette, editorial restraint), Barry's (intensity, type-led hero moments), Forma (minimalism, material richness), Aman (stillness, earth tones, luxury through absence).

Anti-references: big-box gyms, fluorescent brightness, "wellness journey" tone, stock business-casual smiles, rainbow gradients, pastels.

---

## Palette

Dark-native. No light mode.

| Role | Name | Hex | Use |
|---|---|---|---|
| Base | Onyx | `#0B0B0D` | Page background |
| Surface | Espresso | `#1A1715` | Cards, elevated surfaces |
| Surface raised | Clay | `#24201C` | Dialog, menu, popover |
| Border subtle | Ash | `#2A2724` | Hairlines, dividers |
| Text primary | Ivory | `#F4EDE4` | Body, headlines |
| Text secondary | Oat | `#C8BFB2` | Captions, labels |
| Text muted | Stone | `#8A8278` | Metadata, timestamps |
| Accent | Brass | `#B08D57` | CTAs, focus, selected state |
| Accent strong | Brass Gilt | `#D4AE74` | Hover / pressed brass |
| Accent warm | Terracotta | `#9A6B52` | Secondary accent (rare) |
| Accent cool | Moss | `#4A5842` | Tertiary accent (rare) |
| Danger | Rust | `#B4513A` | Destructive, errors |
| Success | Olive | `#7A8560` | Confirmation |

Rules:
- Brass is the ONLY accent that fires at normal saturation. Terracotta, moss, rust, olive appear at low saturation as supporting tones — never competing with brass.
- Never use pure black (`#000`) or pure white (`#FFF`). Onyx and Ivory have warmth; preserve it.
- Text on Onyx must be Ivory, Oat, or Stone. No mid-grey.
- Brass on Onyx passes WCAG AA for large text; use Ivory for long body copy, brass only for accents and large display type.

---

## Typography

Two-family system. Display serif for headline moments; clean sans for everything else. Uppercase tracked sans for eyebrows and labels.

**Display serif — headlines, eyebrows, feature copy**
- Preferred (paid): Canela Deck (Commercial Type), Migra (Pangram Pangram)
- Free fallback: Playfair Display (Google Fonts) — already loaded
- Weights: Light 300 and Regular 400 only. Never Bold.
- Use cases: h1, h2, landing hero, section headers.

**Body sans — everything else**
- Preferred (paid): Söhne (Klim), GT America (GrilliType)
- Free fallback: Inter (Google Fonts) — already loaded
- Weights: Regular 400, Medium 500, Semibold 600.
- Use cases: body copy, UI labels, buttons.

**Scale (base 16px, 1.25 ratio)**

| Token | Size | Line | Use |
|---|---|---|---|
| display | 56px / 3.5rem | 1.05 | Landing hero only |
| h1 | 40px / 2.5rem | 1.15 | Page headers |
| h2 | 32px / 2rem | 1.2 | Section heads |
| h3 | 24px / 1.5rem | 1.3 | Subsection heads |
| body-lg | 18px / 1.125rem | 1.55 | Essay, hero subhead |
| body | 16px / 1rem | 1.55 | Default body |
| body-sm | 14px / 0.875rem | 1.5 | Captions, meta |
| eyebrow | 12px / 0.75rem | 1.4 | Uppercase, 0.12em tracking |

**Rules:**
- Display serif is reserved for moments. If every section is h1-serif, none of it lands.
- Eyebrow: uppercase, tracked 0.12em, Brass color, small. The visual "section marker."
- No italics. No underlines (except links, and those are restrained).
- Letter-spacing: -0.01em on display sizes (serif tightens at scale); 0 on body.

---

## Spacing & rhythm

8-point grid. Every gap, padding, margin is a multiple of 4.

| Token | px | Use |
|---|---|---|
| space-1 | 4 | Tight inline |
| space-2 | 8 | Default inline gap |
| space-3 | 12 | Small stack |
| space-4 | 16 | Default stack gap |
| space-6 | 24 | Card internal padding |
| space-8 | 32 | Section internal spacing |
| space-12 | 48 | Between subsections |
| space-16 | 64 | Between sections (mobile) |
| space-24 | 96 | Between sections (desktop) |

Page horizontal padding: 24px mobile, 48px tablet, 80px desktop. Max content width: 1280px with optional 720px reading column for long-form.

---

## Radius & elevation

Restrained. Luxury reads through sharpness, not softness.

- `radius-sm`: 2px (inputs, chips)
- `radius-md`: 4px (buttons, small cards)
- `radius-lg`: 8px (cards, panels)
- `radius-pill`: 999px (pills, avatars)

Drop shadow is allowed but never to imply playfulness. Use for genuine elevation only:
- `shadow-1`: `0 1px 2px rgba(0,0,0,0.4)` — button rest
- `shadow-2`: `0 4px 16px rgba(0,0,0,0.4)` — card
- `shadow-3`: `0 16px 48px rgba(0,0,0,0.5)` — dialog

Prefer 1px brass top-border on hero / feature cards over drop shadow for the "lifted" feeling.

---

## Iconography

Lucide icons (react-lucide). Stroke weight 1.5 by default, 2 for emphasis. Brass on selected state, Oat on default, Stone on disabled. Never emoji in UI chrome. Emoji is acceptable in user-generated content only.

---

## Motion

Subtle. Luxury motion is slow and certain.

- Transitions: 200–400ms default, `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart).
- Page transitions: 240ms fade + 12px upward slide (via Framer Motion `AnimatePresence`).
- Hover states: 180ms color / border only. No bounce, no scale.
- Button press: scale 0.98, 100ms.
- List reveals: staggered 40ms per item, 280ms per reveal.
- Landing hero: slow zoom (scale 1.0 → 1.05 over 20s), no parallax tricks.
- Reduce motion: respect `prefers-reduced-motion`; kill all non-essential motion.

---

## Photography

The single biggest brand lever. Without editorial photography the app reads as a tool; with it, the app reads as a studio.

**Subject matter:**
- Solo athletes mid-movement (not posed, not smiling at camera)
- Equipment details (a barbell, a rowing handle, a rope — close crops, material texture)
- Interior studio spaces (warm woods, dark floors, directional light)
- Hands / feet / detail crops

**Grade:**
- Warm neutral, desaturated. Push highlights warm (amber), shadows cool (blue-green), chroma reduced 15–25%.
- High contrast, deep shadows preserved. No lifted-blacks HDR look.
- Film grain acceptable at low intensity.

**Composition:**
- Single subject. Negative space.
- Off-center subjects acceptable; dead-center reserved for portrait-style hero.
- Avoid: group shots, fluorescent-lit rooms, chrome mirror gyms, overhead fluorescents, wide cheerful smiles.

**Sourcing (v1 placeholders):**
Curate 12–15 images from Unsplash / Pexels matching the above. Save to `web/public/img/editorial/` with descriptive names (`hero-rope-pull.webp`, `detail-barbell-grip.webp`, etc.). License: Unsplash / Pexels free-for-commercial with attribution in `ATTRIBUTION.md`.

**V2 (out of scope this pass):** commission a half-day shoot at Pelayo Studio with a single photographer and one lighting setup. Budget for 30 finals.

---

## Voice

Short. Declarative. Present-tense. First-person plural when the studio speaks ("We train"), second-person singular when addressing the member ("Your session is Thursday at 7").

**Good examples:**
- "Private training. By appointment."
- "Train. Recover. Return."
- "Session confirmed. Thursday, 7:00 AM."
- "You have no upcoming sessions."
- "Cancel anytime up to 12 hours before."

**Anti-examples:**
- "Welcome to your wellness journey!"
- "Get ready to crush your goals! 💪"
- "Oops, something went wrong!"
- "We couldn't find any bookings 😢"

Rules:
- No exclamation points outside genuine urgency.
- No emoji in product copy.
- No "please" in system messages — direct but not rude.
- Errors state what happened, not what the user did wrong.
- Confirmation messages name the concrete outcome, not the abstract state.

---

## Component conventions

- **Buttons:** primary is brass on onyx, ivory text; secondary is outline brass, brass text; tertiary is ivory text only with underline on hover; danger is rust on onyx, ivory text. Never more than one primary per screen.
- **Cards:** espresso background, 1px ash border, 8px radius, 24px internal padding. Selected or feature cards add 1px brass top border.
- **Inputs:** 2px radius, 1px ash border, ivory text, oat placeholder, brass border on focus. 16px text (never smaller — prevents iOS zoom).
- **Tabs:** underline pattern, brass active underline, eyebrow-styled labels.
- **Dialogs:** clay surface, 8px radius, shadow-3, 32px padding, close button top-right as icon only.

---

## What this doc does NOT cover (yet)

- Sound design.
- Print / merch.
- Email templates.
- Social media guidelines.
- Real photography shoot direction.

Add sections as needed — keep this doc the single source.
