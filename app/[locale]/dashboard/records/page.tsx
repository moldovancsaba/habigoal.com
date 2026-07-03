"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Group, Loader, Modal, Paper, Stack, Text, TextInput } from "@mantine/core";
import { createGdsVocabularyPack, GdsIcons, PageHeader, SectionPanel, SemanticButton } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { formatScore } from "@/lib/utils";
import type { CheckInRecord } from "@/types/check-in";

export default function RecordsPage() {
  const t = useTranslations("Dashboard");
  const ta = useTranslations("Assessment");
  const router = useRouter();
  const [savedRecords, setSavedRecords] = useState<CheckInRecord[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const recordsActionPack = useMemo(
    () =>
      createGdsVocabularyPack("records", {
        showDeleted: {
          defaultMessage: t("showDeleted"),
          icon: GdsIcons.History
        },
        showingDeleted: {
          defaultMessage: t("showingDeleted"),
          icon: GdsIcons.History
        }
      }),
    [t]
  );

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/check-ins").catch(() => null);
      const deletedResponse = await fetch("/api/check-ins?deleted=true").catch(() => null);
      if (!response?.ok) {
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { assessments?: CheckInRecord[] };
      setSavedRecords(data.assessments || []);
      if (deletedResponse?.ok) {
        const deletedData = (await deletedResponse.json()) as { assessments?: CheckInRecord[] };
        setDeletedRecords(deletedData.assessments || []);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = showDeleted ? deletedRecords : savedRecords;
    if (!q) return source;
    return source.filter(r =>
      r.child.name.toLowerCase().includes(q) || 
      r.session.location?.toLowerCase().includes(q) ||
      r.session.date.includes(q)
    );
  }, [savedRecords, deletedRecords, query, showDeleted]);

  async function restoreAssessment(id?: string) {
    if (!id) return;
    const res = await fetch(`/api/check-ins/${id}`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return;
    const restored = deletedRecords.find((r) => r._id === id);
    if (restored) setSavedRecords((prev) => [restored, ...prev]);
    setDeletedRecords((prev) => prev.filter((r) => r._id !== id));
    setRestoreTargetId(null);
    setRestoreConfirmText("");
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }}>
        <Loader />
      </Box>
    );
  }

  return (
    <Stack gap="md">
      <PageHeader
        title={t("records")}
        actions={
          <SemanticButton
            action={showDeleted ? "records:showingDeleted" : "records:showDeleted"}
            variant={showDeleted ? "filled" : "default"}
            color={showDeleted ? "red" : "gray"}
            onClick={() => setShowDeleted((v) => !v)}
            vocabularyPacks={[recordsActionPack]}
          />
        }
      />
      <SectionPanel>
        <Stack gap="md">
          <TextInput
            label={t("searchRecords")}
            placeholder={t("searchRecordsPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {filtered.length === 0 ? (
            <Text c="dimmed" fs="italic">{query ? t("noRecordsMatch") : ta("noHistory")}</Text>
          ) : (
            <Stack gap="md">
              {filtered.map((record) => (
                <Paper 
                  key={record._id} 
                  withBorder 
                  p="md" 
                  radius="md"
                  onClick={() => router.push(`/dashboard/records/${record._id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <Stack gap="md">
                    <Box>
                      <Group justify="space-between" align="flex-start">
                        <Box>
                          <Text
                            component={Link}
                            href={`/dashboard/records/${record._id}`}
                            fw={800}
                            size="lg"
                            color="ingress"
                            style={{ textDecoration: "none" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {record.child.name || "---"}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {record.session.date} {record.session.location ? `· ${record.session.location}` : ""}
                          </Text>
                        </Box>
                        <Badge color="ingress" variant="filled" size="lg">
                          {t("sportReadiness")}: {formatScore(record.computed.ski)}
                        </Badge>
                      </Group>
                    </Box>

                    <Group gap="sm">
                      {!showDeleted ? (
                        <>
                          <Link href={`/dashboard/records/${record._id}`} style={{ textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                            <SemanticButton action="launch" variant="default" size="sm" />
                          </Link>
                          <Link href={`/dashboard/assessment?id=${record._id}`} style={{ textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                            <SemanticButton action="edit" color="ingress" variant="light" size="sm" />
                          </Link>
                        </>
                      ) : (
                        <SemanticButton action="restore" color="ingress" variant="light" size="sm" onClick={(e) => { e.stopPropagation(); setRestoreTargetId(record._id || null); setRestoreConfirmText(""); }} />
                      )}
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </SectionPanel>
      <Modal opened={Boolean(restoreTargetId)} onClose={() => setRestoreTargetId(null)} title={t("restoreAssessment")} centered>
        <Stack gap="md">
          <Text size="sm">{t("typeRestoreAssessmentToConfirm")}</Text>
          <TextInput value={restoreConfirmText} onChange={(e) => setRestoreConfirmText(e.currentTarget.value)} placeholder="restore" />
          <Group justify="flex-end">
            <SemanticButton action="cancel" variant="subtle" onClick={() => setRestoreTargetId(null)} />
            <SemanticButton action="restore" color="ingress" disabled={restoreConfirmText.trim().toLowerCase() !== "restore" || !restoreTargetId} onClick={() => void restoreAssessment(restoreTargetId || undefined)} />
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
