"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { ChangeEvent, Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert as MantineAlert,
  Anchor as MantineAnchor,
  Badge as MantineBadge,
  Box as MantineBox,
  Button as MantineButton,
  Checkbox as MantineCheckbox,
  Divider as MantineDivider,
  Group as MantineGroup,
  Modal as MantineModal,
  Paper as MantinePaper,
  Select,
  Stack as MantineStack,
  Text,
  TextInput,
  Textarea
} from "@mantine/core";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { sectionsForMode } from "@/lib/kidex-schema";
import { computeAssessment } from "@/lib/scoring";
import { calculateAgeGroup } from "@/lib/utils/age";
import { getStandardForAgeGroup } from "@/lib/standards";
import { formatScore } from "@/lib/utils";
import { getDomainChipStyles, type AssessmentDomain } from "@/lib/domain-colors";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { SectionCard } from "@/components/ui/SectionCard";
import { getSettings, saveSettings } from "@/services/settings-service";
import { getConductors, getObservers } from "@/services/user-service";
import type { AssessmentPayload, AssessmentRecord, EvidenceAttachment, ScoreEntry } from "@/types/assessment";

const DRAFT_STORAGE_KEY = "kidex-draft";

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

type AnyProps = Record<string, unknown>;

function resolveResponsiveValue(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const map = value as Record<string, unknown>;
  return map.lg ?? map.md ?? map.sm ?? map.xs ?? map.base ?? Object.values(map)[0];
}

function spacingToRem(value: unknown) {
  if (typeof value === "number") return `${value * 0.25}rem`;
  return value;
}

function sxToStyle(sx?: unknown): CSSProperties | undefined {
  if (!sx || typeof sx === "function") return undefined;
  const raw = sx as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  const spacingMap: Record<string, string[]> = {
    p: ["padding"],
    px: ["paddingLeft", "paddingRight"],
    py: ["paddingTop", "paddingBottom"],
    pt: ["paddingTop"],
    pr: ["paddingRight"],
    pb: ["paddingBottom"],
    pl: ["paddingLeft"],
    m: ["margin"],
    mx: ["marginLeft", "marginRight"],
    my: ["marginTop", "marginBottom"],
    mt: ["marginTop"],
    mr: ["marginRight"],
    mb: ["marginBottom"],
    ml: ["marginLeft"]
  };
  for (const [key, value] of Object.entries(raw)) {
    const resolved = resolveResponsiveValue(value);
    if (key in spacingMap) {
      for (const target of spacingMap[key]) {
        normalized[target] = spacingToRem(resolved);
      }
      continue;
    }
    if (key === "bgcolor") {
      if (resolved === "background.paper") {
        normalized.backgroundColor = "var(--mantine-color-body)";
      } else if (resolved === "common.black") {
        normalized.backgroundColor = "#000";
      } else {
        normalized.backgroundColor = resolved;
      }
      continue;
    }
    if (key === "borderColor" && resolved === "divider") {
      normalized.borderColor = "var(--mantine-color-default-border)";
      continue;
    }
    normalized[key] = resolved;
  }
  return normalized as CSSProperties;
}

function Alert({ severity, children, onClose }: AnyProps) {
  const color = severity === "error" ? "red" : severity === "success" ? "kidex" : "blue";
  return <MantineAlert color={color as string} withCloseButton={Boolean(onClose)} onClose={onClose as (() => void) | undefined}>{children as ReactNode}</MantineAlert>;
}

function Box({ sx, component, ...rest }: AnyProps) {
  const style = sxToStyle(sx);
  const MantineBoxAny = MantineBox as unknown as (props: Record<string, unknown>) => ReactNode;
  if (component) {
    return <MantineBoxAny component={component} style={style} {...(rest as Record<string, unknown>)} />;
  }
  return <MantineBox style={style} {...(rest as Record<string, unknown>)} />;
}

function Button({ variant, sx, children, ...rest }: AnyProps) {
  const mappedVariant = variant === "contained" ? "filled" : variant === "outlined" ? "default" : (variant as string | undefined);
  return <MantineButton variant={mappedVariant} size="md" style={sxToStyle(sx)} {...(rest as Record<string, unknown>)}>{children as ReactNode}</MantineButton>;
}

function Checkbox(props: AnyProps) {
  return <MantineCheckbox {...(props as Record<string, unknown>)} />;
}

function Chip({ label, sx }: AnyProps) {
  return <MantineBadge variant="light" style={sxToStyle(sx)}>{label as ReactNode}</MantineBadge>;
}

function Dialog({ open, onClose, children, maxWidth }: AnyProps) {
  const size = maxWidth === "sm" ? "md" : "lg";
  return <MantineModal opened={Boolean(open)} onClose={(onClose as (() => void) | undefined) ?? (() => {})} size={size}>{children as ReactNode}</MantineModal>;
}

function DialogTitle({ children }: AnyProps) {
  return <Text size="lg" fw={600} mb="xs">{children as ReactNode}</Text>;
}

function DialogContent({ children }: AnyProps) {
  return <Box>{children}</Box>;
}

function DialogActions({ children }: AnyProps) {
  return <MantineGroup justify="flex-end" mt="md">{children as ReactNode}</MantineGroup>;
}

function Divider({ sx }: AnyProps) {
  return <MantineDivider style={sxToStyle(sx)} />;
}

function FormControlLabel({ control, label }: AnyProps) {
  return <MantineGroup gap="xs">{control as ReactNode}<Text size="sm">{label as ReactNode}</Text></MantineGroup>;
}

function Link({ children, ...rest }: AnyProps) {
  return <MantineAnchor {...(rest as Record<string, unknown>)}>{children as ReactNode}</MantineAnchor>;
}

function Paper({ variant, sx, children, ...rest }: AnyProps) {
  return <MantinePaper withBorder={variant === "outlined" ? true : (rest.withBorder as boolean | undefined)} style={sxToStyle(sx)} {...(rest as Record<string, unknown>)}>{children as ReactNode}</MantinePaper>;
}

function Stack({ spacing, direction, sx, children, divider, ...rest }: AnyProps) {
  const dir = (typeof direction === "string" ? direction : resolveResponsiveValue(direction)) as string | undefined;
  const resolvedGap = resolveResponsiveValue(spacing);
  const style = { ...sxToStyle(sx), display: "flex", flexDirection: dir } as CSSProperties;
  const nodes = Children.toArray(children as ReactNode);
  const withDividers = (divider
    ? nodes.flatMap((node, index) => (index === 0 ? [node] : [isValidElement(divider) ? cloneElement(divider) : divider, node]))
    : nodes) as ReactNode[];
  return (
    <MantineStack gap={typeof resolvedGap === "number" ? `${resolvedGap * 0.5}rem` : (resolvedGap as string | number | undefined)} style={style} {...(rest as Record<string, unknown>)}>
      {withDividers}
    </MantineStack>
  );
}

function TextField({ multiline, minRows, type, slotProps, fullWidth, variant, size, style, ...rest }: AnyProps) {
  const extraProps = slotProps as { inputLabel?: { shrink?: boolean } } | undefined;
  const textProps = { ...(rest as Record<string, unknown>) };
  const normalizedVariant = variant === "outlined" ? "filled" : (variant as string | undefined);
  const normalizedSize = size === "small" ? "sm" : size === "medium" ? "md" : (size as string | undefined);
  const mergedStyle = {
    ...(style as CSSProperties | undefined),
    ...(fullWidth ? { width: "100%" } : null)
  } as CSSProperties;
  void extraProps;
  if (multiline) return <Textarea minRows={(minRows as number) ?? 2} variant={normalizedVariant} size={normalizedSize} style={mergedStyle} {...textProps} />;
  return <TextInput type={type as string | undefined} variant={normalizedVariant} size={normalizedSize} style={mergedStyle} {...textProps} />;
}

function ToggleButton({ selected, onChange, sx, children, ...rest }: AnyProps) {
  return (
    <MantineButton
      variant={selected ? "filled" : "default"}
      color={selected ? "kidex" : "gray"}
      onClick={onChange as ((event: MouseEvent<HTMLButtonElement>) => void) | undefined}
      style={sxToStyle(sx)}
      {...(rest as Record<string, unknown>)}
    >
      {children as ReactNode}
    </MantineButton>
  );
}

export function KidexAssessmentApp() {
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");
  const searchParams = useSearchParams();
  const childIdParam = searchParams.get("childId");

  const [assessment, setAssessment] = useState<AssessmentPayload>(loadDraftAssessment);
  const [recordId, setRecordId] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const initializedChildPrefill = useRef(false);

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

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!childIdParam) return;
    if (recordId) return;
    if (initializedChildPrefill.current) return;
    initializedChildPrefill.current = true;

    void (async () => {
      const response = await fetch(`/api/children/${childIdParam}`).catch(() => null);
      if (!response?.ok) return;
      const child = (await response.json()) as {
        name: string;
        birthDate: string;
        knownTraits?: string;
        parentSignals?: string;
        dominantHand?: string;
        dominantEye?: string;
        dominantFoot?: string;
      };

      setAssessment(() => {
        const ageGroup = calculateAgeGroup(child.birthDate) || "";
        return {
          ...cloneAssessment(emptyAssessment),
          childId: childIdParam,
          child: {
            name: child.name || "",
            birthDate: child.birthDate || "",
            ageGroup,
            knownTraits: "",
            parentSignals: "",
            dominantHand: "",
            dominantEye: "",
            dominantFoot: ""
          }
        };
      });
    })();
  }, [childIdParam, recordId]);

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
    setAssessment((current) => {
      if (!childIdParam) {
        return cloneAssessment(emptyAssessment);
      }

      return {
        ...cloneAssessment(emptyAssessment),
        childId: current.childId || childIdParam,
        child: {
          ...cloneAssessment(emptyAssessment).child,
          name: current.child.name,
          birthDate: current.child.birthDate,
          ageGroup: current.child.ageGroup
        }
      };
    });
    setSaveState("idle");
    setMessage("");
  }

  function appendLocationIfMissing(value: string) {
    setLocations((current) => (value && !current.includes(value) ? [...current, value] : current));
  }

  async function uploadImageFile(file: File | Blob) {
    if (!assessment.session.consentPhoto) {
      setMessage(t("consentRequired"));
      return;
    }
    setUploading(true);
    setMessage("");
    const form = new FormData();
    form.set("image", file, file instanceof File ? file.name : "camera-capture.jpg");
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

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadImageFile(file);
  }

  function stopCameraStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function openCamera() {
    if (!assessment.session.consentPhoto) {
      setMessage(t("consentRequired"));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(t("cameraUnsupported"));
      return;
    }

    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedPreview(null);
    setCapturedBlob(null);
    setCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setMessage(t("cameraAccessError"));
      setCameraOpen(false);
    }
  }

  function capturePhotoFrame() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setCapturedBlob(blob);
      setCapturedPreview(URL.createObjectURL(blob));
      stopCameraStream();
    }, "image/jpeg", 0.92);
  }

  async function uploadCapturedPhoto() {
    if (!capturedBlob) return;
    await uploadImageFile(capturedBlob);
    closeCameraDialog();
  }

  function closeCameraDialog() {
    stopCameraStream();
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedPreview(null);
    setCapturedBlob(null);
    setCameraOpen(false);
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
      <PageHeader
        title={t("appTitle")}
        subtitle={t("appSubtitle")}
        actions={
          <>
            <Button variant="outlined" onClick={newAssessment} sx={{ minWidth: 112, fontWeight: 600 }}>
              {tc("new")}
            </Button>
            <Button variant="contained" onClick={() => void saveAssessment()} disabled={saveState === "saving"} sx={{ minWidth: 112, fontWeight: 700 }}>
              {saveState === "saving" ? tc("saving") : recordId ? tc("update") : tc("save")}
            </Button>
          </>
        }
      />

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

      <Stack spacing={3} id="setup">
        <SectionCard title={t("setupTitle")}>
          <Stack direction="row" spacing={3} useFlexGap sx={{ width: "100%", flexWrap: "wrap" }}>
            <FieldWrap>
              <TextField label={t("childName")} value={assessment.child.name} onChange={(e: ChangeEvent<HTMLInputElement>) => update("child", "name", e.target.value)} fullWidth />
            </FieldWrap>
            <FieldWrap>
              <TextField
                label={t("birthDate")}
                type="date"
                value={assessment.child.birthDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => update("child", "birthDate", e.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FieldWrap>
            <FieldWrap>
              <Select
                label={t("ageGroup")}
                value={assessment.child.ageGroup || ""}
                disabled={!assessment.child.birthDate}
                data={[
                  { value: "", label: t("ageGroupPending") },
                  { value: "4-6", label: "4-6" },
                  { value: "7-9", label: "7-9" },
                  { value: "10-12", label: "10-12" }
                ]}
                onChange={(value) => update("child", "ageGroup", value ?? "")}
              />
            </FieldWrap>
            <FieldWrap>
              <Select
                label={t("mode")}
                value={assessment.mode}
                data={[
                  { value: "rapid", label: t("modeRapid") },
                  { value: "full", label: t("modeFull") }
                ]}
                onChange={(value) =>
                  setAssessment((current) => ({ ...current, mode: (value as AssessmentPayload["mode"]) ?? "rapid" }))
                }
              />
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
              <Select
                label={t("context")}
                value={assessment.session.context}
                data={[
                  { value: "event", label: t("contextEvent") },
                  { value: "structured", label: t("contextStructured") },
                  { value: "spontaneous", label: t("contextSpontaneous") },
                  { value: "mixed", label: t("contextMixed") }
                ]}
                onChange={(value) => update("session", "context", value ?? "event")}
              />
            </FieldWrap>
            <FieldWide>
              <TextField
                label={t("knownTraits")}
                value={assessment.child.knownTraits}
                onChange={(e: ChangeEvent<HTMLInputElement>) => update("child", "knownTraits", e.target.value)}
                fullWidth
                multiline
                minRows={2}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FieldWide>
            <FieldWide>
              <TextField
                label={t("parentSignals")}
                value={assessment.child.parentSignals}
                onChange={(e: ChangeEvent<HTMLInputElement>) => update("child", "parentSignals", e.target.value)}
                fullWidth
                multiline
                minRows={2}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FieldWide>
            <FieldWide>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ flexWrap: "wrap" }}>
                <FormControlLabel control={<Checkbox checked={assessment.session.consentPhoto} onChange={(e: ChangeEvent<HTMLInputElement>) => update("session", "consentPhoto", e.target.checked)} />} label={t("consentPhoto")} />
                <FormControlLabel control={<Checkbox checked={assessment.session.consentReport} onChange={(e: ChangeEvent<HTMLInputElement>) => update("session", "consentReport", e.target.checked)} />} label={t("consentReport")} />
              </Stack>
            </FieldWide>
          </Stack>
        </SectionCard>

        <SectionCard title={t("evidenceImages")}>
          <Stack spacing={2}>
            <Text size="sm" c="dimmed">
              {t("uploadSecurityNote")}
            </Text>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="outlined" component="label" disabled={!assessment.session.consentPhoto || uploading}>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e: ChangeEvent<HTMLInputElement>) => void uploadImage(e)}
                  disabled={!assessment.session.consentPhoto || uploading}
                />
                {uploading ? t("uploading") : t("uploadImage")}
              </Button>
              <Button variant="outlined" onClick={() => void openCamera()} disabled={!assessment.session.consentPhoto || uploading}>
                {uploading ? t("uploading") : t("takePhoto")}
              </Button>
            </Stack>
            {assessment.attachments.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t("noImages")}
              </Text>
            ) : (
              <Stack spacing={2} divider={<Divider flexItem />}>
                {assessment.attachments.map((attachment) => (
                  <Stack key={attachment.id} direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
                    <Image
                      src={attachment.thumbUrl || attachment.url}
                      alt={attachment.name || "Image"}
                      width={160}
                      height={120}
                      style={{ width: 160, height: "auto", maxHeight: 160, borderRadius: "var(--mantine-radius-md)" }}
                      unoptimized
                    />
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

      <Dialog open={cameraOpen} onClose={closeCameraDialog} fullWidth maxWidth="sm">
        <DialogTitle>{t("takePhoto")}</DialogTitle>
        <DialogContent>
          {capturedPreview ? (
            <Box
              component="img"
              src={capturedPreview}
              alt={t("takePhoto")}
              sx={{ width: "100%", border: 1, borderColor: "divider" }}
            />
          ) : (
            <Box
              component="video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              sx={{ width: "100%", border: 1, borderColor: "divider", bgcolor: "common.black" }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCameraDialog}>{tc("cancel")}</Button>
          {capturedPreview ? (
            <>
              <Button onClick={() => void openCamera()} variant="outlined">{t("retakePhoto")}</Button>
              <Button onClick={() => void uploadCapturedPhoto()} variant="contained" disabled={uploading}>
                {uploading ? t("uploading") : t("usePhoto")}
              </Button>
            </>
          ) : (
            <Button onClick={capturePhotoFrame} variant="contained">{t("capturePhoto")}</Button>
          )}
        </DialogActions>
      </Dialog>

      <div id="scoring" />
      {sections.map((section, sectionIndex) => (
        <SectionCard
          key={section.key}
          title={`${ts(section.key)} (${Math.round(section.weight * 100)}%)`}
          action={<Chip label={ts(section.domain)} size="small" variant="outlined" sx={getDomainChipStyles(section.domain as AssessmentDomain)} />}
        >
          <Stack spacing={1.25}>
            {section.items.map((item, itemIndex) => {
              const entry = assessment.scores[item.key];
              return (
                <Paper
                  key={item.key}
                  sx={{
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 1.25, sm: 1.5 },
                    bgcolor: "background.paper"
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Text size="sm" c="dimmed">
                        {sectionIndex * 25 + itemIndex + 1}
                      </Text>
                      <Text size="lg" fw={700} lh={1.2}>
                        {ts(`${item.key}.title`)}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {ts(`${item.key}.prompt`)}
                      </Text>
                    </Box>
                    <Box
                      role="group"
                      aria-label={t("tableScore")}
                      sx={{
                        alignSelf: { xs: "flex-end", sm: "flex-start" },
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                        gap: 0.75
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => {
                        const selected = scoreValue(entry) === n;
                        return (
                          <ToggleButton
                            key={n}
                            value={String(n)}
                            selected={selected}
                            aria-label={`score-${n}`}
                            onChange={() => updateScore(item.key, { score: selected ? "" : n })}
                            sx={{
                              minWidth: { xs: 44, sm: 42 },
                              minHeight: { xs: 44, sm: 40 },
                              px: 1,
                              fontWeight: 700
                            }}
                          >
                            {n}
                          </ToggleButton>
                        );
                      })}
                    </Box>
                  </Stack>
                  <TextField
                    value={entry?.note || ""}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateScore(item.key, { note: e.target.value })}
                    placeholder={t("observationNote")}
                    fullWidth
                    multiline
                    minRows={2}
                    variant="outlined"
                    size="small"
                    style={{ marginTop: 2 }}
                  />
                </Paper>
              );
            })}
          </Stack>
        </SectionCard>
      ))}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ alignItems: "stretch" }} id="report">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionCard title={t("professionalNotes")}>
            <Stack spacing={2}>
              <TextField
                label={t("generalObservation")}
                value={assessment.notes.general}
                onChange={(e: ChangeEvent<HTMLInputElement>) => update("notes", "general", e.target.value)}
                fullWidth
                multiline
                minRows={3}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label={t("adaptationNeeds")}
                value={assessment.notes.adaptations}
                onChange={(e: ChangeEvent<HTMLInputElement>) => update("notes", "adaptations", e.target.value)}
                fullWidth
                multiline
                minRows={3}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label={t("referralNote")}
                value={assessment.notes.referral}
                onChange={(e: ChangeEvent<HTMLInputElement>) => update("notes", "referral", e.target.value)}
                fullWidth
                multiline
                minRows={3}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </SectionCard>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionCard title={t("reportPreview")}>
            <ReportList title={t("strengths")} items={strengths.map(([key, entry]) => `${ts(`${key}.title`)} (${entry.score})`)} emptyText={t("noData")} />
            <ReportList title={t("developmentPriorities")} items={needs.map(([key, entry]) => `${ts(`${key}.title`)} (${entry.score})`)} emptyText={t("noData")} />
            <Box sx={{ mt: 2 }}>
              <Text size="sm" c="dimmed">
                {t("nextStep")}:
              </Text>
              <Text size="md" mt={4} fw={600}>
                {computed.ski === null ? t("completeAll") : computed.ski < 3.5 ? t("stabilizing") : t("sportOrientation")}
              </Text>
            </Box>
          </SectionCard>
        </Box>
      </Stack>
    </Stack>
  );
}

function FieldWrap({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ flex: "1 1 260px", minWidth: 220, maxWidth: "100%" }}>{children}</Box>
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
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="xl" component="p" mt={4} fw={700}>
        {value}
      </Text>
      {target ? (
        <Text size="sm" c="dimmed" mt={4} style={{ display: "block" }}>
          target: {target.toFixed(1)}
        </Text>
      ) : null}
    </Paper>
  );
}

function ReportList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Text size="lg" fw={700} mb={4}>
        {title}
      </Text>
      {items.length ? (
        <Box component="ul" sx={{ pl: 2, m: 0 }}>
          {items.map((item, idx) => (
            <Text key={`${idx}-${item}`} component="li" size="sm">
              {item}
            </Text>
          ))}
        </Box>
      ) : (
        <Text size="sm" c="dimmed">
          {emptyText}
        </Text>
      )}
    </Box>
  );
}
