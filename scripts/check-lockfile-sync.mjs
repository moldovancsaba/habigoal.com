import { execFileSync } from "node:child_process";

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: "inherit" });
}

try {
  // Recompute lockfile metadata/resolution without installing node_modules.
  run("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"]);
  // Fail if package-lock.json changed, meaning package.json + lockfile were out of sync.
  run("git", ["diff", "--exit-code", "--", "package-lock.json"]);
  console.log("Lockfile check passed: package-lock.json is in sync.");
} catch {
  console.error("");
  console.error("Lockfile check failed: package-lock.json is out of sync with package.json.");
  console.error("Run `npm install` and commit the updated package-lock.json before pushing.");
  process.exit(1);
}
