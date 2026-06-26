"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, Group, Modal, Progress, SemanticButton, Stack, StateBlock } from "@doneisbetter/gds/client";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { OnboardingEventType, OnboardingModuleView } from "@/types/onboarding";

type OnboardingPromptProps = {
  module: OnboardingModuleView;
  state: "ready" | "submitting" | "error";
  errorMessage?: string;
  onDismiss: () => void;
  onComplete: (stepId?: string) => void;
  onRetry: () => void;
};

export function OnboardingPrompt({ module, state, errorMessage, onDismiss, onComplete, onRetry }: OnboardingPromptProps) {
  const t = useTranslations("Onboarding");
  const closeRef = useRef<HTMLButtonElement>(null);
  const completedCount = module.completedStepIds.length;
  const progressValue = module.steps.length ? Math.round((completedCount / module.steps.length) * 100) : 0;

  useEffect(() => {
    closeRef.current?.focus();
  }, [module.id]);

  return (
    <Modal opened onClose={onDismiss} title={module.title} centered closeOnEscape aria-describedby={`${module.id}-description`}>
      <Stack gap="md">
        <p id={`${module.id}-description`} style={{ margin: 0, color: "var(--mantine-color-dimmed)" }}>
          {module.body}
        </p>
        <Box aria-label={`${module.checklistTitle || t("defaults.checklistTitle")} ${progressValue}%`}>
          <Group justify="space-between" mb="xs">
            <strong>{module.checklistTitle || t("defaults.checklistTitle")}</strong>
            <Badge variant="light">{progressValue}%</Badge>
          </Group>
          <Progress value={progressValue} aria-hidden />
        </Box>
        <Stack gap="sm">
          {module.steps.map((step) => {
            const done = module.completedStepIds.includes(step.id);
            return (
              <Box key={step.id} p="sm" style={{ border: "1px solid var(--gds-color-border, var(--mantine-color-default-border))", borderRadius: "var(--mantine-radius-sm)" }}>
                <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                  <Stack gap={2}>
                    <strong>{step.title}</strong>
                    <span style={{ color: "var(--mantine-color-dimmed)", fontSize: "0.875rem" }}>{step.body}</span>
                  </Stack>
                  <Badge color={done ? "green" : "blue"} variant="light">
                    {done ? t("status.done") : t("status.next")}
                  </Badge>
                </Group>
                {!done ? (
                  <Group mt="sm">
                    <SemanticButton
                      action="complete"
                      size="sm"
                      variant="light"
                      disabled={state === "submitting"}
                      onClick={() => onComplete(step.id)}
                    />
                  </Group>
                ) : null}
              </Box>
            );
          })}
        </Stack>
        {state === "error" ? <StateBlock variant="error" title={errorMessage || "Onboarding update failed"} /> : null}
        <Group justify="flex-end">
          {state === "error" ? <SemanticButton action="refresh" variant="light" onClick={onRetry} /> : null}
          <SemanticButton action="cancel" variant="subtle" onClick={onDismiss} disabled={state === "submitting"} />
          <SemanticButton action="complete" onClick={() => onComplete()} disabled={state === "submitting"} />
        </Group>
      </Stack>
    </Modal>
  );
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [modules, setModules] = useState<OnboardingModuleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeModule = useMemo(
    () => modules.find((module) => module.state !== "completed" && module.state !== "dismissed" && module.state !== "snoozed"),
    [modules]
  );

  const loadState = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/onboarding/state?route=${encodeURIComponent(pathname)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load onboarding state");
      const payload = await response.json();
      setModules(Array.isArray(payload.modules) ? payload.modules : []);
    } catch (loadError) {
      setError((loadError as Error).message);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  const postEvent = useCallback(async (event: OnboardingEventType, stepId?: string) => {
    if (!activeModule) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: activeModule.id,
          event,
          route: pathname,
          stepId,
          idempotencyKey: `${activeModule.id}:${event}:${stepId || "module"}:${pathname}`
        })
      });
      if (!response.ok) throw new Error("Unable to update onboarding state");
      const payload = await response.json();
      setModules(Array.isArray(payload.modules) ? payload.modules : []);
    } catch (postError) {
      setError((postError as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [activeModule, pathname]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadState();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadState]);

  useEffect(() => {
    if (!activeModule || activeModule.state !== "eligible") return;
    const timeout = window.setTimeout(() => {
      void postEvent("shown");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeModule, postEvent]);

  return (
    <>
      {children}
      {!loading && activeModule ? (
        <OnboardingPrompt
          module={activeModule}
          state={submitting ? "submitting" : error ? "error" : "ready"}
          errorMessage={error}
          onDismiss={() => void postEvent("dismissed")}
          onComplete={(stepId) => void postEvent("completed", stepId)}
          onRetry={() => void loadState()}
        />
      ) : null}
    </>
  );
}
