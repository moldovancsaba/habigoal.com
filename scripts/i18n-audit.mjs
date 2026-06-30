import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const messagesDir = path.join(root, "messages");
const newsFile = path.join(root, "content/news/posts.json");
const supportedLocales = ["en", "hu", "de", "es", "ar", "he"];

const failures = [];
const warnings = [];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function flatten(value, prefix = "", output = new Map()) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }

  output.set(prefix, value);
  return output;
}

function sortedDifference(left, right) {
  return [...left].filter((item) => !right.has(item)).sort();
}

function placeholderSet(value) {
  if (typeof value !== "string") {
    return new Set();
  }

  const placeholders = new Set();
  const matcher = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  let match;

  while ((match = matcher.exec(value))) {
    placeholders.add(match[1]);
  }

  return placeholders;
}

function formatList(items, limit = 10) {
  const visible = items.slice(0, limit);
  const suffix = items.length > limit ? `, ... +${items.length - limit} more` : "";
  return `${visible.join(", ")}${suffix}`;
}

function auditMessageCatalogs() {
  const canonicalFile = path.join(messagesDir, "en.json");
  const canonical = flatten(readJson(canonicalFile));
  const canonicalKeys = new Set(canonical.keys());

  for (const locale of supportedLocales) {
    const localeFile = path.join(messagesDir, `${locale}.json`);

    if (!existsSync(localeFile)) {
      failures.push(`Missing message catalog: messages/${locale}.json`);
      continue;
    }

    const localized = flatten(readJson(localeFile));
    const localizedKeys = new Set(localized.keys());
    const missing = sortedDifference(canonicalKeys, localizedKeys);
    const extra = sortedDifference(localizedKeys, canonicalKeys);

    if (missing.length > 0) {
      failures.push(`messages/${locale}.json is missing ${missing.length} keys: ${formatList(missing)}`);
    }

    if (extra.length > 0) {
      failures.push(`messages/${locale}.json has ${extra.length} extra keys not present in en.json: ${formatList(extra)}`);
    }

    for (const [key, englishValue] of canonical.entries()) {
      if (!localized.has(key)) {
        continue;
      }

      const englishPlaceholders = placeholderSet(englishValue);
      const localizedPlaceholders = placeholderSet(localized.get(key));
      const missingPlaceholders = sortedDifference(englishPlaceholders, localizedPlaceholders);
      const extraPlaceholders = sortedDifference(localizedPlaceholders, englishPlaceholders);

      if (missingPlaceholders.length > 0 || extraPlaceholders.length > 0) {
        failures.push(
          `messages/${locale}.json placeholder mismatch at ${key}: missing [${formatList(missingPlaceholders)}], extra [${formatList(extraPlaceholders)}]`,
        );
      }
    }
  }
}

function requireLocalizedObject(postSlug, fieldPath, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push(`News post ${postSlug} field ${fieldPath} must be a locale object.`);
    return [];
  }

  const locales = Object.keys(value).sort();
  const unsupported = locales.filter((locale) => !supportedLocales.includes(locale));

  if (unsupported.length > 0) {
    failures.push(`News post ${postSlug} field ${fieldPath} has unsupported locales: ${formatList(unsupported)}`);
  }

  if (locales.length === 0) {
    failures.push(`News post ${postSlug} field ${fieldPath} has no localized content.`);
  }

  return locales;
}

function auditNewsPosts() {
  if (!existsSync(newsFile)) {
    warnings.push("No content/news/posts.json file found; news locale audit skipped.");
    return;
  }

  const posts = readJson(newsFile);

  if (!Array.isArray(posts)) {
    failures.push("content/news/posts.json must contain an array of posts.");
    return;
  }

  const slugs = new Set();

  for (const [postIndex, post] of posts.entries()) {
    const slug = post?.slug ?? `index:${postIndex}`;

    if (!post?.slug || typeof post.slug !== "string") {
      failures.push(`News post at index ${postIndex} is missing a string slug.`);
    } else if (slugs.has(post.slug)) {
      failures.push(`Duplicate news post slug: ${post.slug}`);
    } else {
      slugs.add(post.slug);
    }

    const titleLocales = requireLocalizedObject(slug, "title", post?.title);
    const summaryLocales = requireLocalizedObject(slug, "summary", post?.summary);
    const postLocales = new Set([...titleLocales, ...summaryLocales]);

    for (const locale of postLocales) {
      if (!post.title?.[locale] || !post.summary?.[locale]) {
        failures.push(`News post ${slug} has partial ${locale} title/summary localization.`);
      }
    }

    if (!Array.isArray(post?.sections) || post.sections.length === 0) {
      failures.push(`News post ${slug} must have at least one section.`);
      continue;
    }

    for (const [sectionIndex, section] of post.sections.entries()) {
      const sectionPath = `sections[${sectionIndex}]`;
      const sectionTitleLocales = requireLocalizedObject(slug, `${sectionPath}.title`, section?.title);
      const sectionItemsLocales = requireLocalizedObject(slug, `${sectionPath}.items`, section?.items);
      const sectionLocales = new Set([...sectionTitleLocales, ...sectionItemsLocales]);

      for (const locale of sectionLocales) {
        if (!section.title?.[locale] || !section.items?.[locale]) {
          failures.push(`News post ${slug} has partial ${locale} localization in ${sectionPath}.`);
          continue;
        }

        if (!Array.isArray(section.items[locale]) || section.items[locale].some((item) => typeof item !== "string" || item.trim() === "")) {
          failures.push(`News post ${slug} ${sectionPath}.items.${locale} must be a non-empty string array.`);
        }
      }

      for (const locale of postLocales) {
        if (!section.title?.[locale] || !section.items?.[locale]) {
          failures.push(`News post ${slug} is visible in ${locale} but ${sectionPath} is not fully localized.`);
        }
      }
    }
  }
}

function walkFiles(dir, extensions, output = []) {
  if (!existsSync(dir)) {
    return output;
  }

  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walkFiles(fullPath, extensions, output);
      continue;
    }

    if (extensions.has(path.extname(fullPath))) {
      output.push(fullPath);
    }
  }

  return output;
}

function auditKnownCopyLeaks() {
  const checkedDirs = ["app", "components", "lib"].map((dir) => path.join(root, dir));
  const files = checkedDirs.flatMap((dir) => walkFiles(dir, new Set([".ts", ".tsx"])));
  const forbiddenPatterns = [
    { label: "raw schema key", pattern: /Schema\.[A-Za-z0-9_]+/ },
    { label: "legacy English landing claim", pattern: /Bio-Psycho-Social Sport Ecosystem/i },
    { label: "legacy Hungarian landing claim", pattern: /Bio-pszicho-szoci[aá]lis sport [öo]kosziszt[eé]ma/i },
    { label: "legacy conduct survey label", pattern: /Felmérések végzése|Felmérés végzése/i },
    { label: "legacy observer label", pattern: /Megfigyelés\s*\/\s*Segítség/i },
    { label: "legacy conductor label", pattern: /Konduktor/i },
    { label: "athlete typo", pattern: /athelte|athelete|athlates/i },
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const relative = path.relative(root, file);

    for (const { label, pattern } of forbiddenPatterns) {
      if (pattern.test(source)) {
        failures.push(`Known i18n/product-language leak (${label}) in ${relative}`);
      }
    }
  }
}

function auditCriticalHardcodedUiCopy() {
  const criticalFiles = [
    "components/forms/AthleteCheckInApp.tsx",
    "components/ui/BrandMark.tsx",
    "components/landing/ProductEntryCard.tsx",
    "components/product/habigoal/HabigoalExperience.tsx",
    "components/product/athlete-iq/AthleteIqExperience.tsx",
    "app/[locale]/habigoal/page.tsx",
    "app/[locale]/athlete-iq/page.tsx",
  ];
  const allowedLiteralText = new Set(["Habigoal", "AthleteIQ"]);
  const hardcodedJsxPatterns = [
    { label: "hard-coded label prop", pattern: /\blabel="[^"]*[A-Za-z][^"]*"/ },
    { label: "hard-coded title prop", pattern: /\btitle="[^"]*[A-Za-z][^"]*"/ },
    { label: "hard-coded subheader prop", pattern: /\bsubheader="[^"]*[A-Za-z][^"]*"/ },
    { label: "hard-coded placeholder prop", pattern: /\bplaceholder="[^"]*[A-Za-z][^"]*"/ },
    { label: "hard-coded aria-label prop", pattern: /\baria-label="[^"]*[A-Za-z][^"]*"/ },
  ];
  const hardcodedJsxTextPattern = />\s*([A-Za-z][^<>{}]*)\s*</g;

  for (const relative of criticalFiles) {
    const file = path.join(root, relative);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, "utf8");
    let textMatch;

    while ((textMatch = hardcodedJsxTextPattern.exec(source))) {
      const literal = textMatch[1].trim().replace(/\s+/g, " ");

      if (!literal || allowedLiteralText.has(literal)) {
        continue;
      }

      failures.push(`Hard-coded critical UI copy (JSX text node: "${literal}") in ${relative}`);
    }

    for (const { label, pattern } of hardcodedJsxPatterns) {
      if (pattern.test(source)) {
        failures.push(`Hard-coded critical UI copy (${label}) in ${relative}`);
      }
    }
  }
}

function auditProductSurfaceCatalogQuality() {
  const canonical = readJson(path.join(messagesDir, "en.json"));
  const coreProductKeys = [
    "ProductSurfaces.habigoal.headline",
    "ProductSurfaces.habigoal.promise",
    "ProductSurfaces.athleteIq.teamCommand.title",
    "ProductSurfaces.athleteIq.hero.subtitle",
    "ProductSurfaces.athleteIq.services.title",
  ];

  for (const locale of supportedLocales.filter((item) => item !== "en")) {
    const localized = readJson(path.join(messagesDir, `${locale}.json`));

    for (const key of coreProductKeys) {
      const englishValue = getPath(canonical, key);
      const localizedValue = getPath(localized, key);

      if (localizedValue === englishValue) {
        failures.push(`messages/${locale}.json product copy still matches English at ${key}`);
      }
    }
  }
}

function getPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => current?.[key], value);
}

// Namespaces whose every key must carry a real, non-English translation in each
// non-English locale. Guards production UI surfaces against English leaking in
// behind key+placeholder parity (which the catalog audit alone would pass).
const MUST_TRANSLATE_NAMESPACES = [
  "Dashboard",
  "Assessment",
  "Schema",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels",
  "ProductSurfaces.athleteIq.athleteWorkspace.sections",
  "ProductSurfaces.athleteIq.nav.modules",
  "athleteiq",
  "CoachHub",
  "AthleteIntelligence",
  "ProductSurfaces.habigoal.progress",
  "ProductSurfaces.habigoal.reasons",
  "ProductSurfaces.habigoal.navigation",
  "Reports",
];

// Keys that are intentionally identical to English in every locale: units,
// brand/metric names, ICU-only format strings, and loanwords the target
// languages genuinely use as-is (e.g. German "Training"/"Standard"/"Team").
const IDENTICAL_OK = new Set([
  // Dashboard: brand, shared loanwords, version strings, and sample placeholders
  // that are genuinely identical across the target languages.
  "Dashboard.brandName",
  "Dashboard.navAthleteIq",
  "Dashboard.title",
  "Dashboard.wearables",
  "Dashboard.conductors",
  "Dashboard.observers",
  "Dashboard.volatility",
  "Dashboard.athleteDailyMomentumLabel",
  "Dashboard.athleteSessionsLabel",
  "Dashboard.athleteTrendMetricSocial",
  "Dashboard.standardsMin",
  "Dashboard.standardsVersionPlaceholder",
  "Dashboard.sessionBlueprintStandardBadge",
  "Dashboard.settingsAdminsCount",
  "Dashboard.settingsEmailPlaceholder",
  "Dashboard.teamNamePlaceholder",
  "Dashboard.roleTrainer",
  "Dashboard.roleAdmin",
  "Dashboard.teamsTitle",
  "Dashboard.trainingLogMarkMaximal",
  "Dashboard.sectionPlan",
  // Assessment: acronyms, brand terms, shared loanwords and a filename that
  // stay identical across the target languages.
  "Assessment.sessionIq",
  "Assessment.coachPriorityBadge",
  "Assessment.rpe",
  "Assessment.drillBlock",
  "Assessment.pause",
  "Assessment.mentalShortLabel",
  "Assessment.optionOkay",
  "Assessment.reportFileName",
  // Schema: "Rapid Bio/Psycho/Social" are product feature names kept as-is.
  "Schema.rapid_movement",
  "Schema.rapid_mental",
  "Schema.rapid_social",
  "AthleteIntelligence.dimensions.readiness",
  "AthleteIntelligence.status.lite_manual",
  "CoachHub.intelligence",
  "CoachHub.messages.selectTeam",
  "CoachHub.readinessValue",
  "CoachHub.vision",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels.dailyPlan.dueWindow.training",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels.dailyPlan.intensity.normal",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels.dailyPlan.sessionType.standard",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels.lite.learningStatus",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels.lite.metricOption.hrv_ms",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels.lite.modules.wearable",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels.mentalEdge.minutes",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels.progress.metric.dailyIq",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels.progress.metric.readiness",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels.session.blockMinutes",
  "ProductSurfaces.athleteIq.athleteWorkspace.panels.session.type.standard",
  "ProductSurfaces.athleteIq.nav.modules.checkin",
  "ProductSurfaces.athleteIq.nav.modules.cognitive",
  "ProductSurfaces.athleteIq.nav.modules.mental",
  "ProductSurfaces.athleteIq.nav.modules.roadmap",
  "ProductSurfaces.athleteIq.nav.modules.team",
  "ProductSurfaces.habigoal.navigation.checkIn",
  "ProductSurfaces.habigoal.progress.activeDaysValue",
  "Reports.csv",
  "Reports.json",
  "Reports.pdf.button",
  "Reports.rowMeta",
  "athleteiq.sessions.safety.standard",
]);

function underMustTranslate(key) {
  return MUST_TRANSLATE_NAMESPACES.some((ns) => key === ns || key.startsWith(`${ns}.`));
}

function auditMustTranslateNamespaces() {
  const canonical = flatten(readJson(path.join(messagesDir, "en.json")));

  for (const locale of supportedLocales.filter((item) => item !== "en")) {
    const localized = flatten(readJson(path.join(messagesDir, `${locale}.json`)));
    const untranslated = [];

    for (const [key, englishValue] of canonical.entries()) {
      if (!underMustTranslate(key) || typeof englishValue !== "string" || englishValue.trim() === "") {
        continue;
      }
      if (IDENTICAL_OK.has(key)) {
        continue;
      }
      if (localized.get(key) === englishValue) {
        untranslated.push(key);
      }
    }

    if (untranslated.length > 0) {
      failures.push(
        `messages/${locale}.json has ${untranslated.length} untranslated key(s) in must-translate namespaces: ${formatList(untranslated.sort())}`,
      );
    }
  }
}

function main() {
  auditMessageCatalogs();
  auditNewsPosts();
  auditKnownCopyLeaks();
  auditCriticalHardcodedUiCopy();
  auditProductSurfaceCatalogQuality();
  auditMustTranslateNamespaces();

  if (warnings.length > 0) {
    console.warn("i18n audit warnings:");
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.error("i18n audit failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`i18n audit passed for ${supportedLocales.length} locales, ${supportedLocales.length} message catalogs, and localized news content.`);
}

main();
