"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Box, Stack, Text, Paper, Group, Badge, Loader } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton, StateBlock } from "@sovereignsquad/gds/client";

interface MediaItem {
  mediaId: string;
  url: string;
  status: string;
  confidence?: string;
  createdAt: string;
}

interface AnalysisItem {
  mediaId: string;
  confidence: string;
  qualityAccepted: boolean;
  limitations: string[];
  createdAt: string;
}

export default function VisionPage() {
  const params = useParams();
  const athleteId = params?.id as string;
  const t = useTranslations("VisionLab");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [realPipeline, setRealPipeline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMedia = useCallback(async () => {
    if (!athleteId) return;
    const res = await fetch(`/api/athletes/${athleteId}/media`);
    if (res.ok) {
      const json = await res.json();
      setMedia(json.media ?? []);
      setAnalyses(json.analyses ?? []);
      setRealPipeline(json.realPipeline !== false);
    }
  }, [athleteId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadMedia();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMedia]);

  const handleUpload = async (file: File) => {
    if (!athleteId) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/athletes/${athleteId}/media/upload`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? t("uploadFailed"));
        return;
      }
      await loadMedia();
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <Box p="xl"><Loader /></Box>;
  }

  return (
    <Stack gap="md">
      <PageHeader title={t("title")} />

      {!realPipeline && (
        <StateBlock variant="info" title={t("previewNotice")} description={t("previewNoticeDesc")} />
      )}

      <SectionPanel title={t("uploadTitle")}>
        <Paper withBorder p="xl" radius="md" style={{ textAlign: "center", borderStyle: "dashed" }}>
          <Text size="lg" fw={500} mb="sm">{t("uploadPrompt")}</Text>
          <Text size="sm" c="dimmed" mb="md">{t("uploadHint")}</Text>
          <input
            ref={fileRef}
            type="file"
            accept="video/*,image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <SemanticButton action="start" loading={uploading} onClick={() => fileRef.current?.click()} />
          {error ? <Text c="red" size="sm" mt="sm">{error}</Text> : null}
        </Paper>
      </SectionPanel>

      <SectionPanel title={t("analysesTitle")}>
        <Stack gap="md">
          {analyses.length === 0 && media.length === 0 && <Text c="dimmed">{t("noMedia")}</Text>}
          {analyses.map((item) => (
            <Paper key={item.mediaId} withBorder p="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>{t("analysisLabel", { id: item.mediaId.slice(0, 8) })}</Text>
                  <Text size="sm" c="dimmed">{new Date(item.createdAt).toLocaleString()}</Text>
                  {item.limitations.length > 0 && (
                    <Text size="sm" c="dimmed">{item.limitations.join("; ")}</Text>
                  )}
                </Box>
                <Group>
                  <Badge color={item.qualityAccepted ? "green" : "red"} variant="light">
                    {item.qualityAccepted ? t("accepted") : t("rejected")}
                  </Badge>
                  <Badge variant="outline">{item.confidence}</Badge>
                </Group>
              </Group>
            </Paper>
          ))}
          {media.filter((m) => !analyses.some((a) => a.mediaId === m.mediaId)).map((item) => (
            <Paper key={item.mediaId} withBorder p="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>{t("mediaLabel", { id: item.mediaId.slice(0, 8) })}</Text>
                  <Text size="sm" c="dimmed">{item.status}</Text>
                </Box>
                <Badge variant="light">{item.status}</Badge>
              </Group>
            </Paper>
          ))}
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
