# KIDEX design system (Material UI)

The dashboard and assessment UI use **Material UI v9** with a single app theme and shared layout primitives. Presentation is separated from API/data logic.

## Architecture

| Layer | Role |
|--------|------|
| `theme/mui-theme.ts` | `getKidexTheme("light" \| "dark")` — brand colors, typography (`Outfit` / `Inter`), shape, component defaults. |
| `components/theme/MuiRegistry.tsx` | `AppRouterCacheProvider` (Emotion + Next App Router), `ThemeProvider`, `CssBaseline`. |
| `components/theme/ThemeModeContext.tsx` | `mode` / `setMode`, syncs `document.documentElement` `data-theme`, local storage (`kidex_theme`, legacy `theme`), and consent-gated cookie persistence. |
| `components/layout/DashboardShell.tsx` | Responsive shell: `AppBar` + temporary `Drawer` (mobile) + permanent `Drawer` (desktop), nav, `PageContainer`, shared app footer. |
| `components/ui/PageContainer.tsx` | Max-width + horizontal padding for page content. |
| `components/ui/SectionCard.tsx` | `Card` + optional `CardHeader` + `CardContent` for grouped sections. |

`app/[locale]/layout.tsx` wraps the tree with `NextIntlClientProvider` and `MuiRegistry`. Locale-aware routes stay under this layout so **MUI and `ThemeModeProvider` are always available** where `ThemeSwitcher` / assessment UI render.
Theme initialization also reads cookie-backed mode from server layout to avoid refresh mismatch.

## Usage rules

1. **Prefer MUI primitives** — `Box`, `Stack`, `Typography`, `Button`, `TextField`, `Table*`, `Alert`, `Paper`, `Card`, etc., styled with `sx` or theme defaults.
2. **MUI v9 layout props** — `Stack` supports `direction`, `spacing`, `divider`, `useFlexGap`, and `sx`. Put `alignItems`, `justifyContent`, `flexWrap`, and `gap` (when not using `spacing`) on **`sx`**, not as top-level `Stack` props.
3. **Typography** — use `sx` for `fontWeight`, `display`, and other CSS that is not part of `TypographyOwnProps` (e.g. `sx={{ fontWeight: 700 }}`).
4. **Forms** — controlled inputs via MUI `TextField`, `Select`, `Checkbox`, `Autocomplete` (`SearchableSelect` wraps `Autocomplete`).
5. **Navigation** — use `Link` / `usePathname` from `@/i18n/navigation` with MUI `Button` / `ListItemButton` `component={Link}` where appropriate.
6. **Global CSS** — keep `app/globals.css` minimal: resets, print helpers (`.no-print`, `.only-print`, `.dashboard-main`), and optional CSS variables. Avoid large page-specific class-based layouts; express layout in MUI + `sx`.
7. **Accessibility** — prefer `slotProps` on MUI components (e.g. `Checkbox` `slotProps.input` for `aria-label`) over removed legacy prop names where typings changed.
8. **Charts** — dashboard and analytics visuals use `recharts`; avoid one-off SVG chart implementations unless a library chart is impossible.

## Adding a new dashboard page

1. Add a route under `app/[locale]/dashboard/...`.
2. Use `PageContainer` implicitly via `DashboardShell` (already wraps `children`).
3. Structure content with `SectionCard` and MUI layout components.
4. Reuse `useTranslations` namespaces (`Dashboard`, `Assessment`, `Common`, `Schema`).
5. Run `npm run typecheck`, `npm run lint`, and `npm run build` before merging.

## Migration notes

- Legacy `.panel`, `.btn`, `.metrics`, `.scoreRow`, etc., were removed when pages moved to MUI; **do not reintroduce** large bespoke CSS blocks for dashboard UI.
- Record print view still uses `className="no-print"` / `only-print` and global `@media print` rules, but user-facing export action is PDF download from the record page.
