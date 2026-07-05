"use client";

import { useEffect, useReducer, useRef, type ReactNode } from "react";
import { Box, Group, Progress, SemanticButton, Stack } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { Text } from "@/components/gds/SurfacePrimitives";
import {
  createStepFlow,
  stepFlowReducer,
  isFirstStep,
  isLastStep,
  stepProgressPercent,
} from "@/lib/step-flow";
import { getProductColor } from "@/lib/product-ui-contracts";

export interface StepDef {
  id: string;
  /** Localized step title. */
  title: string;
  /** Step body. */
  render: () => ReactNode;
}

// Reusable mobile "Save & Next" wizard (#save-and-next, req 4): one topic per
// screen, a progress bar, and Back / Save & next (Finish on the last step). The
// step heading is focused on each change and the position is announced via an
// aria-live region so it works for keyboard + screen-reader users. Interim shell
// until the GDS Stepper (issue GH-502) is available.
export function StepFlow({
  steps,
  onComplete,
  busy = false,
}: {
  steps: StepDef[];
  /** Called when the user finishes the last step. */
  onComplete: () => void;
  busy?: boolean;
}) {
  const t = useTranslations("StepFlow");
  const [state, dispatch] = useReducer(stepFlowReducer, steps.length, createStepFlow);
  const headingRef = useRef<HTMLParagraphElement>(null);

  // Move focus to the new step's heading so keyboard/SR users land in context.
  useEffect(() => {
    headingRef.current?.focus();
  }, [state.stepIndex]);

  if (steps.length === 0) return null;
  const step = steps[Math.min(state.stepIndex, steps.length - 1)];
  const last = isLastStep(state);

  return (
    <Stack gap="md">
      <Box>
        <Group justify="space-between" mb={4}>
          <Text size="sm" c="dimmed" aria-live="polite">
            {t("stepStatus", { current: state.stepIndex + 1, total: state.total })}
          </Text>
          <Text size="sm" c="dimmed">{stepProgressPercent(state)}%</Text>
        </Group>
        <Progress value={stepProgressPercent(state)} aria-hidden />
      </Box>

      <Box component="section" aria-labelledby={`step-${step.id}`}>
        <Text id={`step-${step.id}`} ref={headingRef} tabIndex={-1} fw={800} size="lg" mb="sm">
          {step.title}
        </Text>
        {step.render()}
      </Box>

      <Group justify="space-between" wrap="nowrap">
        <SemanticButton
          action="back"
          variant="default"
          disabled={isFirstStep(state) || busy}
          onClick={() => dispatch({ type: "back" })}
        />
        {last ? (
          <SemanticButton action="save" color={getProductColor("dashboard", "primaryAction")} loading={busy} onClick={onComplete}>
            {t("finish")}
          </SemanticButton>
        ) : (
          <SemanticButton action="start" color={getProductColor("dashboard", "primaryAction")} disabled={busy} onClick={() => dispatch({ type: "next" })}>
            {t("saveNext")}
          </SemanticButton>
        )}
      </Group>
    </Stack>
  );
}
