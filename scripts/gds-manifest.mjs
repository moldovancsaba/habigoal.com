import fs from "node:fs";
import { validateManifest } from "@sovereignsquad/gds-compliance";

const manifestPath = process.argv[2] ?? "./gds-adoption.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const findings = validateManifest(manifest);

if (findings.some((finding) => finding.severity === "error")) {
  console.error(`GDS manifest validation failed for ${manifestPath}.`);
  for (const finding of findings) {
    console.error(`- [${finding.severity}] ${finding.rule}: ${finding.message}`);
  }
  process.exit(1);
}

console.log(`GDS manifest validation passed for ${manifestPath}.`);
