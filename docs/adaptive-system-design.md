# Adaptive multi-device system — low-level design & implementation plan

Status: 2026-06-28. Scope: deliver three genuinely native-feeling experiences
(DESKTOP = mouse + physical keyboard, TABLET = finger + virtual keyboard,
MOBILE = finger + virtual keyboard) from one Next.js 15 / React 19 / Mantine 8
codebase serving two products (Habigoal consumer + Athlete IQ professional) behind
one shared component layer; plus four discrete fixes (persistent pseudo session;
remove the selector subtitle; neutral GDS theme for the selector; unify the
selector card/footer radius).

Grounded in a codebase audit (session, theming, tokens) and ~25 cited sources
(W3C/WCAG, MDN, Apple HIG, Material 3, NN/g, Carbon, Fluent 2, Atlassian,
Polaris, Mantine). Sources listed at the end.

---

## 0. Problems → solutions map

| # | Problem | Solution (section) |
|---|---------|--------------------|
| 1 | Pseudo login does not persist until logout | §A Session persistence |
| 2 | Selector still shows the "Choose Habigoal… / Register with email…" subtitle | §B.1 |
| 3 | Selector chrome is "baked-in", not a GDS theme | §B.2 neutral GDS preset |
| 4 | Selector cards radius ≠ footer radius | §B.3 radius unification |
| 5/6 | Desktop / tablet / mobile must each be a first-class experience with the right input model | §C–§G adaptive system |

---

## Core thesis (the mistake we must not make)

There are **two orthogonal adaptation axes**, and conflating them is the root of
most responsive failures:

1. **Viewport width** → drives **layout** (columns, nav placement, table↔cards,
   modal↔sheet).
2. **Input capability** (pointer precision + hover) → drives **affordances**
   (hit-target size, hover-only UI, tooltip↔tap).

**Width tells you nothing about input** — a 1280px screen can be touch-only; a
small screen can have a stylus. So we branch layout by width **and** branch
affordances by `pointer`/`hover` media features — composed, never substituted.

Adversarial finding from the research: **none** of Material 3 / Carbon / Fluent /
Atlassian / Polaris adapt by pointer out of the box — they all switch by width and
treat density as a manual mode with an always-on 44–48px touch-target floor. The
pointer-aware layer is something **we build ourselves**.

---

# PART 1 — LOW-LEVEL SYSTEM DESIGN

## §A. Session persistence (problem 1)

**Current state (audited):** `lib/session.ts` issues a stateless HS256 JWT cookie
`habigoal_session`, `SESSION_DURATION = 7 days` (line 7), persistent
(`expires` set), `httpOnly`/`secure`/`sameSite:lax` correct. `middleware.ts`
verifies and expiry-checks but **never re-issues** → 7 days of inactivity logs the
user out. It does NOT drop on browser close.

**Design:** keep the stateless-JWT model; make it persist until explicit logout via
(a) a long absolute lifetime and (b) sliding refresh on activity.

- Introduce `SESSION_DURATION_DAYS` env (default 30) in `config/env.ts`; remove the
  hardcoded 7-day constant.
- `lib/session.ts`: `SESSION_DURATION = days * 86_400_000`; JWT
  `.setExpirationTime(\`${days}d\`)`. Add `refreshSessionCookie(payload)` that
  re-encrypts with a fresh expiry and re-sets the cookie (reusing the existing
  cookie options).
- **Sliding refresh** in `middleware.ts`: after successful verify, if the token is
  within the **last 50%** of its lifetime, re-issue the cookie (NextResponse
  `cookies.set`) with a new expiry. This makes any active user effectively
  permanent; only true inactivity (> duration) or explicit logout ends it.
- Explicit logout already works (`deleteSession()` clears the cookie). No change.
- Guardrail: refresh only for valid, unexpired tokens; never extend an expired one.

Why not "infinite cookie": a finite sliding window keeps the security properties
(stolen cookie eventually dies) while delivering "logged in until I log out" for
real usage. 30 days sliding = industry-standard "remember me".

## §B. The app selector (problems 2–4)

**Audited facts:** `app/[locale]/page.tsx` renders `Landing.selectorSubtitle`
(lines 46–48); footer `Paper radius="xl"` (16px, line 74) vs `ProductEntryCard`
`radius="md"` (8px); the selector chrome (`PublicAppControls` + `.landing-*` CSS)
is ad-hoc, inheriting the global Mantine theme rather than a GDS vibe — hence the
"baked-in" look. Available GDS presets include neutral ones (`default`,
`flat-surface`, `editorial`, `partner-discovery`, `skyline`, `dark-public`) plus
the product ones (`athlete-gold` = AIQ; Habigoal uses a teal CSS palette).

- **B.1 Remove subtitle:** delete the `Text` rendering `Landing.selectorSubtitle`;
  delete the now-dead key from all 6 locales. Keep only the badge + title + cards +
  legal footer (the selector is a selector + legal, nothing else).
- **B.2 Neutral GDS theme:** wrap the selector shell in a container that applies a
  **neutral** GDS vibe preset via `getGdsVibeThemeCssVariables('skyline','light'|'dark')`
  (recommend `skyline` — neutral blue-grey, distinct from gold and teal), exactly
  as `AthleteIqExperience` applies `athlete-gold`. Set `data-gds-theme-preset` and
  the `--gds-vibe-*` CSS vars on the wrapper; restyle `.landing-*` / the controls
  to consume `--gds-vibe-*` (surface, border, text, accent) so the selector reads
  as its own neutral brand. This separates it from both products and removes the
  "baked-in" feel.
- **B.3 Unify radius:** the footer and cards must share one radius. Set footer
  `radius="md"` (or promote both to a single `--selector-radius` token). Verify the
  inner preview tiles (`.selector-*-preview/tab/metric`) use a consistent nested
  scale (md outer / sm inner).

## §C. Token layer — the adaptive foundation

One scale for spacing/radius/typography (Mantine CSS vars). Add two new concepts:

1. **`--target-size` token — driven by input capability, not width.**
   ```css
   :root { --target-size: 32px; }                          /* dense pointer default */
   @media (any-pointer: coarse) { :root { --target-size: 48px; } }
   ```
   Apply as `min-height`/`min-width` (and icon padding) on every interactive
   component. This satisfies WCAG 2.5.8 (24px floor) everywhere and reaches Apple
   44pt / Material 48dp whenever *any* coarse pointer is present — additive, so
   hybrids get the safe larger target.
2. **Density as an explicit, manual axis** (`data-density="comfortable|compact"` on
   a container → CSS vars) for the professional app's data views only. Hard rule:
   density may **never** drop a target below `--target-size`.
3. **Radius/spacing**: keep `defaultRadius: md`; introduce semantic
   `--surface-radius` so cards/sheets/footers can't drift apart (problem 4 class of
   bug, systemically prevented).

## §D. Two media-query channels — never conflate

- **Width channel** — Mantine `em` breakpoints (`xs`30 / `sm`48 / `md`64 / `lg`74 /
  `xl`90 em) and `--mantine-breakpoint-*`. Drives layout: column counts, nav
  placement, table↔cards, modal↔sheet, AppShell navbar collapse.
- **Capability channel** — `@media (any-pointer: coarse)`, `(any-hover: hover)`,
  and the postcss-preset-mantine `hover` mixin (compiles to
  `@media (hover:hover){:hover}` / `@media (hover:none){:active}`). Drives
  affordances: target size, hover-only reveals, tooltip↔tap.
- **Rule:** use `any-*` (union of all inputs) to decide what to **offer**; use
  primary `pointer`/`hover` only to pick a **default**. Provide a user toggle
  (comfortable/compact) for genuinely ambiguous hybrids. No UA sniffing; no
  width-as-input proxy.

## §E. Façade components (the adaptation contract)

Four shared façades encapsulate every device-specific swap so feature code stays
device-agnostic:

| Façade | Desktop | Touch/Mobile | Driven by |
|--------|---------|--------------|-----------|
| `<Disclosure>` | hover Tooltip | tap Popover/Drawer | **capability** (hover/pointer) |
| `<OverflowMenu>` | `Menu` | bottom `Drawer` | width |
| `<AdaptiveDialog>` | `Modal` | bottom-sheet `Drawer` | width |
| `<DataView>` | `Table` (compact density) | card list | width |

Prefer **CSS-driven swaps** (SSR-safe, no layout shift); reserve `useMediaQuery`
(`getInitialValueInEffect`) for must-branch-in-render logic. Hover/focus content
must be Dismissible/Hoverable/Persistent (WCAG 1.4.13). The card↔table transform
must preserve table semantics via ARIA roles (a `display:block` table stops being
announced as a table).

## §F. Two product shells + the neutral selector shell

Same components, different **defaults + route maps**:

- **Consumer (mobile-first)** — `AppShell` with a bottom tab bar (3–5 destinations
  + "More" overflow), sheets over modals, thumb-zone primary actions; all inputs
  carry `inputmode`/`enterkeyhint` and **≥16px font** (prevents iOS focus-zoom);
  `dvh`/`svh` layouts; VisualViewport offset to keep the focused field above the
  keyboard; `interactive-widget=resizes-content` in the viewport meta (helps
  Android Chrome 108+, harmless elsewhere). (The Habigoal mobile PWA wizard from
  PR #387 is the template.)
- **Professional (desktop-first)** — `AppShell` with persistent left nav +
  **Spotlight** command palette (Cmd/Ctrl+K); data tables with a compact density
  mode; full keyboard model (composite widgets = one tab stop + roving tabindex,
  `:focus-visible` rings meeting WCAG 2.4.13, logical tab order, remappable
  single-key shortcuts per 2.1.4); hover tooltips that degrade to tap via
  `<Disclosure>`.
- **Selector** — its own neutral GDS shell (§B.2), responsive but minimal.

## §G. Keyboard, focus, and virtual-keyboard model

- **Desktop a11y:** WCAG 2.4.3 (focus order), 2.4.7 (focus visible), 2.4.11 (focus
  not obscured), 2.4.13 (focus appearance — ≥2px perimeter, ≥3:1). `:focus-visible`
  for keyboard-only rings; never `outline:none` without replacement. Composite
  widgets via roving tabindex / `aria-activedescendant`. Prefer native elements
  (first rule of ARIA). Command-palette + shortcuts as expert accelerators
  (remappable/scoped).
- **Touch virtual keyboard:** default only resizes the *visual* viewport → use
  `dvh`/`svh`, not `vh`. `interactive-widget=resizes-content` (Android Chrome
  108+/FF 133+; not iOS). **iOS Safari:** no resize, no VirtualKeyboard API → use
  the **VisualViewport API** to detect geometry and `scrollIntoView` the focused
  field; expect the late-`resize` jump quirk. Inputs: correct `type`/`inputmode`/
  `enterkeyhint`, font ≥16px.

---

# PART 2 — IMPLEMENTATION PLAN (phased, file-by-file)

Each phase ships as its own PR per the #81 standard: tests + i18n audit + build +
docs, rebase-merge on green.

## Phase 0 — Quick wins (no architecture; immediate)

- **P0.1 Session persistence** (§A): `config/env.ts` add `sessionDurationDays`;
  `lib/session.ts` use it + add `refreshSessionCookie`; `middleware.ts` sliding
  refresh (re-issue when >50% elapsed). Tests: token re-issued within window, not
  re-issued when fresh, never when expired; logout still clears. Files: `config/env.ts`,
  `lib/session.ts`, `middleware.ts`, `lib/session.test.ts`.
- **P0.2 Selector subtitle + radius** (§B.1, §B.3): edit `app/[locale]/page.tsx`
  (remove subtitle Text; footer `radius="md"`); delete `Landing.selectorSubtitle`
  from 6 locales. Update the boundary test if it references the subtitle. Files:
  `app/[locale]/page.tsx`, `messages/*.json`.

## Phase 1 — Token foundation (§C, §D)

- Add `--target-size` (capability-driven) + `--surface-radius` to `app/globals.css`
  `:root`, and the `@media (any-pointer: coarse)` override.
- Add a `useInputCapability()` hook (CSS-first; JS only where render must branch)
  and document the two-channel rule.
- Apply `min-height: var(--target-size)` to the base interactive components
  (buttons, nav items, toggles, slider thumb) — many already hardcode 44–52px;
  migrate them to the token.
- Tests: a vitest/JSDOM assertion that interactive primitives reference
  `--target-size`; visual spot-check on preview.

## Phase 2 — Neutral selector shell (§B.2)

- Wrap the selector in a GDS `skyline` (neutral) vibe container
  (`getGdsVibeThemeCssVariables`), set `data-gds-theme-preset`; restyle `.landing-*`
  + `PublicAppControls` to consume `--gds-vibe-*`. Make it responsive (single
  column < sm, two cards ≥ sm; comfortable targets via `--target-size`).
- Tests: boundary test asserts the selector uses a neutral preset (not
  `athlete-gold`, not the Habigoal teal) and that card+footer share one radius.

### Reference implementation (#403, shipped)

The selector is the canonical example of the two-axis model — copy its shape
when adapting any surface:

- **Width channel → layout.** `SimpleGrid cols={{ base: 1, sm: 2 }}` is the only
  thing that decides the column count: one thumb-friendly column below `sm`, a
  comfortable two-up at/above `sm` (tablet portrait and up). No capability query
  ever touches the column count.
- **Capability channel → affordances.** The hover lift lives in
  `@media (hover: hover) and (pointer: fine)` so only a genuinely hovering fine
  pointer gets it; touch devices never inherit a stuck hover state. Width is
  never used as an input proxy here.
- **Tokens → sizing.** `.selector-card` corner radius comes from
  `--surface-radius`; the primary action row (`.selector-card-action`) is floored
  at `var(--target-size)` so it grows from 24/32px (precise) to 44–48px (coarse).
- **Accessibility.** Each card is a single real `<a>` (`.selector-card-link`)
  with an `aria-label`, a `:focus-visible` ring drawn in `currentColor` (high
  contrast on both the light home card and the dark pro card), and a
  `prefers-reduced-motion: reduce` guard that removes the lift entirely.

Guarded by `tests/selector-responsive.test.ts`.

## Phase 3 — Façade components (§E)

- Build `<AdaptiveDialog>`, `<OverflowMenu>`, `<Disclosure>`, `<DataView>` in
  `components/adaptive/`, each with the width/capability resolution above and unit
  tests for the swap logic. No feature migration yet — land the contracts + Storybook-
  style preview routes.

## Phase 4 — Professional desktop shell (§F, §G)

- AIQ shell: persistent left nav + `Spotlight` (Cmd/Ctrl+K); migrate AIQ tables to
  `<DataView>` with a compact density toggle (`data-density`); keyboard model
  (roving tabindex on the nav + panels, `:focus-visible` audit, shortcut registry).
- Replace AIQ hover tooltips with `<Disclosure>`; AIQ modals with `<AdaptiveDialog>`.
- Tests: keyboard-traversal tests; density never < `--target-size`.

## Phase 5 — Consumer mobile/tablet shell (§F, §G)

- Consolidate the Habigoal + AIQ-athlete shells on the bottom-tab AppShell pattern;
  inputs get `inputmode`/`enterkeyhint`/≥16px; add VisualViewport keep-focused-field
  logic; `interactive-widget=resizes-content` already set (verify). Tablet: rail +
  split-view where canvas allows.
- Tests: inputs declare inputmode/enterkeyhint; no `vh` in mobile shells (use dvh).

## Sequencing & risk

P0 first (highest value, lowest risk — directly fixes the four reported defects).
P1 is the lever everything else pulls; land it before P3–P5. P3 contracts must be
merged before migrating features onto them. P4/P5 are independent and can run in
parallel once P1+P3 exist. Cross-cutting guardrails (no UA sniffing, hit-region ≥
glyph, WCAG 1.4.13 for hover content, no `outline:none`, table semantics on card
transform, live re-evaluation of media queries) are PR-review checklist items.

## Acceptance criteria (per the brief)

- Pseudo login survives restarts/inactivity until explicit logout.
- Selector = title + two cards + legal only, on a neutral GDS theme, with one
  consistent radius.
- Desktop: mouse + full keyboard (shortcuts, focus rings, tab order, command
  palette), denser layout, hover affordances.
- Tablet: touch-first with rail/split views, comfortable targets, virtual-keyboard
  safe.
- Mobile: bottom-tab app, thumb-zone actions, sheets, ≥16px inputs, keyboard-safe.

---

## Sources (condensed)

Input capability: MDN `@media/pointer|hover|any-pointer|any-hover`, Pointer Events;
Smashing "Guide to hover/pointer"; CSS-Tricks "touch devices not judged by size",
"can't detect touchscreen", "sticky hover", "interaction media features". Targets/
density: Apple HIG accessibility & pointing-devices; Material 3 structure/density/
window-size-classes; WCAG 2.5.8/2.5.5; NN/g Fitts/touch-target-size; web.dev
accessible-tap-targets. Layout/nav: NN/g bottom-sheet/vertical-nav/hamburger/
mobile-navigation/accelerators; Apple tab-bars/split-views/sheets/action-sheets;
Material 3 navigation-rail/navigation-bar; Smashing thumb-zone; UXmatters how-users-
hold. Keyboard/VKB: WCAG 2.4.3/2.4.7/2.4.11/2.4.13/2.1.4/1.4.13; W3C ARIA APG
keyboard; MDN `:focus-visible`/VirtualKeyboard_API/VisualViewport/inputmode/
enterkeyhint; Chrome viewport-resize-behavior; CSS-Tricks iOS 16px zoom. Design-
system density: Material 3, Carbon spacing, Fluent 2 tokens, Atlassian spacing,
Polaris tokens. Mantine 8: responsive/style-props/css-variables/css-modules/
postcss-preset/app-shell/drawer/spotlight/use-media-query. (Full URL list in the
research record; several primary pages were egress-blocked and cross-verified via
upstream MDN/W3C/Mantine repos — spot-check exact dp/pt/px before quoting.)
