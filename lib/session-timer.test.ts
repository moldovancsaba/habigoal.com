import { describe, expect, it } from "vitest";
import { createSessionTimer, sessionTimerReducer, type SessionTimerState } from "./session-timer";
import { getBlueprintByKey } from "./session-blueprints";

const blueprint = getBlueprintByKey("standard-technical")!;

function run(state: SessionTimerState, actions: Parameters<typeof sessionTimerReducer>[1][]): SessionTimerState {
  return actions.reduce((s, a) => sessionTimerReducer(s, a), state);
}

describe("session timer reducer (#83 TRN-002)", () => {
  it("starts idle at the first drill", () => {
    const s = createSessionTimer(blueprint);
    expect(s.status).toBe("idle");
    expect(s.drillIndex).toBe(0);
    expect(s.secondsRemaining).toBe(blueprint.drills[0].seconds);
  });

  it("ticks only while running and counts down", () => {
    let s = createSessionTimer(blueprint);
    s = sessionTimerReducer(s, { type: "tick" }); // ignored while idle
    expect(s.secondsRemaining).toBe(blueprint.drills[0].seconds);
    s = run(s, [{ type: "play" }, { type: "tick" }, { type: "tick" }]);
    expect(s.status).toBe("running");
    expect(s.secondsRemaining).toBe(blueprint.drills[0].seconds - 2);
  });

  it("advances to the next drill when a drill's time elapses", () => {
    let s = createSessionTimer(blueprint);
    s.secondsRemaining = 2; // shorten for the test
    s = run(s, [{ type: "play" }, { type: "tick" }, { type: "tick" }]);
    expect(s.drillIndex).toBe(1);
    expect(s.secondsRemaining).toBe(blueprint.drills[1].seconds);
    expect(s.status).toBe("running");
  });

  it("pause halts ticking; play resumes", () => {
    let s = createSessionTimer(blueprint);
    s = run(s, [{ type: "play" }, { type: "tick" }, { type: "pause" }, { type: "tick" }]);
    expect(s.status).toBe("paused");
    expect(s.secondsRemaining).toBe(blueprint.drills[0].seconds - 1);
  });

  it("skip advances drills and completes after the last", () => {
    let s = createSessionTimer(blueprint);
    s = sessionTimerReducer(s, { type: "play" });
    for (let i = 0; i < blueprint.drills.length; i += 1) {
      s = sessionTimerReducer(s, { type: "skip" });
    }
    expect(s.status).toBe("completed");
    expect(s.drillIndex).toBe(blueprint.drills.length - 1);
  });

  it("does not tick past completion", () => {
    let s = createSessionTimer(blueprint);
    s = sessionTimerReducer(s, { type: "play" });
    for (let i = 0; i < blueprint.drills.length; i += 1) s = sessionTimerReducer(s, { type: "skip" });
    const after = sessionTimerReducer(s, { type: "tick" });
    expect(after).toEqual(s); // completed is terminal for tick
  });

  it("reset returns to idle at the first drill", () => {
    let s = createSessionTimer(blueprint);
    s = run(s, [{ type: "play" }, { type: "skip" }, { type: "reset" }]);
    expect(s.status).toBe("idle");
    expect(s.drillIndex).toBe(0);
    expect(s.secondsRemaining).toBe(blueprint.drills[0].seconds);
  });
});
