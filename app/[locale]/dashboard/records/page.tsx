"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    <Stack spacing={2.5}>
      <PageHeader title={t("records")} />
      <SectionCard>
        {savedRecords.length === 0 ? (
          <Typography color="text.secondary">{ta("noHistory")}</Typography>
        ) : (
          <Stack spacing={2}>
            {savedRecords.map((record) => (
              <Card key={record._id} variant="outlined">
                <CardContent>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                    <Box sx={{ minWidth: 0 }}>
                      {record.childId ? (
                        <Typography
                          component={Link}
                          href={`/dashboard/children/${record.childId}`}
                          variant="h6"
                          sx={{ fontWeight: 700, textDecoration: "none", color: "primary.main", "&:hover": { textDecoration: "underline" } }}
                        >
                          {record.child.name || "---"}
                        </Typography>
                      ) : (
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {record.child.name || "---"}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {record.mode} · SKI {formatScore(record.computed.ski)} · {record.session.date}
                      </Typography>
                    </Box>
                    <Button component={Link} href={`/dashboard/records/${record._id}`} variant="outlined">
                      {tc("view")}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}
