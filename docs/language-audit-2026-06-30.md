# Deep Language Audit — 2026-06-30

Run it yourself any time:

```bash
npm run i18n:audit:deep          # summary
node scripts/language-audit.mjs --full   # every finding
```

This is a **report, not a gate** (always exits 0). The existing `npm run i18n:audit`
remains the blocking CI gate for key parity, placeholder parity, and a curated
must-translate set. This deep audit covers the three things that gate did **not**.

## TL;DR

The visible "mixed languages" in the UI is **not** mainly caused by hardcoded
elements. It is caused by **English values leaking through the message catalogs**:
keys exist in every locale (so the parity gate passes) but hundreds of values
were never actually translated.

Out of **2,399** translatable string keys:

| Locale | English values remaining | ~% of catalog |
| ------ | -----------------------: | ------------: |
| de     | 598                      | ~25%          |
| es     | 598                      | ~25%          |
| he     | 466                      | ~19%          |
| ar     | 318                      | ~13%          |
| hu     | 98                       | ~4%           |

## 1. Hardcoded UI strings (not translated at all)

Only a few, but three are **entire components with no i18n wiring**:

| File | Problem |
| ---- | ------- |
| `app/[locale]/services/page.tsx` | Whole page hardcoded English (title, intro, empty state, card labels). No `useTranslations`. |
| `app/[locale]/services/[id]/page.tsx` | Hardcoded, includes a `Raw Data Dump` + `JSON.stringify` block — looks like a dev/debug page shipped under `[locale]`. |
| `components/consent/ConsentModal.tsx` | Consent dialog fully hardcoded English (title, body, `aria-label`s, "Submission failed"). Legally important surface. |
| `app/[locale]/legal/gtc/page.tsx`, `.../privacy/page.tsx` | Minor: a literal `App:` label. |

`components/dashboard/MainDashboard.tsx:188` (`pillar.score`) is a **false positive** (code, not copy).

## 2. Untranslated leftovers — where the English is concentrated

By namespace (multi-word values identical to English):

| Namespace  | de  | es  | he  | ar  | hu |
| ---------- | --: | --: | --: | --: | -: |
| Dashboard  | 248 | 247 | 153 | 126 | 12 |
| Assessment | 137 | 137 | 137 |  44 | 45 |
| Schema     | 112 | 112 | 112 | 109 |  0 |
| Report     |  36 |  36 |  24 |   0 |  0 |
| AthletesApp|  22 |  22 |   0 |   0 |  0 |
| ProductSurfaces | 19 | 21 | 19 | 18 | 20 |
| Onboarding |  13 |  13 |  13 |  13 | 13 |
| Wearables  |   4 |   4 |   4 |   4 |  4 |

The leakage lives almost entirely in namespaces the must-translate gate never
covered: **Dashboard, Assessment, Schema, Report, AthletesApp, Onboarding**.
`ProductSurfaces` and `athleteiq` are comparatively clean because they were
already in the gate.

## 3. Wrong-script / mixed-language values

The Arabic and Hebrew catalogs are the clearest signal:

- `ar.json`: **410** values contain no Arabic script (English/Latin text sitting in the Arabic file).
- `he.json`: **605** values contain no Hebrew script.

Legitimate exceptions (intentionally not translated): the language self-names
(`Common.languageEnglish` = "English", `…Hungarian` = "Magyar", etc.), brand
names ("Athlete IQ", "Habigoal"), and pure units/ICU format fragments.

## Recommended remediation

1. **Backfill the catalogs** namespace-by-namespace, worst-first
   (Dashboard → Assessment → Schema → Report → AthletesApp → Onboarding),
   one PR per namespace per pass, all gates green.
2. **Internationalize the three hardcoded components** (new keys in all 6 locales).
3. **Tighten the gate**: once a namespace is clean, add it to
   `MUST_TRANSLATE_NAMESPACES` in `scripts/i18n-audit.mjs` so English can never
   leak back in. Optionally promote `i18n:audit:deep` to a gate after backfill.
