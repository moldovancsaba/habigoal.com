import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ATHLETE_IQ_OS_GROUPS, ATHLETE_IQ_OS_MODULES } from "@/lib/athlete-iq-os";
import { ATHLETE_IQ_GDS_THEME_PRESET, ATHLETE_IQ_GOLD_LOGO_SRC } from "@/lib/product-surface-branding";

const readSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const readJson = <T,>(path: string) => JSON.parse(readSource(path)) as T;

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
    const logoPath = ATHLETE_IQ_GOLD_LOGO_SRC.replace(/^\//, "");

    expect(existsSync(join(process.cwd(), "public", logoPath))).toBe(true);
    expect(athleteIqSource).toContain("ATHLETE_IQ_GOLD_LOGO_SRC");
    expect(sharedSource).toContain("ATHLETE_IQ_GOLD_LOGO_SRC");
    expect(athleteIqSource).toContain("data-gds-theme-preset");
    expect(ATHLETE_IQ_GDS_THEME_PRESET).toBe("athlete-gold");
  });

  it("keeps Habigoal configured as a mobile PWA surface", () => {
    const localeLayout = readSource("app/[locale]/layout.tsx");
    const manifest = readSource("app/manifest.ts");
    const habigoalSource = readSource("components/product/habigoal/HabigoalExperience.tsx");

    expect(localeLayout).toContain("userScalable: false");
    expect(localeLayout).toContain("manifest: \"/manifest.webmanifest\"");
    expect(manifest).toContain("display: \"standalone\"");
    expect(manifest).toContain("orientation: \"portrait\"");
    expect(habigoalSource).toContain("hbg-app-frame");
    expect(habigoalSource).toContain("hbg-bottom-nav");
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
    expect(landingRoute).toContain("encodeURIComponent(habigoalPath)");
    expect(landingRoute).toContain("encodeURIComponent(athleteIqPath)");
    expect(loginRoute).toContain("sanitizePersona");
    expect(loginRoute).toContain('defaultChecked={initialPersona === "athlete"}');
    expect(loginRoute).toContain('defaultChecked={initialPersona === "trainer"}');
  });

  it("requires a matching login session before product app data is loaded", () => {
    const habigoalRoute = readSource("app/[locale]/habigoal/page.tsx");
    const athleteIqRoute = readSource("app/[locale]/athlete-iq/page.tsx");

    expect(habigoalRoute.indexOf("requireProductSession")).toBeLessThan(habigoalRoute.indexOf("getHabigoalTodayProjection"));
    expect(habigoalRoute).toContain('persona: "athlete"');
    expect(habigoalRoute).toContain('allowedRoles: ["athlete"]');
    expect(athleteIqRoute.indexOf("requireProductSession")).toBeLessThan(athleteIqRoute.indexOf("getAthleteIqProductDashboardProjection"));
    expect(athleteIqRoute).toContain('persona: "trainer"');
    expect(athleteIqRoute).toContain('"club_management"');
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
    expect(englishMessages.ProductSurfaces.athleteIq.teamCommand.title).toBe("Trainer team and club command");
    expect(englishMessages.ProductSurfaces.athleteIq.teamCommand.copy).toContain("club-level delivery");
    expect(ATHLETE_IQ_OS_MODULES.map((module) => module.label)).toContain("Team");
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
    expect(athleteIqSource).toContain("HIDDEN_REFERENCE_NAV_ITEMS");
  });

  it("localizes the separated product app shells in every supported catalog", () => {
    const locales = ["en", "hu", "de", "es", "ar", "he"];
    const englishMessages = readJson<Messages>("messages/en.json");

    for (const locale of locales) {
      const messages = readJson<Messages>(`messages/${locale}.json`);

      expect(messages.ProductSurfaces.habigoal.headline).toBeTruthy();
      expect(messages.ProductSurfaces.athleteIq.teamCommand.title).toBeTruthy();
      expect(messages.ProductSurfaces.athleteIq.hero.title).toBeTruthy();
    }

    for (const locale of locales.filter((item) => item !== "en")) {
      const messages = readJson<Messages>(`messages/${locale}.json`);

      expect(messages.ProductSurfaces.habigoal.headline).not.toBe(englishMessages.ProductSurfaces.habigoal.headline);
      expect(messages.ProductSurfaces.athleteIq.teamCommand.title).not.toBe(englishMessages.ProductSurfaces.athleteIq.teamCommand.title);
    }
  });
});
