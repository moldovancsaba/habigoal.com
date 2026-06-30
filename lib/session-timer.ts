// Pure session-timer reducer (TRN-002, #83).
//
// Timer state is client-only and transient by design (no persistence; only the
// final debrief is saved). Keeping it a pure reducer makes the play/pause/skip/
// tick/reset behaviour deterministic and unit-testable, independent of React.

import type { SessionBlueprint } from "@/lib/session-blueprints";

export type SessionTimerStatus = "idle" | "running" | "paused" | "completed";

export interface SessionTimerState {
  blueprintKey: string;
  /** Planned seconds for each drill, in order. */
  drillSeconds: number[];
  drillIndex: number;
  secondsRemaining: number;
  status: SessionTimerStatus;
}

export type SessionTimerAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "tick" }
  | { type: "skip" }
  | { type: "reset" };

export function createSessionTimer(blueprint: SessionBlueprint): SessionTimerState {
  const drillSeconds = blueprint.drills.map((d) => d.seconds);
  return {
    blueprintKey: blueprint.key,
    drillSeconds,
    drillIndex: 0,
    secondsRemaining: drillSeconds[0] ?? 0,
    status: "idle",
  };
}

// Advance to the next drill, or complete the session after the last drill.
function advance(state: SessionTimerState): SessionTimerState {
  const nextIndex = state.drillIndex + 1;
  if (nextIndex >= state.drillSeconds.length) {
    return { ...state, drillIndex: state.drillSeconds.length - 1, secondsRemaining: 0, status: "completed" };
  }
  return { ...state, drillIndex: nextIndex, secondsRemaining: state.drillSeconds[nextIndex], status: state.status };
}

export function sessionTimerReducer(state: SessionTimerState, action: SessionTimerAction): SessionTimerState {
  switch (action.type) {
    case "play":
      if (state.status === "completed") return state;
      return { ...state, status: "running" };
    case "pause":
      if (state.status !== "running") return state;
      return { ...state, status: "paused" };
    case "tick": {
      if (state.status !== "running") return state;
      if (state.secondsRemaining > 1) {
        return { ...state, secondsRemaining: state.secondsRemaining - 1 };
      }
      // Drill finished — advance (or complete), preserving running status.
      return advance({ ...state, secondsRemaining: 0 });
    }
    case "skip":
      if (state.status === "completed") return state;
      return advance(state);
    case "reset":
      return {
        ...state,
        drillIndex: 0,
        secondsRemaining: state.drillSeconds[0] ?? 0,
        status: "idle",
      };
    default:
      return state;
  }
}
