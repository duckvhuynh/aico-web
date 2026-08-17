# Design System: AI Company OS

Reading this as: B2B invite-only SaaS in one Next.js app for technical founders, with a calm editorial software language on `/`, leaning toward Tailwind + Geist; plus an accessibility-critical company setup form at `/company`.

**Landing dials:** VARIANCE 6 · MOTION 4 · DENSITY 3  
**Webapp dials:** VARIANCE 4 · MOTION 2 · DENSITY 5

## 1. Visual Theme & Atmosphere

A north-light studio, not a neon launch site. The landing should feel like a quiet architecture practice that happens to ship software: cool paper, one oxidized-pine accent, generous asymmetric whitespace, and a single photograph used as punctuation. The founder webapp is denser and calmer still. It is a governed form, not a marketing page. Motion is CSS-only, short, and disabled when `prefers-reduced-motion: reduce`.

## 2. Color Palette & Roles

- **Cool Paper** (`#F3F4F2`) — Page canvas
- **Quiet Surface** (`#FAFBFA`) — Form panels and raised regions
- **Charcoal Ink** (`#1C1D1B`) — Primary text (never `#000000`)
- **Muted Sage** (`#5F675F`) — Secondary text, helpers, metadata
- **Whisper Line** (`rgba(28, 29, 27, 0.12)`) — 1px structural borders
- **Oxidized Pine** (`#245C4A`) — Single accent for CTAs, focus rings, committed success
- **Alert Clay** (`#8A3A2A`) — Errors only; not a second brand accent

Saturation of the pine accent stays under 80%. No purple, no neon, no dark-mode inversion in this slice.

## 3. Typography Rules

- **Display:** Geist Sans, tracking tight, weight-driven hierarchy, `clamp()` scale
- **Body:** Geist Sans, relaxed leading, `max-w-[65ch]`
- **Mono:** Geist Mono for tokens, versions, limits, and field metadata
- **Banned:** Inter, generic serifs, mixed-family emphasis, `LABEL // YEAR`

## 4. Component Stylings

- **Buttons:** Flat pine fill for the one primary action. 44px minimum target. Translate 1px on active. No outer glow. Ghost ink outline only if a true secondary action is required (sign out).
- **Cards:** Avoid on the landing. Use grid, rules, and whitespace. The webapp panel uses a 1px whisper line, not a floating card stack.
- **Inputs:** Label above, helper beside the label or under the control, error below. No floating labels. Focus ring 2px pine.
- **Loaders:** Skeletal block matching the form width. No circular spinner.
- **Success:** Pine-tinted status region with `role="status"`.

## 5. Layout Principles

- Landing hero is a 12-column split (copy 7 / photograph 5), never a centered stack.
- Collapse to one column below 768px. No horizontal scroll.
- Full-height regions use `min-h-[100dvh]`, never `h-screen`.
- Max width 1400px. Grid over flex percentage math.
- Webapp form is a single readable column (`max-w-xl`) inside a wider shell.

## 6. Motion & Interaction

- Landing: 200–320ms opacity/transform on the photograph and CTA. No infinite loops.
- Webapp: focus and disabled states only.
- Animate `transform` and `opacity` only.
- Honor `prefers-reduced-motion`.

## 7. Anti-Patterns (Banned)

No emojis, Inter, em dashes, pure black, neon glows, three equal feature cards, fake metrics, “Elevate / Seamless / Unleash / Next-Gen”, “Scroll to explore”, public Sign up, Lucide icons, or overlapping text on the photograph.
