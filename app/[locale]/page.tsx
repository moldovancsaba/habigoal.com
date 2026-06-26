import Image from "next/image";
import { Alert, Anchor, Badge, Box, Container, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ATHLETE_IQ_GOLD_LOGO_SRC } from "@/lib/product-surface-branding";

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
  const homeHref = `/${locale}`;
  const habigoalHref = `/${locale}/habigoal`;
  const athleteIqHref = `/${locale}/athlete-iq`;
  const newsHref = `/${locale}/news`;
  const termsHref = `/${locale}/legal/gtc`;
  const privacyHref = `/${locale}/legal/privacy`;
  const brand = (
    <Group gap="sm" wrap="nowrap">
      <Image src="/images/habigoal_logo.png" alt="" width={40} height={40} priority />
      <Text fw={800}>Habigoal</Text>
    </Group>
  );

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" wrap="nowrap">
          <Anchor href={homeHref} underline="never" c="inherit">{brand}</Anchor>
          <Anchor href={newsHref} fw={700}>{t("whatsNew")}</Anchor>
        </Group>

      {error === "access_denied" && (
          <Alert color="red" title={t("accessDeniedTitle")}>
            {t("accessDenied")}
          </Alert>
      )}

        <Box component="main">
          <Stack gap="xl">
            <Stack gap="sm">
              <Badge variant="light" color="ingress" w="fit-content">Unified platform</Badge>
              <Title order={1}>Choose your experience</Title>
              <Text size="lg" c="dimmed">
                One backend and one database power two separate products: Habigoal for home wellbeing, and Athlete IQ for professional performance operations.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1 }} spacing="lg">
              <ProductEntryCard
                badge="Habigoal"
                title="Home habit tracker and wellbeing support"
                body="Simple daily check-ins, habits, wellbeing support, sport support, and clear status feedback."
                href={habigoalHref}
                action="Open Habigoal"
                tone="home"
              />
              <ProductEntryCard
                badge="Athlete IQ"
                title="Professional athlete performance OS"
                body="The pro surface for athletes, coaches, academies, dashboards, services, and advanced performance intelligence."
                href={athleteIqHref}
                action="Open Athlete IQ"
                tone="pro"
              />
            </SimpleGrid>
          </Stack>
        </Box>

      <Text c="dimmed" size="sm">
        {t("ssoNote")}
      </Text>

        <Paper component="footer" withBorder radius="xl" p="lg">
          <Stack gap="sm">
            <Title order={4}>Habigoal</Title>
            <Text c="dimmed">{t("subtitle")}</Text>
            <Group gap="lg" wrap="wrap">
              <Anchor href={termsHref}>{t("termsOfService")}</Anchor>
              <Anchor href={privacyHref}>{t("privacyPolicy")}</Anchor>
              <Anchor href={newsHref}>{t("whatsNew")}</Anchor>
              <Anchor href={habigoalHref}>Habigoal</Anchor>
              <Anchor href={athleteIqHref}>Athlete IQ</Anchor>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

function ProductEntryCard({
  badge,
  title,
  body,
  href,
  action,
  tone
}: {
  badge: string;
  title: string;
  body: string;
  href: string;
  action: string;
  tone: "home" | "pro";
}) {
  return (
    <Paper component="section" withBorder radius="md" p={{ base: "lg", md: "xl" }} className={tone === "pro" ? "selector-card selector-card-pro surface-outline" : "selector-card selector-card-home surface-outline"}>
      <Anchor href={href} underline="never" c="inherit" aria-label={action}>
        <Stack gap="lg" h="100%">
          <Group justify="space-between" align="flex-start" gap="md">
            <Badge variant="light" color={tone === "home" ? "ingress" : "yellow"} w="fit-content">
              {badge}
            </Badge>
            {tone === "pro" ? (
              <Image src={ATHLETE_IQ_GOLD_LOGO_SRC} alt="" width={64} height={57} className="aiq-mark" />
            ) : (
              <Image src="/images/habigoal_logo.png" alt="" width={48} height={48} />
            )}
          </Group>
          <Stack gap={8}>
            <Title order={2} size="h2">
              {title}
            </Title>
            <Text className={tone === "pro" ? "selector-card-body-pro" : undefined} c={tone === "home" ? "dimmed" : undefined} size="lg">{body}</Text>
          </Stack>
          <Text fw={800} mt="auto">{action}</Text>
        </Stack>
      </Anchor>
    </Paper>
  );
}
