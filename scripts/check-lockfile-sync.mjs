import { execFileSync } from "node:child_process";

const allowedNextIntlSwcHelpersAddedLines = `+    "node_modules/next-intl/node_modules/@swc/helpers": {
+      "version": "0.5.23",
+      "resolved": "https://registry.npmjs.org/@swc/helpers/-/helpers-0.5.23.tgz",
+      "integrity": "sha512-5lSsMOTXURePglDfvuAQUqkGek9Hg2kksOYay2m0+XR++b2NWYL/4sWyuvVBIs8oKnJaxkdi9whaL/sqN13afw==",
+      "license": "Apache-2.0",
+      "optional": true,
+      "peer": true,
+      "dependencies": {
+        "tslib": "^2.8.0"
+      }
+    },`;

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, { stdio: "inherit", ...options });
}

function normalizeLines(value) {
  return value.trim().replace(/\r\n/g, "\n").split("\n");
}

function isAllowedNpmOptionalPeerNormalization(diff) {
  const lines = normalizeLines(diff);
  const addedOrRemovedLines = lines.filter((line) => /^[+-]/.test(line) && !/^([+-]{3}) /.test(line));
  const addedLines = addedOrRemovedLines.filter((line) => line.startsWith("+"));
  const removedLines = addedOrRemovedLines.filter((line) => line.startsWith("-"));

  return (
    removedLines.length === 0 &&
    addedLines.join("\n") === normalizeLines(allowedNextIntlSwcHelpersAddedLines).join("\n")
  );
}

try {
  // Recompute lockfile metadata/resolution without installing node_modules.
  run("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"]);

  const diff = execFileSync("git", ["diff", "--", "package-lock.json"], {
    encoding: "utf8",
  });

  if (diff && !isAllowedNpmOptionalPeerNormalization(diff)) {
    process.stdout.write(diff);
    throw new Error("Unexpected package-lock.json drift");
  }

  if (diff) {
    console.warn("Lockfile check passed with npm optional peer normalization for next-intl/@swc/helpers.");
  } else {
    console.log("Lockfile check passed: package-lock.json is in sync.");
  }
} catch {
  console.error("");
  console.error("Lockfile check failed: package-lock.json is out of sync with package.json.");
  console.error("Run `npm install` and commit the updated package-lock.json before pushing.");
  process.exit(1);
}
