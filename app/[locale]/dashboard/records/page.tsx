"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Group, Loader, Paper, Stack, Text, TextInput } from "@mantine/core";
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
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/assessments").catch(() => null);
      if (!response?.ok) {
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { assessments?: AssessmentRecord[] };
      setSavedRecords(data.assessments || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return savedRecords;
    return savedRecords.filter(r => 
      r.child.name.toLowerCase().includes(q) || 
      r.session.location?.toLowerCase().includes(q) ||
      r.session.date.includes(q)
    );
  }, [savedRecords, query]);

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }}>
        <Loader />
      </Box>
    );
  }

  return (
    <Stack gap="md">
      <PageHeader title={t("records")} />
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
                            color="kidex"
                            style={{ textDecoration: "none" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {record.child.name || "---"}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {record.session.date} {record.session.location ? `· ${record.session.location}` : ""}
                          </Text>
                        </Box>
                        <Badge color="kidex" variant="filled" size="lg">
                          SKI: {formatScore(record.computed.ski)}
                        </Badge>
                      </Group>
                    </Box>

                    <Group gap="sm">
                      <Button component={Link} href={`/dashboard/records/${record._id}`} variant="default" size="sm" onClick={(e) => e.stopPropagation()}>
                        {tc("view")}
                      </Button>
                      <Button component={Link} href={`/dashboard/assessment?id=${record._id}`} color="kidex" variant="light" size="sm" onClick={(e) => e.stopPropagation()}>
                        {tc("update")}
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
