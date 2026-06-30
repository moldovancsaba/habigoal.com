# GDS issue hand-off — Gold-Athlete theme for Habigoal / Athlete IQ

This file is a **ready-to-create issue** for the General Design System project board
(`sovereignsquad/general-design-system`). Copy the title + body below, and attach
the design files / assets listed. (Claude Code could not create it directly — this
session's GitHub access is scoped to `moldovancsaba/habigoal.com` only; once
`sovereignsquad/general-design-system` is added to the session's allowed
repositories, the issue + project-board placement can be created automatically.)

---

## Issue title

`Gold-Athlete theme + missing components & chart kit for Habigoal / Athlete IQ`

## Suggested labels / project

- Repo: `sovereignsquad/general-design-system`
- Add to: the GDS project board (Theme / Components track)
- Suggested labels: `theme`, `components`, `charts`, `accessibility`, `consumer:habigoal`

---

## Issue body

### Context
Habigoal / Athlete IQ consumes `@doneisbetter/gds@^3.6.0` and needs a complete,
production **Gold-Athlete** theme plus the missing components/chart primitives so the
app can be **100% GDS-driven with zero app-local hardcoded styles**. We have written
a detailed technical brief (attached) and are providing our current design files and
tokens so you can deliver against real usage.

### What we need (summary — full detail in the attached brief)
1. Finalize the **`athlete-gold`** preset (dark + light) as tokens (CSS vars + Mantine
   theme), AA-verified.
2. **Global theming guarantee:** portalled overlays (Modal, ConfirmDialog, tooltips,
   menus, toasts, our onboarding prompt) must inherit the active surface preset.
   Today the gold preset is applied only inside the Athlete IQ shell, so overlays
   render off-brand **blue** (default primary).
3. Missing/under-specified **components** (all states, a11y, RTL, dark+light):
   SemanticButton vocabulary, Badge (severity/status), Modal/ConfirmDialog,
   **SegmentedControl with overflow handling**, form controls (incl. Slider 1–10/1–5),
   **Stepper/Wizard** (for a mobile "Save & Next" flow), Table/DataTable, Tooltip,
   Progress, **StateBlock + a MissingDataPrompt pattern**, Toast.
4. A first-class, tokenized, accessible **Chart Kit** to replace our hand-rolled
   Recharts: line/longitudinal (+ reference bands), bar/benchmark, radar/maturity,
   gauge, sparkline, symmetry, calendar heatmap, distribution histogram, diverging
   bars, slope, stacked bar.
5. **Token coverage** for 100% of our hardcoded-style audit (we will share that file),
   plus `@doneisbetter/gds-compliance` rules that fail on app-local hex / inline color
   / non-token radius.

### Observed defects to resolve
- **D1 — off-theme portals:** onboarding modal + overlays render blue, not gold.
- **D2 — SegmentedControl overflow:** lite-module tabs clip on mobile ("Tanulá…").
- **D3 — app-local styling:** ~17 files with hex, ~21 inline `style` color/background
  literals, charts referencing Mantine vars directly.

### Our current theming (ground truth for you)
- Global provider: `components/theme/ThemeRegistry.tsx` → one `GdsProvider` with a
  Mantine theme (`theme/mantine-theme.ts`, `primaryColor: "ingress"`,
  `defaultRadius: "md"`), `defaultColorScheme` light/dark.
- Surface presets (`lib/product-surface-branding.ts`): Athlete IQ → `"athlete-gold"`,
  Habigoal → teal/ingress, selector → `"skyline"`.
- Brand palette (`tone()` ramps): `ingress`, `synthesis`, `knowmore`, `strategy`,
  `checklist`, `tactical`, `review`, `neutral`.
- Fonts: Noto Sans (LTR) + Noto Sans Arabic/Hebrew (RTL); 6 locales (en, hu, de, es,
  ar, he).
- Candidate Gold-Athlete palette and full token list: see the attached brief §3–§4.

### Accessibility & i18n
WCAG 2.2 AA (dark + light), keyboard, visible focus, reduced-motion, RTL for ar/he,
no color-only meaning, localizable strings (no embedded English).

### Definition of done
See the attached brief §10 (preset, portal theming, SegmentedControl overflow, all
components, chart kit, token coverage + compliance lint, integration guide).

---

## Files & assets to attach to the issue

**Primary brief (attach this file):**
- `docs/gds-gold-athlete-theme-brief.md` — the full technical specification.

**Design / theme source files (attach or share read access):**
- `theme/mantine-theme.ts` — current Mantine theme + brand ramps.
- `lib/product-surface-branding.ts` — preset ids (`athlete-gold`, `skyline`).
- `components/analytics/AnalyticsConstants.ts` — chart color/structural tokens in use.
- `components/analytics/*.tsx` — current charts to replace (BenchmarkChart,
  LongitudinalChart, MaturityRadarChart, ReadinessGauge, SparklineChart,
  SymmetryChart, ChartEmptyState).
- `app/globals.css` — current CSS variables / surface styles.
- `docs/design-system.md`, `docs/gds-adoption.md`, `gds-adoption.json` — adoption state.
- `docs/gds-hardcoded-style-audit.md` — *(to be produced)* the full token-replacement list.

**Brand image assets (attach the binaries):**
- `public/images/athlete-iq-gold-logo.png`
- `public/images/habigoal_logo.png`

### Collaboration loop
We will share the hardcoded-style audit so every entry maps to a GDS token; please
confirm token names so we can migrate. We want GDS-only — please flag anything in our
usage that should be a GDS primitive instead of app code.
