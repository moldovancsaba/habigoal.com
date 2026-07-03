# GDS hardcoded-style audit (req 6a)

**Date:** 2026-06-30. **Scope:** `app/**`, `components/**` (`.tsx`).
**Purpose:** the fixable-elements list — every app-local style that should become a
**GDS token / component** — feeding the GDS Gold-Athlete theme (issue #502, brief
`docs/gds-gold-athlete-theme-brief.md`) and the migration. Each category lists the
pattern, why it's a problem, representative sites, the GDS token to map to, and
severity.

> **Good news:** there is **almost no raw hex** in the app (the only `#…` match is a
> code comment). The real debt is (1) **semantic palette names used as literals**,
> (2) **gold faked with `yellow`**, (3) **charts bound to Mantine vars**, and
> (4) a small set of **inline-style literals**. All are mechanically migratable once
> the GDS gold theme exposes the matching tokens.

## How to regenerate this list
```bash
# 1. semantic color literals
grep -rnE 'color="(blue|cyan|indigo|grape|pink|lime|teal|orange|red|green|yellow|gray|grey|dark)"' app components --include=*.tsx
# 2. gold stand-in
grep -rnE 'color="yellow"' app components --include=*.tsx
# 3. inline-style literals (non-token)
grep -rnE 'style=\{\{[^}]*(background|border|boxShadow|color|fontSize|borderRadius|width|height): *[^v]' app components --include=*.tsx
# 4. chart color bindings
grep -rnE 'var\(--mantine-color-[a-z]+-[0-9]\)|ANALYTICS_CONFIG' components/analytics
# 5. raw hex (should stay ~empty)
grep -rnE '#[0-9a-fA-F]{3,8}\b' app components --include=*.tsx | grep -vE '//|/\*'
```

---

## Category 1 — Semantic color literals (`color="…"`)  · severity: **high** · ~30 sites
Mantine palette names used directly for meaning. Should map to **GDS semantic
tokens** so dark/light + gold theme controls them centrally.

| Literal | Meaning | GDS token to map to |
| --- | --- | --- |
| `color="red"` | danger / delete | `danger` |
| `color="green"` | success / done | `success` |
| `color="yellow"` | **gold accent** (mis-used) / warning | `accent/gold` (actions) or `warning` (status) — disambiguate per site |
| `color="gray"` | neutral / muted | `neutral` |
| `color="ingress"` | brand primary (teal) | `brand/primary` (will become gold on AIQ surface) |

Representative sites (non-exhaustive — full list via grep #1):
- `app/[locale]/dashboard/coach/page.tsx:228–231,254,278,308` — readiness distribution
  badges (green/yellow/red/gray) → readiness-zone tokens (see Category 2 note).
- `app/[locale]/dashboard/athletes/[id]/page.tsx:526,1205,1834` — delete (red), neutral badge.
- `app/[locale]/dashboard/athletes/page.tsx:375,488,537,538,632` — neutral / delete / restore.
- `app/[locale]/dashboard/settings/page.tsx:473,481,559,638,663,716,798` — warning alerts, delete.
- `app/[locale]/dashboard/planning/page.tsx:158` — neutral badge.
- `app/[locale]/page.tsx:43`, `app/[locale]/login/page.tsx:91` — error alerts (red).
- `components/ui/ThemeSwitcher.tsx:16`, `components/ui/LocaleSwitcher.tsx:53`,
  `components/layout/DashboardShell.tsx:230`, `components/layout/PublicAppControls.tsx:70`,
  `components/layout/CookieConsentBanner.tsx:112` — neutral controls.
- `components/landing/ProductEntryCard.tsx:83` — `ThemeIcon color="yellow"` (gold).

## Category 2 — Gold faked with `yellow`  · severity: **high** · 10 sites
The Athlete IQ surface has no gold token, so primary actions use `color="yellow"`.
Map to a real **`accent/gold`** action token from the new theme.
- `components/product/athlete-iq/panels/AiqDailyPlanPanel.tsx:100,111,165`
- `components/product/athlete-iq/panels/AiqMentalEdgePanel.tsx:86,120`
- `components/product/athlete-iq/panels/AiqLiteModulesPanel.tsx:196`
- `components/product/athlete-iq/panels/AiqProgressPanel.tsx:87`
- `components/product/athlete-iq/panels/AiqSessionPanel.tsx:125,198`
- `components/landing/ProductEntryCard.tsx:83`

> **Note on readiness/severity badges:** coach distribution + readiness chips encode
> meaning with green/yellow/red. Map to the **readiness-zone tokens** (good/moderate/
> compromised) from the brief §3.5, not raw palette names, so color meaning is
> centralized and colorblind-safe pairing (icon + label) can be enforced.

## Category 3 — Charts bound to Mantine vars  · severity: **medium** · `components/analytics/*`
Charts read `var(--mantine-color-ingress-6)` / `--status-*` and a local
`ANALYTICS_CONFIG`. Should consume the **GDS Chart Kit + chart palette tokens**
(brief §6) so charts re-skin with the active preset.
- `components/analytics/AnalyticsConstants.ts:13–21` — `primary/secondary/grid/text/…`.
- `components/analytics/SparklineChart.tsx:17`, `ReadinessGauge.tsx:28` — default colors.
- `BenchmarkChart / LongitudinalChart / MaturityRadarChart / SymmetryChart` — tick
  `fontSize: 8–11` + `fill` from `ANALYTICS_CONFIG` → chart typography + palette tokens.

## Category 4 — Inline-style literals  · severity: **medium** · handful
191 `style={{…}}` props exist total; most already use `var(--…)`. The non-token ones:
- `components/dashboard/MainDashboard.tsx:820,956` — `borderRadius: 999; background:
  <runtime color>; opacity: 0.85` (pill meter) → radius-full token + token color.
- `components/athletes/AthletesAppHome.tsx:214` — `borderRadius: 14` → radius token.
- `app/[locale]/dashboard/records/[id]/page.tsx:290,331,511,521` — `width:100`,
  `fontSize:32`, `height:10`, `borderRadius:999` → tokens / radius-full.
- `app/[locale]/dashboard/athletes/[id]/page.tsx:1247` — `fontSize:40` (emoji) → token.
- `app/[locale]/dashboard/settings/page.tsx:731,775` — `background:"none";border:"none"`
  (unstyled button) → use a GDS `subtle`/`unstyled` button; `width:420` → token/responsive.
- `app/[locale]/dashboard/athletes/[id]/intelligence/page.tsx:129` — `height:300`
  chart wrapper → chart component sizing.

## Category 5 — Raw hex  · severity: **none**
No actionable raw hex in `.tsx` (only a comment). Keep the lint guard.

---

## Migration plan
1. **Blocked on GDS theme (#502):** Categories 1–3 need the gold theme's semantic +
   gold + chart tokens before migrating, so colors don't regress. Track against the
   brief's token list.
2. **Do now (independent of theme):** Category 4 inline-style literals → existing
   radius/spacing tokens and GDS button variants (no new tokens needed).
3. **Enforce:** once `@sovereignsquad/gds-compliance` ships the rules (per the brief),
   add them to lint so `color="<palette>"`, inline color/background literals, and
   non-token radius **fail CI**.

## Acceptance
- [ ] Every Category-1/2 `color="…"` replaced by a GDS semantic/accent token.
- [ ] Charts consume the GDS Chart Kit / palette tokens (Category 3).
- [ ] Category-4 inline literals replaced by tokens / GDS components.
- [ ] Compliance lint rules active; this audit returns empty on re-run.
