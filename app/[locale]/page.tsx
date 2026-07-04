import { Anchor, Badge, Box, Group, SimpleGrid, Stack } from "@sovereignsquad/gds/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductEntryCard } from "@/components/landing/ProductEntryCard";
import { PublicAppControls } from "@/components/layout/PublicAppControls";
import { SelectorThemeShell } from "@/components/landing/SelectorThemeShell";
import { Alert, Paper, Title } from "@/components/gds/SurfacePrimitives";
import { getProductColor } from "@/lib/product-ui-contracts";

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
  // Three pre-selectable destinations (#persona): Habigoal, Athlete IQ as an
  // athlete, or Athlete IQ as a trainer. Each encodes the persona + surface so a
  // signed-in user lands directly in the right app (the login page passes through
  // an existing session), and a first-time login arrives pre-selected.
  const athleteIqAthleteHref = `/${locale}/login?next=${encodeURIComponent(`${athleteIqPath}?persona=athlete`)}&persona=athlete&productSurface=athlete-iq`;
  const athleteIqTrainerHref = `/${locale}/login?next=${encodeURIComponent(`${athleteIqPath}?persona=trainer`)}&persona=trainer&productSurface=athlete-iq`;
  const newsHref = `/${locale}/news`;
  const termsHref = `/${locale}/legal/gtc`;
  const privacyHref = `/${locale}/legal/privacy`;

  return (
    <SelectorThemeShell>
    <Box
      className="landing-selector-container"
      mx="auto"
      px={{ base: "md", md: "lg" }}
      py="xl"
      style={{ maxWidth: "var(--mantine-container-size-md)" }}
    >
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
              <Badge variant="light" color={getProductColor("dashboard", "primaryAction")} w="fit-content">{t("selectorBadge")}</Badge>
              <Title order={1}>{t("selectorTitle")}</Title>
            </Stack>

            <SimpleGrid className="selector-grid" cols={{ base: 1, sm: 2, lg: 3 }} spacing={{ base: "md", sm: "lg", md: "xl" }}>
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
                title={t("athleteIqAthleteTitle")}
                body={t("athleteIqAthleteBody")}
                href={athleteIqAthleteHref}
                action={t("athleteIqAthleteAction")}
                ariaLabel={t("athleteIqAthleteAria")}
                tone="pro"
              />
              <ProductEntryCard
                badge={t("athleteIqBadge")}
                title={t("athleteIqTrainerTitle")}
                body={t("athleteIqTrainerBody")}
                href={athleteIqTrainerHref}
                action={t("athleteIqTrainerAction")}
                ariaLabel={t("athleteIqTrainerAria")}
                tone="pro"
              />
            </SimpleGrid>
          </Stack>
        </Box>

        <Paper component="footer" className="landing-footer" withBorder radius="md" p="lg">
          <Group gap="lg" wrap="wrap" justify="center">
            <Anchor href={termsHref}>{t("termsOfService")}</Anchor>
            <Anchor href={privacyHref}>{t("privacyPolicy")}</Anchor>
          </Group>
        </Paper>
      </Stack>
    </Box>
    </SelectorThemeShell>
  );
}
