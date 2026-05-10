import { Button, Container, Title, Text, Stack, Group, Box, ThemeIcon, Alert, Badge } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandMark } from "@/components/ui/BrandMark";
import { env } from "@/config/env";

export default async function LandingPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Landing" });
  const { error } = await searchParams;
  const authHref = env.surveyEnforceAuth ? "/api/auth/login" : `/${locale}/dashboard`;

  return (
    <Box style={{ minHeight: "100vh", color: "var(--text-primary)", position: "relative", overflow: "hidden" }}>
      <Container size="xl" py={{ base: 56, md: 96 }}>
        <Stack gap={60} align="stretch">
          {error === "access_denied" && (
            <Alert color="review" title={t("accessDeniedTitle")} radius="md" style={{ maxWidth: 560, marginInline: "auto" }}>
              {t("accessDenied")}
            </Alert>
          )}
          <Group align="stretch" gap="xl">
            <Stack className="glass-panel surface-outline" gap="xl" p={{ base: "xl", md: "2rem" }} style={{ flex: 1, borderRadius: 28, minWidth: 0 }}>
              <Group justify="space-between" align="center">
                <Badge color="strategy" variant="light" size="lg">{t("badge", {brand: "{Hg}"})}</Badge>
                <Group gap="xs">
                  <Box className="glass-pill" px="md" py={8} style={{ borderRadius: 999 }}>
                    <Text size="sm" fw={700} c="var(--text-secondary)">{t("chipAdaptiveIntake")}</Text>
                  </Box>
                  <Box className="glass-pill" px="md" py={8} style={{ borderRadius: 999 }}>
                    <Text size="sm" fw={700} c="var(--text-secondary)">{t("chipLiquidShell")}</Text>
                  </Box>
                </Group>
              </Group>

              <Stack gap="lg">
                <Title order={1} size={72} maw={760} style={{ lineHeight: 0.98 }}>
                  {t("title")}
                </Title>
                <Text size="xl" maw={680} c="var(--text-secondary)" style={{ lineHeight: 1.65 }}>
                  {t("subtitle")}
                </Text>
              </Stack>

              <Group gap="md" wrap="wrap">
                {[t("feature1"), t("feature2"), t("feature3")].map((feature, i) => (
                  <Group key={i} gap="sm" wrap="nowrap" className="glass-pill" px="md" py="sm" style={{ borderRadius: 999 }}>
                    <ThemeIcon color={i === 0 ? "ingress" : i === 1 ? "strategy" : "tactical"} size={28} radius="xl" variant="light">
                      <Box style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "currentColor" }} />
                    </ThemeIcon>
                    <Text fw={600} c="var(--text-primary)">{feature}</Text>
                  </Group>
                ))}
              </Group>

              <Group gap="md" wrap="wrap">
                <Button component="a" href={authHref} size="xl" color="ingress" style={{ minWidth: 220 }}>
                  {t("login")}
                </Button>
                <Text size="sm" c="var(--text-muted)">
                  {t("ssoNote")}
                </Text>
              </Group>
            </Stack>

            <Box className="glass-panel surface-outline" p={{ base: "xl", md: "2rem" }} style={{ width: "100%", maxWidth: 420, borderRadius: 32, position: "relative", overflow: "hidden" }}>
              <Box style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 18%, rgba(0, 63, 206, 0.44), transparent 34%), radial-gradient(circle at 58% 48%, rgba(0, 174, 239, 0.32), transparent 28%), radial-gradient(circle at 40% 78%, rgba(199, 240, 54, 0.2), transparent 32%)" }} />
              <Stack align="center" justify="center" gap="lg" style={{ position: "relative", minHeight: 460 }}>
                <BrandMark size={164} subtitle={t("brandSubtitle")} />
                <Stack gap={6} align="center">
                  <Text fw={800} size="xl">{t("previewTitle")}</Text>
                  <Text size="sm" c="var(--text-secondary)" ta="center" maw={280}>
                    {t("previewSubtitle")}
                  </Text>
                </Stack>
              </Stack>
            </Box>
          </Group>
        </Stack>
      </Container>

      <Box component="footer" py="xl" style={{ textAlign: "center" }}>
        <Container size="lg">
          <Group className="glass-panel surface-outline" justify="center" gap="xl" py="md" style={{ borderRadius: 999 }}>
            <Text component="a" href={`/${locale}/legal/gtc`} size="sm" c="var(--text-secondary)" style={{ textDecoration: "none" }}>
              {t("termsOfService")}
            </Text>
            <Text component="a" href={`/${locale}/legal/privacy`} size="sm" c="var(--text-secondary)" style={{ textDecoration: "none" }}>
              {t("privacyPolicy")}
            </Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
