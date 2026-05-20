# Habigoal design system (Mantine)

`DESIGN.md` at the repo root is the canonical design-system source of truth for both humans and coding agents.

- [DESIGN.md](/Users/Shared/Projects/habigoal/DESIGN.md) defines the durable token contract and the semantic usage rules.
- This document explains how that design system is implemented in the current codebase.

The landing page, athlete app, trainer dashboard, settings, planning, records, news, and legal surfaces use **Mantine** with a single app theme and shared layout primitives. Presentation is separated from API/data logic.

## Architecture

| Layer | Role |
|--------|------|
| `theme/mantine-theme.ts` | `getSurveyMantineTheme("light" \| "dark")` — semantic colors, typography (`Noto Sans` / `Noto Sans Arabic`), radius, and component defaults. |
| `components/theme/ThemeRegistry.tsx` | `MantineProvider` + color-scheme wiring using `ThemeModeContext`. |
| `components/theme/ThemeModeContext.tsx` | `mode` / `setMode`, syncs `document.documentElement` `data-theme`, local storage (`survey_theme`, legacy `theme`), and consent-gated cookie persistence. |
| `components/layout/DashboardShell.tsx` | Responsive protected-app shell: Mantine `AppShell` + mobile `Drawer`, role-aware nav, `PageContainer`, shared app footer. |
| `components/ui/PageContainer.tsx` | Max-width + horizontal padding for page content. |
| `components/ui/SectionCard.tsx` | Mantine `Paper` + optional header/action block for grouped sections. |

`app/[locale]/layout.tsx` wraps the tree with `NextIntlClientProvider` and `ThemeRegistry`. Locale-aware routes stay under this layout so Mantine + `ThemeModeProvider` are always available where UI renders.
Theme initialization also reads cookie-backed mode from server layout to avoid refresh mismatch.

## Usage rules

1. **Prefer Mantine primitives** — `Box`, `Stack`, `Text`, `Button`, `TextInput`, `Table`, `Alert`, `Paper`, etc., styled from the shared theme and tokens.
2. **Typography** — use the shared typography tokens and semantic sizes (`xs/sm/md/lg/xl`); avoid arbitrary pixel/rem literals.
3. **Forms** — controlled inputs should use Mantine fields and shared wrappers (`SearchableSelect`, etc.).
4. **Navigation** — use `Link` / `usePathname` from `@/i18n/navigation` with Mantine components.
5. **Global CSS** — keep `app/globals.css` focused on global tokens, atmosphere, print helpers (`.no-print`, `.only-print`, `.dashboard-main`), and shared surface classes.
6. **Accessibility** — preserve semantic labels and aria attributes on interactive controls.
8. **Charts** — dashboard and analytics visuals use `recharts`; avoid one-off SVG chart implementations unless a library chart is impossible.

## Adding a new protected app page

1. Add a route under `app/[locale]/dashboard/...`.
2. Use `PageContainer` implicitly via `DashboardShell` (already wraps `children`).
3. Structure content with `SectionCard` and Mantine layout components.
4. Reuse `useTranslations` namespaces (`Dashboard`, `Assessment`, `Common`, `Schema`, or a feature-specific namespace).
5. Run `npm run typecheck`, `npm run lint`, and `npm run build` before merging.

## i18n and content rules

- All visible UI copy must come from `/messages` or structured localized content.
- Public news posts must render only in locales where exact locale content exists.
- RTL locales must be checked on compact action bars and buttons because translated action labels can be wider than English.
- Do not add hardcoded English fallback text to shared components.

## Source Of Truth

When updating the design system:

1. Update [DESIGN.md](/Users/Shared/Projects/habigoal/DESIGN.md) first if the token contract or design rules change.
2. Reflect those changes in the live implementation files:
   - [app/globals.css](/Users/Shared/Projects/habigoal/app/globals.css)
   - [theme/mantine-theme.ts](/Users/Shared/Projects/habigoal/theme/mantine-theme.ts)
   - [lib/semantic-theme.ts](/Users/Shared/Projects/habigoal/lib/semantic-theme.ts)
   - [theme/typography.ts](/Users/Shared/Projects/habigoal/theme/typography.ts)
   - [theme/tokens.ts](/Users/Shared/Projects/habigoal/theme/tokens.ts)
3. Run `npm run semantic:audit`.

## Migration notes

- Legacy `.panel`, `.btn`, `.metrics`, `.scoreRow`, etc., were removed when pages moved to shared design-system primitives; **do not reintroduce** large bespoke CSS blocks for dashboard UI.
- Record print view still uses `className="no-print"` / `only-print` and global `@media print` rules, but user-facing export action is PDF download from the record page.
