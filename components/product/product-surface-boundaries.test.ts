import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ATHLETE_IQ_OS_GROUPS, ATHLETE_IQ_OS_MODULES } from "@/lib/athlete-iq-os";
import { ATHLETE_IQ_GDS_THEME_PRESET, ATHLETE_IQ_GOLD_LOGO_SRC } from "@/lib/product-surface-branding";

const readSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const readJson = <T,>(path: string) => JSON.parse(readSource(path)) as T;
const legacyHex = (prefix: string, suffix: string) => `#${prefix}${suffix}`;

type Messages = {
  ProductSurfaces: {
    athleteIq: {
      hero: {
        title: string;
      };
      teamCommand: {
        copy: string;
        title: string;
      };
    };
    habigoal: {
      headline: string;
    };
  };
};

describe("product surface route boundaries", () => {
  it("routes import product-owned entry components instead of the shared dispatcher", () => {
    const habigoalRoute = readSource("app/[locale]/habigoal/page.tsx");
    const athleteIqRoute = readSource("app/[locale]/athlete-iq/page.tsx");

    expect(habigoalRoute).toContain("@/components/product/habigoal/HabigoalExperience");
    expect(habigoalRoute).not.toContain("ProductSurfacePage");
    expect(athleteIqRoute).toContain("@/components/product/athlete-iq/AthleteIqExperience");
    expect(athleteIqRoute).not.toContain("ProductSurfacePage");
  });

  it("keeps Habigoal free of AthleteIQ command ownership", () => {
    const habigoalSource = readSource("components/product/habigoal/HabigoalExperience.tsx");

    expect(habigoalSource).not.toContain("PRIORITY_ATHLETES");
    expect(habigoalSource).not.toContain("SERVICE_MODULES");
    expect(habigoalSource).not.toContain("roleView");
    expect(habigoalSource).not.toContain("athlete_iq");
    expect(habigoalSource).not.toContain("AthleteIQ");
  });

  it("keeps AthleteIQ free of Habigoal client-state ownership", () => {
    const athleteIqSource = readSource("components/product/athlete-iq/AthleteIqExperience.tsx");

    expect(athleteIqSource).not.toContain("HABIT_PLAN");
    expect(athleteIqSource).not.toContain("StatusSlider");
    expect(athleteIqSource).not.toContain("completedHabits");
  });

  it("uses the dedicated AthleteIQ gold logo and GDS theme preset", () => {
    const athleteIqSource = readSource("components/product/athlete-iq/AthleteIqExperience.tsx");
    const sharedSource = readSource("components/product/ProductSurfaceShared.tsx");
    const themeBoundarySource = readSource("components/product/ProductThemeBoundary.tsx");
    const logoPath = ATHLETE_IQ_GOLD_LOGO_SRC.replace(/^\//, "");

    expect(existsSync(join(process.cwd(), "public", logoPath))).toBe(true);
    expect(athleteIqSource).toContain("ATHLETE_IQ_GOLD_LOGO_SRC");
    expect(sharedSource).toContain("ATHLETE_IQ_GOLD_LOGO_SRC");
    expect(athleteIqSource).toContain("ProductThemeBoundary");
    expect(themeBoundarySource).toContain("data-gds-theme-preset");
    expect(ATHLETE_IQ_GDS_THEME_PRESET).toBe("athlete-gold");
  });

  it("keeps Habigoal configured as a mobile PWA surface", () => {
    const localeLayout = readSource("app/[locale]/layout.tsx");
    const manifest = readSource("app/manifest.ts");
    const habigoalSource = readSource("components/product/habigoal/HabigoalExperience.tsx");
    const styles = readSource("app/globals.css");

    // The PWA must NOT lock pinch-zoom (WCAG 1.4.4 / GH-412); iOS focus-zoom is
    // prevented by ≥16px inputs on coarse pointers, not by disabling scale.
    expect(localeLayout).not.toContain("userScalable: false");
    expect(localeLayout).not.toContain("maximumScale: 1");
    expect(localeLayout).toContain("manifest: \"/manifest.webmanifest\"");
    expect(manifest).toContain("display: \"standalone\"");
    expect(manifest).toContain("orientation: \"portrait\"");
    expect(habigoalSource).toContain("hbg-app-frame");
    expect(habigoalSource).toContain("hbg-bottom-nav");
    expect(styles).toContain("touch-action: pan-y");
    expect(styles).toContain("width: 100dvw");
    expect(styles).toMatch(/\.hbg-bottom-nav\s*\{[\s\S]*?position:\s*fixed/);
    expect(styles).toMatch(/\.hbg-main-grid\s*\{[\s\S]*?scroll-padding-bottom/);
  });

  it("keeps Habigoal as an owned product app instead of an embedded dashboard panel", () => {
    const habigoalRoute = readSource("app/[locale]/habigoal/page.tsx");
    const habigoalSource = readSource("components/product/habigoal/HabigoalExperience.tsx");
    const styles = readSource("app/globals.css");

    expect(habigoalRoute).not.toContain("DashboardShell");
    expect(habigoalRoute).not.toContain("embedded");
    expect(habigoalSource).toContain("<SurfaceTopBar surface={surface} />");
    expect(habigoalSource).toContain("className=\"hbg-bottom-nav hbg-bottom-nav-2\"");
    expect(habigoalSource).toContain("aria-current={view === \"flow\" ? \"page\" : undefined}");
    expect(habigoalSource).toContain("aria-current={view === \"progress\" ? \"page\" : undefined}");
    expect(habigoalSource).not.toContain("hbg-embedded-viewswitch");
    expect(habigoalSource).not.toContain("hbg-app-frame-embedded");
    expect(styles).not.toContain("hbg-embedded-viewswitch");
    expect(styles).not.toContain("hbg-app-frame-embedded");
  });

  it("keeps AthleteIQ as an owned product app instead of an embedded dashboard panel", () => {
    const athleteIqRoute = readSource("app/[locale]/athlete-iq/page.tsx");
    const athleteIqSource = readSource("components/product/athlete-iq/AthleteIqExperience.tsx");
    const styles = readSource("app/globals.css");

    expect(athleteIqRoute).not.toContain("DashboardShell");
    expect(athleteIqRoute).not.toContain("embedded");
    expect(athleteIqSource).toContain("<SurfaceTopBar surface={surface} />");
    expect(athleteIqSource).toContain("AiqMobileTopBar");
    expect(athleteIqSource).toContain("AiqMobileNavigation");
    expect(athleteIqSource).toContain("className=\"aiq-command-layout\"");
    expect(athleteIqSource).toContain("className=\"aiq-sidebar-v2 aiq-desktop-sidebar surface-outline\"");
    expect(athleteIqSource).not.toContain("DashboardShell");
    expect(athleteIqSource).not.toContain("embedded");
    expect(athleteIqSource).not.toContain("aiq-command-layout-embedded");
    expect(styles).not.toContain("aiq-command-layout-embedded");
  });

  it("keeps global overlays and athlete persona routes on the gold product color contract", () => {
    const cookieBanner = readSource("components/layout/CookieConsentBanner.tsx");
    const athleteHome = readSource("components/athletes/AthletesAppHome.tsx");
    const trainingLogRoute = readSource("app/[locale]/athletes/[id]/training-log/page.tsx");
    const trainingLogForm = readSource("components/athletes/TrainingLoadLogger.tsx");
    const sessionRpeRoute = readSource("app/api/session-plans/rpe/route.ts");

    expect(cookieBanner).toContain("resolveProductSurfaceFromPathname(pathname)");
    expect(cookieBanner).toContain("getProductColor(activeSurface, \"primaryAction\")");
    expect(cookieBanner).not.toContain("color=\"ingress\"");
    expect(cookieBanner).not.toContain("@mantine/core");

    expect(athleteHome).toContain("getProductColor(ATHLETE_APP_SURFACE, \"primaryAction\")");
    expect(athleteHome).not.toContain("@mantine/core");
    expect(athleteHome).not.toContain("mantine-color-ingress");

    expect(trainingLogRoute).toContain("<DashboardShell>");
    expect(trainingLogRoute).toContain("TrainingLoadLogger");
    expect(trainingLogRoute).not.toContain("setTimeout");

    expect(trainingLogForm).toContain("`/api/athletes/${athleteId}/training-load`");
    expect(trainingLogForm).toContain("getProductColor(\"dashboard\", \"primaryAction\")");
    expect(trainingLogForm).not.toContain("bg=\"gray.0\"");
    expect(trainingLogForm).not.toContain("color=\"ingress\"");
    expect(trainingLogForm).not.toContain("mantine-color-ingress");
    expect(trainingLogForm).not.toContain("setTimeout");

    expect(sessionRpeRoute).toContain("requireRole(request, [\"admin\", \"trainer\", \"athlete\"])");
    expect(sessionRpeRoute).toContain("canAccessAthlete(authUser, athleteId)");
    expect(sessionRpeRoute).toContain("createTrainingLoadRecord");
    expect(sessionRpeRoute).not.toContain("console.log");
    expect(sessionRpeRoute).not.toContain("Store in DB");
  });

  it("uses the official gold athlete theme contract for persona app shells", () => {
    const localeLayout = readSource("app/[locale]/layout.tsx");
    const manifest = readSource("app/manifest.ts");
    const theme = readSource("theme/mantine-theme.ts");
    const productContracts = readSource("lib/product-ui-contracts.ts");
    const themeBoundary = readSource("components/product/ProductThemeBoundary.tsx");
    const styles = readSource("app/globals.css");
    const oldHabigoalTeal = legacyHex("0f", "9f8f");
    const oldHabigoalBlue = legacyHex("16", "87d9");

    expect(localeLayout).toContain("getSemanticTone(\"review\").color");
    expect(manifest).toContain("getSemanticTone(\"review\").color");
    expect(theme).toContain("primaryColor: \"review\"");
    expect(theme).toMatch(/defaultGradient:\s*\{[\s\S]*?from:\s*"review(?:\.\d+)?"/);
    expect(theme).toMatch(/defaultGradient:\s*\{[\s\S]*?to:\s*"review(?:\.\d+)?"/);
    expect(theme).not.toContain("primaryColor: \"ingress\"");
    expect(productContracts).toMatch(/dashboard:\s*\{[\s\S]*?mode:\s*"professional_dark_gold"/);
    expect(productContracts).toMatch(/habigoal:\s*\{[\s\S]*?mode:\s*"professional_dark_gold"/);
    expect(productContracts).toMatch(/habigoal:\s*\{[\s\S]*?primaryAction:\s*"review"/);
    expect(productContracts).toMatch(/public:\s*\{[\s\S]*?primaryAction:\s*"review"/);
    expect(themeBoundary).toContain("surface === \"habigoal\"");
    expect(themeBoundary).toContain("surface === \"dashboard\"");
    expect(themeBoundary).toContain("--app-bg");
    expect(themeBoundary).toContain("--blob-1");
    expect(styles).not.toContain("--hbg-sky");
    expect(styles).not.toContain("--hbg-mint");
    expect(styles).not.toContain(oldHabigoalTeal);
    expect(styles).not.toContain(oldHabigoalBlue);
  });

  it("keeps product apps isolated from selector and cross-app navigation", () => {
    const sharedSource = readSource("components/product/ProductSurfaceShared.tsx");
    const habigoalSource = readSource("components/product/habigoal/HabigoalExperience.tsx");
    const athleteIqSource = readSource("components/product/athlete-iq/AthleteIqExperience.tsx");
    const actionSource = readSource("components/product/productSurfaceActions.ts");

    expect(sharedSource).not.toContain("Link href");
    expect(sharedSource).not.toContain("relatedSurface.primaryPath");
    expect(habigoalSource).not.toContain("href=\"/athlete-iq\"");
    expect(athleteIqSource).not.toContain("href=\"/\"");
    expect(athleteIqSource).not.toContain("href=\"/habigoal\"");
    expect(athleteIqSource).not.toContain("href=\"/dashboard\"");
    expect(athleteIqSource).not.toContain("productSurface:dashboard");
    expect(athleteIqSource).toContain("productSurface:athleteDashboard");
    expect(actionSource).not.toContain("productSurface:habigoal");
    expect(actionSource).not.toContain("productSurface:aiq");
    expect(actionSource).not.toContain("productSurface:home");
  });

  it("routes app selector entries through login with the selected product persona", () => {
    const landingRoute = readSource("app/[locale]/page.tsx");
    const loginRoute = readSource("app/[locale]/login/page.tsx");

    expect(landingRoute).toContain("persona=athlete");
    expect(landingRoute).toContain("persona=trainer");
    expect(landingRoute).toContain("productSurface=habigoal");
    expect(landingRoute).toContain("productSurface=athlete-iq");
    expect(landingRoute).toContain("encodeURIComponent(habigoalPath)");
    // The two Athlete IQ entries carry the pre-selected persona into the next
    // destination so the surface renders the athlete vs trainer experience.
    expect(landingRoute).toContain("${athleteIqPath}?persona=athlete");
    expect(landingRoute).toContain("${athleteIqPath}?persona=trainer");
    expect(loginRoute).toContain("ATHLETE_IQ_GOLD_LOGO_SRC");
    expect(loginRoute).toContain("login-panel-aiq");
    expect(loginRoute).toContain("sanitizePersona");
    expect(loginRoute).toContain('!isAthleteIqSurface ? <input type="hidden" name="persona" value="athlete" /> : null');
    expect(loginRoute).toContain('{isAthleteIqSurface ? (');
    expect(loginRoute).toContain('defaultChecked={initialPersona === "athlete"}');
    expect(loginRoute).toContain('defaultChecked={initialPersona === "trainer"}');
  });

  it("requires a matching login session before product app data is loaded", () => {
    const habigoalRoute = readSource("app/[locale]/habigoal/page.tsx");
    const athleteIqRoute = readSource("app/[locale]/athlete-iq/page.tsx");
    const appContracts = readSource("lib/product-apps.ts");

    expect(habigoalRoute.indexOf("requireProductSession")).toBeLessThan(habigoalRoute.indexOf("getHabigoalTodayProjection"));
    expect(habigoalRoute).toContain('getProductAppContract("habigoal")');
    expect(habigoalRoute).toContain("getProductAppSessionInput(HABIGOAL_APP, locale)");
    expect(appContracts).toContain('defaultPersona: "athlete"');
    expect(appContracts).toContain('"parent"');
    expect(appContracts).toContain('"trainer"');
    expect(appContracts).toContain('"club_management"');
    expect(athleteIqRoute.indexOf("requireProductSession")).toBeLessThan(athleteIqRoute.indexOf("getAthleteIqProductDashboardProjection"));
    expect(athleteIqRoute).toContain("resolveAthleteIqProductAppId(requestedPersona)");
    expect(athleteIqRoute).toContain("getProductAppSessionInput(appContract, locale");
    expect(appContracts).toContain('"athlete-iq-athlete"');
    expect(appContracts).toContain('"athlete-iq-trainer"');
  });

  it("keeps AthleteIQ oriented around trainer team and club operations", () => {
    const athleteIqSource = readSource("components/product/athlete-iq/AthleteIqExperience.tsx");
    const athleteIqRoute = readSource("app/[locale]/athlete-iq/page.tsx");
    const englishMessages = readJson<Messages>("messages/en.json");

    expect(athleteIqSource).not.toContain("PRIORITY_ATHLETES");
    expect(athleteIqSource).not.toContain("SERVICE_MODULES");
    expect(athleteIqSource).not.toContain("TEAM_OPERATIONS");
    expect(athleteIqRoute).toContain("getAthleteIqProductDashboardProjection");
    expect(athleteIqSource).toContain("teamCommand.title");
    expect(englishMessages.ProductSurfaces.athleteIq.teamCommand.title).toBe("Team & club management");
    expect(englishMessages.ProductSurfaces.athleteIq.teamCommand.copy).toContain("club-level work");
    expect(ATHLETE_IQ_OS_MODULES.map((module) => module.label)).toContain("Team");
  });

  it("keeps AthleteIQ athlete view free of trainer service cards and keeps service actions wired", () => {
    const athleteIqSource = readSource("components/product/athlete-iq/AthleteIqExperience.tsx");
    const athleteWorkspace = athleteIqSource.slice(
      athleteIqSource.indexOf("function AiqAthleteWorkspace"),
      athleteIqSource.indexOf("function TeamOperationCard")
    );

    expect(athleteWorkspace).not.toContain("ServiceModuleCard");
    expect(athleteWorkspace).not.toContain("dashboard.services.map");
    expect(athleteWorkspace).toContain("athleteWorkspace.shared");
    expect(athleteWorkspace).toContain("SharedDailyRecorder");
    expect(athleteWorkspace).toContain('product="athlete-iq"');
    expect(athleteIqSource).toContain("onOpen={openServiceModule}");
    expect(athleteIqSource).toContain("onClick={() => onOpen(module)}");
    expect(athleteIqSource).toContain("getTrainerServiceRoute");
  });

  it("matches the AthleteIQ Daily Development OS reference menu", () => {
    const athleteIqSource = readSource("components/product/athlete-iq/AthleteIqExperience.tsx");
    const englishMessages = readJson<Messages>("messages/en.json");

    expect(ATHLETE_IQ_OS_GROUPS.map((group) => group.title)).toEqual(["Daily OS", "Stakeholders", "Development"]);
    expect(ATHLETE_IQ_OS_MODULES).toHaveLength(17);
    expect(ATHLETE_IQ_OS_MODULES.map((module) => module.label)).toEqual([
      "Home",
      "User Profile",
      "Check-in",
      "Live Session",
      "Calendar",
      "Coach",
      "Parent",
      "Team",
      "Pillar Status",
      "Recovery",
      "Fuel",
      "Mental",
      "Cognitive Lite",
      "Reflection",
      "Habits",
      "Roadmap",
      "Report"
    ]);
    expect(athleteIqSource).toContain("hero.title");
    expect(englishMessages.ProductSurfaces.athleteIq.hero.title).toBe("Athlete IQ Daily Development OS");
    expect(athleteIqSource).not.toContain("Daily Development OS menu");
    expect(athleteIqSource).not.toContain("AiqModuleGroup");
    expect(athleteIqSource).not.toContain("FunctionDirectory");
    expect(athleteIqSource).not.toContain("<strong>Output:</strong>");
    expect(athleteIqSource).not.toContain("aiq-nav-code");
    // The coach sidebar links must target the sections that actually render
    // (home, team-club, priority, athletes, services) so every menu entry
    // scrolls, rather than the aspirational OS module catalogue.
    expect(athleteIqSource).toContain('anchorId: "team-club"');
    expect(athleteIqSource).toContain('anchorId: "priority"');
    expect(athleteIqSource).toContain('anchorId: "services"');
    expect(athleteIqSource).not.toContain("HIDDEN_REFERENCE_NAV_ITEMS");
  });

  it("keeps AthleteIQ mobile navigation behind a hamburger drawer", () => {
    const athleteIqSource = readSource("components/product/athlete-iq/AthleteIqExperience.tsx");
    const styles = readSource("app/globals.css");

    expect(athleteIqSource).toContain("AiqMobileTopBar");
    expect(athleteIqSource).toContain("AiqMobileNavigation");
    expect(athleteIqSource).toContain("GdsIcons.Menu");
    expect(athleteIqSource).toContain("aiq-mobile-menu-button");
    expect(athleteIqSource).toContain("aiq-mobile-language-select");
    expect(athleteIqSource).toContain("common(\"openDashboard\")");
    expect(athleteIqSource).toContain("common(\"logout\")");
    expect(styles).toMatch(/\.aiq-desktop-sidebar\s*\{[\s\S]*?display:\s*none/);
    expect(styles).toMatch(/\.surface-topbar\.aiq-topbar\s*\{[\s\S]*?display:\s*none/);
    expect(styles).toMatch(/\.aiq-mobile-topbar\s*\{[\s\S]*?display:\s*flex/);
    expect(styles).toContain(".aiq-mobile-drawer");
    expect(styles).toContain(".aiq-mobile-language-select");
    expect(styles).not.toContain(".aiq-nav-code");
  });

  it("localizes the separated product app shells in every supported catalog", () => {
    const locales = ["en", "hu", "de", "es", "ar", "he"];
    const englishMessages = readJson<Messages>("messages/en.json");
    const blockedUserFacingArchitectureCopy = [
      "Shared data layer",
      "Közös adatréteg",
      "Gemeinsame Datenschicht",
      "Capa de datos compartida",
      "Habigoal and Athlete IQ use one profile",
      "A Habigoal és az Athlete IQ egy profilt használ",
      "Habigoal und Athlete IQ nutzen ein Profil",
      "Habigoal y Athlete IQ usan un perfil"
    ];

    for (const locale of locales) {
      const messages = readJson<Messages>(`messages/${locale}.json`);
      const athleteIqMessages = JSON.stringify(messages.ProductSurfaces.athleteIq);

      expect(messages.ProductSurfaces.habigoal.headline).toBeTruthy();
      expect(messages.ProductSurfaces.athleteIq.teamCommand.title).toBeTruthy();
      expect(messages.ProductSurfaces.athleteIq.hero.title).toBeTruthy();
      for (const blockedCopy of blockedUserFacingArchitectureCopy) {
        expect(athleteIqMessages).not.toContain(blockedCopy);
      }
    }

    for (const locale of locales.filter((item) => item !== "en")) {
      const messages = readJson<Messages>(`messages/${locale}.json`);

      expect(messages.ProductSurfaces.habigoal.headline).not.toBe(englishMessages.ProductSurfaces.habigoal.headline);
      expect(messages.ProductSurfaces.athleteIq.teamCommand.title).not.toBe(englishMessages.ProductSurfaces.athleteIq.teamCommand.title);
    }
  });
});
