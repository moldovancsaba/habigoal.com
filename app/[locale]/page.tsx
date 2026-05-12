import { Button, Container, Title, Text, Stack, Group, Box, Alert, SimpleGrid } from "@mantine/core";
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
  const authHref = env.surveyEnforceAuth ? `/api/auth/login?next=/${locale}/dashboard` : `/${locale}/dashboard`;

  return (
    <Box style={{ minHeight: "100vh", color: "var(--text-primary)", position: "relative", overflow: "hidden" }}>
      <Container size="xl" py={{ base: 56, md: 96 }}>
        <Stack gap={60} align="stretch">
          {error === "access_denied" && (
            <Alert color="review" title={t("accessDeniedTitle")} radius="md" style={{ maxWidth: 560, marginInline: "auto" }}>
              {t("accessDenied")}
            </Alert>
          )}
          <Box maw={1080} mx="auto">
            <Stack className="glass-panel surface-outline" gap="xl" p={{ base: "xl", md: "2rem" }} style={{ borderRadius: 28, minWidth: 0 }}>
              <Group justify="flex-start" align="center">
                <BrandMark size={76} align="left" />
              </Group>

              <Stack gap="lg">
                <Title order={1} fz={{ base: 42, md: 56, xl: 72 }} maw={760} style={{ lineHeight: 0.98 }}>
                  {t("title")}
                </Title>
                <Text fz={{ base: "lg", md: "xl" }} maw={680} c="var(--text-secondary)" style={{ lineHeight: 1.65 }}>
                  {t("subtitle")}
                </Text>
              </Stack>

              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Button component="a" href={`/${locale}/athletes`} size="xl" color="ingress" styles={{ label: { fontSize: "1.1rem", fontWeight: 800 } }} style={{ minHeight: 72 }}>
                    {t("athleteApp")}
                  </Button>
                  <Button component="a" href={authHref} size="xl" variant="default" styles={{ label: { fontSize: "1.1rem", fontWeight: 800 } }} style={{ minHeight: 72 }}>
                    {t("trainerApp")}
                  </Button>
                </SimpleGrid>
                <Button component="a" href={`/${locale}/news`} size="lg" color="ingress" variant="light" styles={{ label: { fontSize: "1rem", fontWeight: 800 } }}>
                  {t("whatsNew")}
                </Button>
                <Text size="sm" c="var(--text-muted)">
                  {t("ssoNote")}
                </Text>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Container>

      <Box component="footer" py="xl" style={{ textAlign: "center" }}>
        <Container size="lg">
          <Group className="glass-panel surface-outline" justify="center" gap="xl" py="md" wrap="wrap" style={{ borderRadius: 32 }}>
            <Text component="a" href={`/${locale}/legal/gtc`} size="sm" c="var(--text-secondary)" style={{ textDecoration: "none" }}>
              {t("termsOfService")}
            </Text>
            <Text component="a" href={`/${locale}/legal/privacy`} size="sm" c="var(--text-secondary)" style={{ textDecoration: "none" }}>
              {t("privacyPolicy")}
            </Text>
            <Text component="a" href={`/${locale}/news`} size="sm" c="var(--text-secondary)" style={{ textDecoration: "none" }}>
              {t("whatsNew")}
            </Text>
            <Text component="a" href={`/${locale}/athletes`} size="sm" c="var(--text-secondary)" style={{ textDecoration: "none" }}>
              {t("athleteApp")}
            </Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
