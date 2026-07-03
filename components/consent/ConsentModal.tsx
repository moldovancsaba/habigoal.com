"use client";

import { useState } from "react";
import { Alert, Button, Checkbox, Group, Modal, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";

interface ConsentModalProps {
  athleteId: string;
  isOpen: boolean;
  onSuccess: () => void;
  onClose?: () => void;
}

// Data-purpose consent (distinct from the cookie banner in GH-423). Built on
// Mantine primitives so it is a proper modal — aria-modal, focus trap, labelled
// close, and inputs id-linked to their labels via Mantine Checkbox (GH-431).
const CONSENT_PURPOSE_KEYS = ["daily_check_in", "wearable_data", "media_upload"] as const;

type PurposeKey = (typeof CONSENT_PURPOSE_KEYS)[number];

export function ConsentModal({ athleteId, isOpen, onSuccess, onClose }: ConsentModalProps) {
  const t = useTranslations("Consent");
  const [selected, setSelected] = useState<PurposeKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Daily check-in consent is mandatory to proceed (preserves prior behaviour:
  // the submit button stayed disabled until it was granted).
  const canSubmit = selected.includes("daily_check_in") && !loading;

  const handleSubmit = async () => {
    if (selected.length === 0) {
      setError(t("selectAtLeastOne"));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await Promise.all(
        selected.map((purpose) =>
          fetch(`/api/athletes/${athleteId}/consents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ purpose, method: "web_form" })
          }).then((res) => {
            if (!res.ok) throw new Error(t("saveError"));
          })
        )
      );

      onSuccess();
    } catch (submitError: unknown) {
      console.error("Consent flow failed:", submitError);
      setError(submitError instanceof Error ? submitError.message : t("saveError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose ?? (() => {})}
      title={t("title")}
      centered
      closeButtonProps={{ "aria-label": t("closeAria") }}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t("intro")}
        </Text>

        {error ? (
          <Alert color="red" title={t("submissionFailed")} role="alert">
            {error}
          </Alert>
        ) : null}

        <Checkbox.Group
          value={selected}
          onChange={(value) => {
            setSelected(value as PurposeKey[]);
            setError(null);
          }}
        >
          <Stack gap="sm">
            {CONSENT_PURPOSE_KEYS.map((purpose) => (
              <Checkbox
                key={purpose}
                value={purpose}
                label={t(`purposes.${purpose}.title`)}
                description={t(`purposes.${purpose}.description`)}
              />
            ))}
          </Stack>
        </Checkbox.Group>

        <Group justify="flex-end" pt="sm">
          <Button onClick={handleSubmit} loading={loading} disabled={!canSubmit}>
            {t("submit")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
