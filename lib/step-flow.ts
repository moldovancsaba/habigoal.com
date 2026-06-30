// Pure step-flow reducer (#save-and-next, req 4).
//
// Drives the mobile "Save & Next" wizard: one input topic per screen so the
// athlete focuses on a single thing at a time. Kept as a pure reducer so the
// navigation logic is deterministic and unit-testable independent of React; the
// StepFlow component renders it. (This is the interim until the GDS Stepper from
// issue #502 lands.)

export interface StepFlowState {
  stepIndex: number;
  total: number;
}

export type StepFlowAction =
  | { type: "next" }
  | { type: "back" }
  | { type: "goto"; index: number };

export function createStepFlow(total: number): StepFlowState {
  return { stepIndex: 0, total: Math.max(0, total) };
}

function clamp(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(total - 1, index));
}

export function stepFlowReducer(state: StepFlowState, action: StepFlowAction): StepFlowState {
  switch (action.type) {
    case "next":
      return { ...state, stepIndex: clamp(state.stepIndex + 1, state.total) };
    case "back":
      return { ...state, stepIndex: clamp(state.stepIndex - 1, state.total) };
    case "goto":
      return { ...state, stepIndex: clamp(action.index, state.total) };
    default:
      return state;
  }
}

export const isFirstStep = (s: StepFlowState) => s.stepIndex <= 0;
export const isLastStep = (s: StepFlowState) => s.total > 0 && s.stepIndex >= s.total - 1;
export const stepProgressPercent = (s: StepFlowState) =>
  s.total <= 0 ? 0 : Math.round(((s.stepIndex + 1) / s.total) * 100);
