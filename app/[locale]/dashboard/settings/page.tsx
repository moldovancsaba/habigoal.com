"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
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
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { useTranslations } from "next-intl";
import { getSettings, KidexSettings, saveSettings } from "@/services/settings-service";
import { getUsers, saveUser, User } from "@/services/user-service";
import { SectionCard } from "@/components/ui/SectionCard";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function SettingsPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");

  const [settings, setSettings] = useState<KidexSettings>({
    conductors: [],
    observers: [],
    locations: []
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [locationDraft, setLocationDraft] = useState("");

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
    const name = window.prompt(t("userName"))?.trim();
    if (name) {
      const newUser: User = { name, roles: [] };
      setUsers((prev) => [...prev, newUser]);
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

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }} role="status">
        <CircularProgress aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
        {t("settings")}
      </Typography>

      {message ? (
        <Alert severity={message === tc("error") ? "error" : "success"} onClose={() => setMessage("")}>
          {message}
        </Alert>
      ) : null}

      <SectionCard
        title={t("userRights")}
        action={
          <Button variant="outlined" size="small" onClick={addNewUser}>
            + {t("addUser")}
          </Button>
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
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Box sx={{ minWidth: 260, flex: "1 1 320px" }}>
              <SearchableSelect
                label={t("addLocation")}
                value={locationDraft}
                options={settings.locations.map((name) => ({ id: name, name }))}
                onChange={setLocationDraft}
                allowAdd
              />
            </Box>
            <Button variant="outlined" size="small" onClick={addLocation}>
              + {t("addLocation")}
            </Button>
            <Button variant="contained" size="small" onClick={() => void handleSaveSettings()} disabled={saving}>
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
                  <IconButton edge="end" aria-label={tc("remove")} onClick={() => removeLocation(i)} size="small">
                    ×
                  </IconButton>
                }
                sx={{ border: 1, borderColor: "divider", borderRadius: 1, mb: 1 }}
              >
                <ListItemText primary={loc} />
              </ListItem>
            ))}
          </List>
        )}
      </SectionCard>
    </Stack>
  );
}
