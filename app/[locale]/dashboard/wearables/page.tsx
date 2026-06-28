"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader, SectionPanel, SemanticButton, StateBlock } from "@doneisbetter/gds/client";
import { Avatar, Badge, Box, Group, Loader, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { deriveConnectionStatus, toMetricChips, type WearableConnectionStatus } from "@/lib/wearable-dashboard-view";
import type { CanonicalMetric } from "@/types/canonical-metric";
import type { DeviceConnection } from "@/types/wearable-connector";

const SUPPORTED = [
  { id: "oura" },
  { id: "whoop" },
  { id: "garmin" },
  { id: "polar", disabled: true },
  { id: "apple_health", disabled: true }
];

const STATUS_TONE: Record<WearableConnectionStatus, string> = {
  connected: "green",
  stale: "yellow",
  error: "red",
  needs_reauth: "orange",
  never: "gray"
};

type LoadResult = { ok: boolean; connections: DeviceConnection[]; metrics: CanonicalMetric[] };

export default function WearablesConnectFlow() {
  const t = useTranslations("Wearables");
  const searchParams = useSearchParams();
  const connectedProvider = searchParams.get("connected");
  const connectError = searchParams.get("error");

  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [connections, setConnections] = useState<DeviceConnection[]>([]);
  const [metrics, setMetrics] = useState<CanonicalMetric[]>([]);
  const [phase, setPhase] = useState<"loading" | "error" | "ready" | "no_athlete">("loading");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncErrorId, setSyncErrorId] = useState<string | null>(null);

  const loadAll = useCallback(async (id: string): Promise<LoadResult> => {
    try {
      const [devRes, metRes] = await Promise.all([
        fetch(`/api/athletes/${id}/devices`),
        fetch(`/api/athletes/${id}/devices/recent-metrics`)
      ]);
      if (!devRes.ok) return { ok: false, connections: [], metrics: [] };
      const dev = await devRes.json();
      const met = metRes.ok ? await metRes.json() : { metrics: [] };
      return { ok: true, connections: dev?.data ?? [], metrics: met?.metrics ?? [] };
    } catch {
      return { ok: false, connections: [], metrics: [] };
    }
  }, []);

  const applyLoad = useCallback((result: LoadResult) => {
    if (result.ok) {
      setConnections(result.connections);
      setMetrics(result.metrics);
      setPhase("ready");
    } else {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        const id = me?.athleteId ?? me?.user?.athleteId ?? null;
        if (!active) return undefined;
        if (!id) {
          setPhase("no_athlete");
          return undefined;
        }
        setAthleteId(id);
        return loadAll(id).then((res) => {
          if (active) applyLoad(res);
        });
      })
      .catch(() => {
        if (active) setPhase("error");
      });
    return () => {
      active = false;
    };
  }, [loadAll, applyLoad]);

  async function connect(source: string) {
    if (!athleteId) return;
    const res = await fetch(`/api/athletes/${athleteId}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source })
    }).catch(() => null);
    const json = res && res.ok ? await res.json().catch(() => null) : null;
    if (json?.authUrl) {
      globalThis.location.assign(json.authUrl as string);
    }
  }

  async function disconnect(connectionId: string) {
    if (!athleteId) return;
    await fetch(`/api/athletes/${athleteId}/devices/${connectionId}`, { method: "DELETE" }).catch(() => null);
    void loadAll(athleteId).then(applyLoad);
  }

  async function syncNow(connectionId: string) {
    if (!athleteId) return;
    setSyncing(connectionId);
    setSyncErrorId(null);
    const res = await fetch(`/api/athletes/${athleteId}/devices/${connectionId}/sync`, { method: "POST" }).catch(() => null);
    if (res && res.ok) {
      const result = await loadAll(athleteId);
      applyLoad(result);
    } else {
      setSyncErrorId(connectionId);
    }
    setSyncing(null);
  }

  if (phase === "loading") {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }}>
        <Loader />
      </Box>
    );
  }

  if (phase === "no_athlete") {
    return (
      <Box p="xl">
        <StateBlock variant="info" title={t("noAthlete")} description={t("noAthleteHelp")} />
      </Box>
    );
  }

  if (phase === "error") {
    return (
      <Box p="xl">
        <Stack gap="md" align="flex-start">
          <StateBlock variant="error" title={t("loadError")} />
          <SemanticButton action="refresh" variant="light" onClick={() => athleteId && void loadAll(athleteId).then(applyLoad)}>
            {t("retry")}
          </SemanticButton>
        </Stack>
      </Box>
    );
  }

  const connectionBySource = new Map<string, DeviceConnection>(connections.map((conn) => [conn.source as string, conn]));

  return (
    <Stack gap="xl" pb="xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {connectedProvider ? (
        <Box role="status">
          <StateBlock variant="success" title={t("connectedNotice.title")} description={t("connectedNotice.body", { provider: connectedProvider })} />
        </Box>
      ) : null}
      {connectError ? (
        <Box role="alert">
          <StateBlock variant="error" title={t("connectFailed.title")} description={t(`connectFailed.${connectError}` as "connectFailed.exchange_failed")} />
        </Box>
      ) : null}

      <SectionPanel title={t("devices")}>
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
          {SUPPORTED.map((provider) => {
            const conn = connectionBySource.get(provider.id);
            const status = conn ? deriveConnectionStatus(conn) : null;
            const chips = conn ? toMetricChips(metrics.filter((m) => m.source === provider.id)) : [];
            return (
              <Paper key={provider.id} withBorder p="lg" radius="md">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Group gap="sm">
                      <Avatar radius="xl" color="ingress">{t(`providers.${provider.id}.name`).charAt(0)}</Avatar>
                      <Box>
                        <Text fw={700}>{t(`providers.${provider.id}.name`)}</Text>
                        <Text size="sm" c="dimmed">{t(`providers.${provider.id}.desc`)}</Text>
                      </Box>
                    </Group>
                    {status ? (
                      <Badge color={STATUS_TONE[status]} variant="light">{t(`status.${status}`)}</Badge>
                    ) : null}
                  </Group>

                  {conn ? (
                    <>
                      <Text size="sm" c="dimmed">
                        {conn.lastSyncAt ? t("lastSync", { time: new Date(conn.lastSyncAt).toLocaleString() }) : t("neverSynced")}
                      </Text>

                      {chips.length > 0 ? (
                        <Group gap="xs">
                          {chips.map((chip) => (
                            <Badge key={chip.key} variant="outline" color="strategy">
                              {t(`metricLabel.${chip.key}`)}: {chip.value}{chip.unit ? ` ${chip.unit}` : ""}
                            </Badge>
                          ))}
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">{t("noMetrics")}</Text>
                      )}

                      {syncErrorId === conn.connectionId ? (
                        <Text size="sm" role="alert" style={{ color: "var(--status-error)" }}>{t("syncError")}</Text>
                      ) : null}

                      <Group gap="sm">
                        {status === "needs_reauth" ? (
                          <SemanticButton action="start" color="ingress" onClick={() => void connect(provider.id)}>{t("reconnect")}</SemanticButton>
                        ) : (
                          <SemanticButton action="refresh" variant="light" color="ingress" loading={syncing === conn.connectionId} onClick={() => void syncNow(conn.connectionId)}>
                            {t("syncNow")}
                          </SemanticButton>
                        )}
                        <SemanticButton action="cancel" variant="outline" onClick={() => void disconnect(conn.connectionId)}>{t("disconnect")}</SemanticButton>
                      </Group>
                    </>
                  ) : (
                    <Group>
                      <SemanticButton action="start" color="ingress" disabled={provider.disabled} onClick={() => void connect(provider.id)}>
                        {provider.disabled ? t("comingSoon") : t("connect")}
                      </SemanticButton>
                    </Group>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      </SectionPanel>
    </Stack>
  );
}
