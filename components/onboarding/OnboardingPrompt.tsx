"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, createGdsVocabularyPack, GdsIcons, Group, Modal, Progress, SemanticButton, Stack, StateBlock } from "@doneisbetter/gds/client";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { buildOnboardingPromptModel, type OnboardingPromptProps } from "@/lib/onboarding-prompt";
import type { OnboardingEventType, OnboardingModuleView } from "@/types/onboarding";

export function OnboardingPrompt({ module, state, errorMessage, onDismiss, onComplete, onSnooze, onRetry }: OnboardingPromptProps) {
  const t = useTranslations("Onboarding");
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const model = buildOnboardingPromptModel(module, state, { onRetry, onSnooze });
  const title = module.title || t("defaults.moduleTitle");
  const body = module.body || t("defaults.moduleBody");
  const checklistTitle = module.checklistTitle || t("defaults.checklistTitle");
  const snoozeActionPack = useMemo(
    () =>
      createGdsVocabularyPack("onboarding", {
        snooze: {
          defaultMessage: t("actions.snooze"),
          icon: GdsIcons.Pause
        }
      }),
    [t]
  );

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      previousFocusRef.current?.focus();
    };
  }, [module.id]);

  if (!model.rendersModal && model.stateBlock) {
    return (
      <Box role="status" aria-live="polite">
        <StateBlock variant={model.stateBlock.variant} title={t(`states.${model.stateBlock.titleKey}`)} description={t(`states.${model.stateBlock.bodyKey}`)} compact />
      </Box>
    );
  }

  return (
    <Modal opened onClose={onDismiss} title={title} centered closeOnEscape aria-describedby={`${module.id}-description`}>
      <Stack gap="md">
        <p id={`${module.id}-description`} style={{ margin: 0, color: "var(--mantine-color-dimmed)" }}>
          {body}
        </p>
        {model.rendersChecklist ? (
          <>
            <Box aria-label={`${checklistTitle} ${model.progressValue}%`}>
              <Group justify="space-between" mb="xs">
                <strong>{checklistTitle}</strong>
                <Badge variant="light">{model.progressValue}%</Badge>
              </Group>
              <Progress value={model.progressValue} aria-hidden />
            </Box>
            {model.rendersEmptyState ? (
              <StateBlock variant="empty" title={t("states.emptyTitle")} description={t("states.emptyBody")} compact />
            ) : (
              <Stack gap="sm">
                {module.steps.map((step) => {
                  const done = module.completedStepIds.includes(step.id) || state === "completed";
                  return (
                    <Box key={step.id} p="sm" style={{ border: "1px solid var(--gds-color-border, var(--mantine-color-default-border))", borderRadius: "var(--mantine-radius-sm)" }}>
                      <Group justify="space-between" align="flex-start" gap="sm" wrap="wrap">
                        <Stack gap={2} style={{ minWidth: 0, flex: "1 1 14rem" }}>
                          <strong>{step.title}</strong>
                          <span style={{ color: "var(--mantine-color-dimmed)", fontSize: "0.875rem" }}>{step.body}</span>
                        </Stack>
                        <Badge color={done ? "green" : "blue"} variant="light">
                          {done ? t("status.done") : t("status.next")}
                        </Badge>
                      </Group>
                      {!done && model.canCompleteStep ? (
                        <Group mt="sm">
                          <SemanticButton
                            action="complete"
                            size="sm"
                            variant="light"
                            disabled={model.disablesActions}
                            onClick={() => onComplete(step.id)}
                          />
                        </Group>
                      ) : null}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </>
        ) : null}
        {model.stateBlock ? (
          <StateBlock
            variant={model.stateBlock.variant}
            title={state === "error" && errorMessage ? errorMessage : t(`states.${model.stateBlock.titleKey}`)}
            description={t(`states.${model.stateBlock.bodyKey}`)}
            compact
          />
        ) : null}
        <Group justify="flex-end">
          {model.canRetry && onRetry ? <SemanticButton action="refresh" variant="light" onClick={onRetry} /> : null}
          {model.canSnooze && onSnooze ? <SemanticButton action="onboarding:snooze" variant="subtle" onClick={onSnooze} disabled={model.disablesActions} vocabularyPacks={[snoozeActionPack]} /> : null}
          {model.canDismiss ? <SemanticButton action="cancel" variant="subtle" onClick={onDismiss} disabled={model.disablesActions} /> : null}
          {model.canCompleteModule ? <SemanticButton action="complete" onClick={() => onComplete()} disabled={model.disablesActions} /> : null}
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
          onSnooze={() => void postEvent("snoozed")}
          onRetry={() => void loadState()}
        />
      ) : null}
    </>
  );
}
