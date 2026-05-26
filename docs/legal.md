# Legal And Company Information

Habigoal exposes public legal pages outside the protected dashboard:

- `/{locale}/legal/gtc`
- `/{locale}/legal/privacy`

Supported locales:

- `en`
- `hu`
- `es`
- `de`
- `ar`
- `he`

Legal pages must remain public even when `HABIGOAL_ENFORCE_AUTH=true`.

## Company Profile Source

Company and legal profile data is managed in Dashboard Settings and persisted through `/api/settings`.

The profile is displayed in:

- dashboard footer
- public legal pages
- generated reports where applicable

## Version Source

The app version is developer-managed in `lib/app-version.ts` and should remain aligned with `package.json` when release versioning changes.

Current app version: `0.5.1`

## Current Production Identity

The live app identity is Habigoal at:

- `https://habigoal.com`

Older `survey.*` and `messmass.*` references are obsolete and should not be introduced into new documentation or UI copy.

## Legal Copy Requirements

- Legal page text must come from the locale message catalogs or structured legal content, not inline page strings.
- Locale-specific pages must not silently fall back to another language for legal text.
- Footer labels must be localized in every supported locale.
- Any change to public legal content should be validated with `npm run i18n:audit`, `npm run build`, and a manual route check.
