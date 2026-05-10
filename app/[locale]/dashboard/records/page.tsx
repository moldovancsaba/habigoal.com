"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Group, Loader, Modal, Paper, Stack, Text, TextInput } from "@mantine/core";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatScore } from "@/lib/utils";
import { SectionCard } from "@/components/ui/SectionCard";
import type { CheckInRecord } from "@/types/check-in";

export default function RecordsPage() {
  const t = useTranslations("Dashboard");
  const ta = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const { locale } = useParams();
  const [savedRecords, setSavedRecords] = useState<CheckInRecord[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");

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
        actions={<Button variant={showDeleted ? "filled" : "default"} color={showDeleted ? "red" : "gray"} onClick={() => setShowDeleted((v) => !v)}>{showDeleted ? t("showingDeleted") : t("showDeleted")}</Button>}
      />
      <SectionCard>
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
                  onClick={() => window.location.href = `/${locale}/dashboard/records/${record._id}`}
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
                          <Button component={Link} href={`/dashboard/records/${record._id}`} variant="default" size="sm" onClick={(e) => e.stopPropagation()}>
                            {tc("view")}
                          </Button>
                          <Button component={Link} href={`/dashboard/assessment?id=${record._id}`} color="ingress" variant="light" size="sm" onClick={(e) => e.stopPropagation()}>
                            {tc("update")}
                          </Button>
                        </>
                      ) : (
                        <Button color="ingress" variant="light" size="sm" onClick={(e) => { e.stopPropagation(); setRestoreTargetId(record._id || null); setRestoreConfirmText(""); }}>
                          {t("restoreAction")}
                        </Button>
                      )}
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </SectionCard>
      <Modal opened={Boolean(restoreTargetId)} onClose={() => setRestoreTargetId(null)} title={t("restoreAssessment")} centered>
        <Stack gap="md">
          <Text size="sm">{t("typeRestoreAssessmentToConfirm")}</Text>
          <TextInput value={restoreConfirmText} onChange={(e) => setRestoreConfirmText(e.currentTarget.value)} placeholder="restore" />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setRestoreTargetId(null)}>{tc("cancel")}</Button>
            <Button color="ingress" disabled={restoreConfirmText.trim().toLowerCase() !== "restore" || !restoreTargetId} onClick={() => void restoreAssessment(restoreTargetId || undefined)}>{t("restoreAction")}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
