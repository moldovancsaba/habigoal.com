"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, Group, Loader, Paper, Stack, Table, Text, TextInput } from "@mantine/core";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { DEFAULT_KIDEX_SETTINGS, getSettings, KidexSettings, saveSettings } from "@/services/settings-service";
import { getUsers, saveUser, User } from "@/services/user-service";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function SettingsPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const tl = useTranslations("Legal");
  const params = useParams();
  const locale = params.locale as string;

  const [settings, setSettings] = useState<KidexSettings>(DEFAULT_KIDEX_SETTINGS);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [userDraft, setUserDraft] = useState("");
  const [me, setMe] = useState<{ isGoogleLinked: boolean } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [sData, uData, meRes] = await Promise.all([
          getSettings(), 
          getUsers(),
          fetch("/api/auth/me").then(r => r.json()).catch(() => null)
        ]);
        setSettings(sData);
        setUsers(uData);
        if (meRes?.user) setMe(meRes.user);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSaveSettings() {
    setSaving(true);
    const ok = await saveSettings(settings);
    setMessage(ok ? tc("success") : tc("error"));
    setSaving(false);
  }

  async function toggleRole(user: User, role: "admin" | "conductor" | "observer") {
    const nextRoles = user.roles.includes(role) ? user.roles.filter((r) => r !== role) : [...user.roles, role];

    const updatedUser = { ...user, roles: nextRoles };

    const previousUsers = users;
    setUsers((prev) => prev.map((u) => (u.email === user.email ? updatedUser : u)));

    const ok = await saveUser(updatedUser);
    if (!ok) {
      setUsers(previousUsers);
      setMessage(tc("error"));
      return;
    }
    setMessage(tc("success"));
  }

  function addNewUser() {
    const email = userDraft.trim().toLowerCase();
    if (email) {
      const newUser: User = { email, roles: [] };
      setUsers((prev) => [...prev, newUser]);
      setUserDraft("");
      void saveUser(newUser).then((ok) => {
        if (!ok) {
          setUsers((prev) => prev.filter((u) => u.email !== email));
          setMessage(tc("error"));
        } else {
          setMessage(tc("success"));
      void fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale })
      }).then(async (res) => {
        const data = await res.json();
        if (data.error) {
          setMessage(`Error: ${data.error}`);
        } else if (data.message) {
          setMessage(data.message);
        } else {
          setMessage(tc("success"));
        }
      });
    }
  });
}
}

  function removeLocation(index: number) {
    setSettings((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index)
    }));
  }

  function addLocation() {
    const loc = locationDraft.trim();
    if (!loc) return;
    setSettings((prev) => ({
      ...prev,
      locations: prev.locations.includes(loc) ? prev.locations : [...prev.locations, loc]
    }));
    setLocationDraft("");
  }

  function updateCompanyField(field: keyof KidexSettings["company"], value: string) {
    setSettings((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        [field]: value
      }
    }));
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader title={t("settings")} />

      {message ? (
        <Alert color={message === tc("error") ? "red" : "kidex"} withCloseButton onClose={() => setMessage("")}>
          {message}
        </Alert>
      ) : null}

      <SectionCard title={t("userRights")}>
        <Stack gap="md">
          <Group gap="xs" align="end" wrap="wrap">
            <TextInput
              label={t("email")}
              placeholder="user@example.com"
              value={userDraft}
              onChange={(event) => setUserDraft(event.target.value)}
              style={{ minWidth: 280 }}
            />
            <Button variant="default" onClick={addNewUser} disabled={!userDraft.trim()}>
              {t("inviteUser")}
            </Button>
          </Group>
          <Paper withBorder p={0}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("email")}</Table.Th>
                <Table.Th style={{ textAlign: "center" }}>{t("canConduct")}</Table.Th>
                <Table.Th style={{ textAlign: "center" }}>{t("canObserve")}</Table.Th>
                <Table.Th style={{ textAlign: "center" }}>Admin</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>{tc("actions")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users
                .filter(u => !!u.email)
                .map((user) => (
                <Table.Tr key={user.email}>
                  <Table.Td>
                    <Text fw={600}>{user.email}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "center" }}>
                    <Checkbox
                      checked={user.roles.includes("conductor")}
                      onChange={() => void toggleRole(user, "conductor")}
                      aria-label={`${user.email} conductor`}
                    />
                  </Table.Td>
                  <Table.Td style={{ textAlign: "center" }}>
                    <Checkbox
                      checked={user.roles.includes("observer")}
                      onChange={() => void toggleRole(user, "observer")}
                      aria-label={`${user.email} observer`}
                    />
                  </Table.Td>
                  <Table.Td style={{ textAlign: "center" }}>
                    <Checkbox
                      checked={user.roles.includes("admin")}
                      onChange={() => void toggleRole(user, "admin")}
                      aria-label={`${user.email} admin`}
                    />
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Button 
                      variant="light" 
                      color="red" 
                      size="sm" 
                      onClick={async () => {
                        const { deleteUser } = await import("@/services/user-service");
                        if (confirm(`Remove access for ${user.email}?`)) {
                          const ok = await deleteUser(user.email);
                          if (ok) setUsers(prev => prev.filter(u => u.email !== user.email));
                        }
                      }}
                    >
                      {tc("remove")}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
              {users.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed">{t("noUsers")}</Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
          </Paper>
        </Stack>
      </SectionCard>

      <SectionCard title={t("locations")}>
        <Stack gap="md">
          <Group gap="xs" align="end" wrap="wrap">
            <Box style={{ minWidth: 280, width: 420, maxWidth: "100%" }}>
              <SearchableSelect
                label={t("addLocation")}
                value={locationDraft}
                options={settings.locations.map((name) => ({ id: name, name }))}
                onChange={setLocationDraft}
                allowAdd
              />
            </Box>
            <Button variant="default" onClick={addLocation} disabled={!locationDraft.trim()}>
              {t("addLocation")}
            </Button>
            <Button color="kidex" onClick={() => void handleSaveSettings()} disabled={saving}>
              {saving ? tc("saving") : tc("save")}
            </Button>
          </Group>
          {settings.locations.length === 0 ? (
            <Text c="dimmed">{t("noLocations")}</Text>
          ) : (
            <Stack gap="xs">
              {settings.locations.map((loc, i) => (
                <Paper
                  key={`${loc}-${i}`}
                  withBorder
                  p="sm"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
                >
                  <Text>{loc}</Text>
                  <Button color="red" variant="light" size="sm" onClick={() => removeLocation(i)}>
                    {tc("remove")}
                  </Button>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </SectionCard>

      <SectionCard
        title={t("legalAndCompany")}
        action={
          <Button color="kidex" onClick={() => void handleSaveSettings()} disabled={saving}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        }
      >
        <Stack gap="md">
          <TextInput label={t("company")} value={settings.company.name} onChange={(event) => updateCompanyField("name", event.target.value)} />
          <TextInput label={tl("idNo")} value={settings.company.ico} onChange={(event) => updateCompanyField("ico", event.target.value)} />
          <TextInput
            label={tl("registered")}
            value={settings.company.registered}
            onChange={(event) => updateCompanyField("registered", event.target.value)}
          />
          <TextInput
            label={tl("legalForm")}
            value={settings.company.legalForm}
            onChange={(event) => updateCompanyField("legalForm", event.target.value)}
          />
          <TextInput label={tl("address")} value={settings.company.address} onChange={(event) => updateCompanyField("address", event.target.value)} />
          <TextInput
            label={tl("shareCapital")}
            value={settings.company.shareCapital}
            onChange={(event) => updateCompanyField("shareCapital", event.target.value)}
          />
          <TextInput label={tl("vatNo")} value={settings.company.vatNo} onChange={(event) => updateCompanyField("vatNo", event.target.value)} />
          <TextInput label={tl("website")} value={settings.company.website} onChange={(event) => updateCompanyField("website", event.target.value)} />
        </Stack>
      </SectionCard>

      <SectionCard title={t("emailIntegration")}>
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {t("gmailIntegrationDescription")}
          </Text>
          <Group>
            {me?.isGoogleLinked ? (
              <Alert color="teal" style={{ flex: 1 }}>
                <Group justify="space-between">
                  <Text fw={700}>{t("gmailLinked")}</Text>
                  <Button variant="white" color="teal" size="sm" onClick={() => window.location.href = "/api/auth/google/login"}>
                    {t("reconnect")}
                  </Button>
                </Group>
              </Alert>
            ) : (
              <Button color="kidex" onClick={() => window.location.href = "/api/auth/google/login"}>
                {t("linkGmail")}
              </Button>
            )}
          </Group>
        </Stack>
      </SectionCard>
    </Stack>
  );
}
