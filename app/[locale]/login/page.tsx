import Image from "next/image";
import { redirect } from "next/navigation";
import { Alert, Paper, Text, Title } from "@mantine/core";
import { Anchor, Badge, Button, SimpleGrid, Stack, TextInput } from "@doneisbetter/gds/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ATHLETE_IQ_GOLD_LOGO_SRC } from "@/lib/product-surface-branding";
import { KeepFocusedFieldVisible } from "@/components/a11y/KeepFocusedFieldVisible";
import { getSession } from "@/lib/session";
import { getAuthUser, canOpenProductSurface } from "@/lib/access";
import { getProductColor } from "@/lib/product-ui-contracts";

function sanitizeNext(input: string | undefined, locale: string) {
  if (!input) return `/${locale}`;
  if (!input.startsWith("/") || input.startsWith("//") || input.startsWith("/api/")) return `/${locale}`;
  return input;
}

type LoginProductSurface = "habigoal" | "athlete-iq";

function sanitizePersona(input: string | undefined, nextPath: string, surface: LoginProductSurface) {
  if (input === "athlete" || input === "trainer") return input;
  if (surface === "athlete-iq") return "trainer";
  if (surface === "habigoal") return "athlete";
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
  const { error, next, persona, productSurface } = await searchParams;
  const nextPath = sanitizeNext(next, locale);
  const selectedSurface = sanitizeProductSurface(productSurface, nextPath);

  // Single sign-on across all three surfaces (selector, Habigoal, Athlete IQ):
  // if the visitor already has a valid session and can open the requested
  // surface, send them straight into the app instead of re-prompting for login.
  // Login is therefore permanent until logout and survives persona switching.
  // Skip the pass-through when an error is present so an entitlement bounce from
  // requireProductSession shows the message instead of looping back to the app.
  if (!error) {
    const session = await getSession();
    if (session?.email) {
      const user = await getAuthUser();
      if (user && canOpenProductSurface(user, selectedSurface)) {
        redirect(nextPath);
      }
    }
  }

  const initialPersona = sanitizePersona(persona, nextPath, selectedSurface);
  const isAthleteIqSurface = selectedSurface === "athlete-iq";
  const surfaceKey = isAthleteIqSurface ? "athleteIq" : "habigoal";
  const logoSrc = isAthleteIqSurface ? ATHLETE_IQ_GOLD_LOGO_SRC : "/images/habigoal_logo.png";
  const logoWidth = isAthleteIqSurface ? 72 : 54;
  const logoHeight = isAthleteIqSurface ? 64 : 54;
  const surfaceColor = getProductColor(isAthleteIqSurface ? "athlete_iq" : "habigoal", "primaryAction");

  return (
    <main className={isAthleteIqSurface ? "login-page-container login-page-container-aiq" : "login-page-container login-page-container-habigoal"}>
      <Paper className={isAthleteIqSurface ? "login-panel login-panel-aiq surface-outline" : "login-panel login-panel-habigoal surface-outline"} withBorder radius="md" p={{ base: "lg", md: "xl" }}>
        <form action="/api/auth/login" method="post">
          <KeepFocusedFieldVisible />
          <Stack gap="lg">
            <Stack gap="sm" align="flex-start">
              <Image src={logoSrc} alt="" width={logoWidth} height={logoHeight} priority className={isAthleteIqSurface ? "login-brand-logo login-brand-logo-aiq" : "login-brand-logo login-brand-logo-habigoal"} />
              <Badge variant="light" color={surfaceColor}>{t(`surfaces.${surfaceKey}.badge`)}</Badge>
              <Title order={1}>{t(`surfaces.${surfaceKey}.title`)}</Title>
            </Stack>

            {error ? (
              <Alert color={getProductColor(isAthleteIqSurface ? "athlete_iq" : "habigoal", "risk")} title={t("errorTitle")}>
                {t(errorKey(error))}
              </Alert>
            ) : null}

            <input type="hidden" name="next" value={nextPath} />
            <input type="hidden" name="productSurface" value={selectedSurface} />
            {!isAthleteIqSurface ? <input type="hidden" name="persona" value="athlete" /> : null}
            <TextInput
              autoComplete="email"
              enterKeyHint="go"
              inputMode="email"
              label={t("identifierLabel")}
              name="identifier"
              placeholder={t("identifierPlaceholder")}
              required
              type="email"
            />

            {isAthleteIqSurface ? (
              <Stack gap="xs">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" aria-label={t("personaLabel")}>
                  <label className="login-persona-option">
                    <input type="radio" name="persona" value="athlete" defaultChecked={initialPersona === "athlete"} required />
                    <span>
                      <Text component="span" fw={900}>{t("athletePersonaTitle")}</Text>
                      <Text component="span" c="dimmed" size="sm">{t("athleteIqAthletePersonaCopy")}</Text>
                    </span>
                  </label>
                  <label className="login-persona-option">
                    <input type="radio" name="persona" value="trainer" defaultChecked={initialPersona === "trainer"} required />
                    <span>
                      <Text component="span" fw={900}>{t("trainerPersonaTitle")}</Text>
                      <Text component="span" c="dimmed" size="sm">{t("athleteIqTrainerPersonaCopy")}</Text>
                    </span>
                  </label>
                </SimpleGrid>
              </Stack>
            ) : null}
            <Button fullWidth type="submit" size="md" variant="filled" color={surfaceColor}>
              {t("submit")}
            </Button>

            <Anchor href={isAthleteIqSurface ? `/${locale}/athlete-iq` : `/${locale}/habigoal`} fw={700}>{t(`surfaces.${surfaceKey}.backLink`)}</Anchor>
          </Stack>
        </form>
      </Paper>
    </main>
  );
}
