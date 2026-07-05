"use client";

import { useEffect, useState } from "react";
import { Checkbox, Group, NumberInput, Stack, SectionPanel, SemanticButton } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { Text } from "@/components/gds/SurfacePrimitives";
import { trackerQuestions } from "@/lib/readiness-model";
import { getProductColor } from "@/lib/product-ui-contracts";
import type { CheckInQuestionConfig } from "@/types/check-in-config";

export function CheckInConfigAdminPanel() {
  const t = useTranslations("CheckInConfig");
  const tc = useTranslations("Common");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState(false);
  const [questions, setQuestions] = useState<CheckInQuestionConfig[]>([]);

  useEffect(() => {
    void fetch("/api/settings/check-in-config")
      .then((res) => res.json())
      .then((config: { questions?: CheckInQuestionConfig[]; allowDuplicateOverride?: boolean }) => {
        setQuestions(
          config.questions?.length
            ? config.questions
            : trackerQuestions.map((q) => ({
                key: q.key,
                enabled: true,
                required: true,
                labelKey: q.title,
                concernThreshold: 3,
              }))
        );
        setAllowDuplicateOverride(Boolean(config.allowDuplicateOverride));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/check-in-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, allowDuplicateOverride }),
      });
      setMessage(res.ok ? tc("success") : tc("error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <SectionPanel title={t("title")} description={t("subtitle")}>
      <Stack gap="md">
        <Checkbox
          label={t("allowDuplicateOverride")}
          checked={allowDuplicateOverride}
          onChange={(e) => setAllowDuplicateOverride(e.currentTarget.checked)}
        />
        {questions.map((question, index) => (
          <Group key={question.key} align="flex-end" wrap="wrap">
            <Checkbox
              label={question.key}
              checked={question.enabled !== false}
              onChange={(e) => {
                const next = [...questions];
                next[index] = { ...question, enabled: e.currentTarget.checked };
                setQuestions(next);
              }}
            />
            <NumberInput
              label={t("concernThreshold")}
              value={question.concernThreshold ?? 3}
              min={1}
              max={5}
              onChange={(value) => {
                const next = [...questions];
                next[index] = { ...question, concernThreshold: typeof value === "number" ? value : 3 };
                setQuestions(next);
              }}
            />
          </Group>
        ))}
        <Group justify="flex-end">
          <SemanticButton action="save" color={getProductColor("dashboard", "primaryAction")} loading={saving} onClick={() => void handleSave()} />
        </Group>
        {message ? <Text size="sm">{message}</Text> : null}
      </Stack>
    </SectionPanel>
  );
}
