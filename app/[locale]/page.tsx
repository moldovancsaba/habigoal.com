import Image from "next/image";
import { Alert, Anchor, Box, Container, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { env } from "@/config/env";
import { LandingCtas } from "@/components/landing/LandingCtas";

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
  const authHref = env.habigoalEnforceAuth ? `/api/auth/login?next=/${locale}/dashboard` : `/${locale}/dashboard`;
  const homeHref = `/${locale}`;
  const athleteHref = `/${locale}/athletes`;
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
    <Container size="lg" py="xl">
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

        <Paper component="section" withBorder radius="xl" p={{ base: "lg", md: "xl" }}>
          <Group gap="xl" align="center" justify="space-between">
            <Stack gap="lg" maw={680}>
                <Stack gap="sm">
                  <Title order={1}>{t("title")}</Title>
                  <Text size="lg" c="dimmed">{t("subtitle")}</Text>
                </Stack>
              <LandingCtas
                athleteAppLabel={t("athleteApp")}
                trainerAppLabel={t("trainerApp")}
                whatsNewLabel={t("whatsNew")}
                athleteHref={athleteHref}
                trainerHref={authHref}
                newsHref={newsHref}
              />
            </Stack>
            <Box visibleFrom="sm">
              <Image src="/images/habigoal_logo.png" alt="Habigoal" width={320} height={320} priority />
            </Box>
          </Group>
        </Paper>

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
              <Anchor href={athleteHref}>{t("athleteApp")}</Anchor>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
