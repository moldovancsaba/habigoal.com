# GDS Gold-Athlete Theme & Component Brief

**Audience:** General Design System (GDS) developer agents (`@sovereignsquad/gds`).
**Requested by:** Habigoal / Athlete IQ product team.
**Date:** 2026-06-30.
**Goal:** Deliver a complete, production-grade **Gold-Athlete** theme **and the missing
components/chart primitives** so the Habigoal/Athlete IQ app can be **100% GDS-driven
with zero app-local hardcoded styles**. This is a collaboration request: we list
exactly what we consume and where the gaps are; please deliver tokens + components
that close every gap.

---

## 0. How we consume GDS today (ground truth)

- Package: `@sovereignsquad/gds@3.9.0` (+ `-eslint-config`, `-compliance`). We import
  from `@sovereignsquad/gds/client`.
- Global theming: `components/theme/ThemeRegistry.tsx` mounts a single
  `GdsProvider` with a **Mantine theme** (`theme/mantine-theme.ts`,
  `primaryColor: "ingress"` — teal) and `defaultColorScheme` light/dark.
- Surface presets (via `lib/product-surface-branding.ts`):
  - Athlete IQ → preset id **`"athlete-gold"`** (`GdsThemePresetId`).
  - Habigoal → teal/ingress.
  - Selector → `"skyline"`.
- The gold look is currently applied **only inside the Athlete IQ shell**, by
  injecting `getGdsVibeThemeCssVariables("athlete-gold", "dark")` as inline CSS
  vars on a wrapper `Box` plus `data-gds-theme-preset`. Everything rendered
  **outside** that wrapper — the app-selector, Habigoal, dashboard, and crucially
  **portalled overlays (Modal, onboarding prompt, tooltips, toasts)** — falls back
  to the default theme and renders **off-brand blue** (see Defect D1 below).
- GDS components we already use: `GdsProvider`, `AppShell`, `SidebarNav`,
  `PageHeader`, `SectionPanel`, `SemanticButton`, `CtaButtonGroup`, `Badge`,
  `Modal`, `ConfirmDialog`, `FormField`, `ChoiceChip`, `Progress`, `StateBlock`,
  `GdsIcons`, `createGdsVocabularyPack`, `resolveGdsVibeTheme`,
  `getGdsVibeThemeCssVariables`.
- **No GDS chart primitives exist** — all charts are app-side Recharts
  (`components/analytics/*`) styled from Mantine CSS vars.

---

## 1. Brand intent & design principles

**Gold-Athlete** = a premium, **dark-first**, professional performance surface for
elite athletes and trainers. Gold is the accent of achievement; the canvas is a
deep, slightly warm near-black; everything else is calm, high-contrast, and
legible under gym/field lighting.

Principles:
1. **Dark-first**, with a real (secondary) light mode at full parity.
2. **Gold is an accent, not a flood** — used for primary actions, focus, key data,
   and brand marks; never as large fills behind text.
3. **Calm-confident** — restrained motion, generous spacing, strong type hierarchy.
4. **Honest data** — chart/status colors map to documented meanings (readiness
   zones, severity) and never rely on color alone.
5. **Accessible by default** — WCAG 2.2 AA, keyboard, reduced-motion, RTL.

---

## 2. Deliverables summary

1. A finalized **`athlete-gold` theme preset** (dark + light) exposed as: design
   tokens (CSS custom properties), a Mantine theme object, and the GDS preset id —
   resolvable through the existing `resolveGdsVibeTheme` / `getGdsVibeThemeCssVariables` API.
2. A **global theming guarantee**: portalled overlays (Modal/ConfirmDialog,
   tooltips, menus, toasts, the onboarding prompt) inherit the active surface
   preset — no default-blue leakage (fixes D1).
3. The **missing/under-specified components** in §5, themed and stateful.
4. A first-class **GDS Chart Kit** (§6) so we can drop raw Recharts + inline styles.
5. **Token coverage** for 100% of the items in our hardcoded-style audit
   (`docs/gds-hardcoded-style-audit.md`, produced in parallel) so no app-local
   styles remain.

---

## 3. Color system

Provide the following as named tokens (semantic names, not raw hex, exposed as CSS
vars + Mantine palette). Candidate hex values below are a **starting point** —
please refine for AA contrast and visual polish, but keep the structure and names.

### 3.1 Dark surfaces (canvas → elevated)
| Token | Purpose | Candidate |
|---|---|---|
| `surface/canvas` | app background | `#0B0B0D` |
| `surface/1` | cards/panels | `#141417` |
| `surface/2` | nested cards, inputs | `#1C1C21` |
| `surface/3` | overlays, popovers, modals | `#26262C` |
| `border/subtle` | hairlines, card borders | `#2E2E35` |
| `border/strong` | dividers, focus targets | `#3A3A42` |

### 3.2 Gold accent scale (primary, 0–9)
`#FBF6E9, #F3E7C4, #E9D49A, #DEBE6E, #D4AC4E, #C8992F, #B07F1E, #8E6516, #6B4B11, #46310B`
- Primary action / brand accent base ≈ index **4–5**; ensure the chosen on-dark
  accent text hits **≥4.5:1** on `surface/1`.
- Define `accent/onAccent` (text on a gold fill) — likely the near-black canvas.

### 3.3 Text
| Token | Candidate | Min contrast |
|---|---|---|
| `text/primary` | `#F4F2EC` | 4.5:1 on surfaces 0–2 |
| `text/secondary` | `#B9B6AD` | 4.5:1 |
| `text/muted` | `#87847C` | 3:1 (non-essential) |
| `text/disabled` | `#5B594F` | — |

### 3.4 Semantic (dark-tuned; also need light variants)
`success #3FB783`, `warning #E0B341`, `danger #E5604D`, `info #5AA9E6`. Each needs
`/bg` (subtle tint), `/fg` (text/icon), `/border` variants for badges/state blocks.

### 3.5 Performance-domain colors (product-specific — please include)
- **Readiness/operating zones:** good `#3FB783`, moderate `#E0B341`, fatigued
  `#E58A3C`, compromised `#E5604D`, none/`no-data` `#6B6B6B`.
- **Severity:** low (neutral gray), medium (amber/gold), high (danger).
- **Load zones:** light, balanced, heavy (reuse success/neutral/warning ramps).

### 3.6 Categorical chart palette
A 6–8 hue palette that is distinct on the dark canvas, harmonizes with gold, and is
**colorblind-aware**: gold `#D4AC4E`, teal `#3FB7A8`, blue `#5AA9E6`, violet
`#9B8CFF`, rose `#E5739B`, lime `#9FCF5A`, orange `#E58A3C`, slate `#8AA0B8`.
Plus chart-structural tokens: `chart/grid`, `chart/axis`, `chart/tooltip-bg`,
`chart/reference-band` (for readiness zone overlays).

### 3.7 Contrast & modes
- WCAG 2.2 AA: text 4.5:1 (large 3:1), UI/graphic 3:1, visible focus ring (3:1).
- Deliver **dark (primary) and light** with identical token names.

---

## 4. Foundation tokens

- **Typography:** family must support our stack (we ship `Noto Sans` incl.
  Arabic/Hebrew for RTL). Provide a type scale (display/h1–h6/body-lg/body/
  body-sm/caption) with sizes, weights (we use 400/600/700/800/900), and
  line-heights. Numeric/tabular figures for data tables and timers.
- **Spacing scale** (xs–xl + beyond) as tokens; no raw px in app code.
- **Radius:** a single global radius token (`md`) plus sm/lg/full. (Our lint
  **bans** `radius="sm"` and hardcoded `borderRadius: 8` — the token must be the
  only path.)
- **Elevation/shadow** tokens tuned for dark (subtle, low-glare).
- **Focus ring** token (gold, 3:1, offset) used by every interactive component.
- **Motion:** duration + easing tokens, and a **reduced-motion** variant
  (`prefers-reduced-motion`) baked into components (timers, progress, hovers).
- **Z-index / layering** tokens so modals > popovers > tooltips > toasts compose
  predictably across surfaces.

---

## 5. Components required (themed, all states, dark+light, a11y, RTL)

For each: variants, sizes, and states **default / hover / active / focus-visible /
disabled / loading**, plus keyboard + screen-reader semantics.

1. **Buttons & `SemanticButton`** — the action vocabulary we rely on (`start`,
   `save`, `edit`, `delete`, `download`, `launch`, `refresh`, `view`, plus
   vocabulary packs). Variants: primary (gold), neutral/default, light, outline,
   subtle, danger. Plus `CtaButtonGroup`.
2. **Badge** — incl. **status/severity** styles and the priority chip style we use
   (e.g. "KÖZEPES"); tinted bg + readable fg per semantic color.
3. **Modal / Dialog / ConfirmDialog** — themed; **portal must inherit the active
   surface preset** (fixes D1: today the modal renders blue). Header/body/footer,
   focus trap, ESC, scrim.
4. **SegmentedControl** — **must handle overflow** (horizontal scroll or wrap) when
   labels exceed width (fixes D2: lite-module tabs clip "Tanulá").
5. **Form controls:** `FormField`, `TextInput`, `Textarea`, `NumberInput`,
   `Select`, `Slider` (1–10 / 1–5 scales), `Checkbox`, `Radio`, `ChoiceChip`,
   switch. Label/help/error/required, char-count, disabled.
6. **Stepper / Wizard** — for our mobile **"Save & Next"** input flow: per-step
   progress, back/next, focus management, validation per step.
7. **Tabs**, **Table / DataTable** (+ responsive card fallback for mobile),
   **Tooltip**, **Progress** (bar + ring), **Skeleton/loading**.
8. **StateBlock** (empty / info / success / error) and a **MissingDataPrompt**
   pattern — an inline "no data yet → add it" affordance (we have many empty
   states: "NINCS ADAT", "6/6 traits · 0 provided").
9. **Toast / Notification**, **Menu/Dropdown**, **Drawer** — all portal-themed.
10. **Shell:** `AppShell`, `SidebarNav`/`SidebarNavItem`, `PageHeader`,
    `SectionPanel` — confirm gold-athlete styling parity.

---

## 6. GDS Chart Kit (the biggest gap)

We currently hand-roll these with Recharts + Mantine vars
(`components/analytics/*`). Please deliver them as **first-class, tokenized,
accessible GDS chart components** so we can delete the app-side versions. Each must:
consume the chart palette + structural tokens; be responsive; support **RTL**;
respect **reduced-motion**; expose **empty/loading** states; and provide an
**accessible text-summary** alternative (charts must not be the only representation).

Required chart types (map to our real usage — see
`docs/analytics-charts-research-2026-06-30.md`):
1. **Line / Longitudinal** — with optional **reference bands** (readiness zones).
2. **Bar / Benchmark** (grouped: current vs baseline).
3. **Radar / Maturity** (pillar profile).
4. **Gauge** (readiness / load ratio with safe-zone bands).
5. **Sparkline** (inline trend).
6. **Symmetry** (left/right).
7. **Calendar heatmap** (habit consistency).
8. **Distribution histogram**, **Diverging bars** (period change), **Slope**,
   **Stacked bar** (habit categories).

Deliver a shared `ChartTheme` (palette, grid, axis, tooltip, fonts) driven by the
active preset so all charts re-skin with the theme automatically.

---

## 7. Global theming guarantees

1. **One source of truth:** setting the surface preset (`athlete-gold`, habigoal,
   selector) must theme **everything in that subtree including portals** (Modal,
   tooltip, menu, toast, onboarding prompt). No component may fall back to a
   default blue primary.
2. Tokens must be readable as CSS custom properties for any bespoke render
   (charts, custom layouts) so we never reach for raw hex.
3. Per-surface switching must not require inline CSS-var injection on wrappers
   (our current workaround) — provide a provider/prop API.

---

## 8. Accessibility & i18n requirements

- WCAG 2.2 AA across both modes; visible focus; keyboard operability; no
  color-only meaning (pair with icon/label).
- **Reduced-motion** honored by timers, progress, hovers, chart animations.
- **RTL** for `ar` and `he` (we ship 6 locales: en, hu, de, es, ar, he).
- Components must accept localized strings (no embedded English).

---

## 9. Migration / compatibility

- Keep the import surface stable (`@sovereignsquad/gds/client` symbols listed in §0);
  add new exports for the chart kit, Stepper, MissingDataPrompt, and any new
  controls.
- Keep preset id **`athlete-gold`**; deliver dark + light.
- Provide a token map so we can mechanically replace every entry in our
  hardcoded-style audit with a GDS token (we will share that file).
- Ship `@sovereignsquad/gds-compliance` rules that **fail** on app-local hex / inline
  color / non-token radius, so regressions can't creep back.

---

## 10. Definition of done

- [ ] `athlete-gold` preset (dark + light) with the full §3–§4 token set, AA-verified.
- [ ] Portalled overlays inherit the active preset (Defect D1 closed).
- [ ] SegmentedControl overflow handled (Defect D2 closed).
- [ ] All §5 components delivered with full states, a11y, RTL, both modes.
- [ ] §6 Chart Kit delivered and theme-driven.
- [ ] Token coverage for 100% of our hardcoded-style audit; compliance lint rules shipped.
- [ ] A short integration guide for swapping our current usage to the new APIs.

---

## Appendix A — Defects this brief must resolve (observed)

- **D1 — Off-theme portals:** the onboarding modal and other overlays render with a
  **blue** primary (Mantine default) instead of gold, because the gold preset is
  only applied inside the AIQ shell wrapper, not to portalled content. Hardcoded
  `color="blue"` exists in `components/onboarding/OnboardingPrompt.tsx` as a
  stop-gap and must become unnecessary.
- **D2 — SegmentedControl overflow:** lite-module tabs clip ("Tanulá…") on mobile.
- **D3 — App-local styling:** ~17 files contain hex and ~21 inline `style`
  color/background literals; charts reference Mantine vars directly. All should be
  replaceable by GDS tokens/components.

## Appendix B — Surfaces & where the theme must apply
App selector (`/`), Habigoal (`/habigoal`, `/athletes/**`), Athlete IQ
(`/athlete-iq`, `/dashboard/**`), the shared onboarding prompt, all modals,
the session runner (`/athletes/[id]/session`), and reports/export surfaces.
