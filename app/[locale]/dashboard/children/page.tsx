"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Group, Loader, Modal, Paper, Stack, Text, TextInput } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { calculateAgeGroup } from "@/lib/utils/age";
import type { ChildProfile } from "@/repositories/child.repository";

export default function ChildrenListPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const ta = useTranslations("Assessment");

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<ChildProfile | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftBirthDate, setDraftBirthDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      const response = await fetch("/api/children").catch(() => null);
      if (!active) return;

      if (!response?.ok) {
        setChildren([]);
        setLoading(false);
        return;
      }

      const data = (await response.json()) as ChildProfile[];
      setChildren(data);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return children;
    return children.filter((child) => {
      const ageGroup = calculateAgeGroup(child.birthDate) || "";
      return (
        child.name.toLowerCase().includes(q) ||
        child.birthDate.toLowerCase().includes(q) ||
        ageGroup.toLowerCase().includes(q)
      );
    });
  }, [children, query]);

  function startEdit(child: ChildProfile) {
    setEditing(child);
    setDraftName(child.name);
    setDraftBirthDate(child.birthDate);
  }

  async function saveEdit() {
    if (!editing?._id || !draftName.trim() || !draftBirthDate.trim()) {
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/children/${editing._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draftName,
        birthDate: draftBirthDate,
        dominantHand: editing.dominantHand || "",
        dominantEye: editing.dominantEye || "",
        dominantFoot: editing.dominantFoot || "",
        knownTraits: editing.knownTraits || "",
        parentSignals: editing.parentSignals || ""
      })
    }).catch(() => null);
    setSaving(false);

    if (!response?.ok) {
      setError(true);
      setMessage(tc("error"));
      return;
    }

    const updated = (await response.json()) as ChildProfile;
    setChildren((current) => current.map((child) => (child._id === updated._id ? updated : child)));
    setEditing(null);
    setError(false);
    setMessage(tc("success"));
  }

  async function deleteChild(child: ChildProfile) {
    if (!child._id) return;

    const ok = window.confirm(t("deleteChildConfirm", { name: child.name }));
    if (!ok) return;

    const response = await fetch(`/api/children/${child._id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setError(true);
      setMessage(tc("error"));
      return;
    }

    setChildren((current) => current.filter((item) => item._id !== child._id));
    setError(false);
    setMessage(t("childDeleted"));
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack gap="md">
      <PageHeader title={t("children")} />
      <SectionCard>
        <Stack gap="md">
          {message ? (
            <Alert color={error ? "red" : "kidex"} withCloseButton onClose={() => setMessage("")}>
              {message}
            </Alert>
          ) : null}

          <TextInput
            label={t("searchChildren")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchChildrenPlaceholder")}
          />

          {filtered.length === 0 ? (
            <Text c="dimmed">{query ? t("noChildrenMatch") : tc("noChildren")}</Text>
          ) : (
            <Stack gap="md">
              {filtered.map((child) => {
                const ageGroup = calculateAgeGroup(child.birthDate) || "-";
                return (
                  <Paper key={child._id} withBorder p="md">
                      <Stack gap="md">
                        <Box style={{ minWidth: 0 }}>
                          <Text
                            component={Link}
                            href={`/dashboard/children/${child._id}`}
                            fw={700}
                            size="lg"
                            style={{ textDecoration: "none", color: "var(--mantine-color-kidex-6)" }}
                          >
                            {child.name}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {ta("birthDate")}: {child.birthDate} · {ta("ageGroup")}: {ageGroup}
                          </Text>
                        </Box>
                        <Group gap="xs" wrap="wrap">
                          <Button component={Link} href={`/dashboard/assessment?childId=${child._id}`} color="kidex">
                            {t("newSurveyForChild")}
                          </Button>
                          <Button component={Link} href={`/dashboard/children/${child._id}`} variant="default">
                            {t("viewHistory")}
                          </Button>
                          <Button variant="light" color="gray" onClick={() => startEdit(child)}>
                            {t("editChild")}
                          </Button>
                          <Button color="red" variant="light" onClick={() => void deleteChild(child)}>
                            {t("deleteChild")}
                          </Button>
                        </Group>
                      </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </SectionCard>
      <Modal opened={Boolean(editing)} onClose={() => (saving ? null : setEditing(null))} title={t("editChild")} centered>
          <Stack gap="md" mt="xs">
            <TextInput
              label={ta("childName")}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
            <TextInput
              label={ta("birthDate")}
              type="date"
              value={draftBirthDate}
              onChange={(event) => setDraftBirthDate(event.target.value)}
            />
          </Stack>
          <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={() => setEditing(null)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={() => void saveEdit()} color="kidex" disabled={saving || !draftName.trim() || !draftBirthDate.trim()}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
