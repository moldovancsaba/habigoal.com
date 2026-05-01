"use client";

import { useEffect, useState } from "react";
import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatScore } from "@/lib/utils";
import { SectionCard } from "@/components/ui/SectionCard";
import type { AssessmentRecord } from "@/types/assessment";

export default function RecordsPage() {
  const t = useTranslations("Dashboard");
  const ta = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const { locale } = useParams();
  const [savedRecords, setSavedRecords] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/assessments").catch(() => null);
      if (!response?.ok) return;
      const data = (await response.json()) as { assessments?: AssessmentRecord[] };
      setSavedRecords(data.assessments || []);
    })();
  }, []);

  return (
    <Stack gap="md">
      <PageHeader title={t("records")} />
      <SectionCard>
        {savedRecords.length === 0 ? (
          <Text c="dimmed">{ta("noHistory")}</Text>
        ) : (
          <Stack gap="md">
            {savedRecords.map((record) => (
              <Paper 
                key={record._id} 
                withBorder 
                p="md" 
                onClick={() => window.location.href = `/${locale}/dashboard/records/${record._id}`}
                style={{ cursor: "pointer", transition: "transform 0.1s ease", hover: { transform: "translateY(-2px)" } }}
                className="clickable-card"
              >
                <Stack gap="md" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                    <Box style={{ minWidth: 0 }}>
                      {record.childId ? (
                        <Text
                          component={Link}
                          href={`/dashboard/children/${record.childId}`}
                          fw={700}
                          size="lg"
                          style={{ textDecoration: "none", color: "var(--mantine-color-kidex-6)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {record.child.name || "---"}
                        </Text>
                      ) : (
                        <Text fw={700} size="lg">
                          {record.child.name || "---"}
                        </Text>
                      )}
                      <Text size="sm" c="dimmed">
                        {record.mode} · SKI {formatScore(record.computed.ski)} · {record.session.date}
                      </Text>
                    </Box>
                    <Group gap="xs">
                      <Button component={Link} href={`/dashboard/assessment?id=${record._id}`} variant="light" color="kidex" onClick={(e) => e.stopPropagation()}>
                        {tc("update")}
                      </Button>
                      <Button component={Link} href={`/dashboard/records/${record._id}`} variant="default" onClick={(e) => e.stopPropagation()}>
                        {tc("view")}
                      </Button>
                    </Group>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}
