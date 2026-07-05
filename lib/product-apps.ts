import type { GdsThemePresetId } from "@sovereignsquad/gds";
import type { AppRole } from "@/lib/access";
import type { ProductSurfaceId } from "@/lib/product-entitlements";
import { ATHLETE_IQ_GDS_THEME_PRESET } from "@/lib/product-surface-branding";
import type { ProductSurfaceKey } from "@/lib/product-ui-contracts";

export type ProductAppPersona = "athlete" | "trainer";
export type ProductAppId = "habigoal" | "athlete-iq-athlete" | "athlete-iq-trainer";
export type ProductAppCopyNamespace = "ProductSurfaces.habigoal" | "ProductSurfaces.athleteIq";
export type SharedDailyStatusMode = "write-personal" | "read-write-own-athlete" | "read-team";

export type ProductAppSharedDataPolicy = {
  dailyStatus: SharedDailyStatusMode;
  mayRenderForeignProductUi: false;
  mayPublishForeignProductFunctions: false;
  sourceContract: "shared-daily-status-ledger";
};

export type ProductAppContract = {
  id: ProductAppId;
  label: string;
  routePath: "/habigoal" | "/athlete-iq";
  productSurfaceId: ProductSurfaceId;
  productSurfaceKey: Extract<ProductSurfaceKey, "habigoal" | "athlete_iq">;
  copyNamespace: ProductAppCopyNamespace;
  defaultPersona: ProductAppPersona;
  allowedRoles: readonly AppRole[];
  themePresetId: GdsThemePresetId;
  ownedShellMarkers: readonly string[];
  forbiddenShellMarkers: readonly string[];
  allowedFunctionPrefixes: readonly string[];
  forbiddenFunctionPrefixes: readonly string[];
  forbiddenRoutePrefixes: readonly string[];
  runtimeFlow: readonly string[];
  accessibility: readonly string[];
  observabilityEvents: readonly string[];
  retryPolicy: string;
  rollbackPolicy: string;
  sharedDataPolicy: ProductAppSharedDataPolicy;
};

const HABIGOAL_ROLES = ["admin", "athlete", "trainer", "parent", "performance_coach", "physio", "analyst", "club_management"] as const;
const ATHLETE_IQ_ROLES = ["admin", "athlete", "trainer", "performance_coach", "physio", "analyst", "club_management"] as const;
const TRAINER_ROLES = ["admin", "trainer", "performance_coach", "physio", "analyst", "club_management"] as const;

export const PRODUCT_APP_SEQUENCE = ["habigoal", "athlete-iq-athlete", "athlete-iq-trainer"] as const satisfies readonly ProductAppId[];

export const PRODUCT_APP_CONTRACTS = {
  habigoal: {
    id: "habigoal",
    label: "Habigoal",
    routePath: "/habigoal",
    productSurfaceId: "habigoal",
    productSurfaceKey: "habigoal",
    copyNamespace: "ProductSurfaces.habigoal",
    defaultPersona: "athlete",
    allowedRoles: HABIGOAL_ROLES,
    themePresetId: ATHLETE_IQ_GDS_THEME_PRESET,
    ownedShellMarkers: ["habigoal-product-shell", "hbg-app-frame", "hbg-bottom-nav"],
    forbiddenShellMarkers: ["aiq-product-shell", "aiq-command-layout", "DashboardShell"],
    allowedFunctionPrefixes: ["hbg-"],
    forbiddenFunctionPrefixes: ["aiq-"],
    forbiddenRoutePrefixes: ["/athlete-iq", "/dashboard"],
    runtimeFlow: [
      "Resolve Habigoal entitlement before reading daily data",
      "Load the personal daily-status projection",
      "Render only Habigoal-owned habitbuilder chrome",
      "Persist personal check-in and habit records through Habigoal APIs",
      "Refresh the projection after a successful save"
    ],
    accessibility: [
      "Bottom navigation exposes aria-current on the active tab",
      "Daily status uses text labels in addition to color",
      "All primary controls stay keyboard reachable and at least 44px high on touch screens"
    ],
    observabilityEvents: [
      "habigoal.daily_operation.started",
      "habigoal.daily_operation.validation_failed",
      "habigoal.daily_operation.saved",
      "habigoal.daily_operation.retryable_failed"
    ],
    retryPolicy: "Keep the local draft visible after a failed save and allow the same idempotency key to be retried.",
    rollbackPolicy: "Never mutate Athlete IQ UI state from Habigoal; if save fails, keep the previous daily projection visible.",
    sharedDataPolicy: {
      dailyStatus: "write-personal",
      mayPublishForeignProductFunctions: false,
      mayRenderForeignProductUi: false,
      sourceContract: "shared-daily-status-ledger"
    }
  },
  "athlete-iq-athlete": {
    id: "athlete-iq-athlete",
    label: "Athlete IQ athlete workspace",
    routePath: "/athlete-iq",
    productSurfaceId: "athlete-iq",
    productSurfaceKey: "athlete_iq",
    copyNamespace: "ProductSurfaces.athleteIq",
    defaultPersona: "athlete",
    allowedRoles: ATHLETE_IQ_ROLES,
    themePresetId: ATHLETE_IQ_GDS_THEME_PRESET,
    ownedShellMarkers: ["aiq-product-shell", "aiq-command-layout", "aiq-sidebar-v2"],
    forbiddenShellMarkers: ["habigoal-product-shell", "hbg-app-frame", "DashboardShell"],
    allowedFunctionPrefixes: ["aiq-"],
    forbiddenFunctionPrefixes: ["hbg-"],
    forbiddenRoutePrefixes: ["/habigoal", "/dashboard"],
    runtimeFlow: [
      "Resolve Athlete IQ entitlement before reading professional data",
      "Load the athlete projection for the signed-in athlete scope",
      "Render the Athlete IQ athlete workspace only inside Athlete IQ chrome",
      "Record shared daily status through the Athlete IQ recorder adapter",
      "Keep coach/team-only service cards outside the athlete workspace"
    ],
    accessibility: [
      "Mobile navigation is behind a labelled hamburger drawer",
      "Daily recorder errors render as alert text, not color alone",
      "Dense metric cards keep semantic headings and readable text alternatives"
    ],
    observabilityEvents: [
      "athlete_iq.athlete_workspace.loaded",
      "athlete_iq.daily_recorder.started",
      "athlete_iq.daily_recorder.saved",
      "athlete_iq.daily_recorder.failed"
    ],
    retryPolicy: "Daily recorder saves use idempotent requests and keep the edited values visible when the API fails.",
    rollbackPolicy: "Shared daily-status writes can be retried or abandoned without publishing Habigoal UI or trainer-only modules.",
    sharedDataPolicy: {
      dailyStatus: "read-write-own-athlete",
      mayPublishForeignProductFunctions: false,
      mayRenderForeignProductUi: false,
      sourceContract: "shared-daily-status-ledger"
    }
  },
  "athlete-iq-trainer": {
    id: "athlete-iq-trainer",
    label: "Athlete IQ trainer workspace",
    routePath: "/athlete-iq",
    productSurfaceId: "athlete-iq",
    productSurfaceKey: "athlete_iq",
    copyNamespace: "ProductSurfaces.athleteIq",
    defaultPersona: "trainer",
    allowedRoles: TRAINER_ROLES,
    themePresetId: ATHLETE_IQ_GDS_THEME_PRESET,
    ownedShellMarkers: ["aiq-product-shell", "aiq-command-layout", "aiq-sidebar-v2"],
    forbiddenShellMarkers: ["habigoal-product-shell", "hbg-app-frame", "DashboardShell"],
    allowedFunctionPrefixes: ["aiq-"],
    forbiddenFunctionPrefixes: ["hbg-"],
    forbiddenRoutePrefixes: ["/habigoal"],
    runtimeFlow: [
      "Resolve Athlete IQ entitlement before reading team data",
      "Load team, club, service, priority, and report projections through professional services",
      "Render only Athlete IQ trainer-owned command chrome",
      "Write coach actions through auditable professional APIs",
      "Degrade each module independently when one professional data source fails"
    ],
    accessibility: [
      "Sidebar and mobile drawer expose the same reachable navigation targets",
      "Priority states include labels and not only badge color",
      "Service actions are real buttons with visible focus states"
    ],
    observabilityEvents: [
      "athlete_iq.trainer_workspace.loaded",
      "athlete_iq.coach_action.acknowledge_started",
      "athlete_iq.coach_action.acknowledge_saved",
      "athlete_iq.coach_action.acknowledge_failed"
    ],
    retryPolicy: "Coach action writes are isolated per athlete and keep the row visible when the API fails.",
    rollbackPolicy: "Failed professional modules must not alter Habigoal records or hide the core trainer shell.",
    sharedDataPolicy: {
      dailyStatus: "read-team",
      mayPublishForeignProductFunctions: false,
      mayRenderForeignProductUi: false,
      sourceContract: "shared-daily-status-ledger"
    }
  }
} as const satisfies Record<ProductAppId, ProductAppContract>;

export function getProductAppContract(id: ProductAppId): ProductAppContract {
  return PRODUCT_APP_CONTRACTS[id];
}

export function resolveAthleteIqProductAppId(persona: string | null | undefined): Extract<ProductAppId, "athlete-iq-athlete" | "athlete-iq-trainer"> {
  return persona === "athlete" ? "athlete-iq-athlete" : "athlete-iq-trainer";
}

export function getLocalizedProductAppPath(contract: ProductAppContract, locale: string, options?: { persona?: ProductAppPersona }) {
  const persona = options?.persona;
  const query = contract.routePath === "/athlete-iq" && persona ? `?persona=${persona}` : "";
  return `/${locale}${contract.routePath}${query}`;
}

export function getProductAppSessionInput(contract: ProductAppContract, locale: string, options?: { persona?: ProductAppPersona }) {
  const persona = options?.persona ?? contract.defaultPersona;

  return {
    allowedRoles: [...contract.allowedRoles],
    locale,
    path: getLocalizedProductAppPath(contract, locale, { persona }),
    persona,
    surface: contract.productSurfaceId
  };
}
