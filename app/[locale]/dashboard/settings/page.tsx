"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { useTranslations } from "next-intl";
import { DEFAULT_KIDEX_SETTINGS, getSettings, KidexSettings, saveSettings } from "@/services/settings-service";
import { getUsers, saveUser, User } from "@/services/user-service";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function SettingsPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const tl = useTranslations("Legal");

  const [settings, setSettings] = useState<KidexSettings>(DEFAULT_KIDEX_SETTINGS);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [userDraft, setUserDraft] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [sData, uData] = await Promise.all([getSettings(), getUsers()]);
        setSettings(sData);
        setUsers(uData);
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

  async function toggleRole(user: User, role: "conductor" | "observer") {
    const nextRoles = user.roles.includes(role) ? user.roles.filter((r) => r !== role) : [...user.roles, role];

    const updatedUser = { ...user, roles: nextRoles };

    const previousUsers = users;
    setUsers((prev) => prev.map((u) => (u.name === user.name ? updatedUser : u)));

    const ok = await saveUser(updatedUser);
    if (!ok) {
      setUsers(previousUsers);
      setMessage(tc("error"));
      return;
    }
    setMessage(tc("success"));
  }

  function addNewUser() {
    const name = userDraft.trim();
    if (name) {
      const newUser: User = { name, roles: [] };
      setUsers((prev) => [...prev, newUser]);
      setUserDraft("");
      void saveUser(newUser).then((ok) => {
        if (!ok) {
          setUsers((prev) => prev.filter((u) => u.name !== name));
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
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }} role="status">
        <CircularProgress aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader title={t("settings")} />

      {message ? (
        <Alert severity={message === tc("error") ? "error" : "success"} onClose={() => setMessage("")}>
          {message}
        </Alert>
      ) : null}

      <SectionCard
        title={t("userRights")}
        action={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
            <TextField
              size="small"
              label={t("userName")}
              value={userDraft}
              onChange={(event) => setUserDraft(event.target.value)}
              sx={{ minWidth: { sm: 220 } }}
            />
            <Button variant="outlined" size="small" onClick={addNewUser} disabled={!userDraft.trim()}>
              {t("addUser")}
            </Button>
          </Stack>
        }
      >
        <TableContainer component={Paper} variant="outlined">
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>{t("userName")}</TableCell>
                <TableCell align="center">{t("canConduct")}</TableCell>
                <TableCell align="center">{t("canObserve")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.name}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{user.name}</Typography>
                  </TableCell>
                  <TableCell align="center" padding="checkbox">
                    <Checkbox
                      checked={user.roles.includes("conductor")}
                      onChange={() => void toggleRole(user, "conductor")}
                      slotProps={{ input: { "aria-label": `${user.name} conductor` } }}
                    />
                  </TableCell>
                  <TableCell align="center" padding="checkbox">
                    <Checkbox
                      checked={user.roles.includes("observer")}
                      onChange={() => void toggleRole(user, "observer")}
                      slotProps={{ input: { "aria-label": `${user.name} observer` } }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography color="text.secondary">{t("noUsers")}</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <SectionCard
        title={t("locations")}
        action={
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ width: { xs: "100%", md: "auto" }, alignItems: { md: "center" } }}>
            <Box sx={{ minWidth: { md: 280 }, width: { xs: "100%", md: 360 } }}>
              <SearchableSelect
                label={t("addLocation")}
                value={locationDraft}
                options={settings.locations.map((name) => ({ id: name, name }))}
                onChange={setLocationDraft}
                allowAdd
              />
            </Box>
            <Button variant="outlined" onClick={addLocation} disabled={!locationDraft.trim()} sx={{ minWidth: 120, minHeight: 40 }}>
              {t("addLocation")}
            </Button>
            <Button variant="contained" onClick={() => void handleSaveSettings()} disabled={saving} sx={{ minWidth: 96, minHeight: 40 }}>
              {saving ? tc("saving") : tc("save")}
            </Button>
          </Stack>
        }
      >
        {settings.locations.length === 0 ? (
          <Typography color="text.secondary">{t("noLocations")}</Typography>
        ) : (
          <List disablePadding>
            {settings.locations.map((loc, i) => (
              <ListItem
                key={`${loc}-${i}`}
                secondaryAction={
                  <Button color="error" variant="outlined" size="small" onClick={() => removeLocation(i)}>
                    {tc("remove")}
                  </Button>
                }
                sx={{ border: 1, borderColor: "divider", borderRadius: 1, mb: 1 }}
              >
                <ListItemText primary={loc} />
              </ListItem>
            ))}
          </List>
        )}
      </SectionCard>

      <SectionCard
        title={t("legalAndCompany")}
        action={
          <Button variant="contained" size="small" onClick={() => void handleSaveSettings()} disabled={saving}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        }
      >
        <Stack spacing={2}>
          <TextField label={t("company")} value={settings.company.name} onChange={(event) => updateCompanyField("name", event.target.value)} fullWidth size="small" />
          <TextField label={tl("idNo")} value={settings.company.ico} onChange={(event) => updateCompanyField("ico", event.target.value)} fullWidth size="small" />
          <TextField
            label={tl("registered")}
            value={settings.company.registered}
            onChange={(event) => updateCompanyField("registered", event.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label={tl("legalForm")}
            value={settings.company.legalForm}
            onChange={(event) => updateCompanyField("legalForm", event.target.value)}
            fullWidth
            size="small"
          />
          <TextField label={tl("address")} value={settings.company.address} onChange={(event) => updateCompanyField("address", event.target.value)} fullWidth size="small" />
          <TextField
            label={tl("shareCapital")}
            value={settings.company.shareCapital}
            onChange={(event) => updateCompanyField("shareCapital", event.target.value)}
            fullWidth
            size="small"
          />
          <TextField label={tl("vatNo")} value={settings.company.vatNo} onChange={(event) => updateCompanyField("vatNo", event.target.value)} fullWidth size="small" />
          <TextField label={tl("website")} value={settings.company.website} onChange={(event) => updateCompanyField("website", event.target.value)} fullWidth size="small" />
        </Stack>
      </SectionCard>
    </Stack>
  );
}
