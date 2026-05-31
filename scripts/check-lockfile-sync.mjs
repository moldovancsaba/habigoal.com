import { execFileSync } from "node:child_process";

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: "inherit" });
}

try {
  // Non-mutating lockfile validation: npm ci --dry-run fails when package-lock.json is out of sync.
  run("npm", ["ci", "--dry-run", "--ignore-scripts", "--no-audit", "--no-fund"]);
  console.log("Lockfile check passed: package-lock.json is in sync.");
} catch {
  console.error("");
  console.error("Lockfile check failed: package-lock.json is out of sync with package.json.");
  console.error("Run `npm install` and commit the updated package-lock.json before pushing.");
  process.exit(1);
}
