import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = walk(root).filter((file) => /\.(ts|tsx|js|jsx|mjs|css)$/.test(file));

const forbidden = [
  { pattern: /color=["']kidex["']/g, label: "legacy kidex color prop" },
  { pattern: /c=["']kidex["']/g, label: "legacy kidex text color prop" },
  { pattern: /var\(--mantine-color-kidex/gi, label: "legacy kidex CSS token" },
  { pattern: /theme\.colors\.kidex/gi, label: "legacy kidex palette access" },
  { pattern: /light-dark\(/g, label: "light-dark helper is forbidden" },
  { pattern: /color=["'](blue|green|orange|violet|cyan|teal|indigo|purple|amber)["']/g, label: "generic hue color prop" },
  { pattern: /c=["'](blue|green|orange|violet|cyan|teal|indigo|purple|amber)["']/g, label: "generic hue text prop" }
];

const failures = [];

for (const file of files) {
  const relative = path.relative(root, file);
  if (relative.startsWith("node_modules/") || relative.startsWith(".next/")) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) {
      failures.push(`${relative}: ${rule.label}`);
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
