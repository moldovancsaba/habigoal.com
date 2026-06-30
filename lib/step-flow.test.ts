import { describe, expect, it } from "vitest";
import {
  createStepFlow,
  stepFlowReducer,
  isFirstStep,
  isLastStep,
  stepProgressPercent,
} from "./step-flow";

describe("step-flow reducer (#save-and-next)", () => {
  it("starts at the first step", () => {
    const s = createStepFlow(3);
    expect(s.stepIndex).toBe(0);
    expect(isFirstStep(s)).toBe(true);
    expect(isLastStep(s)).toBe(false);
  });

  it("advances and goes back, clamped to bounds", () => {
    let s = createStepFlow(3);
    s = stepFlowReducer(s, { type: "next" });
    expect(s.stepIndex).toBe(1);
    s = stepFlowReducer(s, { type: "next" });
    s = stepFlowReducer(s, { type: "next" }); // clamp at last
    expect(s.stepIndex).toBe(2);
    expect(isLastStep(s)).toBe(true);
    s = stepFlowReducer(s, { type: "back" });
    s = stepFlowReducer(s, { type: "back" });
    s = stepFlowReducer(s, { type: "back" }); // clamp at first
    expect(s.stepIndex).toBe(0);
  });

  it("jumps with goto, clamped", () => {
    const s = createStepFlow(3);
    expect(stepFlowReducer(s, { type: "goto", index: 5 }).stepIndex).toBe(2);
    expect(stepFlowReducer(s, { type: "goto", index: -2 }).stepIndex).toBe(0);
    expect(stepFlowReducer(s, { type: "goto", index: 1 }).stepIndex).toBe(1);
  });

  it("reports progress as a percentage of steps completed", () => {
    const s = createStepFlow(4);
    expect(stepProgressPercent(s)).toBe(25);
    expect(stepProgressPercent({ stepIndex: 3, total: 4 })).toBe(100);
  });

  it("handles a zero-step flow safely", () => {
    const s = createStepFlow(0);
    expect(s.stepIndex).toBe(0);
    expect(stepProgressPercent(s)).toBe(0);
    expect(stepFlowReducer(s, { type: "next" }).stepIndex).toBe(0);
  });
});
