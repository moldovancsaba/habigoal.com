---
version: alpha
name: Habigoal
description: Semantic liquid-glass assessment workspace for athlete evaluation, reporting, and operations.
colors:
  app-bg-light: "#EDF3FF"
  app-bg-dark: "#050917"
  sidebar-bg-light: "#F2F7FF"
  sidebar-bg-dark: "#081123"
  surface-base-light: "#FFFFFFC7"
  surface-base-dark: "#10182DB8"
  surface-elevated-light: "#F6FAFFE0"
  surface-elevated-dark: "#151F36D1"
  border-primary-light: "#3D4F8224"
  border-primary-dark: "#8DABFF29"
  text-primary-light: "#10203D"
  text-primary-dark: "#EDF4FF"
  text-secondary-light: "#51627F"
  text-secondary-dark: "#B3C1DF"
  text-muted-light: "#7888A7"
  text-muted-dark: "#7F8DB0"
  overlay-light: "#E9F1FFD1"
  overlay-dark: "#050917D6"
  nav-company-label-light: "#3958D9"
  nav-company-label-dark: "#8DB0FF"
  nav-company-description-light: "#5871C6"
  nav-company-description-dark: "#C5D4FF"
  nav-link-active-light: "#10203D"
  nav-link-active-dark: "#EDF4FF"
  nav-link-inactive-light: "#5D6F94"
  nav-link-inactive-dark: "#B9C7EA"
  blob-1-light: "#4F46E547"
  blob-1-dark: "#4F46E56B"
  blob-2-light: "#2563EB33"
  blob-2-dark: "#0EA5E943"
  blob-3-light: "#A855F72E"
  blob-3-dark: "#A855F751"
  grid-line-light: "#3D4F820F"
  grid-line-dark: "#8DABFF14"
  ingress: "#2563EB"
  ingress-dark: "#6AA6FF"
  synthesis: "#4F46E5"
  synthesis-dark: "#7F72FF"
  knowmore: "#0891B2"
  knowmore-dark: "#4BD7FF"
  strategy: "#A855F7"
  strategy-dark: "#D58BFF"
  checklist: "#0EA5E9"
  checklist-dark: "#4FD6FF"
  tactical: "#14B8A6"
  tactical-dark: "#45E3CF"
  review: "#F97316"
  review-dark: "#FF9B66"
  neutral: "#64748B"
  neutral-dark: "#A9B7D0"
typography:
  h1:
    fontFamily: "Noto Sans"
    fontSize: 2rem
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: -0.03em
  h2:
    fontFamily: "Noto Sans"
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.03em
  h3:
    fontFamily: "Noto Sans"
    fontSize: 1.25rem
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.02em
  h4:
    fontFamily: "Noto Sans"
    fontSize: 1.125rem
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: -0.02em
  body-xs:
    fontFamily: "Noto Sans"
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.4
  body-sm:
    fontFamily: "Noto Sans"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: "Noto Sans"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-lg:
    fontFamily: "Noto Sans"
    fontSize: 1.125rem
    fontWeight: 500
    lineHeight: 1.5
  body-xl:
    fontFamily: "Noto Sans"
    fontSize: 1.25rem
    fontWeight: 500
    lineHeight: 1.5
  label-caps:
    fontFamily: "Noto Sans"
    fontSize: 0.75rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.04em
  label-tight:
    fontFamily: "Noto Sans"
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: -0.01em
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 18px
  pill: 999px
spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 40px
  shell-nav-width: 292px
components:
  button-primary:
    backgroundColor: "{colors.ingress}"
    textColor: "{colors.text-primary-dark}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-outline:
    backgroundColor: "{colors.surface-base-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  card-surface:
    backgroundColor: "{colors.surface-base-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  card-surface-elevated:
    backgroundColor: "{colors.surface-elevated-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  nav-item:
    backgroundColor: "{colors.surface-base-light}"
    textColor: "{colors.nav-link-inactive-light}"
    typography: "{typography.label-tight}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  nav-item-active:
    backgroundColor: "{colors.surface-base-light}"
    textColor: "{colors.nav-link-active-light}"
    typography: "{typography.label-tight}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  input-field:
    backgroundColor: "{colors.surface-elevated-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  modal-surface:
    backgroundColor: "{colors.surface-elevated-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  page-header:
    backgroundColor: "{colors.surface-base-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.h2}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  brand-mark:
    backgroundColor: "{colors.surface-base-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.h2}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
---

## Overview

Habigoal is an operational athlete-support workspace, not a marketing site. The interface should feel precise, glassy, and deliberate: high-contrast information, layered liquid surfaces, and semantic color roles that help scanning. The tone is calm control rather than exuberant decoration.

The visual language is defined by three rules:

1. Mantine is the only component system.
2. Semantic intent comes before hue preference.
3. Surfaces carry the identity more than accents do.

Agents should preserve the product's authored light and dark modes, the soft liquid-glass elevation model, and the disciplined use of semantic tones for structure, emphasis, and navigation.

## Colors

Habigoal uses two token layers:

1. A foundation layer for page background, surface, text, border, navigation, and atmospheric blobs.
2. A semantic tone layer for product meaning.

Foundation colors are mode-specific. Light mode is airy and refracted; dark mode is deep and high-contrast. Both modes should preserve the same hierarchy: strong text, translucent surfaces, restrained borders, and atmospheric gradients.

Semantic tones:

- **Ingress:** primary assessment and navigation emphasis
- **Synthesis:** clustering, interpretation, and intelligence
- **Knowmore:** evidence, enrichment, and supporting context
- **Strategy:** planning, summaries, and synthesized direction
- **Checklist:** structured execution and progress states
- **Tactical:** active operations and hands-on execution
- **Review:** warnings, decisions, deletions, and guarded actions
- **Neutral:** structural UI and fallback content

When adding a new colored surface or action, choose the tone by meaning, not by aesthetic instinct.

## Typography

Habigoal uses `Noto Sans` for left-to-right languages and `Noto Sans Arabic` for right-to-left rendering, with `Noto Sans` as fallback support. Typography should feel dense enough for dashboards but still editorially controlled.

Rules:

- Headings are tight and heavy.
- Body text remains straightforward and highly readable.
- Buttons, badges, and control labels use uppercase or tightened label styles when acting as system controls.
- Arabic rendering must switch to the RTL font stack instead of inheriting Latin defaults.

Avoid ad hoc font stacks, arbitrary sizes, or decorative type pairings that conflict with the operating-surface character of the product.

## Layout

Habigoal is built around a dashboard shell with a fixed navigation rail and glass-panel content regions. Spacing should be consistent and restrained rather than loose.

Key layout rules:

- Use the app shell navigation width of `292px`.
- Prefer the shared spacing scale over raw numbers.
- Group content into section cards and page headers instead of free-floating blocks.
- Default page composition is header, section cards, then charts/tables/forms.
- Dense information should still breathe through padding and section separation rather than oversized whitespace.

## Elevation & Depth

Depth is a defining part of the system. Habigoal is not flat. Surfaces use translucent fills, subtle inner highlights, soft borders, blur, and glow-backed hover states.

The live implementation uses:

- layered radial atmosphere blobs in the page background
- gradient-tinted translucent surfaces
- elevated shadows with inset highlights
- blurred glass panels and pills
- tone-aware hover glows for semantic surfaces

Guidance:

- Cards, headers, and nav trays should feel like one family of material.
- Hover states should intensify glow and border presence, not jump to unrelated colors.
- Do not replace glass surfaces with opaque commodity white or flat dark panels unless a print/export surface explicitly requires it.
- Print surfaces are the exception: they intentionally flatten to white.

## Shapes

The shape language is modern but controlled.

- Most components use `md` radius.
- Navigation items are slightly rounder at `lg`.
- Glass pills and compact status chips may use `pill`.
- The brand mark can scale beyond the default radius system, but still belongs to the same softened geometry family.

Do not introduce exaggerated playful rounding. Habigoal should feel sharp enough for operations while still contemporary.

## Components

The theme layer owns defaults for the core family:

- `Paper` and `Card` provide the glass surface baseline.
- `Button` uses uppercase high-weight labels with semantic tone ownership.
- `Badge` uses tight tracking and small radius.
- `NavLink` keeps restrained rounding and semantic active states.
- `TextInput`, `Select`, and `Textarea` share elevated input surfaces and subdued labels.
- `Modal` uses a stronger elevated surface than cards.
- `SectionCard`, `PageHeader`, and `BrandMark` are composition primitives built on top of the same tokens.

Implementation source currently lives in:

- `app/globals.css`
- `theme/mantine-theme.ts`
- `lib/semantic-theme.ts`
- `theme/typography.ts`
- `theme/tokens.ts`

Agents should update those files in ways that remain consistent with this document, not by creating parallel local styling systems.

## Do's and Don'ts

Do:

- Use semantic tones instead of raw hue names.
- Reuse the shared Mantine theme and shared UI primitives.
- Preserve the authored light and dark foundations.
- Keep surfaces translucent, layered, and gradient-backed.
- Keep visible text in locale files rather than hardcoding UI copy.

Don't:

- Introduce Tailwind, shadcn fragments, or a second UI system.
- Style new features with raw `blue`, `green`, `orange`, `purple`, `cyan`, `teal`, `indigo`, or `amber` props.
- Reintroduce legacy `kidex` palette naming or tokens.
- Flatten the UI into plain cards without glass treatment.
- Add isolated one-off shadows, radii, or color exceptions when the theme should own them.

The semantic audit script is part of enforcement. If the code and this file diverge, update both together so `DESIGN.md` remains the durable design-system source of truth.
