"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import type { ChildProfile } from "@/repositories/child.repository";

export default function ChildrenListPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const ta = useTranslations("Assessment");

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/children")
      .then((res) => res.json())
      .then(setChildren)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }} role="status">
        <CircularProgress aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <SectionCard title={t("children")}>
      {children.length === 0 ? (
        <Typography color="text.secondary">{tc("noChildren")}</Typography>
      ) : (
        <Stack spacing={2}>
          {children.map((child) => (
            <Card key={child._id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
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
                      {ta("birthDate")}: {child.birthDate}
                    </Typography>
                  </Box>
                  <Button component={Link} href={`/dashboard/children/${child._id}`} variant="outlined">
                    {t("viewHistory")}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
