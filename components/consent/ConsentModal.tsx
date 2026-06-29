"use client";

import { useState } from "react";
import { Alert, Button, Checkbox, Group, Modal, Stack, Text } from "@mantine/core";

interface ConsentModalProps {
  athleteId: string;
  isOpen: boolean;
  onSuccess: () => void;
  onClose?: () => void;
}

// Data-purpose consent (distinct from the cookie banner in #423). Built on
// Mantine primitives so it is a proper modal — aria-modal, focus trap, labelled
// close, and inputs id-linked to their labels via Mantine Checkbox (#431).
const CONSENT_PURPOSES = [
  {
    key: "daily_check_in",
    title: "Daily Check-in Data",
    description: "Allow processing of daily readiness and wellness surveys."
  },
  {
    key: "wearable_data",
    title: "Wearable Data Integration",
    description: "Allow syncing with Oura, Garmin, Whoop, etc."
  },
  {
    key: "media_upload",
    title: "Media Upload & Vision AI",
    description: "Allow uploading photos/videos for posture and sprint analysis."
  }
] as const;

type PurposeKey = (typeof CONSENT_PURPOSES)[number]["key"];

export function ConsentModal({ athleteId, isOpen, onSuccess, onClose }: ConsentModalProps) {
  const [selected, setSelected] = useState<PurposeKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Daily check-in consent is mandatory to proceed (preserves prior behaviour:
  // the submit button stayed disabled until it was granted).
  const canSubmit = selected.includes("daily_check_in") && !loading;

  const handleSubmit = async () => {
    if (selected.length === 0) {
      setError("Please select at least one purpose to proceed.");
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
            if (!res.ok) throw new Error("Failed to save consent");
          })
        )
      );

      onSuccess();
    } catch (submitError: unknown) {
      console.error("Consent flow failed:", submitError);
      setError(submitError instanceof Error ? submitError.message : "An error occurred while saving consent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose ?? (() => {})}
      title="Data Processing Consent"
      centered
      closeButtonProps={{ "aria-label": "Close consent dialog" }}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Athlete IQ requires your consent to process your health and performance data to provide our services.
        </Text>

        {error ? (
          <Alert color="red" title="Submission failed" role="alert">
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
            {CONSENT_PURPOSES.map((purpose) => (
              <Checkbox key={purpose.key} value={purpose.key} label={purpose.title} description={purpose.description} />
            ))}
          </Stack>
        </Checkbox.Group>

        <Group justify="flex-end" pt="sm">
          <Button onClick={handleSubmit} loading={loading} disabled={!canSubmit}>
            Acknowledge &amp; Continue
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
