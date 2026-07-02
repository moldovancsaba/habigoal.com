import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = walk(root).filter((file) => /\.(ts|tsx|js|jsx|mjs|css)$/.test(file));

const forbidden = [
  {
    pattern: /\b(color|c)=["']kidex["']/g,
    label: "legacy kidex color prop",
    appliesTo: () => true
  },
  {
    pattern: /var\(--mantine-color-kidex/gi,
    label: "legacy kidex CSS token",
    appliesTo: () => true
  },
  {
    pattern: /theme\.colors\.kidex/gi,
    label: "legacy kidex palette access",
    appliesTo: () => true
  },
  {
    pattern: /light-dark\(/g,
    label: "light-dark helper is forbidden",
    appliesTo: () => true
  },
  {
    pattern: /\b(color|c)=["'](yellow|blue|orange|amber|cyan|teal|indigo|purple|violet)["']/g,
    label: "raw hue color prop; use product-ui-contracts/GDS semantic tokens",
    appliesTo: isUiFile
  },
  {
    pattern: /\b(color|c)=\{[^\n]*(["'])(yellow|blue|orange|amber|cyan|teal|indigo|purple|violet)\2/g,
    label: "raw dynamic hue color prop; use product-ui-contracts/GDS semantic tokens",
    appliesTo: isUiFile
  },
  {
    pattern: /var\(--mantine-color-yellow|var\(--brand-blue\)/g,
    label: "raw legacy hue CSS variable in UI surface",
    appliesTo: isUiFile
  },
  {
    pattern: /import\s+\{[^}]*\b(ActionIcon|Anchor|Avatar|Badge|Box|Burger|Button|Checkbox|Group|Loader|Menu|Modal|MultiSelect|NumberInput|Progress|Radio|ScrollArea|Select|SimpleGrid|Slider|Stack|Switch|Table|TextInput|Textarea|ThemeIcon|Tooltip)\b[^}]*\}\s+from ["']@mantine\/core["']/g,
    label: "direct Mantine control/layout import in migrated UI surface; import available controls via @doneisbetter/gds/client",
    appliesTo: isMigratedGdsSurface
  },
  {
    pattern: /\bhbg-(primary|secondary)-button\b/g,
    label: "legacy Habigoal local button class; use GDS Button/SemanticButton",
    appliesTo: (relative) => relative.endsWith(".tsx") || relative.endsWith(".jsx")
  }
];

const failures = [];

for (const file of files) {
  const relative = path.relative(root, file);
  if (shouldSkip(relative)) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const rule of forbidden) {
    if (!rule.appliesTo(relative)) continue;
    for (const match of source.matchAll(rule.pattern)) {
      failures.push(`${relative}:${lineNumberForIndex(source, match.index ?? 0)}: ${rule.label}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Semantic audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Semantic audit passed for ${files.length} files.`);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git") continue;
      results.push(...walk(target));
    } else {
      results.push(target);
    }
  }

  return results;
}

function shouldSkip(relative) {
  return (
    relative.startsWith("node_modules/") ||
    relative.startsWith(".next/") ||
    relative.startsWith("coverage/") ||
    relative.startsWith("dist/")
  );
}

function isUiFile(relative) {
  return (
    relative.startsWith("app/") ||
    relative.startsWith("components/") ||
    relative.startsWith("theme/")
  );
}

function isMigratedGdsSurface(relative) {
  return (
    relative.startsWith("components/product/") ||
    relative.startsWith("components/dashboard/") ||
    relative.startsWith("components/forms/") ||
    relative.startsWith("components/insights/") ||
    relative === "components/layout/DashboardShell.tsx" ||
    relative === "components/landing/LandingCtas.tsx" ||
    relative === "components/landing/ProductEntryCard.tsx" ||
    relative === "app/[locale]/login/page.tsx" ||
    relative === "app/[locale]/dashboard/coach/page.tsx" ||
    relative === "app/[locale]/dashboard/digital-twin/page.tsx" ||
    relative === "app/[locale]/dashboard/settings/page.tsx" ||
    relative === "app/[locale]/dashboard/wearables/page.tsx" ||
    relative === "app/[locale]/dashboard/athletes/[id]/intelligence/page.tsx"
  );
}

function lineNumberForIndex(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}
