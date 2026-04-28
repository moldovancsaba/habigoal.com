"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }} role="status">
        <CircularProgress aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack spacing={2.5}>
      <PageHeader title={t("children")} />
      <SectionCard>
        <Stack spacing={2}>
          {message ? (
            <Alert severity={error ? "error" : "success"} onClose={() => setMessage("")}>
              {message}
            </Alert>
          ) : null}

          <TextField
            label={t("searchChildren")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchChildrenPlaceholder")}
            fullWidth
            size="small"
          />

          {filtered.length === 0 ? (
            <Typography color="text.secondary">{query ? t("noChildrenMatch") : tc("noChildren")}</Typography>
          ) : (
            <Stack spacing={2}>
              {filtered.map((child) => {
                const ageGroup = calculateAgeGroup(child.birthDate) || "-";
                return (
                  <Card key={child._id} variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            component={Link}
                            href={`/dashboard/children/${child._id}`}
                            variant="h6"
                            sx={{ fontWeight: 700, textDecoration: "none", color: "primary.main", "&:hover": { textDecoration: "underline" } }}
                          >
                            {child.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {ta("birthDate")}: {child.birthDate} · {ta("ageGroup")}: {ageGroup}
                          </Typography>
                        </Box>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <Button component={Link} href={`/dashboard/assessment?childId=${child._id}`} variant="contained">
                            {t("newSurveyForChild")}
                          </Button>
                          <Button component={Link} href={`/dashboard/children/${child._id}`} variant="outlined">
                            {t("viewHistory")}
                          </Button>
                          <Button variant="outlined" onClick={() => startEdit(child)}>
                            {t("editChild")}
                          </Button>
                          <Button color="error" variant="outlined" onClick={() => void deleteChild(child)}>
                            {t("deleteChild")}
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      </SectionCard>
      <Dialog open={Boolean(editing)} onClose={() => (saving ? null : setEditing(null))} fullWidth maxWidth="sm">
        <DialogTitle>{t("editChild")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={ta("childName")}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              fullWidth
            />
            <TextField
              label={ta("birthDate")}
              type="date"
              value={draftBirthDate}
              onChange={(event) => setDraftBirthDate(event.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={() => void saveEdit()} variant="contained" disabled={saving || !draftName.trim() || !draftBirthDate.trim()}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
