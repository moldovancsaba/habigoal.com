import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// #429 regression guard: the surfaces localized in this issue must not
// re-introduce hardcoded user-facing string literals in label/placeholder/
// title/description props. (A literal like `label="..."` bypasses next-intl;
// `label={t("...")}` is fine.) Example/keyword placeholders that are passed
// through translation keys are allowed because they go via `t(...)`.
const FILES = [
  "app/[locale]/dashboard/digital-twin/page.tsx",
  "app/[locale]/athletes/[id]/training-log/page.tsx",
  "app/[locale]/dashboard/athletes/page.tsx",
  "app/[locale]/dashboard/settings/page.tsx",
  "components/product/ProductSurfaceShared.tsx"
];

// Matches label="literal" / placeholder='literal' / title="literal" etc., but
// NOT label={...} (curly = expression, e.g. a t() call).
const HARDCODED = /\b(?:label|placeholder|title|description)=["'][^"'{}]+["']/g;

describe("no hardcoded UI strings (#429)", () => {
  for (const file of FILES) {
    it(`${file} routes label/placeholder/title/description through i18n`, () => {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      // Confirmation-keyword placeholders (type "delete"/"restore" to confirm a
      // destructive action) are deliberately fixed: the typed value is compared
      // to the literal word, so they must not vary by locale.
      const CONFIRM_KEYWORDS = /^placeholder=["'](?:delete|restore)["']$/;
      const matches = (src.match(HARDCODED) ?? []).filter((m) => !CONFIRM_KEYWORDS.test(m));
      expect(matches, `hardcoded UI strings: ${matches.join(", ")}`).toHaveLength(0);
    });
  }
});
