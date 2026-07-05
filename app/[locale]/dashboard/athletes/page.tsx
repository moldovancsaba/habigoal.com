"use client";

import { MouseEvent, useEffect, useMemo, useState } from "react";
import { Badge, Box, Checkbox, Group, Loader, Modal, MultiSelect, NumberInput, Select, SimpleGrid, Stack, TextInput, Textarea, createGdsVocabularyPack, ChoiceChip, GdsIcons, PageHeader, SectionPanel, SemanticButton } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Alert, Paper, Text } from "@/components/gds/SurfacePrimitives";
import { formatScore } from "@/lib/utils";
import { getProductColor } from "@/lib/product-ui-contracts";
import type { AthleteProfile } from "@/types/athlete";
import { PdfService } from "@/lib/pdf-service";
import { getUsers } from "@/services/user-service";
import { withDisplayNamesForReport } from "@/lib/report-user-display";
import type { CheckInRecord } from "@/types/check-in";

type BaselineDraft = {
  heightCm?: number;
  weightKg?: number;
  wingspanCm?: number;
  restingHeartRate?: number;
  sleepTargetHours?: number;
  cognitiveScore?: number;
  confidenceBaseline?: number;
  focusBaseline?: number;
  motivationBaseline?: number;
  stressBaseline?: number;
  injuryNotes: string;
  medicalNotes: string;
  coachBaselineNotes: string;
};

const emptyBaselineDraft = (): BaselineDraft => ({
  injuryNotes: "",
  medicalNotes: "",
  coachBaselineNotes: ""
});

export default function ChildrenListPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const ta = useTranslations("Assessment");
  const ts = useTranslations("Schema");
  const tr = useTranslations("Report");
  const router = useRouter();
  const athleteActionPack = useMemo(
    () =>
      createGdsVocabularyPack("athletes", {
        showingDeleted: {
          defaultMessage: t("showingDeleted"),
          icon: GdsIcons.Search
        },
        showDeleted: {
          defaultMessage: t("showDeleted"),
          icon: GdsIcons.Search
        },
        hideFilters: {
          defaultMessage: tc("hideFilters"),
          icon: GdsIcons.Search
        },
        advancedFilters: {
          defaultMessage: tc("advancedFilters"),
          icon: GdsIcons.Search
        },
        allRange: {
          defaultMessage: "All",
          icon: GdsIcons.Filter
        },
        supportRange: {
          defaultMessage: "Support",
          icon: GdsIcons.Help
        },
        watchRange: {
          defaultMessage: "Watch",
          icon: GdsIcons.Eye
        },
        readyRange: {
          defaultMessage: "Ready",
          icon: GdsIcons.Check
        }
      }),
    [t, tc]
  );

  const [children, setChildren] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<AthleteProfile | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftBirthDate, setDraftBirthDate] = useState("");
  const [draftKnownTraits, setDraftKnownTraits] = useState("");
  const [draftParentSignals, setDraftParentSignals] = useState("");
  const [draftBaseline, setDraftBaseline] = useState<BaselineDraft>(emptyBaselineDraft());
  const [draftConsentPhoto, setDraftConsentPhoto] = useState(false);
  const [draftConsentReport, setDraftConsentReport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [readinessRange, setReadinessRange] = useState<[number, number]>([0, 5]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AthleteProfile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletedChildren, setDeletedChildren] = useState<AthleteProfile[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<AthleteProfile | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch("/api/athletes?metrics=true").catch(() => null),
          fetch("/api/settings").catch(() => null)
        ]);
        const dcRes = await fetch("/api/athletes?deleted=true").catch(() => null);

        if (!active) return;

        if (!cRes?.ok || !dcRes?.ok || !sRes?.ok) {
          setError(true);
          setMessage(tc("error"));
          setChildren([]);
          setDeletedChildren([]);
          setLocations([]);
          return;
        }

        const [childrenData, deletedData, settingsData] = await Promise.all([
          cRes.json() as Promise<AthleteProfile[]>,
          dcRes.json() as Promise<AthleteProfile[]>,
          sRes.json() as Promise<{ locations?: string[] }>
        ]);

        setChildren(Array.isArray(childrenData) ? childrenData : []);
        setDeletedChildren(Array.isArray(deletedData) ? deletedData : []);
        setLocations(Array.isArray(settingsData.locations) ? settingsData.locations : []);
        setError(false);
        setMessage("");
      } catch {
        if (!active) return;
        setError(true);
        setMessage(tc("error"));
        setChildren([]);
        setDeletedChildren([]);
        setLocations([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [tc]);

  const downloadLatestMap = async (childId?: string, latestRecordId?: string) => {
    if (!childId || !latestRecordId) return;
    setDownloadingId(childId);
    try {
      const [aRes, hRes] = await Promise.all([
        fetch(`/api/check-ins/${latestRecordId}`),
        fetch(`/api/athletes/${childId}/history`)
      ]);

      if (!aRes.ok) throw new Error("Failed to fetch assessment");
      
      const { assessment } = (await aRes.json()) as { assessment: CheckInRecord };
      const historyData = hRes.ok ? (await hRes.json()).assessments : [];
      
      const users = await getUsers();
      const printableRecord = withDisplayNamesForReport(assessment, users);
      await PdfService.generateMapReport(printableRecord, ta, tc, ts, tr, historyData);
    } catch (err) {
      console.error(err);
      setMessage(tc("error"));
      setError(true);
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    
    const source = showDeleted ? deletedChildren : children;
    return source.filter((child) => {
      const matchesQuery = !q || 
        child.name.toLowerCase().includes(q) ||
        child.birthDate.toLowerCase().includes(q);
      
      if (!matchesQuery) return false;

      if (selectedLocations.length > 0 && (!child.latestLocation || !selectedLocations.includes(child.latestLocation))) {
        return false;
      }

      const readiness = child.latestReadiness ?? 0;
      if (readiness < readinessRange[0] || readiness > readinessRange[1]) {
        return false;
      }

      return true;
    });
  }, [children, deletedChildren, query, selectedLocations, readinessRange, showDeleted]);

  async function restoreChild(child: AthleteProfile) {
    if (!child._id) return;
    const res = await fetch(`/api/athletes/${child._id}/restore`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return;
    setDeletedChildren((prev) => prev.filter((x) => x._id !== child._id));
    setChildren((prev) => [...prev, child].sort((a, b) => a.name.localeCompare(b.name)));
    setRestoreTarget(null);
    setRestoreConfirmText("");
  }

  function startEdit(child: AthleteProfile) {
    setEditing(child);
    setDraftName(child.name);
    setDraftBirthDate(child.birthDate);
    setDraftKnownTraits(child.knownTraits || "");
    setDraftParentSignals(child.parentSignals || "");
    setDraftBaseline({
      ...emptyBaselineDraft(),
      ...child.baselineProfile
    });
    setDraftConsentPhoto(Boolean(child.consentPhoto));
    setDraftConsentReport(Boolean(child.consentReport));
  }

  function startCreate() {
    setCreateOpen(true);
    setDraftName("");
    setDraftBirthDate("");
    setDraftKnownTraits("");
    setDraftParentSignals("");
    setDraftBaseline(emptyBaselineDraft());
    setDraftConsentPhoto(false);
    setDraftConsentReport(false);
  }

  async function saveEdit() {
    if (!editing?._id || !draftName.trim() || !draftBirthDate.trim()) {
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/athletes/${editing._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draftName,
        birthDate: draftBirthDate,
        baselineProfile: draftBaseline,
        consentPhoto: draftConsentPhoto,
        consentReport: draftConsentReport,
        dominantHand: editing.dominantHand || "",
        dominantEye: editing.dominantEye || "",
        dominantFoot: editing.dominantFoot || "",
        knownTraits: draftKnownTraits,
        parentSignals: draftParentSignals
      })
    }).catch(() => null);
    setSaving(false);

    if (!response?.ok) {
      setError(true);
      setMessage(tc("error"));
      return;
    }

    const updated = (await response.json()) as AthleteProfile;
    setChildren((current) => current.map((child) => (child._id === updated._id ? updated : child)));
    setEditing(null);
    setError(false);
    setMessage(tc("success"));
  }

  async function createChild() {
    if (!draftName.trim() || !draftBirthDate.trim()) return;
    setSaving(true);
    const response = await fetch("/api/athletes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draftName,
        birthDate: draftBirthDate,
        baselineProfile: draftBaseline,
        consentPhoto: draftConsentPhoto,
        consentReport: draftConsentReport,
        dominantHand: "",
        dominantEye: "",
        dominantFoot: "",
        knownTraits: draftKnownTraits,
        parentSignals: draftParentSignals
      })
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      setError(true);
      setMessage(tc("error"));
      return;
    }
    const created = (await response.json()) as AthleteProfile;
    setChildren((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    setCreateOpen(false);
    setError(false);
    setMessage(tc("success"));
  }

  async function deleteChild(child: AthleteProfile) {
    if (!child._id) return;
    const response = await fetch(`/api/athletes/${child._id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setError(true);
      setMessage(tc("error"));
      return;
    }

    setChildren((current) => current.filter((item) => item._id !== child._id));
    setError(false);
    setMessage(t("childDeleted"));
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack gap="md">
      <PageHeader
        title={t("children")}
        actions={
          <Group>
            <SemanticButton
              action={showDeleted ? "athletes:showingDeleted" : "athletes:showDeleted"}
              variant={showDeleted ? "filled" : "default"}
              color={showDeleted ? getProductColor("dashboard", "risk") : getProductColor("dashboard", "neutral")}
              onClick={() => setShowDeleted((v) => !v)}
              vocabularyPacks={[athleteActionPack]}
            />
            <SemanticButton action="add" color={getProductColor("dashboard", "primaryAction")} onClick={startCreate} />
          </Group>
        }
      />
      <SectionPanel>
        <Stack gap="md">
          {message ? (
            <Alert
              color={error ? getProductColor("dashboard", "risk") : getProductColor("dashboard", "success")}
              role={error ? "alert" : "status"}
              title={error ? tc("error") : tc("success")}
            >
              {message}
            </Alert>
          ) : null}

          <Group align="end" gap="xs">
            <TextInput
              label={t("searchChildren")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchChildrenPlaceholder")}
              style={{ flex: 1 }}
            />
            <SemanticButton
              action={showAdvanced ? "athletes:hideFilters" : "athletes:advancedFilters"}
              variant="light"
              color={getProductColor("dashboard", "neutral")}
              onClick={() => setShowAdvanced((v) => !v)}
              vocabularyPacks={[athleteActionPack]}
            />
          </Group>

          {showAdvanced && (
            <Paper withBorder p="md">
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, md: 1 }} spacing="md">
                  <MultiSelect
                    label={t("location")}
                    placeholder={tc("all")}
                    data={locations}
                    value={selectedLocations}
                    onChange={setSelectedLocations}
                    clearable
                    searchable
                  />
                </SimpleGrid>
                <Box>
                  <Text size="sm" fw={500} mb="xs">{t("athleteReadinessRangeLabel", { min: readinessRange[0], max: readinessRange[1] })}</Text>
                  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                  {[
                      { label: ta("rangeAll"), value: [0, 5] as [number, number] },
                      { label: ta("rangeSupport"), value: [0, 2.9] as [number, number] },
                      { label: ta("rangeWatch"), value: [3, 3.9] as [number, number] },
                      { label: ta("rangeReady"), value: [4, 5] as [number, number] }
                    ].map((preset) => {
                      const active = readinessRange[0] === preset.value[0] && readinessRange[1] === preset.value[1];
                      return (
                        <ChoiceChip
                          key={preset.label}
                          active={active}
                          label={preset.label}
                          onClick={() => setReadinessRange(preset.value)}
                        />
                      );
                    })}
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 2, sm: 2 }} spacing="md" mt="sm">
                    <Select
                      label={ta("minScoreLabel")}
                      value={String(readinessRange[0])}
                      data={["0", "1", "2", "3", "4", "5"].map((value) => ({ value, label: ta("minScoreOption", { value }) }))}
                      onChange={(value) => {
                        const nextMin = Number(value ?? readinessRange[0]);
                        setReadinessRange(([, max]) => [Math.min(nextMin, max), max]);
                      }}
                    />
                    <Select
                      label={ta("maxScoreLabel")}
                      value={String(readinessRange[1])}
                      data={["0", "1", "2", "3", "4", "5"].map((value) => ({ value, label: ta("maxScoreOption", { value }) }))}
                      onChange={(value) => {
                        const nextMax = Number(value ?? readinessRange[1]);
                        setReadinessRange(([min]) => [min, Math.max(nextMax, min)]);
                      }}
                    />
                  </SimpleGrid>
                </Box>
                <Group justify="flex-end">
                  <SemanticButton action="reset" variant="subtle" size="sm" onClick={() => {
                    setSelectedLocations([]);
                    setReadinessRange([0, 5]);
                  }} />
                </Group>
              </Stack>
            </Paper>
          )}

          {filtered.length === 0 ? (
            <Text c="dimmed" fs="italic">{query ? t("noChildrenMatch") : tc("noChildren")}</Text>
          ) : (
            <Stack gap="md">
              {filtered.map((child) => {
                const baselineFacts = [
                  child.baselineProfile?.heightCm ? `${child.baselineProfile.heightCm} cm` : null,
                  child.baselineProfile?.weightKg ? `${child.baselineProfile.weightKg} kg` : null,
                  child.baselineProfile?.cognitiveScore ? `IQ ${child.baselineProfile.cognitiveScore}` : null
                ].filter(Boolean);
                return (
                  <Paper 
                    key={child._id} 
                    withBorder 
                    p="md"
                    radius="md"
                    onClick={() => {
                      if (!showDeleted && child._id) {
                        router.push(`/dashboard/athletes/${child._id}`);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <Stack gap="md">
                      <Box>
                        <Text
                          component={Link}
                          href={`/dashboard/athletes/${child._id}`}
                          fw={800}
                          size="lg"
                          c={getProductColor("dashboard", "primaryAction")}
                          style={{ textDecoration: "none" }}
                          onClick={(e: MouseEvent<HTMLElement>) => e.stopPropagation()}
                        >
                          {child.name}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {ta("birthDate")}: {child.birthDate}
                        </Text>
                        {baselineFacts.length > 0 ? (
                          <Group gap="xs" mt={8}>
                            {baselineFacts.map((fact) => (
                              <Badge key={fact} color={getProductColor("dashboard", "neutral")} variant="light" size="sm">
                                {fact}
                              </Badge>
                            ))}
                          </Group>
                        ) : null}
                        {child.latestReadiness !== undefined && (
                          <Group gap="xs" mt={8}>
                            <Badge color={getProductColor("dashboard", "primaryAction")} variant="filled" size="sm">
                              {t("athleteLatestReadinessBadge", { value: formatScore(child.latestReadiness) })}
                            </Badge>
                            <Badge color={getProductColor("dashboard", "secondaryAction")} variant="light" size="sm">
                              {t("athleteAverageReadinessBadge", { value: formatScore(child.avgReadiness) })}
                            </Badge>
                            <Badge color="strategy" variant="light" size="sm">
                              {t("athleteSessionCountBadge", { count: child.assessmentCount ?? 0 })}
                            </Badge>
                            {child.latestLocation && (
                              <Text size="sm" c="dimmed" fw={500}>
                                @{child.latestLocation}
                              </Text>
                            )}
                          </Group>
                        )}
                      </Box>
                      <Group gap="sm">
                        {!showDeleted ? (
                          <Link href={`/dashboard/assessment?childId=${child._id}`} style={{ textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                            <SemanticButton action="start" color={getProductColor("dashboard", "primaryAction")} size="sm" />
                          </Link>
                        ) : null}
                        {child.latestRecordId && (
                          <SemanticButton
                            action="download"
                            variant="outline"
                            color={getProductColor("dashboard", "primaryAction")}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              void downloadLatestMap(child._id, child.latestRecordId);
                            }}
                            loading={downloadingId === child._id}
                          >{t("exportReportPdf")}</SemanticButton>
                        )}
                        {!showDeleted ? (
                          <Link href={`/dashboard/athletes/${child._id}`} style={{ textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                            <SemanticButton action="profile" variant="default" size="sm" />
                          </Link>
                        ) : null}
                        {!showDeleted ? <SemanticButton action="edit" variant="subtle" color={getProductColor("dashboard", "neutral")} size="sm" onClick={(e) => { e.stopPropagation(); startEdit(child); }} /> : null}
                        {!showDeleted ? <SemanticButton action="delete" color={getProductColor("dashboard", "risk")} variant="filled" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(child); setDeleteConfirmText(""); }} /> : <SemanticButton action="restore" color={getProductColor("dashboard", "primaryAction")} variant="light" size="sm" onClick={(e) => { e.stopPropagation(); setRestoreTarget(child); setRestoreConfirmText(""); }} />}
                      </Group>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </SectionPanel>
      <Modal opened={Boolean(editing)} onClose={() => (saving ? null : setEditing(null))} title={t("editChild")} centered>
          <Stack gap="md" mt="xs">
            <TextInput
              label={ta("childName")}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
            <TextInput
              label={ta("birthDate")}
              type="date"
              value={draftBirthDate}
              onChange={(event) => setDraftBirthDate(event.target.value)}
            />
            <Textarea label={ta("knownTraits")} value={draftKnownTraits} onChange={(event) => setDraftKnownTraits(event.target.value)} minRows={2} />
            <Textarea label={ta("parentSignals")} value={draftParentSignals} onChange={(event) => setDraftParentSignals(event.target.value)} minRows={2} />
            <FormDivider label={ta("baselineSection")} />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput label={ta("baselineHeight")} value={draftBaseline.heightCm} onChange={(value) => setDraftBaseline((current) => ({ ...current, heightCm: typeof value === "number" ? value : undefined }))} min={50} max={260} />
              <NumberInput label={ta("baselineWeight")} value={draftBaseline.weightKg} onChange={(value) => setDraftBaseline((current) => ({ ...current, weightKg: typeof value === "number" ? value : undefined }))} min={15} max={250} />
              <NumberInput label={ta("baselineWingspan")} value={draftBaseline.wingspanCm} onChange={(value) => setDraftBaseline((current) => ({ ...current, wingspanCm: typeof value === "number" ? value : undefined }))} min={50} max={300} />
              <NumberInput label={ta("baselineRestingHeartRate")} value={draftBaseline.restingHeartRate} onChange={(value) => setDraftBaseline((current) => ({ ...current, restingHeartRate: typeof value === "number" ? value : undefined }))} min={20} max={220} />
              <NumberInput label={ta("baselineSleepTarget")} value={draftBaseline.sleepTargetHours} onChange={(value) => setDraftBaseline((current) => ({ ...current, sleepTargetHours: typeof value === "number" ? value : undefined }))} min={4} max={14} decimalScale={1} />
              <NumberInput label={ta("baselineCognitiveScore")} value={draftBaseline.cognitiveScore} onChange={(value) => setDraftBaseline((current) => ({ ...current, cognitiveScore: typeof value === "number" ? value : undefined }))} min={40} max={200} />
              <NumberInput label={ta("baselineConfidence")} value={draftBaseline.confidenceBaseline} onChange={(value) => setDraftBaseline((current) => ({ ...current, confidenceBaseline: typeof value === "number" ? value : undefined }))} min={1} max={10} />
              <NumberInput label={ta("baselineFocus")} value={draftBaseline.focusBaseline} onChange={(value) => setDraftBaseline((current) => ({ ...current, focusBaseline: typeof value === "number" ? value : undefined }))} min={1} max={10} />
              <NumberInput label={ta("baselineMotivation")} value={draftBaseline.motivationBaseline} onChange={(value) => setDraftBaseline((current) => ({ ...current, motivationBaseline: typeof value === "number" ? value : undefined }))} min={1} max={10} />
              <NumberInput label={ta("baselineStress")} value={draftBaseline.stressBaseline} onChange={(value) => setDraftBaseline((current) => ({ ...current, stressBaseline: typeof value === "number" ? value : undefined }))} min={1} max={10} />
            </SimpleGrid>
            <Textarea label={ta("baselineInjuryHistory")} value={draftBaseline.injuryNotes} onChange={(event) => setDraftBaseline((current) => ({ ...current, injuryNotes: event.target.value }))} minRows={2} />
            <Textarea label={ta("baselineMedicalNotes")} value={draftBaseline.medicalNotes} onChange={(event) => setDraftBaseline((current) => ({ ...current, medicalNotes: event.target.value }))} minRows={2} />
            <Textarea label={ta("baselineCoachNotes")} value={draftBaseline.coachBaselineNotes} onChange={(event) => setDraftBaseline((current) => ({ ...current, coachBaselineNotes: event.target.value }))} minRows={2} />
            <Group>
              <Checkbox label={ta("consentPhoto")} checked={draftConsentPhoto} onChange={(event) => setDraftConsentPhoto(event.currentTarget.checked)} />
              <Checkbox label={ta("consentReport")} checked={draftConsentReport} onChange={(event) => setDraftConsentReport(event.currentTarget.checked)} />
            </Group>
          </Stack>
          <Group justify="flex-end" mt="md">
          <SemanticButton action="cancel" variant="subtle" onClick={() => setEditing(null)} disabled={saving} />
          <SemanticButton action="save" onClick={() => void saveEdit()} color={getProductColor("dashboard", "primaryAction")} loading={saving} disabled={!draftName.trim() || !draftBirthDate.trim()} />
        </Group>
      </Modal>
      <Modal opened={createOpen} onClose={() => (saving ? null : setCreateOpen(false))} title={t("addChild")} centered>
        <Stack gap="md" mt="xs">
          <TextInput label={ta("childName")} value={draftName} onChange={(event) => setDraftName(event.target.value)} />
          <TextInput label={ta("birthDate")} type="date" value={draftBirthDate} onChange={(event) => setDraftBirthDate(event.target.value)} />
          <Textarea label={ta("knownTraits")} value={draftKnownTraits} onChange={(event) => setDraftKnownTraits(event.target.value)} minRows={2} />
          <Textarea label={ta("parentSignals")} value={draftParentSignals} onChange={(event) => setDraftParentSignals(event.target.value)} minRows={2} />
          <FormDivider label={ta("baselineSection")} />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput label={ta("baselineHeight")} value={draftBaseline.heightCm} onChange={(value) => setDraftBaseline((current) => ({ ...current, heightCm: typeof value === "number" ? value : undefined }))} min={50} max={260} />
            <NumberInput label={ta("baselineWeight")} value={draftBaseline.weightKg} onChange={(value) => setDraftBaseline((current) => ({ ...current, weightKg: typeof value === "number" ? value : undefined }))} min={15} max={250} />
            <NumberInput label={ta("baselineWingspan")} value={draftBaseline.wingspanCm} onChange={(value) => setDraftBaseline((current) => ({ ...current, wingspanCm: typeof value === "number" ? value : undefined }))} min={50} max={300} />
            <NumberInput label={ta("baselineRestingHeartRate")} value={draftBaseline.restingHeartRate} onChange={(value) => setDraftBaseline((current) => ({ ...current, restingHeartRate: typeof value === "number" ? value : undefined }))} min={20} max={220} />
            <NumberInput label={ta("baselineSleepTarget")} value={draftBaseline.sleepTargetHours} onChange={(value) => setDraftBaseline((current) => ({ ...current, sleepTargetHours: typeof value === "number" ? value : undefined }))} min={4} max={14} decimalScale={1} />
            <NumberInput label={ta("baselineCognitiveScore")} value={draftBaseline.cognitiveScore} onChange={(value) => setDraftBaseline((current) => ({ ...current, cognitiveScore: typeof value === "number" ? value : undefined }))} min={40} max={200} />
            <NumberInput label={ta("baselineConfidence")} value={draftBaseline.confidenceBaseline} onChange={(value) => setDraftBaseline((current) => ({ ...current, confidenceBaseline: typeof value === "number" ? value : undefined }))} min={1} max={10} />
            <NumberInput label={ta("baselineFocus")} value={draftBaseline.focusBaseline} onChange={(value) => setDraftBaseline((current) => ({ ...current, focusBaseline: typeof value === "number" ? value : undefined }))} min={1} max={10} />
            <NumberInput label={ta("baselineMotivation")} value={draftBaseline.motivationBaseline} onChange={(value) => setDraftBaseline((current) => ({ ...current, motivationBaseline: typeof value === "number" ? value : undefined }))} min={1} max={10} />
            <NumberInput label={ta("baselineStress")} value={draftBaseline.stressBaseline} onChange={(value) => setDraftBaseline((current) => ({ ...current, stressBaseline: typeof value === "number" ? value : undefined }))} min={1} max={10} />
          </SimpleGrid>
          <Textarea label={ta("baselineInjuryHistory")} value={draftBaseline.injuryNotes} onChange={(event) => setDraftBaseline((current) => ({ ...current, injuryNotes: event.target.value }))} minRows={2} />
          <Textarea label={ta("baselineMedicalNotes")} value={draftBaseline.medicalNotes} onChange={(event) => setDraftBaseline((current) => ({ ...current, medicalNotes: event.target.value }))} minRows={2} />
          <Textarea label={ta("baselineCoachNotes")} value={draftBaseline.coachBaselineNotes} onChange={(event) => setDraftBaseline((current) => ({ ...current, coachBaselineNotes: event.target.value }))} minRows={2} />
          <Group>
            <Checkbox label={ta("consentPhoto")} checked={draftConsentPhoto} onChange={(event) => setDraftConsentPhoto(event.currentTarget.checked)} />
            <Checkbox label={ta("consentReport")} checked={draftConsentReport} onChange={(event) => setDraftConsentReport(event.currentTarget.checked)} />
          </Group>
          <Group justify="flex-end" mt="sm">
            <SemanticButton action="cancel" variant="subtle" onClick={() => setCreateOpen(false)} disabled={saving} />
            <SemanticButton action="save" color={getProductColor("dashboard", "primaryAction")} onClick={() => void createChild()} loading={saving} disabled={!draftName.trim() || !draftBirthDate.trim()} />
          </Group>
        </Stack>
      </Modal>
      <Modal opened={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={t("deleteChild")} centered>
        <Stack gap="md">
          <Text size="sm">
            {t("deleteChildConfirm", { name: deleteTarget?.name || "" })}
          </Text>
          <Text size="sm" c="dimmed">{t("typeDeleteToConfirm")}</Text>
          <TextInput value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.currentTarget.value)} placeholder="delete" />
          <Group justify="flex-end">
            <SemanticButton action="cancel" variant="subtle" onClick={() => setDeleteTarget(null)} />
            <SemanticButton
              action="delete"
              color={getProductColor("dashboard", "risk")}
              disabled={deleteConfirmText.trim().toLowerCase() !== "delete" || !deleteTarget}
              onClick={() => {
                if (!deleteTarget) return;
                void deleteChild(deleteTarget);
                setDeleteTarget(null);
              }}
            />
          </Group>
        </Stack>
      </Modal>
      <Modal opened={Boolean(restoreTarget)} onClose={() => setRestoreTarget(null)} title={t("restoreChild")} centered>
        <Stack gap="md">
          <Text size="sm">{t("typeRestoreToConfirm")}</Text>
          <TextInput value={restoreConfirmText} onChange={(e) => setRestoreConfirmText(e.currentTarget.value)} placeholder="restore" />
          <Group justify="flex-end">
            <SemanticButton action="cancel" variant="subtle" onClick={() => setRestoreTarget(null)} />
            <SemanticButton action="restore" color={getProductColor("dashboard", "primaryAction")} disabled={restoreConfirmText.trim().toLowerCase() !== "restore" || !restoreTarget} onClick={() => restoreTarget && void restoreChild(restoreTarget)} />
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function FormDivider({ label }: { label: string }) {
  return (
    <Group gap="sm" align="center" role="separator" aria-label={label}>
      <Box style={{ flex: 1, borderTop: "1px solid var(--border-primary)" }} />
      <Text size="sm" fw={700} c="dimmed">
        {label}
      </Text>
      <Box style={{ flex: 1, borderTop: "1px solid var(--border-primary)" }} />
    </Group>
  );
}
