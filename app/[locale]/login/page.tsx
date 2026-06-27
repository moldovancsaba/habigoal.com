import Image from "next/image";
import { Alert, Anchor, Badge, Button, Paper, SimpleGrid, Stack, Text, TextInput, Title } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";

function sanitizeNext(input: string | undefined, locale: string) {
  if (!input) return `/${locale}`;
  if (!input.startsWith("/") || input.startsWith("//") || input.startsWith("/api/")) return `/${locale}`;
  return input;
}

function sanitizePersona(input: string | undefined, nextPath: string) {
  if (input === "athlete" || input === "trainer") return input;
  if (nextPath.includes("/athlete-iq")) return "trainer";
  return "athlete";
}

function sanitizeProductSurface(input: string | undefined, nextPath: string) {
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
  const initialPersona = sanitizePersona(persona, nextPath);
  const selectedSurface = sanitizeProductSurface(productSurface, nextPath);

  return (
    <main className="login-page-container">
      <Paper className="login-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
        <form action="/api/auth/login" method="post">
          <Stack gap="lg">
            <Stack gap="sm" align="flex-start">
              <Image src="/images/habigoal_logo.png" alt="" width={54} height={54} priority />
              <Badge variant="light" color="ingress">{t("badge")}</Badge>
              <Title order={1}>{t("title")}</Title>
              <Text c="dimmed">{t("subtitle")}</Text>
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
            <Button fullWidth type="submit" size="md" variant="filled">
              {t("submit")}
            </Button>

            <Text c="dimmed" size="sm">
              {t("supportingCopy")}
            </Text>
            <Anchor href={`/${locale}`} fw={700}>{landing("brandSubtitle")}</Anchor>
          </Stack>
        </form>
      </Paper>
    </main>
  );
}
