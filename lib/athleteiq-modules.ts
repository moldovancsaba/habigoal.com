import type { AppRole, AuthUser } from "@/lib/access";

export const ATHLETEIQ_MODULE_REGISTRY_VERSION = "aiq-modules-1201.1";
export const ATHLETEIQ_CAPABILITY_KEY = "AIQ-1201";

export type AthleteIqModuleMaturity = "active" | "lite_manual" | "planned" | "future";
export type AthleteIqModuleClaimBoundary = "backed_by_user_input" | "backed_by_manual_entry" | "partner_future" | "roadmap_only";
export type AthleteIqDataSourceAvailability = "live" | "manual" | "planned" | "future";
export type AthleteIqReportVisibility = "athlete" | "coach" | "parent" | "team" | "academy" | "roadmap";

export type AthleteIqDataSource = {
  key: string;
  labelKey: string;
  availability: AthleteIqDataSourceAvailability;
};

export type AthleteIqModuleDefinition = {
  key: string;
  displayNameKey: string;
  summaryKey: string;
  maturity: AthleteIqModuleMaturity;
  claimBoundary: AthleteIqModuleClaimBoundary;
  allowedRoles: AppRole[];
  dataSources: AthleteIqDataSource[];
  routes: string[];
  reportVisibility: AthleteIqReportVisibility[];
  dependencies: string[];
  observabilityEvents: string[];
};

export type AthleteIqModuleView = AthleteIqModuleDefinition & {
  registryVersion: string;
  capabilityKey: typeof ATHLETEIQ_CAPABILITY_KEY;
  statusLabel: "usable" | "manual_limited" | "planned_not_actionable" | "future_not_actionable";
  dataAvailabilityLabel: "live_data" | "manual_data_required" | "missing_planned_source" | "future_source_only";
};

export type AthleteIqRegistryValidation = {
  ok: boolean;
  errors: string[];
};

export type AthleteIqModuleResolution = {
  registryVersion: string;
  capabilityKey: typeof ATHLETEIQ_CAPABILITY_KEY;
  role: AppRole | null;
  deniedReason?: "UNSUPPORTED_ROLE" | "ROLE_NOT_ASSIGNED";
  modules: AthleteIqModuleView[];
};

const liveCheckInSource = { key: "daily_check_ins", labelKey: "athleteiq.sources.dailyCheckIns", availability: "live" } satisfies AthleteIqDataSource;
const liveHabitsSource = { key: "habit_records", labelKey: "athleteiq.sources.habitRecords", availability: "live" } satisfies AthleteIqDataSource;
const livePlanningSource = { key: "session_plans", labelKey: "athleteiq.sources.sessionPlans", availability: "live" } satisfies AthleteIqDataSource;
const liveCoachActionSource = { key: "coach_actions", labelKey: "athleteiq.sources.coachActions", availability: "live" } satisfies AthleteIqDataSource;
const manualEntrySource = { key: "manual_daily_entry", labelKey: "athleteiq.sources.manualEntry", availability: "manual" } satisfies AthleteIqDataSource;
const plannedWearableSource = { key: "wearable_normalisation", labelKey: "athleteiq.sources.wearables", availability: "planned" } satisfies AthleteIqDataSource;
const futurePartnerSource = { key: "partner_future_feed", labelKey: "athleteiq.sources.partnerFuture", availability: "future" } satisfies AthleteIqDataSource;

export const ATHLETEIQ_MODULE_REGISTRY: AthleteIqModuleDefinition[] = [
  {
    key: "readiness",
    displayNameKey: "athleteiq.modules.readiness.name",
    summaryKey: "athleteiq.modules.readiness.summary",
    maturity: "active",
    claimBoundary: "backed_by_user_input",
    allowedRoles: ["admin", "trainer", "performance_coach", "physio", "analyst", "athlete", "parent"],
    dataSources: [liveCheckInSource],
    routes: ["/athletes/[id]", "/dashboard", "/dashboard/athletes/[id]"],
    reportVisibility: ["athlete", "coach", "parent", "team"],
    dependencies: [],
    observabilityEvents: ["aiq.module.readiness.viewed", "aiq.module.readiness.missing_data"]
  },
  {
    key: "mental_edge",
    displayNameKey: "athleteiq.modules.mentalEdge.name",
    summaryKey: "athleteiq.modules.mentalEdge.summary",
    maturity: "active",
    claimBoundary: "backed_by_user_input",
    allowedRoles: ["admin", "trainer", "performance_coach", "physio", "athlete", "parent"],
    dataSources: [liveCheckInSource],
    routes: ["/athletes/[id]", "/dashboard/athletes/[id]"],
    reportVisibility: ["athlete", "coach", "parent"],
    dependencies: ["readiness"],
    observabilityEvents: ["aiq.module.mental_edge.viewed", "aiq.module.mental_edge.redacted"]
  },
  {
    key: "pain_safety",
    displayNameKey: "athleteiq.modules.painSafety.name",
    summaryKey: "athleteiq.modules.painSafety.summary",
    maturity: "active",
    claimBoundary: "backed_by_user_input",
    allowedRoles: ["admin", "trainer", "performance_coach", "physio", "athlete", "parent"],
    dataSources: [liveCheckInSource],
    routes: ["/athletes/[id]", "/dashboard/athletes/[id]", "/dashboard/coach"],
    reportVisibility: ["athlete", "coach", "parent"],
    dependencies: ["readiness"],
    observabilityEvents: ["aiq.module.pain_safety.viewed", "aiq.module.pain_safety.escalated"]
  },
  {
    key: "habits",
    displayNameKey: "athleteiq.modules.habits.name",
    summaryKey: "athleteiq.modules.habits.summary",
    maturity: "active",
    claimBoundary: "backed_by_user_input",
    allowedRoles: ["admin", "trainer", "performance_coach", "athlete", "parent"],
    dataSources: [liveHabitsSource],
    routes: ["/athletes/[id]", "/dashboard/athletes/[id]"],
    reportVisibility: ["athlete", "coach", "parent", "team"],
    dependencies: [],
    observabilityEvents: ["aiq.module.habits.viewed", "aiq.module.habits.missing_data"]
  },
  {
    key: "daily_plan",
    displayNameKey: "athleteiq.modules.dailyPlan.name",
    summaryKey: "athleteiq.modules.dailyPlan.summary",
    maturity: "active",
    claimBoundary: "backed_by_manual_entry",
    allowedRoles: ["admin", "trainer", "performance_coach", "athlete"],
    dataSources: [livePlanningSource, liveCheckInSource],
    routes: ["/dashboard/planning", "/athletes/[id]"],
    reportVisibility: ["athlete", "coach", "team"],
    dependencies: ["readiness"],
    observabilityEvents: ["aiq.module.daily_plan.viewed", "aiq.module.daily_plan.updated"]
  },
  {
    key: "session_log",
    displayNameKey: "athleteiq.modules.sessionLog.name",
    summaryKey: "athleteiq.modules.sessionLog.summary",
    maturity: "active",
    claimBoundary: "backed_by_manual_entry",
    allowedRoles: ["admin", "trainer", "performance_coach", "athlete"],
    dataSources: [liveCheckInSource, manualEntrySource],
    routes: ["/athletes/[id]/training-log", "/dashboard/assessment"],
    reportVisibility: ["athlete", "coach", "team"],
    dependencies: [],
    observabilityEvents: ["aiq.module.session_log.viewed", "aiq.module.session_log.saved"]
  },
  {
    key: "calendar",
    displayNameKey: "athleteiq.modules.calendar.name",
    summaryKey: "athleteiq.modules.calendar.summary",
    maturity: "planned",
    claimBoundary: "backed_by_manual_entry",
    allowedRoles: ["admin", "trainer", "performance_coach", "athlete"],
    dataSources: [livePlanningSource],
    routes: ["/dashboard/planning"],
    reportVisibility: ["athlete", "coach", "team"],
    dependencies: ["daily_plan"],
    observabilityEvents: ["aiq.module.calendar.roadmap_viewed"]
  },
  {
    key: "reflection",
    displayNameKey: "athleteiq.modules.reflection.name",
    summaryKey: "athleteiq.modules.reflection.summary",
    maturity: "active",
    claimBoundary: "backed_by_user_input",
    allowedRoles: ["admin", "trainer", "performance_coach", "physio", "athlete", "parent"],
    dataSources: [liveCheckInSource],
    routes: ["/athletes/[id]", "/dashboard/athletes/[id]"],
    reportVisibility: ["athlete", "coach", "parent"],
    dependencies: ["mental_edge"],
    observabilityEvents: ["aiq.module.reflection.viewed", "aiq.module.reflection.redacted"]
  },
  {
    key: "coach_alerts",
    displayNameKey: "athleteiq.modules.coachAlerts.name",
    summaryKey: "athleteiq.modules.coachAlerts.summary",
    maturity: "active",
    claimBoundary: "backed_by_user_input",
    allowedRoles: ["admin", "trainer", "performance_coach", "physio"],
    dataSources: [liveCheckInSource, liveCoachActionSource],
    routes: ["/dashboard", "/dashboard/coach"],
    reportVisibility: ["coach", "team"],
    dependencies: ["readiness", "pain_safety"],
    observabilityEvents: ["aiq.module.coach_alerts.viewed", "aiq.module.coach_alerts.acknowledged"]
  },
  {
    key: "parent_summary",
    displayNameKey: "athleteiq.modules.parentSummary.name",
    summaryKey: "athleteiq.modules.parentSummary.summary",
    maturity: "active",
    claimBoundary: "backed_by_user_input",
    allowedRoles: ["admin", "parent"],
    dataSources: [liveCheckInSource, liveHabitsSource],
    routes: ["/dashboard/parent"],
    reportVisibility: ["parent"],
    dependencies: ["readiness", "habits"],
    observabilityEvents: ["aiq.module.parent_summary.viewed", "aiq.module.parent_summary.redacted"]
  },
  {
    key: "team_overview",
    displayNameKey: "athleteiq.modules.teamOverview.name",
    summaryKey: "athleteiq.modules.teamOverview.summary",
    maturity: "active",
    claimBoundary: "backed_by_user_input",
    allowedRoles: ["admin", "trainer", "performance_coach", "analyst", "club_management"],
    dataSources: [liveCheckInSource, liveHabitsSource, liveCoachActionSource],
    routes: ["/dashboard", "/dashboard/coach", "/dashboard/reports"],
    reportVisibility: ["coach", "team", "academy"],
    dependencies: ["readiness", "coach_alerts"],
    observabilityEvents: ["aiq.module.team_overview.viewed", "aiq.module.team_overview.missing_data"]
  },
  {
    key: "recovery_lite",
    displayNameKey: "athleteiq.modules.recoveryLite.name",
    summaryKey: "athleteiq.modules.recoveryLite.summary",
    maturity: "lite_manual",
    claimBoundary: "backed_by_manual_entry",
    allowedRoles: ["admin", "trainer", "performance_coach", "physio", "athlete", "parent"],
    dataSources: [liveCheckInSource, manualEntrySource],
    routes: ["/athletes/[id]", "/dashboard/athletes/[id]"],
    reportVisibility: ["athlete", "coach", "parent"],
    dependencies: ["readiness"],
    observabilityEvents: ["aiq.module.recovery_lite.viewed", "aiq.module.recovery_lite.manual_data_required"]
  },
  {
    key: "fuel_lite",
    displayNameKey: "athleteiq.modules.fuelLite.name",
    summaryKey: "athleteiq.modules.fuelLite.summary",
    maturity: "lite_manual",
    claimBoundary: "backed_by_manual_entry",
    allowedRoles: ["admin", "trainer", "performance_coach", "athlete", "parent"],
    dataSources: [manualEntrySource],
    routes: ["/athletes/[id]", "/dashboard/athletes/[id]"],
    reportVisibility: ["athlete", "coach", "parent"],
    dependencies: ["habits"],
    observabilityEvents: ["aiq.module.fuel_lite.viewed", "aiq.module.fuel_lite.manual_data_required"]
  },
  {
    key: "learning_lite",
    displayNameKey: "athleteiq.modules.learningLite.name",
    summaryKey: "athleteiq.modules.learningLite.summary",
    maturity: "lite_manual",
    claimBoundary: "backed_by_manual_entry",
    allowedRoles: ["admin", "trainer", "performance_coach", "athlete", "parent"],
    dataSources: [manualEntrySource],
    routes: ["/athletes/[id]", "/dashboard/athletes/[id]"],
    reportVisibility: ["athlete", "coach", "parent"],
    dependencies: ["habits"],
    observabilityEvents: ["aiq.module.learning_lite.viewed", "aiq.module.learning_lite.manual_data_required"]
  },
  {
    key: "wearable_manual_sync",
    displayNameKey: "athleteiq.modules.wearableManualSync.name",
    summaryKey: "athleteiq.modules.wearableManualSync.summary",
    maturity: "lite_manual",
    claimBoundary: "backed_by_manual_entry",
    allowedRoles: ["admin", "trainer", "performance_coach", "physio", "athlete"],
    dataSources: [manualEntrySource, plannedWearableSource],
    routes: ["/dashboard/wearables"],
    reportVisibility: ["athlete", "coach", "team"],
    dependencies: ["recovery_lite"],
    observabilityEvents: ["aiq.module.wearable_manual_sync.viewed", "aiq.module.wearable_manual_sync.limited"]
  },
  {
    key: "cognitive_lite",
    displayNameKey: "athleteiq.modules.cognitiveLite.name",
    summaryKey: "athleteiq.modules.cognitiveLite.summary",
    maturity: "lite_manual",
    claimBoundary: "backed_by_manual_entry",
    allowedRoles: ["admin", "trainer", "performance_coach", "athlete"],
    dataSources: [manualEntrySource],
    routes: ["/athletes/[id]", "/dashboard/athletes/[id]/intelligence"],
    reportVisibility: ["athlete", "coach"],
    dependencies: ["mental_edge"],
    observabilityEvents: ["aiq.module.cognitive_lite.viewed", "aiq.module.cognitive_lite.manual_data_required"]
  },
  {
    key: "cogleague_future",
    displayNameKey: "athleteiq.modules.cogleagueFuture.name",
    summaryKey: "athleteiq.modules.cogleagueFuture.summary",
    maturity: "future",
    claimBoundary: "partner_future",
    allowedRoles: ["admin", "trainer", "performance_coach", "analyst", "club_management"],
    dataSources: [futurePartnerSource],
    routes: [],
    reportVisibility: ["roadmap"],
    dependencies: [],
    observabilityEvents: ["aiq.module.cogleague_future.roadmap_viewed"]
  },
  {
    key: "gameflow_future",
    displayNameKey: "athleteiq.modules.gameflowFuture.name",
    summaryKey: "athleteiq.modules.gameflowFuture.summary",
    maturity: "future",
    claimBoundary: "partner_future",
    allowedRoles: ["admin", "trainer", "performance_coach", "analyst", "club_management"],
    dataSources: [futurePartnerSource],
    routes: [],
    reportVisibility: ["roadmap"],
    dependencies: [],
    observabilityEvents: ["aiq.module.gameflow_future.roadmap_viewed"]
  },
  {
    key: "sports_lab_future",
    displayNameKey: "athleteiq.modules.sportsLabFuture.name",
    summaryKey: "athleteiq.modules.sportsLabFuture.summary",
    maturity: "future",
    claimBoundary: "roadmap_only",
    allowedRoles: ["admin", "trainer", "performance_coach", "physio", "analyst", "club_management"],
    dataSources: [futurePartnerSource],
    routes: [],
    reportVisibility: ["roadmap"],
    dependencies: [],
    observabilityEvents: ["aiq.module.sports_lab_future.roadmap_viewed"]
  }
];

export function isAthleteIqModuleKey(value: string) {
  return ATHLETEIQ_MODULE_REGISTRY.some((entry) => entry.key === value);
}

export function getAthleteIqModule(key: string) {
  return ATHLETEIQ_MODULE_REGISTRY.find((entry) => entry.key === key);
}

export function validateAthleteIqModuleRegistry(registry = ATHLETEIQ_MODULE_REGISTRY): AthleteIqRegistryValidation {
  const errors: string[] = [];
  const keys = new Set<string>();
  const unsupportedActiveSources: AthleteIqDataSourceAvailability[] = ["planned", "future"];

  for (const entry of registry) {
    if (keys.has(entry.key)) errors.push(`Duplicate module key: ${entry.key}`);
    keys.add(entry.key);

    if (entry.maturity === "active") {
      const unsupportedSource = entry.dataSources.find((source) => unsupportedActiveSources.includes(source.availability as AthleteIqDataSourceAvailability));
      if (unsupportedSource) errors.push(`Active module ${entry.key} depends on ${unsupportedSource.availability} source ${unsupportedSource.key}`);
    }

    for (const dependency of entry.dependencies) {
      const dependencyModule = registry.find((candidate) => candidate.key === dependency);
      if (!dependencyModule) errors.push(`Module ${entry.key} depends on unknown module ${dependency}`);
      if (entry.maturity === "active" && dependencyModule?.maturity === "future") {
        errors.push(`Active module ${entry.key} depends on future module ${dependency}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function toAthleteIqModuleView(definition: AthleteIqModuleDefinition): AthleteIqModuleView {
  const hasFutureSource = definition.dataSources.some((source) => source.availability === "future");
  const hasPlannedSource = definition.dataSources.some((source) => source.availability === "planned");
  const hasManualSource = definition.dataSources.some((source) => source.availability === "manual");

  return {
    ...definition,
    registryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION,
    capabilityKey: ATHLETEIQ_CAPABILITY_KEY,
    statusLabel:
      definition.maturity === "active" ? "usable" :
      definition.maturity === "lite_manual" ? "manual_limited" :
      definition.maturity === "planned" ? "planned_not_actionable" :
      "future_not_actionable",
    dataAvailabilityLabel:
      hasFutureSource ? "future_source_only" :
      hasPlannedSource ? "missing_planned_source" :
      hasManualSource ? "manual_data_required" :
      "live_data"
  };
}

export function resolveAthleteIqModulesForUser(user: AuthUser, options: { role?: string | null; includeFuture?: boolean } = {}): AthleteIqModuleResolution {
  const requestedRole = options.role ? normalizeAthleteIqRole(options.role) : user.primaryRole;
  if (!requestedRole) {
    return {
      registryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION,
      capabilityKey: ATHLETEIQ_CAPABILITY_KEY,
      role: null,
      deniedReason: "UNSUPPORTED_ROLE",
      modules: []
    };
  }

  if (!user.roles.includes(requestedRole) && user.primaryRole !== "admin") {
    return {
      registryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION,
      capabilityKey: ATHLETEIQ_CAPABILITY_KEY,
      role: requestedRole,
      deniedReason: "ROLE_NOT_ASSIGNED",
      modules: []
    };
  }

  const modules = ATHLETEIQ_MODULE_REGISTRY
    .filter((entry) => (entry.allowedRoles as AppRole[]).includes(requestedRole))
    .filter((entry) => options.includeFuture || entry.maturity !== "future")
    .map(toAthleteIqModuleView);

  return {
    registryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION,
    capabilityKey: ATHLETEIQ_CAPABILITY_KEY,
    role: requestedRole,
    modules
  };
}

function normalizeAthleteIqRole(role: string): AppRole | null {
  const normalized = role.trim().toLowerCase();
  if (normalized === "coach") return "trainer";
  if (normalized === "guardian") return "parent";
  if (
    normalized === "admin" ||
    normalized === "trainer" ||
    normalized === "athlete" ||
    normalized === "parent" ||
    normalized === "performance_coach" ||
    normalized === "physio" ||
    normalized === "analyst" ||
    normalized === "club_management"
  ) {
    return normalized;
  }
  return null;
}
