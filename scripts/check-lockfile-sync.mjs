import { execFileSync } from "node:child_process";

const allowedNextIntlSwcHelpersDiff = `diff --git a/package-lock.json b/package-lock.json
index e33a5a2..2643e1b 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -2507,6 +2507,18 @@
         "@next/env": "15.5.6"
       }
     },
+    "node_modules/next-intl/node_modules/@swc/helpers": {
+      "version": "0.5.23",
+      "resolved": "https://registry.npmjs.org/@swc/helpers/-/helpers-0.5.23.tgz",
+      "integrity": "sha512-5lSsMOTXURePglDfvuAQUqkGek9Hg2kksOYay2m0+XR++b2NWYL/4sWyuvVBIs8oKnJaxkdi9whaL/sqN13afw==",
+      "license": "Apache-2.0",
+      "optional": true,
+      "peer": true,
+      "dependencies": {
+        "tslib": "^2.8.0"
+      }
+    },
     "node_modules/node-addon-api": {
       "version": "7.1.1",
       "resolved": "https://registry.npmjs.org/node-addon-api/-/node-addon-api-7.1.1.tgz",
`;

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, { stdio: "inherit", ...options });
}

function normalizeDiff(diff) {
  return diff.trim().replace(/\r\n/g, "\n");
}

function isAllowedNpmOptionalPeerNormalization(diff) {
  return normalizeDiff(diff) === normalizeDiff(allowedNextIntlSwcHelpersDiff);
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
