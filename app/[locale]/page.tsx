import { Alert, Anchor, Badge, Box, Container, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductEntryCard } from "@/components/landing/ProductEntryCard";
import { PublicAppControls } from "@/components/layout/PublicAppControls";

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
  const habigoalPath = `/${locale}/habigoal`;
  const athleteIqPath = `/${locale}/athlete-iq`;
  const habigoalHref = `/${locale}/login?next=${encodeURIComponent(habigoalPath)}&persona=athlete&productSurface=habigoal`;
  const athleteIqHref = `/${locale}/login?next=${encodeURIComponent(athleteIqPath)}&persona=trainer&productSurface=athlete-iq`;
  const newsHref = `/${locale}/news`;
  const termsHref = `/${locale}/legal/gtc`;
  const privacyHref = `/${locale}/legal/privacy`;

  return (
    <Container className="landing-selector-container" size="md" py="xl">
      <Stack gap="xl">
        <Group className="landing-topbar" justify="flex-end" wrap="wrap">
          <Group className="landing-top-actions" gap="sm" wrap="wrap">
            <Anchor className="landing-news-link" href={newsHref} fw={700}>{t("whatsNew")}</Anchor>
            <PublicAppControls mobileNewsHref={newsHref} mobileNewsLabel={t("whatsNew")} />
          </Group>
        </Group>

      {error === "access_denied" && (
          <Alert color="red" title={t("accessDeniedTitle")}>
            {t("accessDenied")}
          </Alert>
      )}

        <Box component="main">
          <Stack gap="xl">
            <Stack gap="sm">
              <Badge variant="light" color="ingress" w="fit-content">{t("selectorBadge")}</Badge>
              <Title order={1}>{t("selectorTitle")}</Title>
              <Text size="lg" c="dimmed">
                {t("selectorSubtitle")}
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <ProductEntryCard
                badge={t("habigoalBadge")}
                title={t("habigoalTitle")}
                body={t("habigoalBody")}
                href={habigoalHref}
                action={t("habigoalAction")}
                ariaLabel={t("habigoalAria")}
                tone="home"
              />
              <ProductEntryCard
                badge={t("athleteIqBadge")}
                title={t("athleteIqTitle")}
                body={t("athleteIqBody")}
                href={athleteIqHref}
                action={t("athleteIqAction")}
                ariaLabel={t("athleteIqAria")}
                tone="pro"
              />
            </SimpleGrid>
          </Stack>
        </Box>

        <Paper component="footer" withBorder radius="xl" p="lg">
          <Group gap="lg" wrap="wrap" justify="center">
            <Anchor href={termsHref}>{t("termsOfService")}</Anchor>
            <Anchor href={privacyHref}>{t("privacyPolicy")}</Anchor>
          </Group>
        </Paper>
      </Stack>
    </Container>
  );
}
