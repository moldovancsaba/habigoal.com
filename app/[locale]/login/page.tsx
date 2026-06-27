import Image from "next/image";
import { Alert, Anchor, Badge, Button, Paper, SimpleGrid, Stack, Text, TextInput, Title } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ATHLETE_IQ_GOLD_LOGO_SRC } from "@/lib/product-surface-branding";

function sanitizeNext(input: string | undefined, locale: string) {
  if (!input) return `/${locale}`;
  if (!input.startsWith("/") || input.startsWith("//") || input.startsWith("/api/")) return `/${locale}`;
  return input;
}

type LoginProductSurface = "habigoal" | "athlete-iq";

function sanitizePersona(input: string | undefined, nextPath: string, surface: LoginProductSurface) {
  if (surface === "athlete-iq") return "trainer";
  if (surface === "habigoal") return "athlete";
  if (input === "athlete" || input === "trainer") return input;
  if (nextPath.includes("/athlete-iq")) return "trainer";
  return "athlete";
}

function sanitizeProductSurface(input: string | undefined, nextPath: string): LoginProductSurface {
  if (input === "habigoal" || input === "athlete-iq") return input;
  if (nextPath.includes("/athlete-iq")) return "athlete-iq";
  return "habigoal";
}

function errorKey(error: string | undefined) {
  if (error === "invalid_identifier") return "invalidIdentifier";
  if (error === "missing_persona") return "missingPersona";
  if (error === "athlete_iq_access_required") return "athleteIqAccessRequired";
  if (error === "habigoal_access_required") return "habigoalAccessRequired";
  return "genericError";
}

export default async function LoginPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string; persona?: string; productSurface?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Login" });
  const landing = await getTranslations({ locale, namespace: "Landing" });
  const { error, next, persona, productSurface } = await searchParams;
  const nextPath = sanitizeNext(next, locale);
  const selectedSurface = sanitizeProductSurface(productSurface, nextPath);
  const initialPersona = sanitizePersona(persona, nextPath, selectedSurface);
  const isAthleteIqSurface = selectedSurface === "athlete-iq";
  const surfaceKey = isAthleteIqSurface ? "athleteIq" : "habigoal";
  const logoSrc = isAthleteIqSurface ? ATHLETE_IQ_GOLD_LOGO_SRC : "/images/habigoal_logo.png";
  const logoWidth = isAthleteIqSurface ? 72 : 54;
  const logoHeight = isAthleteIqSurface ? 64 : 54;

  return (
    <main className={isAthleteIqSurface ? "login-page-container login-page-container-aiq" : "login-page-container login-page-container-habigoal"}>
      <Paper className={isAthleteIqSurface ? "login-panel login-panel-aiq surface-outline" : "login-panel login-panel-habigoal surface-outline"} withBorder radius="md" p={{ base: "lg", md: "xl" }}>
        <form action="/api/auth/login" method="post">
          <Stack gap="lg">
            <Stack gap="sm" align="flex-start">
              <Image src={logoSrc} alt="" width={logoWidth} height={logoHeight} priority className={isAthleteIqSurface ? "login-brand-logo login-brand-logo-aiq" : "login-brand-logo login-brand-logo-habigoal"} />
              <Badge variant="light" color={isAthleteIqSurface ? "yellow" : "ingress"}>{t(`surfaces.${surfaceKey}.badge`)}</Badge>
              <Title order={1}>{t(`surfaces.${surfaceKey}.title`)}</Title>
              <Text c="dimmed">{t(`surfaces.${surfaceKey}.subtitle`)}</Text>
            </Stack>

            {error ? (
              <Alert color="red" title={t("errorTitle")}>
                {t(errorKey(error))}
              </Alert>
            ) : null}

            <input type="hidden" name="next" value={nextPath} />
            <input type="hidden" name="productSurface" value={selectedSurface} />
            <TextInput
              autoComplete="username"
              label={t("identifierLabel")}
              name="identifier"
              placeholder={t("identifierPlaceholder")}
              required
            />

            <Stack gap="xs">
              <Text fw={700}>{t("personaLabel")}</Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="xs">
                <label className="login-persona-option">
                  <input type="radio" name="persona" value="athlete" defaultChecked={initialPersona === "athlete"} required />
                  <span>
                    <Text component="span" fw={900}>{t("athletePersonaTitle")}</Text>
                    <Text component="span" c="dimmed" size="sm">{t("athletePersonaCopy")}</Text>
                  </span>
                </label>
                <label className="login-persona-option">
                  <input type="radio" name="persona" value="trainer" defaultChecked={initialPersona === "trainer"} required />
                  <span>
                    <Text component="span" fw={900}>{t("trainerPersonaTitle")}</Text>
                    <Text component="span" c="dimmed" size="sm">{t("trainerPersonaCopy")}</Text>
                  </span>
                </label>
              </SimpleGrid>
            </Stack>
            <Button fullWidth type="submit" size="md" variant="filled" color={isAthleteIqSurface ? "yellow" : "ingress"}>
              {t("submit")}
            </Button>

            <Text c="dimmed" size="sm">
              {t(`surfaces.${surfaceKey}.supportingCopy`)}
            </Text>
            <Anchor href={`/${locale}`} fw={700}>{landing("brandSubtitle")}</Anchor>
          </Stack>
        </form>
      </Paper>
    </main>
  );
}
