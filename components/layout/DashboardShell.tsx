"use client";

import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

const DRAWER_WIDTH = 260;

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = [
    { href: "/dashboard/assessment", label: t("survey") },
    { href: "/dashboard/records", label: t("records") },
    { href: "/dashboard/children", label: t("children") },
    { href: "/dashboard/settings", label: t("settings") }
  ];

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#1e293b", color: "common.white" }}>
      <Box sx={{ p: 2, display: "flex", justifyContent: "center", bgcolor: "common.white", borderRadius: 1, mx: 1.5, mt: 1.5 }}>
        <Image src="/logo.png" alt="KIDEX" width={160} height={50} priority />
      </Box>
      <List sx={{ px: 1, py: 2, flex: 1 }}>
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={active}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                color: "rgba(255,255,255,0.85)",
                "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.12)", color: "common.white" },
                "&:hover": { bgcolor: "rgba(255,255,255,0.08)" }
              }}
            >
              <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: 500 } } }} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
        <LocaleSwitcher />
        <ThemeSwitcher />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { xs: "block", md: "none" },
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider"
        }}
      >
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            KIDEX
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH, borderRight: "none" }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        className="dashboard-main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: "100vh",
          bgcolor: "background.default",
          pt: { xs: 8, md: 0 },
          px: 0,
          py: { xs: 2, md: 3 }
        }}
      >
        <PageContainer>{children}</PageContainer>
      </Box>
    </Box>
  );
}
