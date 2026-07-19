# Design System

## Direction

Holocard should feel like a small foil keepsake being opened in bright afternoon light: personal, physical, and immediately shareable. The marketing surface uses a committed color strategy; the creator becomes quieter so the photo and preview stay dominant.

Anchor references:
- Simon Goellner’s poke-holo interaction for light-following material behavior, reimplemented without Pokémon trade dress.
- The decocms diagnostics cover for a gradient-only, asset-light holo stack.
- Contemporary gift packaging and lenticular postcards for framing, reveals, and tactile copy.

## Color

Use OKLCH tokens.

```css
:root {
  --color-bg: oklch(1 0 0);
  --color-surface: oklch(0.965 0.012 353);
  --color-ink: oklch(0.19 0.025 345);
  --color-muted: oklch(0.47 0.035 345);
  --color-primary: oklch(0.64 0.22 353);
  --color-primary-dark: oklch(0.49 0.19 353);
  --color-accent: oklch(0.79 0.13 196);
  --color-line: oklch(0.88 0.018 345);
}
```

Primary magenta carries calls to action and one large hero field. Cyan is a distinct reflected-light accent, not a second CTA color. Use white or near-white text on saturated primary fills.

## Typography

- Display: Bricolage Grotesque Variable, with a system sans fallback.
- Interface and body: Atkinson Hyperlegible Next Variable, with a system sans fallback.
- Card messages may use the display family, but controls and metadata always use the interface family.
- Keep body lines between 55–72 characters. Balance display headings and use pretty wrapping for prose.

## Shape and Material

- Card aspect ratio: 5 / 7.
- Card corner radius: 5% of card width.
- Controls: 12–16px radius, never pill-shaped except compact status labels.
- Borders are quiet full outlines. No colored side stripes.
- Holographic layers use gradients, masks, blend modes, and pointer-position variables. The effect must not depend on external texture assets.
- Avoid decorative glass panels. The card itself is the material object; surrounding UI stays crisp.

## Layout

The landing hero pairs decisive Portuguese copy with one oversized interactive sample card. The creator is a single guided flow: photo, message, preview, publish. On mobile the preview appears before secondary explanation and remains large enough to tilt comfortably.

The public card route is single-purpose: one centered card, the recipient message, and a small share action. No navigation or product upsell competes with the gift.

## Motion

- Pointer tilt uses requestAnimationFrame with exponential easing and no overshoot.
- Glare follows the pointer directly while rotation eases behind it.
- Touch devices receive a slow idle foil drift; no device-orientation permission in Phase 1.
- `prefers-reduced-motion: reduce` removes tilt, entrance motion, and idle drift while retaining the static foil palette.
- Interface transitions stay between 150–250ms.

## States

Every control needs default, hover, focus-visible, active, disabled, loading, and error states. The creator needs explicit empty, image-processing, generating, published, revision-limit, rate-limit, and deleted states.

## Accessibility

- Body text contrast is at least 4.5:1; primary reading text targets 7:1.
- The card remains legible with all blend modes or motion disabled.
- Decorative foil layers are `aria-hidden`.
- Upload supports keyboard file selection and clear format/size help.
- Share and delete actions return visible status messages through an `aria-live` region.
