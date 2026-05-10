"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
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
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { athleteIqPillars, getReadinessMessage, getReadinessMode, trackerQuestions } from "@/lib/athlete-iq-survey";
import { sectionsForMode } from "@/lib/survey-schema";
import { computeAssessment } from "@/lib/scoring";
import type { AssessmentPayload, AssessmentRecord, ScoreEntry } from "@/types/assessment";
import type { ChildProfile } from "@/repositories/child.repository";

const DRAFT_STORAGE_KEY = "survey-draft";
const LEGACY_DRAFT_STORAGE_KEY = "kidex-draft";

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

  const raw = localStorage.getItem(DRAFT_STORAGE_KEY) ?? localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY);
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

function getQuestionOptions(questionKey: string): ChoiceOption[] {
  const fivePoint = [1, 2, 3, 4, 5];

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
      return ["Very poor", "Poor", "Okay", "Good", "Great"].map((label, index) => ({ value: fivePoint[index], label }));
    case "energy_level":
      return ["Flat", "Low", "Okay", "Ready", "Flying"].map((label, index) => ({ value: fivePoint[index], label }));
    case "body_feel":
      return ["Pain", "Sore", "Stiff", "Good", "Fresh"].map((label, index) => ({ value: fivePoint[index], label }));
    case "fuel_hydration":
      return ["Missed", "Low", "Okay", "Good", "Locked in"].map((label, index) => ({ value: fivePoint[index], label }));
    case "mood_state":
      return ["Heavy", "Low", "Okay", "Good", "Positive"].map((label, index) => ({ value: fivePoint[index], label }));
    case "stress_load":
      return ["Overloaded", "Tense", "Manageable", "Calm", "Light"].map((label, index) => ({ value: fivePoint[index], label }));
    case "confidence_level":
      return ["Unsure", "Hesitant", "Okay", "Confident", "Very confident"].map((label, index) => ({ value: fivePoint[index], label }));
    case "focus_level":
      return ["Scattered", "Distracted", "Okay", "Focused", "Sharp"].map((label, index) => ({ value: fivePoint[index], label }));
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

function buildSupportSummary(assessment: AssessmentPayload) {
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
      ? "Flag pain or heavy soreness early and reduce explosive load today."
      : sleepHours !== null && sleepHours <= 2
        ? "Protect sleep tonight with an earlier wind-down and lighter recovery work."
        : fuelHydration !== null && fuelHydration <= 2
          ? "Make the next support win simple: water bottle, breakfast or snack, and a recovery meal."
          : energy !== null && energy <= 2
            ? "Keep volume lower and prioritize mobility, easy touches, and recovery between blocks."
            : "Physical habits look stable. Keep the same sleep, fuel, and recovery rhythm today.";

  const mental =
    stress !== null && stress <= 2
      ? "Lower pressure today. Give one clear goal and add a short breathing reset before training."
      : mood !== null && mood <= 2
        ? "Check in with the athlete before pushing intensity. Connection first, challenge second."
        : confidence !== null && confidence <= 2
          ? "Start with easy success reps to rebuild trust before harder competitive tasks."
          : "Mental state looks steady. Keep communication simple, calm, and specific.";

  const sportBrain =
    focus !== null && focus <= 2
      ? "Use one coaching cue only, shorter blocks, and a demo-first approach to sharpen focus."
      : confidence !== null && confidence <= 2
        ? "Keep decisions simple early, then add complexity after the first successful actions."
        : "Sport-brain readiness looks solid. Progress to decision-making and learning tasks normally.";

  return { physical, mental, sportBrain };
}

export function SurveyAssessmentApp() {
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const searchParams = useSearchParams();
  const childIdParam = searchParams.get("childId");
  const idParam = searchParams.get("id");

  const [assessment, setAssessment] = useState<AssessmentPayload>(loadDraftAssessment);
  const [recordId, setRecordId] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [children, setChildren] = useState<ChildProfile[]>([]);
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
  const supportSummary = useMemo(() => buildSupportSummary(assessment), [assessment]);
  const nextSupportArea = useMemo(() => {
    const areas = [
      { key: "physical", value: domainScores.physical ?? 99, label: "Physical" },
      { key: "mental", value: domainScores.mental ?? 99, label: "Mental" },
      { key: "sportBrain", value: domainScores.sportBrain ?? 99, label: "Sport brain" }
    ];
    return areas.sort((a, b) => a.value - b.value)[0]?.label ?? "Physical";
  }, [domainScores]);

  useEffect(() => {
    void fetch("/api/children")
      .then((response) => response.json())
      .then((data: ChildProfile[]) => setChildren(Array.isArray(data) ? data : []))
      .catch(() => setChildren([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(assessment));
  }, [assessment]);

  useEffect(() => {
    if (!idParam) return;
    void (async () => {
      const response = await fetch(`/api/assessments/${idParam}`).catch(() => null);
      if (!response?.ok) return;
      const data = (await response.json()) as { assessment: AssessmentRecord };
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
      const response = await fetch(`/api/children/${childIdParam}`).catch(() => null);
      if (!response?.ok) return;
      const child = (await response.json()) as ChildProfile;

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

    const url = recordId ? `/api/assessments/${recordId}` : "/api/assessments";
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

    const data = (await response.json()) as { assessment: AssessmentRecord };
    setRecordId(data.assessment._id || "");
    setSaveState("saved");
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setMessage(t("saved"));
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
            <Button variant="default" onClick={newAssessment} style={{ flex: 1, fontWeight: 600 }}>
              {tc("new")}
            </Button>
            <Button color="ingress" onClick={() => void saveAssessment()} disabled={saveState === "saving"} style={{ flex: 1, fontWeight: 700 }}>
              {saveState === "saving" ? tc("saving") : recordId ? tc("update") : tc("save")}
            </Button>
          </Group>
        }
      />

      {message ? (
        <Alert color={saveState === "error" ? "red" : saveState === "saved" ? "ingress" : "blue"} withCloseButton onClose={() => setMessage("")}>
          {message}
        </Alert>
      ) : null}

      <SectionCard title={t("setupTitle")} subheader="Keep this daily check-in under 2 minutes.">
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
            <InfoChip label="Known traits" value={assessment.child.knownTraits || "No extra notes"} />
            <InfoChip label="Parent or coach signals" value={assessment.child.parentSignals || "No extra notes"} />
            <InfoChip label="Birth date" value={assessment.child.birthDate || tc("emptyValue")} />
          </SimpleGrid>
        </Stack>
      </SectionCard>

      <Paper withBorder p={{ base: "md", sm: "lg" }} radius="lg">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Box>
              <Text size="sm" c="dimmed" fw={600}>
                Daily tracker progress
              </Text>
              <Text fw={800} size="lg">
                {answeredCount}/{trackerQuestions.length} answered
              </Text>
            </Box>
            <Badge variant="light" color={readinessResult.mode === "full" ? "ingress" : readinessResult.mode === "moderate" ? "review" : "red"} size="lg">
              {greenChecks}/{trackerQuestions.length} green
            </Badge>
          </Group>
          <Progress value={progressPercent} color="ingress" radius="xl" size="lg" />
          <Text size="sm" c="dimmed">
            Youth-athlete wellness monitoring most commonly centers on sleep, fatigue or energy, soreness, stress or mood, and focus. This version keeps the tracker to those daily signals plus fuel support.
          </Text>
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <MetricCard label="Physical readiness" value={domainScores.physical} />
        <MetricCard label="Mental balance" value={domainScores.mental} />
        <MetricCard label="Sport brain" value={domainScores.sportBrain} />
      </SimpleGrid>

      {sections.map((section) => (
        <SectionCard
          key={section.key}
          title={t(section.title)}
          subheader={t(athleteIqPillars.find((pillar) => pillar.key === section.key)?.prompt || section.title)}
        >
          <Stack gap="md">
            {section.items.map((item) => {
              const currentScore = getScore(assessment.scores[item.key]);
              const options = getQuestionOptions(item.key);

              return (
                <Paper key={item.key} withBorder p={{ base: "md", sm: "lg" }} radius="lg">
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="md" fw={700}>{t(item.title)}</Text>
                        <Text size="sm" c="dimmed">{t(item.prompt)}</Text>
                      </Box>
                      <Badge variant="light" color="ingress" size="lg">
                        {currentScore === null ? "Not set" : `${currentScore}/5`}
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
        </SectionCard>
      ))}

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SectionCard title="Support today" subheader={`Lowest support area right now: ${nextSupportArea}.`}>
          <Stack gap="sm">
            <SupportCard title="Physical" body={supportSummary.physical} />
            <SupportCard title="Mental" body={supportSummary.mental} />
            <SupportCard title="Sport brain" body={supportSummary.sportBrain} />
          </Stack>
        </SectionCard>

        <SectionCard title={t("professionalNotes")} subheader="Optional context the coach should know before training.">
          <Textarea
            label="Anything to share with the coach today?"
            value={assessment.notes.general}
            onChange={(event) => updateGeneralNote(event.currentTarget.value)}
            minRows={8}
            placeholder="Examples: poor sleep after travel, school exam day, knee soreness, low confidence, hard focus."
          />
        </SectionCard>
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
              <Text size="sm" c="dimmed">Daily readiness</Text>
              <Text fw={700}>{computed.completion.done}/{computed.completion.total} complete</Text>
            </Box>
            <Badge variant="light" color={readinessResult.mode === "full" ? "ingress" : readinessResult.mode === "moderate" ? "review" : "red"} size="lg">
              {readinessModeLabel}
            </Badge>
          </Group>
          <Group gap="md" grow>
            <Button variant="default" onClick={newAssessment} style={{ fontWeight: 600 }}>
              {tc("new")}
            </Button>
            <Button color="ingress" onClick={() => void saveAssessment()} disabled={saveState === "saving"} style={{ fontWeight: 700 }}>
              {saveState === "saving" ? tc("saving") : recordId ? tc("update") : tc("save")}
            </Button>
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
