import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const expectedGdsVersion = "2.6.4";
const manifestPath = path.join(root, "gds-adoption.json");
const packagePath = path.join(root, "package.json");

const requiredPackages = [
  "@doneisbetter/gds",
  "@doneisbetter/gds-eslint-config",
  "@doneisbetter/gds-compliance"
];

const requiredManifestFields = [
  "schemaVersion",
  "gdsVersion",
  "productArchetype",
  "requiredContracts",
  "localAdapters",
  "approvedExceptions",
  "migrationStatus",
  "owner",
  "lastReviewedAt"
];

const allowedMigrationStatusesForFullCompliance = new Set(["governed"]);
const blockers = [];
const warnings = [];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    blockers.push(`${path.relative(root, filePath)} cannot be read as valid JSON: ${error.message}`);
    return null;
  }
}

function hasDependency(pkg, name) {
  return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name] || pkg.peerDependencies?.[name]);
}

function collectFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", ".next", "node_modules", "coverage", "dist"].includes(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(target, results);
    } else if (/\.(ts|tsx|js|jsx|mjs|css|md|json)$/.test(entry.name)) {
      results.push(target);
    }
  }
  return results;
}

function scanForDoneIsBetterImports() {
  const imports = new Set();
  const pattern = /from\s+["'](@doneisbetter\/gds(?:\/(?:client|server))?|@doneisbetter\/gds-[^"']+)["']|import\s+["'](@doneisbetter\/gds(?:\/(?:client|server))?|@doneisbetter\/gds-[^"']+)["']/g;

  for (const file of collectFiles(root)) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(pattern)) {
      imports.add(match[1] || match[2]);
    }
  }

  return [...imports].sort();
}

function scanForLegacyGdsReferences() {
  const references = [];
  const pattern = new RegExp(`@${"gds"}/`);

  for (const file of collectFiles(root)) {
    const relativeFile = path.relative(root, file);
    if (relativeFile === "package-lock.json") continue;
    const source = fs.readFileSync(file, "utf8");
    if (pattern.test(source)) {
      references.push(relativeFile);
    }
  }

  return references.sort();
}

const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : null;
const pkg = fs.existsSync(packagePath) ? readJson(packagePath) : null;

if (!manifest) {
  blockers.push("gds-adoption.json is required for GDS governance.");
} else {
  for (const field of requiredManifestFields) {
    if (!(field in manifest)) {
      blockers.push(`gds-adoption.json is missing required field: ${field}`);
    }
  }

  if (manifest.gdsVersion !== expectedGdsVersion) {
    blockers.push(`gds-adoption.json declares GDS ${manifest.gdsVersion}; expected ${expectedGdsVersion}.`);
  }

  if (!allowedMigrationStatusesForFullCompliance.has(manifest.migrationStatus)) {
    blockers.push(`migrationStatus is "${manifest.migrationStatus}"; 100% GDS-only requires "governed".`);
  }

  const unresolvedAdapters = (manifest.localAdapters ?? []).filter((adapter) => adapter.status !== "active");
  if (unresolvedAdapters.length > 0) {
    blockers.push(`${unresolvedAdapters.length} GDS contract adapter(s) are not active: ${unresolvedAdapters.map((adapter) => adapter.contract).join(", ")}.`);
  }

  for (const exception of manifest.approvedExceptions ?? []) {
    for (const field of ["surface", "reason", "owner", "reviewDate"]) {
      if (!exception[field]) {
        blockers.push(`Approved exception is missing ${field}.`);
      }
    }
  }
}

if (!pkg) {
  blockers.push("package.json is required for GDS dependency verification.");
} else {
  const missingPackages = requiredPackages.filter((name) => !hasDependency(pkg, name));
  if (missingPackages.length > 0) {
    blockers.push(`Missing GDS packages: ${missingPackages.join(", ")}.`);
  }

  const mantineVersion = pkg.dependencies?.["@mantine/core"] ?? pkg.devDependencies?.["@mantine/core"];
  if (mantineVersion && !/^(\^|~)?(7\.(?:9|\d{2,})|8\.(?:3|\d{2,}))/.test(mantineVersion)) {
    blockers.push(`@mantine/core is ${mantineVersion}; GDS ${expectedGdsVersion} supports Mantine ^7.9.0 or ^8.3.0.`);
  }
}

const legacyGdsReferences = scanForLegacyGdsReferences();
if (legacyGdsReferences.length > 0) {
  blockers.push(`Legacy placeholder GDS package references remain: ${legacyGdsReferences.join(", ")}.`);
}

const gdsImports = scanForDoneIsBetterImports();
if (gdsImports.length === 0) {
    blockers.push("No @doneisbetter/gds runtime imports found in source code.");
} else {
  warnings.push(`Detected @doneisbetter/gds imports: ${gdsImports.join(", ")}`);
}

if (blockers.length > 0) {
  console.error("GDS audit failed. Habigoal is not yet 100% GDS-only.");
  for (const blocker of blockers) {
    console.error(`- ${blocker}`);
  }
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) {
      console.error(`- ${warning}`);
    }
  }
  process.exit(1);
}

console.log(`GDS audit passed for Habigoal on GDS ${expectedGdsVersion}.`);
for (const warning of warnings) {
  console.log(`- ${warning}`);
}
