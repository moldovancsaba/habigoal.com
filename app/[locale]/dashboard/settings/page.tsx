"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, Group, Loader, NumberInput, Paper, Select, Stack, Table, Text, TextInput } from "@mantine/core";
import { useTranslations } from "next-intl";
import { DEFAULT_SURVEY_SETTINGS, getSettings, SurveySettings, saveSettings } from "@/services/settings-service";
import { getUsers, saveUser, User } from "@/services/user-service";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { ResponsiveDataCard, ResponsiveDataRow } from "@/components/ui/ResponsiveDataCard";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function SettingsPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const tl = useTranslations("Legal");

  const [settings, setSettings] = useState<SurveySettings>(DEFAULT_SURVEY_SETTINGS);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [userDraft, setUserDraft] = useState("");
  const [userNameDraft, setUserNameDraft] = useState("");
  const [deletedChildren, setDeletedChildren] = useState<Array<{ _id?: string; name: string; updatedAt?: string }>>([]);
  const [deletedAssessments, setDeletedAssessments] = useState<Array<{ _id?: string; child?: { name?: string }; session?: { date?: string }; updatedAt?: string }>>([]);
  const [newStandardsVersion, setNewStandardsVersion] = useState("");
  const [versionNotesDraft, setVersionNotesDraft] = useState("");
  const [impactPreview, setImpactPreview] = useState<{ readyToDeveloping: number; developingToReady: number; total: number } | null>(null);
  const [allAssessments, setAllAssessments] = useState<Array<{ childId?: string; child: { name: string; birthDate: string }; session?: { consentReport?: boolean }; computed: { ski: number | null } }>>([]);
  const [governanceMetrics, setGovernanceMetrics] = useState<{ deletedChildren: number; deletedAssessments: number; missingConsentReport: number; missingChildLink: number }>({ deletedChildren: 0, deletedAssessments: 0, missingConsentReport: 0, missingChildLink: 0 });

  useEffect(() => {
    void (async () => {
      try {
        const [sData, uData] = await Promise.all([getSettings(), getUsers()]);
        setSettings(sData);
        setUsers(uData);
        const [dcRes, daRes] = await Promise.all([
          fetch("/api/athletes?deleted=true").then(r => r.json()).catch(() => []),
          fetch("/api/check-ins?deleted=true").then(r => r.json()).catch(() => ({ assessments: [] }))
        ]);
        const activeAssessmentsRes = await fetch("/api/check-ins").then(r => r.json()).catch(() => ({ assessments: [] }));
        setAllAssessments(Array.isArray(activeAssessmentsRes?.assessments) ? activeAssessmentsRes.assessments : []);
        setDeletedChildren(Array.isArray(dcRes) ? dcRes : []);
        setDeletedAssessments(Array.isArray(daRes?.assessments) ? daRes.assessments : []);
        const activeAssessments = Array.isArray(activeAssessmentsRes?.assessments) ? activeAssessmentsRes.assessments : [];
        setGovernanceMetrics({
          deletedChildren: Array.isArray(dcRes) ? dcRes.length : 0,
          deletedAssessments: Array.isArray(daRes?.assessments) ? daRes.assessments.length : 0,
          missingConsentReport: activeAssessments.filter((a: { session?: { consentReport?: boolean } }) => !a.session?.consentReport).length,
          missingChildLink: activeAssessments.filter((a: { childId?: string }) => !a.childId).length
        });
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

  async function restoreChild(id?: string) {
    if (!id) return;
    const res = await fetch(`/api/athletes/${id}/restore`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return setMessage(tc("error"));
    setDeletedChildren((prev) => prev.filter((x) => x._id !== id));
    setMessage(tc("success"));
  }

  async function restoreAssessment(id?: string) {
    if (!id) return;
    const res = await fetch(`/api/check-ins/${id}`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return setMessage(tc("error"));
    setDeletedAssessments((prev) => prev.filter((x) => x._id !== id));
    setMessage(tc("success"));
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
      const newUser: User = { email, name: userNameDraft.trim() || undefined, roles: [] };
      setUsers((prev) => [...prev, newUser]);
      setUserDraft("");
      setUserNameDraft("");
      void saveUser(newUser).then((ok) => {
        if (!ok) {
          setUsers((prev) => prev.filter((u) => u.email !== email));
          setMessage(tc("error"));
        } else {
          setMessage(tc("success"));
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

  function updateCompanyField(field: keyof SurveySettings["company"], value: string) {
    setSettings((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        [field]: value
      }
    }));
  }

  function cloneActiveStandardsVersion() {
    const versionName = newStandardsVersion.trim();
    if (!versionName) return;
    const active = settings.standards.activeVersion;
    const source = settings.standards.versions[active];
    if (!source || settings.standards.versions[versionName]) return;
    setSettings((prev) => ({
      ...prev,
      standards: {
        ...prev.standards,
        activeVersion: versionName,
        versions: {
          ...prev.standards.versions,
          [versionName]: { ...JSON.parse(JSON.stringify(source)), meta: { createdAt: new Date().toISOString(), status: "draft", notes: `Cloned from ${active}` } }
        }
      }
    }));
    setNewStandardsVersion("");
  }

  function currentVersionMeta() {
    const active = settings.standards.activeVersion;
    return settings.standards.versions[active]?.meta || { status: "draft", notes: "" };
  }

  function setCurrentVersionMeta(next: { notes?: string; status?: "draft" | "published" }) {
    const active = settings.standards.activeVersion;
    setSettings((prev) => ({
      ...prev,
      standards: {
        ...prev.standards,
        versions: {
          ...prev.standards.versions,
          [active]: {
            ...prev.standards.versions[active],
            meta: {
              ...prev.standards.versions[active]?.meta,
              ...next
            }
          }
        }
      }
    }));
  }

  function computeImpactPreview() {
    const active = settings.standards.activeVersion;
    const v = settings.standards.versions[active];
    if (!v) return setImpactPreview(null);
    const threshold = v["7-9"]?.ski?.min ?? 3.5;
    let readyToDeveloping = 0;
    let developingToReady = 0;
    let total = 0;
    for (const a of allAssessments) {
      if (a.computed.ski === null || a.computed.ski === undefined) continue;
      total += 1;
      const oldReady = a.computed.ski >= 3.5;
      const newReady = a.computed.ski >= threshold;
      if (oldReady && !newReady) readyToDeveloping++;
      if (!oldReady && newReady) developingToReady++;
    }
    setImpactPreview({ readyToDeveloping, developingToReady, total });
  }

  function updateStandardValue(
    ageGroup: "4-6" | "7-9" | "10-12",
    domain: "movement" | "social" | "mental" | "ski",
    key: "target" | "min",
    value: string
  ) {
    const n = Number(value);
    if (Number.isNaN(n)) return;
    const active = settings.standards.activeVersion;
    setSettings((prev) => ({
      ...prev,
      standards: {
        ...prev.standards,
        versions: {
          ...prev.standards.versions,
          [active]: {
            ...prev.standards.versions[active],
            [ageGroup]: {
              ...prev.standards.versions[active][ageGroup],
              [domain]: {
                ...prev.standards.versions[active][ageGroup][domain],
                [key]: n
              }
            }
          }
        }
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
        <Alert color={message === tc("error") ? "red" : "ingress"} withCloseButton onClose={() => setMessage("")}>
          {message}
        </Alert>
      ) : null}

      <SectionCard title={t("userRights")}>
        <Stack gap="md">
          <Group gap="xs" align="end" wrap="wrap">
            <TextInput
              label={tc("name")}
              placeholder="Full name"
              value={userNameDraft}
              onChange={(event) => setUserNameDraft(event.target.value)}
              style={{ minWidth: 220 }}
            />
            <TextInput
              label={t("email")}
              placeholder="user@example.com"
              value={userDraft}
              onChange={(event) => setUserDraft(event.target.value)}
              style={{ minWidth: 280 }}
            />
            <Button variant="default" onClick={addNewUser} disabled={!userDraft.trim()}>
              Add user
            </Button>
          </Group>
          <Stack gap="md" hiddenFrom="sm">
            {users
              .filter((u) => !!u.email)
              .map((user) => (
                <ResponsiveDataCard key={user.email} title={user.name || user.email}>
                  <Stack gap="sm">
                    <TextInput
                      label={tc("name")}
                      value={user.name || ""}
                      placeholder="Full name"
                      onChange={(event) => {
                        const name = event.currentTarget.value;
                        setUsers((prev) => prev.map((u) => (u.email === user.email ? { ...u, name } : u)));
                      }}
                    />
                    <ResponsiveDataRow label={t("email")} value={<Text fw={600}>{user.email}</Text>} />
                    <MobileCheckboxRow
                      label={t("canConduct")}
                      checked={user.roles.includes("conductor")}
                      onChange={() => void toggleRole(user, "conductor")}
                    />
                    <MobileCheckboxRow
                      label={t("canObserve")}
                      checked={user.roles.includes("observer")}
                      onChange={() => void toggleRole(user, "observer")}
                    />
                    <MobileCheckboxRow
                      label="Admin"
                      checked={user.roles.includes("admin")}
                      onChange={() => void toggleRole(user, "admin")}
                    />
                    <Group grow>
                      <Button
                        variant="light"
                        onClick={async () => {
                          const latest = users.find((u) => u.email === user.email) || user;
                          const updatedUser = { ...latest, name: (latest.name || "").trim() || undefined };
                          const ok = await saveUser(updatedUser);
                          setMessage(ok ? tc("success") : tc("error"));
                        }}
                      >
                        {tc("save")}
                      </Button>
                      <Button
                        variant="light"
                        color="red"
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
                    </Group>
                  </Stack>
                </ResponsiveDataCard>
              ))}
            {users.length === 0 ? <Text c="dimmed">{t("noUsers")}</Text> : null}
          </Stack>
          <Paper withBorder p={0} visibleFrom="sm">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{tc("name")}</Table.Th>
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
                    <TextInput
                      value={user.name || ""}
                      placeholder="Full name"
                      onChange={(event) => {
                        const name = event.currentTarget.value;
                        setUsers((prev) => prev.map((u) => (u.email === user.email ? { ...u, name } : u)));
                      }}
                    />
                  </Table.Td>
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
                      size="sm"
                      onClick={async () => {
                        const latest = users.find((u) => u.email === user.email) || user;
                        const updatedUser = { ...latest, name: (latest.name || "").trim() || undefined };
                        const ok = await saveUser(updatedUser);
                        setMessage(ok ? tc("success") : tc("error"));
                      }}
                      mr="xs"
                    >
                      {tc("save")}
                    </Button>
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
                  <Table.Td colSpan={6}>
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
            <Button color="ingress" onClick={() => void handleSaveSettings()} disabled={saving}>
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

      <SectionCard title={t("alertingTitle")}>
        <Stack gap="md">
          <Checkbox
            label={t("alertingDigestEnabled")}
            checked={settings.alerting.dailyDigestEnabled}
            onChange={(event) => setSettings((prev) => ({
              ...prev,
              alerting: {
                ...prev.alerting,
                dailyDigestEnabled: event.currentTarget.checked
              }
            }))}
          />
          <Group grow align="end" wrap="wrap">
            <NumberInput
              label={t("alertingCutoffHour")}
              value={settings.alerting.missedCheckInCutoffHour}
              min={0}
              max={23}
              clampBehavior="strict"
              onChange={(value) => setSettings((prev) => ({
                ...prev,
                alerting: {
                  ...prev.alerting,
                  missedCheckInCutoffHour: typeof value === "number" ? value : prev.alerting.missedCheckInCutoffHour
                }
              }))}
            />
            <NumberInput
              label={t("alertingWatchThreshold")}
              value={settings.alerting.watchReadinessThreshold}
              min={1}
              max={5}
              decimalScale={1}
              step={0.1}
              clampBehavior="strict"
              onChange={(value) => setSettings((prev) => ({
                ...prev,
                alerting: {
                  ...prev.alerting,
                  watchReadinessThreshold: typeof value === "number" ? value : prev.alerting.watchReadinessThreshold
                }
              }))}
            />
            <NumberInput
              label={t("alertingSupportThreshold")}
              value={settings.alerting.supportReadinessThreshold}
              min={1}
              max={5}
              decimalScale={1}
              step={0.1}
              clampBehavior="strict"
              onChange={(value) => setSettings((prev) => ({
                ...prev,
                alerting: {
                  ...prev.alerting,
                  supportReadinessThreshold: typeof value === "number" ? value : prev.alerting.supportReadinessThreshold
                }
              }))}
            />
          </Group>
          <Text size="sm" c="dimmed">
            {t("alertingHint", {
              hour: settings.alerting.missedCheckInCutoffHour,
              watch: settings.alerting.watchReadinessThreshold.toFixed(1),
              support: settings.alerting.supportReadinessThreshold.toFixed(1)
            })}
          </Text>
          <Group justify="flex-end">
            <Button color="ingress" onClick={() => void handleSaveSettings()} disabled={saving}>
              {saving ? tc("saving") : tc("save")}
            </Button>
          </Group>
        </Stack>
      </SectionCard>

      <SectionCard
        title={t("legalAndCompany")}
        action={
          <Button color="ingress" onClick={() => void handleSaveSettings()} disabled={saving}>
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

      <SectionCard title="Standards Version Manager">
        <Stack gap="md">
          <Select
            label={t("standardsActiveVersion")}
            value={settings.standards.activeVersion}
            data={Object.keys(settings.standards.versions).map((v) => ({ value: v, label: v }))}
            onChange={(value) => setSettings((prev) => ({ ...prev, standards: { ...prev.standards, activeVersion: value || prev.standards.activeVersion } }))}
          />
          <Group align="end">
            <TextInput
              label={t("standardsNewVersionName")}
              placeholder={t("standardsVersionPlaceholder")}
              value={newStandardsVersion}
              onChange={(e) => setNewStandardsVersion(e.currentTarget.value)}
            />
            <Button variant="default" onClick={cloneActiveStandardsVersion} disabled={!newStandardsVersion.trim()}>
              {t("standardsCloneActive")}
            </Button>
          </Group>
          {settings.standards.versions[settings.standards.activeVersion] ? (
            <Paper withBorder p="sm">
              <Stack gap="sm" mb="sm">
                <TextInput
                  label="Version notes"
                  value={versionNotesDraft || currentVersionMeta().notes || ""}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    setVersionNotesDraft(v);
                    setCurrentVersionMeta({ notes: v });
                  }}
                />
                <Group>
                  <Button
                    variant="default"
                    onClick={() => setCurrentVersionMeta({ status: "published" })}
                    disabled={currentVersionMeta().status === "published" || !(versionNotesDraft || currentVersionMeta().notes)}
                  >
                    Publish version
                  </Button>
                  <Button variant="light" onClick={computeImpactPreview}>Preview Impact</Button>
                </Group>
                {impactPreview ? (
                  <Text size="sm" c="dimmed">
                    Impact preview ({impactPreview.total} records): {impactPreview.developingToReady} Developing→Ready, {impactPreview.readyToDeveloping} Ready→Developing.
                  </Text>
                ) : null}
              </Stack>
              <Stack gap="md" hiddenFrom="sm">
                {(["4-6", "7-9", "10-12"] as const).flatMap((age) =>
                  (["movement", "social", "mental", "ski"] as const).map((domain) => (
                    <ResponsiveDataCard key={`${age}-${domain}`} title={`${age} · ${domain}`}>
                      <Stack gap="sm">
                        <TextInput
                          label={t("standardsTarget")}
                          value={String(settings.standards.versions[settings.standards.activeVersion][age][domain].target)}
                          disabled={currentVersionMeta().status === "published"}
                          onChange={(e) => updateStandardValue(age, domain, "target", e.currentTarget.value)}
                        />
                        <TextInput
                          label={t("standardsMin")}
                          value={String(settings.standards.versions[settings.standards.activeVersion][age][domain].min)}
                          disabled={currentVersionMeta().status === "published"}
                          onChange={(e) => updateStandardValue(age, domain, "min", e.currentTarget.value)}
                        />
                      </Stack>
                    </ResponsiveDataCard>
                  ))
                )}
              </Stack>
              <Table visibleFrom="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("standardsAgeGroup")}</Table.Th>
                    <Table.Th>{t("standardsDomain")}</Table.Th>
                    <Table.Th>{t("standardsTarget")}</Table.Th>
                    <Table.Th>{t("standardsMin")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(["4-6", "7-9", "10-12"] as const).flatMap((age) =>
                    (["movement", "social", "mental", "ski"] as const).map((domain) => (
                      <Table.Tr key={`${age}-${domain}`}>
                        <Table.Td>{age}</Table.Td>
                        <Table.Td>{domain}</Table.Td>
                        <Table.Td>
                          <TextInput
                            value={String(settings.standards.versions[settings.standards.activeVersion][age][domain].target)}
                            disabled={currentVersionMeta().status === "published"}
                            onChange={(e) => updateStandardValue(age, domain, "target", e.currentTarget.value)}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            value={String(settings.standards.versions[settings.standards.activeVersion][age][domain].min)}
                            disabled={currentVersionMeta().status === "published"}
                            onChange={(e) => updateStandardValue(age, domain, "min", e.currentTarget.value)}
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          ) : null}
          <Button color="ingress" onClick={() => void handleSaveSettings()} disabled={saving}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </Stack>
      </SectionCard>

      <SectionCard title={t("restoreBinTitle")}>
        <Stack gap="lg">
          <Box>
            <Text fw={700} mb="sm">{t("restoreDeletedChildren")}</Text>
            {deletedChildren.length === 0 ? <Text c="dimmed">{t("restoreNoDeletedChildren")}</Text> : (
              <Stack gap="xs">
                {deletedChildren.map((c) => (
                  <Paper key={c._id} withBorder p="sm">
                    <Group justify="space-between">
                      <Text>{c.name}</Text>
                      <Button size="sm" variant="light" color="ingress" onClick={() => void restoreChild(c._id)}>{t("restoreAction")}</Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
          <Box>
            <Text fw={700} mb="sm">{t("restoreDeletedAssessments")}</Text>
            {deletedAssessments.length === 0 ? <Text c="dimmed">{t("restoreNoDeletedAssessments")}</Text> : (
              <Stack gap="xs">
                {deletedAssessments.map((a) => (
                  <Paper key={a._id} withBorder p="sm">
                    <Group justify="space-between">
                      <Text>{a.child?.name || t("restoreUnknownChild")} · {a.session?.date || "-"}</Text>
                      <Button size="sm" variant="light" color="ingress" onClick={() => void restoreAssessment(a._id)}>{t("restoreAction")}</Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard title="Governance Metrics">
        <Stack gap="xs">
          <Text size="sm">Deleted athletes: {governanceMetrics.deletedChildren}</Text>
          <Text size="sm">Deleted assessments: {governanceMetrics.deletedAssessments}</Text>
          <Text size="sm">Assessments missing report consent: {governanceMetrics.missingConsentReport}</Text>
          <Text size="sm">Assessments missing athlete link: {governanceMetrics.missingChildLink}</Text>
        </Stack>
      </SectionCard>
    </Stack>
  );
}

function MobileCheckboxRow({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <Group justify="space-between" align="center">
      <Text fw={600}>{label}</Text>
      <Checkbox checked={checked} onChange={onChange} aria-label={label} />
    </Group>
  );
}
