import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the demo-ecosystem seed contract (GH-427): the script must define the full
// roster (5 trainers × 5 athletes = 25, @haho.ai), seed historical data via the
// real collections, be idempotent (unique indexes), and support a dry run. The
// data still has to be *run* against a DB to appear — see docs/runbook-demo-data.md.
const src = readFileSync(join(process.cwd(), "scripts/seed-haho-ecosystem.mjs"), "utf8");
const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

describe("Haho demo ecosystem seed (GH-427)", () => {
  it("defines trainer1..5 and a 5×5 athlete roster on @haho.ai", () => {
    expect(src).toMatch(/trainer\$\{number\}@haho\.ai/);
    expect(src).toMatch(/athlete\$\{trainerNumber\}\$\{athleteNumber\}@haho\.ai/);
    expect(src).toMatch(/length:\s*5/); // 5 athletes per trainer
    expect(src).toMatch(/expectedTrainerCount:\s*5/);
    expect(src).toMatch(/expectedAthleteCount:\s*25/);
  });

  it("seeds historical data through the real collections", () => {
    for (const col of ["athleteiq_checkins", "habit_records", "training_load_records"]) {
      expect(src).toContain(col);
    }
  });

  it("is idempotent (unique indexes) and supports a dry run", () => {
    expect(src).toMatch(/\{\s*unique:\s*true\s*\}/);
    expect(src).toMatch(/dryRun/);
  });

  it("is runnable via the documented npm script", () => {
    expect(pkg.scripts["db:seed-haho-ecosystem"]).toContain("scripts/seed-haho-ecosystem.mjs");
  });
});
