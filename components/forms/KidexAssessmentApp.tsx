"use client";

import type { ReactNode } from "react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import MuiSelect from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { sectionsForMode } from "@/lib/kidex-schema";
import { computeAssessment } from "@/lib/scoring";
import { calculateAgeGroup } from "@/lib/utils/age";
import { getStandardForAgeGroup } from "@/lib/standards";
import { formatScore } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { SectionCard } from "@/components/ui/SectionCard";
import { getSettings, saveSettings } from "@/services/settings-service";
import { getConductors, getObservers } from "@/services/user-service";
import type { AssessmentPayload, AssessmentRecord, EvidenceAttachment, ScoreEntry } from "@/types/assessment";

const DRAFT_STORAGE_KEY = "kidex-draft";

const emptyAssessment: AssessmentPayload = {
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
    groupSize: "6-8",
    context: "event",
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

function cloneAssessment(source: AssessmentPayload): AssessmentPayload {
  return JSON.parse(JSON.stringify(source)) as AssessmentPayload;
}

function scoreValue(entry?: ScoreEntry) {
  return typeof entry?.score === "number" ? entry.score : "";
}

function loadDraftAssessment(): AssessmentPayload {
  if (typeof window === "undefined") {
    return cloneAssessment(emptyAssessment);
  }

  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
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

function domainChipColor(domain: string): "default" | "primary" | "secondary" | "warning" {
  if (domain === "social") return "primary";
  if (domain === "mental") return "warning";
  return "default";
}

export function KidexAssessmentApp() {
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");

  const [assessment, setAssessment] = useState<AssessmentPayload>(loadDraftAssessment);
  const [recordId, setRecordId] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const [conductors, setConductors] = useState<string[]>([]);
  const [observers, setObservers] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const sections = sectionsForMode(assessment.mode);
  const computed = useMemo(() => computeAssessment(assessment), [assessment]);
  const standard = getStandardForAgeGroup(assessment.child.ageGroup);
  const conductorOptions = useMemo(() => conductors.map((name) => ({ id: name, name })), [conductors]);
  const observerOptions = useMemo(() => observers.map((name) => ({ id: name, name })), [observers]);
  const locationOptions = useMemo(() => locations.map((name) => ({ id: name, name })), [locations]);

  useEffect(() => {
    void Promise.all([getSettings(), getConductors(), getObservers()]).then(([settingsData, conductorUsers, observerUsers]) => {
      const allConductors = Array.from(new Set(conductorUsers.map((user) => user.name)));
      const allObservers = Array.from(new Set(observerUsers.map((user) => user.name)));

      setConductors(allConductors);
      setObservers(allObservers);
      setLocations(settingsData.locations);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(assessment));
  }, [assessment]);

  function update<T extends keyof AssessmentPayload>(group: T, key: keyof AssessmentPayload[T], value: unknown) {
    setAssessment((current) => {
      const next = {
        ...current,
        [group]: {
          ...(current[group] as object),
          [key]: value
        }
      };

      if (group === "child" && key === "birthDate") {
        const ageGroup = calculateAgeGroup(value as string);
        next.child.ageGroup = ageGroup || "";
      }

      return next;
    });
    setSaveState("idle");
  }

  function updateScore(key: string, patch: Partial<ScoreEntry>) {
    setAssessment((current) => ({
      ...current,
      scores: {
        ...current.scores,
        [key]: { ...(current.scores[key] || { score: "", note: "" }), ...patch }
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

    const settings = await getSettings();
    await saveSettings({ ...settings, locations });

    setMessage(t("saved"));
  }

  function newAssessment() {
    setRecordId("");
    setAssessment(cloneAssessment(emptyAssessment));
    setSaveState("idle");
    setMessage("");
  }

  function appendLocationIfMissing(value: string) {
    setLocations((current) => (value && !current.includes(value) ? [...current, value] : current));
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!assessment.session.consentPhoto) {
      setMessage(t("consentRequired"));
      return;
    }
    setUploading(true);
    setMessage("");
    const form = new FormData();
    form.set("image", file);
    const response = await fetch("/api/uploads/imgbb", { method: "POST", body: form }).catch((error: Error) => {
      setMessage(error.message);
      return null;
    });
    setUploading(false);
    if (!response?.ok) {
      const err = response ? await parseApiError(response) : null;
      setMessage(err ?? t("uploadFailed"));
      return;
    }
    const data = (await response.json()) as { attachment: EvidenceAttachment };
    setAssessment((current) => ({
      ...current,
      attachments: [...current.attachments, data.attachment]
    }));
    setMessage(t("uploadSuccess"));
  }

  function removeAttachment(id: string) {
    setAssessment((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== id)
    }));
  }

  const strengths = Object.entries(assessment.scores)
    .filter(([, entry]) => typeof entry.score === "number" && entry.score >= 5)
    .slice(0, 3);
  const needs = Object.entries(assessment.scores)
    .filter(([, entry]) => typeof entry.score === "number" && entry.score <= 2)
    .slice(0, 3);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "flex-start" } }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            {t("appSubtitle")}
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            {t("appTitle")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={newAssessment}>
            {tc("new")}
          </Button>
          <Button variant="contained" onClick={() => void saveAssessment()} disabled={saveState === "saving"}>
            {saveState === "saving" ? tc("saving") : recordId ? tc("update") : tc("save")}
          </Button>
        </Stack>
      </Stack>

      {message ? (
        <Alert
          severity={saveState === "error" ? "error" : saveState === "saved" ? "success" : "info"}
          onClose={() => setMessage("")}
        >
          {message}
        </Alert>
      ) : null}

      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
        <MetricCard label={ts("movement")} value={formatScore(computed.movementAverage)} target={standard?.movement.target} />
        <MetricCard label={ts("social")} value={formatScore(computed.socialAverage)} target={standard?.social.target} />
        <MetricCard label={ts("mental")} value={formatScore(computed.mentalAverage)} target={standard?.mental.target} />
        <MetricCard label="SKI" value={formatScore(computed.ski)} target={standard?.ski.target} />
      </Stack>

      <Stack spacing={2} id="setup">
        <SectionCard title={t("setupTitle")}>
          <Stack direction="row" spacing={2} useFlexGap sx={{ width: "100%", flexWrap: "wrap" }}>
            <FieldWrap>
              <TextField label={t("childName")} value={assessment.child.name} onChange={(e) => update("child", "name", e.target.value)} fullWidth />
            </FieldWrap>
            <FieldWrap>
              <TextField
                label={t("birthDate")}
                type="date"
                value={assessment.child.birthDate}
                onChange={(e) => update("child", "birthDate", e.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FieldWrap>
            <FieldWrap>
              <FormControl fullWidth disabled={!assessment.child.birthDate}>
                <InputLabel id="age-group-label">{t("ageGroup")}</InputLabel>
                <MuiSelect
                  labelId="age-group-label"
                  label={t("ageGroup")}
                  value={assessment.child.ageGroup}
                  onChange={(e) => update("child", "ageGroup", e.target.value)}
                >
                  <MenuItem value="">{t("ageGroupPending")}</MenuItem>
                  <MenuItem value="4-6">4-6</MenuItem>
                  <MenuItem value="7-9">7-9</MenuItem>
                  <MenuItem value="10-12">10-12</MenuItem>
                </MuiSelect>
              </FormControl>
            </FieldWrap>
            <FieldWrap>
              <FormControl fullWidth>
                <InputLabel id="mode-label">{t("mode")}</InputLabel>
                <MuiSelect
                  labelId="mode-label"
                  label={t("mode")}
                  value={assessment.mode}
                  onChange={(e) =>
                    setAssessment((current) => ({ ...current, mode: e.target.value as AssessmentPayload["mode"] }))
                  }
                >
                  <MenuItem value="rapid">{t("modeRapid")}</MenuItem>
                  <MenuItem value="full">{t("modeFull")}</MenuItem>
                </MuiSelect>
              </FormControl>
            </FieldWrap>
            <FieldWrap>
              <SearchableSelect label={t("conductor")} value={assessment.session.conductor} options={conductorOptions} onChange={(value) => update("session", "conductor", value)} />
            </FieldWrap>
            <FieldWrap>
              <SearchableSelect
                label={t("location")}
                value={assessment.session.location}
                options={locationOptions}
                onChange={(value) => {
                  appendLocationIfMissing(value);
                  update("session", "location", value);
                }}
                allowAdd
              />
            </FieldWrap>
            <FieldWrap>
              <SearchableSelect label={t("observers")} value={assessment.session.observers} options={observerOptions} onChange={(value) => update("session", "observers", value)} />
            </FieldWrap>
            <FieldWrap>
              <FormControl fullWidth>
                <InputLabel id="context-label">{t("context")}</InputLabel>
                <MuiSelect
                  labelId="context-label"
                  label={t("context")}
                  value={assessment.session.context}
                  onChange={(e) => update("session", "context", e.target.value)}
                >
                  <MenuItem value="event">{t("contextEvent")}</MenuItem>
                  <MenuItem value="structured">{t("contextStructured")}</MenuItem>
                  <MenuItem value="spontaneous">{t("contextSpontaneous")}</MenuItem>
                  <MenuItem value="mixed">{t("contextMixed")}</MenuItem>
                </MuiSelect>
              </FormControl>
            </FieldWrap>
            <FieldWide>
              <TextField label={t("knownTraits")} value={assessment.child.knownTraits} onChange={(e) => update("child", "knownTraits", e.target.value)} fullWidth multiline minRows={2} />
            </FieldWide>
            <FieldWide>
              <TextField label={t("parentSignals")} value={assessment.child.parentSignals} onChange={(e) => update("child", "parentSignals", e.target.value)} fullWidth multiline minRows={2} />
            </FieldWide>
            <FieldWide>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <FormControlLabel control={<Checkbox checked={assessment.session.consentPhoto} onChange={(e) => update("session", "consentPhoto", e.target.checked)} />} label={t("consentPhoto")} />
                <FormControlLabel control={<Checkbox checked={assessment.session.consentReport} onChange={(e) => update("session", "consentReport", e.target.checked)} />} label={t("consentReport")} />
              </Stack>
            </FieldWide>
          </Stack>
        </SectionCard>

        <SectionCard title={t("evidenceImages")}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {t("uploadSecurityNote")}
            </Typography>
            <Button variant="outlined" component="label" disabled={!assessment.session.consentPhoto || uploading}>
              <input type="file" accept="image/*" hidden onChange={(e) => void uploadImage(e)} disabled={!assessment.session.consentPhoto || uploading} />
              {uploading ? t("uploading") : t("uploadImage")}
            </Button>
            {assessment.attachments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("noImages")}
              </Typography>
            ) : (
              <Stack spacing={2} divider={<Divider flexItem />}>
                {assessment.attachments.map((attachment) => (
                  <Stack key={attachment.id} direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
                    <Image src={attachment.thumbUrl || attachment.url} alt={attachment.name || "Image"} width={160} height={120} unoptimized />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Link href={attachment.url} target="_blank" rel="noreferrer" variant="body2">
                        {attachment.name || "Image"}
                      </Link>
                    </Box>
                    <Button variant="outlined" color="inherit" onClick={() => removeAttachment(attachment.id)}>
                      {tc("remove")}
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </SectionCard>
      </Stack>

      <div id="scoring" />
      {sections.map((section, sectionIndex) => (
        <SectionCard
          key={section.key}
          title={`${ts(section.key)} (${Math.round(section.weight * 100)}%)`}
          action={<Chip label={ts(section.domain)} size="small" color={domainChipColor(section.domain)} variant={section.domain === "movement" ? "outlined" : "filled"} />}
        >
          <Stack divider={<Divider flexItem />} spacing={2}>
            {section.items.map((item, itemIndex) => {
              const entry = assessment.scores[item.key];
              return (
                <Stack key={item.key} direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "flex-start" } }}>
                  <Typography variant="subtitle2" sx={{ width: { md: 40 }, flexShrink: 0, pt: 1 }}>
                    {sectionIndex * 25 + itemIndex + 1}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {ts(`${item.key}.title`)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {ts(`${item.key}.prompt`)}
                    </Typography>
                    <TextField
                      value={entry?.note || ""}
                      onChange={(e) => updateScore(item.key, { note: e.target.value })}
                      placeholder={t("observationNote")}
                      fullWidth
                      multiline
                      minRows={2}
                    />
                  </Box>
                  <FormControl sx={{ minWidth: 80 }} size="small">
                    <MuiSelect
                      displayEmpty
                      value={scoreValue(entry) === "" ? "" : String(scoreValue(entry))}
                      onChange={(e) =>
                        updateScore(item.key, { score: e.target.value ? Number(e.target.value) : "" })
                      }
                      slotProps={{ input: { "aria-label": t("observationNote") } }}
                      renderValue={(selected) => (selected === "" ? "–" : selected)}
                    >
                      <MenuItem value="">
                        <em>–</em>
                      </MenuItem>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <MenuItem key={n} value={String(n)}>
                          {n}
                        </MenuItem>
                      ))}
                    </MuiSelect>
                  </FormControl>
                </Stack>
              );
            })}
          </Stack>
        </SectionCard>
      ))}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ alignItems: "stretch" }} id="report">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionCard title={t("professionalNotes")}>
            <Stack spacing={2}>
              <TextField label={t("generalObservation")} value={assessment.notes.general} onChange={(e) => update("notes", "general", e.target.value)} fullWidth multiline minRows={3} />
              <TextField label={t("adaptationNeeds")} value={assessment.notes.adaptations} onChange={(e) => update("notes", "adaptations", e.target.value)} fullWidth multiline minRows={3} />
              <TextField label={t("referralNote")} value={assessment.notes.referral} onChange={(e) => update("notes", "referral", e.target.value)} fullWidth multiline minRows={3} />
            </Stack>
          </SectionCard>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionCard title={t("reportPreview")}>
            <ReportList title={t("strengths")} items={strengths.map(([key, entry]) => `${ts(`${key}.title`)} (${entry.score})`)} emptyText={t("noData")} />
            <ReportList title={t("developmentPriorities")} items={needs.map(([key, entry]) => `${ts(`${key}.title`)} (${entry.score})`)} emptyText={t("noData")} />
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t("nextStep")}:
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                {computed.ski === null ? t("completeAll") : computed.ski < 3.5 ? t("stabilizing") : t("sportOrientation")}
              </Typography>
            </Box>
          </SectionCard>
        </Box>
      </Stack>
    </Stack>
  );
}

function FieldWrap({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ flex: "1 1 240px", minWidth: 200, maxWidth: { lg: "calc(50% - 8px)" } }}>{children}</Box>
  );
}

function FieldWide({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ flex: "1 1 100%", minWidth: 0, width: "100%" }}>{children}</Box>
  );
}

function MetricCard({ label, value, target }: { label: string; value: string; target?: number }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: "1 1 160px", minWidth: 140 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" component="p" sx={{ mt: 0.5, fontWeight: 700 }}>
        {value}
      </Typography>
      {target ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          target: {target.toFixed(1)}
        </Typography>
      ) : null}
    </Paper>
  );
}

function ReportList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {items.length ? (
        <Box component="ul" sx={{ pl: 2, m: 0 }}>
          {items.map((item, idx) => (
            <Typography key={`${idx}-${item}`} component="li" variant="body2">
              {item}
            </Typography>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      )}
    </Box>
  );
}
