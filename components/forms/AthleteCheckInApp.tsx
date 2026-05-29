"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  NumberInput,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea
} from "@mantine/core";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FormField, PageHeader, SectionPanel, SemanticButton } from "@doneisbetter/gds/client";
import { Link, useRouter } from "@/i18n/navigation";
import { athleteIqPillars, getReadinessMessage, getReadinessMode, trackerQuestions } from "@/lib/readiness-model";
import { sectionsForMode } from "@/lib/readiness-schema";
import { computeAssessment } from "@/lib/scoring";
import type { AssessmentPayload, ScoreEntry } from "@/types/assessment";
import type { CheckInRecord } from "@/types/check-in";
import type { AthleteProfile } from "@/types/athlete";

const DRAFT_STORAGE_KEY = "habigoal-assessment-draft";
const LEGACY_DRAFT_STORAGE_KEYS = ["survey-draft", "kidex-draft"];

const emptyAssessment: AssessmentPayload = {
  childId: "",
  mode: "rapid",
  child: {
    name: "",
    birthDate: "",
    ageGroup: "",
    dominantHand: "",
    dominantEye: "",
    dominantFoot: "",
    knownTraits: "",
    parentSignals: ""
  },
  session: {
    date: new Date().toISOString().slice(0, 10),
    location: "",
    conductor: "",
    observers: "",
    groupSize: "",
    context: "structured",
    consentPhoto: false,
    consentReport: false
  },
  trainingLoad: {
    sessionType: "",
    durationMinutes: undefined,
    rpe: undefined,
    externalLoad: undefined
  },
  scores: {},
  notes: {
    general: "",
    movement: "",
    social: "",
    mental: "",
    adaptations: "",
    referral: ""
  },
  attachments: []
};

type SaveState = "idle" | "saving" | "saved" | "error";

type ChoiceOption = {
  value: number;
  label: string;
};

function cloneAssessment(source: AssessmentPayload): AssessmentPayload {
  return JSON.parse(JSON.stringify(source)) as AssessmentPayload;
}

function loadDraftAssessment(): AssessmentPayload {
  if (typeof window === "undefined") {
    return cloneAssessment(emptyAssessment);
  }

  const raw = localStorage.getItem(DRAFT_STORAGE_KEY) ?? LEGACY_DRAFT_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!raw) {
    return cloneAssessment(emptyAssessment);
  }

  try {
    return { ...cloneAssessment(emptyAssessment), ...JSON.parse(raw) };
  } catch {
    return cloneAssessment(emptyAssessment);
  }
}

async function parseApiError(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || null;
}

function getQuestionOptions(questionKey: string, translate: (key: string) => string): ChoiceOption[] {
  const fivePoint = [1, 2, 3, 4, 5];
  const options = (keys: string[]) => keys.map((key, index) => ({ value: fivePoint[index], label: translate(key) }));

  switch (questionKey) {
    case "sleep_hours":
      return [
        { value: 1, label: "<8h" },
        { value: 2, label: "8h" },
        { value: 3, label: "9h" },
        { value: 4, label: "10h" },
        { value: 5, label: "10h+" }
      ];
    case "sleep_quality":
      return options(["optionVeryPoor", "optionPoor", "optionOkay", "optionGood", "optionGreat"]);
    case "energy_level":
      return options(["optionFlat", "optionLow", "optionOkay", "optionReady", "optionFlying"]);
    case "body_feel":
      return options(["optionPain", "optionSore", "optionStiff", "optionGood", "optionFresh"]);
    case "fuel_hydration":
      return options(["optionMissed", "optionLow", "optionOkay", "optionGood", "optionLockedIn"]);
    case "mood_state":
      return options(["optionHeavy", "optionLow", "optionOkay", "optionGood", "optionPositive"]);
    case "stress_load":
      return options(["optionOverloaded", "optionTense", "optionManageable", "optionCalm", "optionLight"]);
    case "confidence_level":
      return options(["optionUnsure", "optionHesitant", "optionOkay", "optionConfident", "optionVeryConfident"]);
    case "focus_level":
      return options(["optionScattered", "optionDistracted", "optionOkay", "optionFocused", "optionSharp"]);
    default:
      return ["1", "2", "3", "4", "5"].map((label, index) => ({ value: fivePoint[index], label }));
  }
}

function getScore(entry?: ScoreEntry) {
  return typeof entry?.score === "number" ? entry.score : null;
}

function averageFromKeys(scores: AssessmentPayload["scores"], keys: string[]) {
  const values = keys
    .map((key) => scores[key]?.score)
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return null;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function buildSupportSummary(assessment: AssessmentPayload, translate: (key: string) => string) {
  const sleepHours = getScore(assessment.scores.sleep_hours);
  const energy = getScore(assessment.scores.energy_level);
  const bodyFeel = getScore(assessment.scores.body_feel);
  const fuelHydration = getScore(assessment.scores.fuel_hydration);
  const mood = getScore(assessment.scores.mood_state);
  const stress = getScore(assessment.scores.stress_load);
  const confidence = getScore(assessment.scores.confidence_level);
  const focus = getScore(assessment.scores.focus_level);

  const physical =
    bodyFeel !== null && bodyFeel <= 2
      ? translate("supportPhysicalPain")
      : sleepHours !== null && sleepHours <= 2
        ? translate("supportPhysicalSleep")
        : fuelHydration !== null && fuelHydration <= 2
          ? translate("supportPhysicalFuel")
          : energy !== null && energy <= 2
            ? translate("supportPhysicalEnergy")
            : translate("supportPhysicalStable");

  const mental =
    stress !== null && stress <= 2
      ? translate("supportMentalStress")
      : mood !== null && mood <= 2
        ? translate("supportMentalMood")
        : confidence !== null && confidence <= 2
          ? translate("supportMentalConfidence")
          : translate("supportMentalStable");

  const sportBrain =
    focus !== null && focus <= 2
      ? translate("supportSportBrainFocus")
      : confidence !== null && confidence <= 2
        ? translate("supportSportBrainConfidence")
        : translate("supportSportBrainStable");

  return { physical, mental, sportBrain };
}

export function AthleteCheckInApp() {
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const childIdParam = searchParams.get("childId");
  const idParam = searchParams.get("id");

  const [assessment, setAssessment] = useState<AssessmentPayload>(loadDraftAssessment);
  const [recordId, setRecordId] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [children, setChildren] = useState<AthleteProfile[]>([]);
  const initializedChildPrefill = useRef(false);

  const sections = sectionsForMode(assessment.mode);
  const computed = useMemo(() => computeAssessment(assessment), [assessment]);
  const answeredCount = useMemo(
    () => trackerQuestions.filter((question) => typeof assessment.scores[question.key]?.score === "number").length,
    [assessment.scores]
  );
  const progressPercent = Math.round((answeredCount / trackerQuestions.length) * 100);
  const greenChecks = useMemo(
    () =>
      trackerQuestions.filter((question) => {
        const score = assessment.scores[question.key]?.score;
        return typeof score === "number" && score >= 4;
      }).length,
    [assessment.scores]
  );
  const readinessResult = getReadinessMessage(greenChecks, trackerQuestions.length);
  const readinessMode = getReadinessMode(greenChecks, trackerQuestions.length);
  const readinessModeLabel = t(`readinessMode${readinessMode.charAt(0).toUpperCase()}${readinessMode.slice(1)}`);
  const domainScores = useMemo(
    () => ({
      physical: averageFromKeys(assessment.scores, trackerQuestions.filter((q) => q.pillarKey === "physical_pillar").map((q) => q.key)),
      mental: averageFromKeys(assessment.scores, trackerQuestions.filter((q) => q.pillarKey === "mental_pillar").map((q) => q.key)),
      sportBrain: averageFromKeys(assessment.scores, trackerQuestions.filter((q) => q.pillarKey === "sport_brain_pillar").map((q) => q.key))
    }),
    [assessment.scores]
  );
  const supportSummary = useMemo(() => buildSupportSummary(assessment, t), [assessment, t]);
  const nextSupportArea = useMemo(() => {
    const areas = [
      { key: "physical", value: domainScores.physical ?? 99, label: t("physicalShortLabel") },
      { key: "mental", value: domainScores.mental ?? 99, label: t("mentalShortLabel") },
      { key: "sportBrain", value: domainScores.sportBrain ?? 99, label: t("sportBrainShortLabel") }
    ];
    return areas.sort((a, b) => a.value - b.value)[0]?.label ?? t("physicalShortLabel");
  }, [domainScores, t]);

  useEffect(() => {
    void fetch("/api/athletes")
      .then((response) => response.json())
      .then((data: AthleteProfile[]) => setChildren(Array.isArray(data) ? data : []))
      .catch(() => setChildren([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(assessment));
  }, [assessment]);

  useEffect(() => {
    if (!idParam) return;
    void (async () => {
      const response = await fetch(`/api/check-ins/${idParam}`).catch(() => null);
      if (!response?.ok) return;
      const data = (await response.json()) as { assessment: CheckInRecord };
      setAssessment(data.assessment);
      setRecordId(data.assessment._id || "");
    })();
  }, [idParam]);

  useEffect(() => {
    if (!childIdParam) return;
    if (recordId) return;
    if (initializedChildPrefill.current) return;
    initializedChildPrefill.current = true;

    void (async () => {
      const response = await fetch(`/api/athletes/${childIdParam}`).catch(() => null);
      if (!response?.ok) return;
      const child = (await response.json()) as AthleteProfile;

      setAssessment(() => ({
        ...cloneAssessment(emptyAssessment),
        childId: childIdParam,
        child: {
          ...cloneAssessment(emptyAssessment).child,
          name: child.name || "",
          birthDate: child.birthDate || "",
          ageGroup: "",
          knownTraits: child.knownTraits || "",
          parentSignals: child.parentSignals || "",
          dominantHand: child.dominantHand || "",
          dominantEye: child.dominantEye || "",
          dominantFoot: child.dominantFoot || ""
        }
      }));
    })();
  }, [childIdParam, recordId]);

  function updateScore(key: string, score: number) {
    setAssessment((current) => ({
      ...current,
      scores: {
        ...current.scores,
        [key]: { ...(current.scores[key] || { score: "", note: "" }), score }
      }
    }));
    setSaveState("idle");
  }

  function updateGeneralNote(value: string) {
    setAssessment((current) => ({
      ...current,
      notes: {
        ...current.notes,
        general: value
      }
    }));
    setSaveState("idle");
  }

  function updateDate(value: string | null) {
    setAssessment((current) => ({
      ...current,
      session: {
        ...current.session,
        date: value || current.session.date
      }
    }));
    setSaveState("idle");
  }

  function updateTrainingLoad<K extends keyof AssessmentPayload["trainingLoad"]>(
    key: K,
    value: AssessmentPayload["trainingLoad"][K]
  ) {
    setAssessment((current) => ({
      ...current,
      trainingLoad: {
        ...current.trainingLoad,
        [key]: value
      }
    }));
    setSaveState("idle");
  }

  function selectChild(value: string | null) {
    const child = children.find((entry) => entry._id === value);
    if (!child || !value) return;

    setAssessment((current) => ({
      ...current,
      childId: value,
      child: {
        ...current.child,
        name: child.name || "",
        birthDate: child.birthDate || "",
        ageGroup: "",
        knownTraits: child.knownTraits || "",
        parentSignals: child.parentSignals || "",
        dominantHand: child.dominantHand || "",
        dominantEye: child.dominantEye || "",
        dominantFoot: child.dominantFoot || ""
      },
      session: {
        ...current.session,
        consentPhoto: Boolean(child.consentPhoto),
        consentReport: Boolean(child.consentReport)
      }
    }));
    setSaveState("idle");
  }

  async function saveAssessment() {
    setSaveState("saving");
    setMessage("");

    const url = recordId ? `/api/check-ins/${recordId}` : "/api/check-ins";
    const response = await fetch(url, {
      method: recordId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assessment)
    }).catch((error: Error) => {
      setMessage(error.message);
      return null;
    });

    if (!response?.ok) {
      setSaveState("error");
      const err = response ? await parseApiError(response) : null;
      setMessage(err ?? t("saveError"));
      return;
    }

    const data = (await response.json()) as { assessment: CheckInRecord };
    setRecordId(data.assessment._id || "");
    setSaveState("saved");
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    LEGACY_DRAFT_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    setMessage(t("saved"));

    const profileChildId = data.assessment.childId || childIdParam;
    if (profileChildId && !idParam) {
      router.replace(`/athletes/${profileChildId}`);
    }
  }

  function newAssessment() {
    setRecordId("");
    setAssessment((current) => ({
      ...cloneAssessment(emptyAssessment),
      childId: current.childId,
      child: {
        ...cloneAssessment(emptyAssessment).child,
        name: current.child.name,
        birthDate: current.child.birthDate,
        ageGroup: current.child.ageGroup,
        knownTraits: current.child.knownTraits,
        parentSignals: current.child.parentSignals,
        dominantHand: current.child.dominantHand,
        dominantEye: current.child.dominantEye,
        dominantFoot: current.child.dominantFoot
      }
    }));
    setSaveState("idle");
    setMessage("");
  }

  return (
    <Stack gap="lg" pb={96}>
      <PageHeader
        title={t("appTitle")}
        subtitle={t("appSubtitle")}
        actions={
          <Group gap="sm" grow>
            {childIdParam && !idParam ? (
              <Link href={`/athletes/${childIdParam}`} style={{ textDecoration: "none", flex: 1 }}>
                <SemanticButton action="back" variant="default" fullWidth />
              </Link>
            ) : null}
            <SemanticButton action="add" variant="default" onClick={newAssessment} style={{ flex: 1, fontWeight: 600 }} />
            <SemanticButton
              action={recordId ? "edit" : "save"}
              color="ingress"
              onClick={() => void saveAssessment()}
              loading={saveState === "saving"}
              style={{ flex: 1, fontWeight: 700 }}
            />
          </Group>
        }
      />

      {message ? (
        <Alert color={saveState === "error" ? "red" : saveState === "saved" ? "ingress" : "blue"} withCloseButton onClose={() => setMessage("")}>
          {message}
        </Alert>
      ) : null}

      <SectionPanel title={t("setupTitle")} description={t("setupSubtitle")}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label={t("childName")}
              placeholder={t("selectAthlete")}
              searchable
              value={assessment.childId || ""}
              data={children.map((child) => ({ value: child._id || "", label: `${child.name} (${child.surveyId || "-"})` })).filter((x) => x.value)}
              onChange={selectChild}
            />
            <TextInput
              label={tc("date")}
              value={assessment.session.date}
              type="date"
              onChange={(event) => updateDate(event.currentTarget.value)}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            <InfoChip label={t("knownTraits")} value={assessment.child.knownTraits || t("noExtraNotes")} />
            <InfoChip label={t("parentCoachSignals")} value={assessment.child.parentSignals || t("noExtraNotes")} />
            <InfoChip label={t("birthDate")} value={assessment.child.birthDate || tc("emptyValue")} />
          </SimpleGrid>
        </Stack>
      </SectionPanel>

      <SectionPanel title={t("trainingLoadTitle")} description={t("trainingLoadSubtitle")}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" verticalSpacing="lg">
          <FormField label={t("sessionType")}>
            <Select
              aria-label={t("sessionType")}
              value={assessment.trainingLoad.sessionType}
              data={[
                { value: "team", label: t("sessionTypeTeam") },
                { value: "match", label: t("sessionTypeMatch") },
                { value: "gym", label: t("sessionTypeGym") },
                { value: "recovery", label: t("sessionTypeRecovery") },
                { value: "individual", label: t("sessionTypeIndividual") }
              ]}
              onChange={(value) => updateTrainingLoad("sessionType", value || "")}
            />
          </FormField>
          <FormField label={t("durationMinutes")}>
            <NumberInput
              aria-label={t("durationMinutes")}
              value={assessment.trainingLoad.durationMinutes}
              onChange={(value) => updateTrainingLoad("durationMinutes", typeof value === "number" ? value : undefined)}
              min={0}
              max={360}
            />
          </FormField>
          <FormField label={t("rpe")}>
            <NumberInput
              aria-label={t("rpe")}
              value={assessment.trainingLoad.rpe}
              onChange={(value) => updateTrainingLoad("rpe", typeof value === "number" ? value : undefined)}
              min={1}
              max={10}
            />
          </FormField>
          <FormField label={t("externalLoad")} description={t("externalLoadDescription")}>
            <NumberInput
              aria-label={t("externalLoad")}
              value={assessment.trainingLoad.externalLoad}
              onChange={(value) => updateTrainingLoad("externalLoad", typeof value === "number" ? value : undefined)}
              min={0}
              max={50000}
            />
          </FormField>
        </SimpleGrid>
      </SectionPanel>

      <Paper withBorder p={{ base: "md", sm: "lg" }} radius="lg">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Box>
              <Text size="sm" c="dimmed" fw={600}>
                {t("dailyTrackerProgress")}
              </Text>
              <Text fw={800} size="lg">
                {t("answeredCount", { answered: answeredCount, total: trackerQuestions.length })}
              </Text>
            </Box>
            <Badge variant="light" color={readinessResult.mode === "full" ? "ingress" : readinessResult.mode === "moderate" ? "review" : "red"} size="lg">
              {t("greenChecksCount", { green: greenChecks, total: trackerQuestions.length })}
            </Badge>
          </Group>
          <Progress value={progressPercent} color="ingress" radius="xl" size="lg" />
          <Text size="sm" c="dimmed">
            {t("dailyTrackerRationale")}
          </Text>
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <MetricCard label={t("physicalReadinessMetric")} value={domainScores.physical} />
        <MetricCard label={t("mentalBalanceMetric")} value={domainScores.mental} />
        <MetricCard label={t("sportBrainMetric")} value={domainScores.sportBrain} />
      </SimpleGrid>

      {sections.map((section) => (
        <SectionPanel
          key={section.key}
          title={t(section.title)}
          description={t(athleteIqPillars.find((pillar) => pillar.key === section.key)?.prompt || section.title)}
        >
          <Stack gap="md">
            {section.items.map((item) => {
              const currentScore = getScore(assessment.scores[item.key]);
              const options = getQuestionOptions(item.key, t);

              return (
                <Paper key={item.key} withBorder p={{ base: "md", sm: "lg" }} radius="lg">
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="md" fw={700}>{t(item.title)}</Text>
                        <Text size="sm" c="dimmed">{t(item.prompt)}</Text>
                      </Box>
                      <Badge variant="light" color="ingress" size="lg">
                        {currentScore === null ? t("notSet") : `${currentScore}/5`}
                      </Badge>
                    </Group>

                    <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="xs">
                      {options.map((option) => {
                        const active = currentScore === option.value;
                        return (
                          <Button
                            key={`${item.key}-${option.value}`}
                            variant={active ? "filled" : "default"}
                            color="ingress"
                            onClick={() => updateScore(item.key, option.value)}
                            style={{ minHeight: 52, whiteSpace: "normal", textTransform: "none", letterSpacing: 0 }}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </SimpleGrid>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </SectionPanel>
      ))}

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SectionPanel title={t("supportTodayTitle")} description={t("lowestSupportArea", { area: nextSupportArea })}>
          <Stack gap="sm">
            <SupportCard title={t("physicalShortLabel")} body={supportSummary.physical} />
            <SupportCard title={t("mentalShortLabel")} body={supportSummary.mental} />
            <SupportCard title={t("sportBrainShortLabel")} body={supportSummary.sportBrain} />
          </Stack>
        </SectionPanel>

        <SectionPanel title={t("professionalNotes")} description={t("professionalNotesSubtitle")}>
          <Textarea
            label={t("shareWithCoach")}
            value={assessment.notes.general}
            onChange={(event) => updateGeneralNote(event.currentTarget.value)}
            minRows={8}
            placeholder={t("shareWithCoachPlaceholder")}
          />
        </SectionPanel>
      </SimpleGrid>

      <Paper
        withBorder
        p="md"
        radius="xl"
        style={{
          position: "sticky",
          bottom: 12,
          zIndex: 40,
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom))"
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Box>
              <Text size="sm" c="dimmed">{t("dailyReadiness")}</Text>
              <Text fw={700}>{t("completionCount", { done: computed.completion.done, total: computed.completion.total })}</Text>
            </Box>
            <Badge variant="light" color={readinessResult.mode === "full" ? "ingress" : readinessResult.mode === "moderate" ? "review" : "red"} size="lg">
              {readinessModeLabel}
            </Badge>
          </Group>
          <Group gap="md" grow>
            <SemanticButton action="add" variant="default" onClick={newAssessment} style={{ fontWeight: 600 }} />
            <SemanticButton
              action={recordId ? "edit" : "save"}
              color="ingress"
              onClick={() => void saveAssessment()}
              loading={saveState === "saving"}
              style={{ fontWeight: 700 }}
            />
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}

function MetricCard({ label, value }: { label: string; value: number | null }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed" fw={600}>{label}</Text>
      <Text size="xl" fw={800}>{value === null ? "—" : `${value.toFixed(1)}/5`}</Text>
    </Paper>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed" fw={600}>{label}</Text>
      <Text size="sm" fw={700}>{value}</Text>
    </Paper>
  );
}

function SupportCard({ title, body }: { title: string; body: string }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text fw={700}>{title}</Text>
      <Text size="sm" c="dimmed" mt={4}>{body}</Text>
    </Paper>
  );
}
