import Image from "next/image";
import { Anchor, Group, Text } from "@mantine/core";
import { EditorialHero, PublicBrandFooter, PublicShell, StateBlock } from "@doneisbetter/gds-core/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    <PublicShell
      brand={<Anchor href={homeHref} underline="never" c="inherit">{brand}</Anchor>}
      actions={<Anchor href={newsHref} fw={700}>{t("whatsNew")}</Anchor>}
      footer={
        <PublicBrandFooter
          brandTitle="Habigoal"
          description={t("subtitle")}
          legal={
            <Group gap="lg" wrap="wrap">
              <Anchor href={termsHref}>{t("termsOfService")}</Anchor>
              <Anchor href={privacyHref}>{t("privacyPolicy")}</Anchor>
              <Anchor href={newsHref}>{t("whatsNew")}</Anchor>
              <Anchor href={athleteHref}>{t("athleteApp")}</Anchor>
            </Group>
          }
          compact
        />
      }
      headerVariant="branded-quiet"
    >
      {error === "access_denied" && (
        <StateBlock variant="permission" title={t("accessDeniedTitle")} description={t("accessDenied")} compact />
      )}

      <EditorialHero
        title={t("title")}
        description={t("subtitle")}
        actions={[
          { label: t("athleteApp"), href: athleteHref, variant: "primary" },
          { label: t("trainerApp"), href: authHref, variant: "secondary" },
          { label: t("whatsNew"), href: newsHref, variant: "subtle" }
        ]}
        media={<Image src="/images/habigoal_logo.png" alt="Habigoal" width={420} height={420} priority />}
        mediaAlt="Habigoal"
        mediaFade="background-match"
        surfaceVariant="flat-public"
      />

      <Text c="dimmed" size="sm">
        {t("ssoNote")}
      </Text>
    </PublicShell>
  );
}
