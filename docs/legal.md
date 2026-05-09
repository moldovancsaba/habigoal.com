# Legal and Company Information

This app includes localized legal pages available under the dashboard:

- `/{locale}/dashboard/legal/gtc`
- `/{locale}/dashboard/legal/privacy`

Supported locales currently include `hu`, `en`, and `ar`.

## Default company profile

These are the current default values seeded in settings and used until modified in Dashboard Settings.

- **Name:** Survey s.r.o.
- **ID-No. (IČO):** 57474869
- **Registered:** 19.02.2026
- **Legal form:** Limited Liability Company
- **Address:** Želiarsky svah 29, Štúrovo, Slovakia 943 01
- **Share capital:** EUR 5 000
- **VAT No.:** SK2122770606
- **Website:** https://survey.app

## App version and company profile source

The app version is developer-managed in `lib/app-version.ts`.
The company profile is managed from Dashboard Settings and persisted in global settings (`/api/settings`).

They are displayed in:

- Dashboard footer
- GTC page
- Privacy Policy page
