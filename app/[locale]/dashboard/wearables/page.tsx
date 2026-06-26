"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PageHeader, SemanticButton, StateBlock } from "@doneisbetter/gds/client";
import { SimpleGrid, Group, Box, Text, Avatar, Paper, Loader } from "@mantine/core";

type WearableStatus = "disconnected" | "connecting" | "connected" | "error" | "active";

interface DeviceConnection {
  connectionId: string;
  source: string;
  status: WearableStatus;
  lastSyncAt?: string;
  lastSyncError?: string;
}

const SUPPORTED = [
  { id: "oura", name: "Oura Ring", description: "Sync readiness and sleep data directly." },
  { id: "whoop", name: "Whoop", description: "Sync recovery, strain, and sleep metrics." },
  { id: "garmin", name: "Garmin Connect", description: "Sync training load, HRV, and sleep." },
  { id: "polar", name: "Polar Flow", description: "Coming soon.", disabled: true },
  { id: "apple_health", name: "Apple Health", description: "Coming soon.", disabled: true },
];

export default function WearablesConnectFlow() {
  const [connections, setConnections] = useState<DeviceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/athletes/${id}/devices`);
      if (!res.ok) throw new Error("Failed to load devices");
      const json = await res.json();
      setConnections(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        const id = me?.athleteId ?? me?.user?.athleteId;
        if (id) {
          setAthleteId(id);
          loadDevices(id);
        } else {
          setLoading(false);
          setError("No athlete profile linked to this account.");
        }
      })
      .catch(() => {
        setLoading(false);
        setError("Could not resolve athlete account.");
      });
  }, [loadDevices]);

  const getStatus = (source: string): DeviceConnection | undefined =>
    connections.find((c) => c.source === source);

  const handleConnect = async (source: string) => {
    if (!athleteId) return;
    try {
      const res = await fetch(`/api/athletes/${athleteId}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const json = await res.json();
      if (json.authUrl) {
        globalThis.location.assign(json.authUrl as string);
        return;
      }
      await loadDevices(athleteId);
    } catch {
      setError("Connection failed");
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!athleteId) return;
    await fetch(`/api/athletes/${athleteId}/devices/${connectionId}`, { method: "DELETE" });
    await loadDevices(athleteId);
  };

  if (loading) {
    return (
      <Box p="xl">
        <Loader />
      </Box>
    );
  }

  return (
    <Box className="wearables-dashboard" pb="xl">
      <PageHeader
        title="Wearable Ecosystem"
        subtitle="Connect devices for daily telemetry ingestion into your Athlete Digital Twin"
      />
      {error && (
        <Box mt="md">
          <StateBlock variant="info" title="Notice" description={error} />
        </Box>
      )}
      <Box mt="xl">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {SUPPORTED.map((wearable) => {
            const conn = getStatus(wearable.id);
            const status = conn?.status ?? "disconnected";
            return (
              <Paper key={wearable.id} withBorder p="lg" radius="md">
                <Group justify="space-between" mb="md">
                  <Avatar radius="xl" color="ingress">{wearable.name[0]}</Avatar>
                  <Text size="sm" c={status === "active" || status === "connected" ? "var(--mantine-color-tactical-6)" : "dimmed"} tt="uppercase">
                    {status}
                  </Text>
                </Group>
                <Text fw={700}>{wearable.name}</Text>
                <Text size="sm" c="dimmed" mb="md">{wearable.description}</Text>
                {conn?.lastSyncAt && (
                  <Text size="sm" c="dimmed" mb="sm">Last sync: {new Date(conn.lastSyncAt).toLocaleString()}</Text>
                )}
                {conn?.lastSyncError && (
                  <Text size="sm" c="red" mb="sm">{conn.lastSyncError}</Text>
                )}
                <Group>
                  {conn ? (
                    <SemanticButton action="cancel" variant="outline" onClick={() => handleDisconnect(conn.connectionId)} />
                  ) : (
                    <SemanticButton
                      action="start"
                      color="ingress"
                      disabled={!!(wearable as { disabled?: boolean }).disabled}
                      onClick={() => handleConnect(wearable.id)}
                    />
                  )}
                </Group>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Box>
    </Box>
  );
}
