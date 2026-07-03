import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["run", "product-boundary:audit"]],
  ["npm", ["run", "persona-ui:audit"]],
  ["npm", ["run", "habigoal:audit"]],
  ["npm", ["run", "i18n:audit"]],
  ["npm", ["run", "semantic:audit"]],
  ["npm", ["run", "gds:audit"]],
  ["npm", ["run", "gds:compliance"]],
  ["npm", ["run", "test"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["run", "build"]]
];

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nHabigoal production release gate passed.");
