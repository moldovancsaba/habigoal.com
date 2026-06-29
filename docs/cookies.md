# Cookie & client-storage inventory (#423)

Consent is category-based. **Necessary** cookies are always set; **functional**
and **analytics** require explicit consent via the cookie banner. The choice is
stored in `habigoal_cookie_consent` (value e.g. `necessary,functional`; the
legacy `accepted` is treated as all-categories).

| Cookie / key | Category | Purpose | Set when |
|---|---|---|---|
| `habigoal_session` | Necessary | Auth session (HS256 JWT) | On login |
| `habigoal_cookie_consent` | Necessary | Stores the consent choice itself | On banner choice |
| `NEXT_LOCALE` | Functional | Remembers the chosen language (#422) | Language switch, **only with functional consent** |
| `habigoal_theme` | Functional | Remembers light/dark theme | Accept-all (functional), theme change |
| `telemetry_events` (server collection) | Analytics | Privacy-safe product telemetry (#88) | Only when `TELEMETRY_ENABLED` **and** analytics consent |

## Rules
- **Before a choice is made:** only necessary cookies exist; functional/analytics are withheld (`hasConsentFor` returns false).
- **Essential only:** writes `habigoal_cookie_consent=necessary`; no functional/analytics cookies set.
- **Accept all:** writes `habigoal_cookie_consent=necessary,functional,analytics`; functional cookies (theme) may be persisted.
- The banner (`components/layout/CookieConsentBanner.tsx`) offers **Accept all** and **Essential only**; it reappears until a choice is recorded.
- Category logic lives in `lib/cookie-consent.ts` (`parseCookieConsent`, `serializeCookieConsent`, `hasCategory`, `hasConsentFor`), guarded by `lib/cookie-consent.test.ts`.

## Known follow-ups
- Server-side analytics gating: `lib/telemetry` is env-flag gated today; per-request analytics-consent enforcement is layered as telemetry expands.
- A "Manage cookies" re-open entry point and the GDS rebuild of the data-purpose `ConsentModal` are tracked on #431.
