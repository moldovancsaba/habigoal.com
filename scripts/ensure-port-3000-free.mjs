import { execSync } from "node:child_process";

function getPort3000Pids() {
  try {
    const output = execSync("lsof -tiTCP:3000 -sTCP:LISTEN", {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8"
    }).trim();
    return output ? output.split(/\s+/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

const pids = getPort3000Pids();

if (pids.length === 0) {
  process.exit(0);
}

for (const pid of pids) {
  try {
    process.kill(Number(pid), "SIGTERM");
  } catch {
    // Ignore processes that vanished between discovery and termination.
  }
}

setTimeout(() => {
  const remaining = getPort3000Pids();
  for (const pid of remaining) {
    try {
      process.kill(Number(pid), "SIGKILL");
    } catch {
      // Ignore processes that vanished between retries.
    }
  }
}, 500);
