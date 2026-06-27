import type { GdsThemePresetId } from "@doneisbetter/gds";
import { ATHLETE_IQ_OS_FUNCTIONS, ATHLETE_IQ_OS_NAVIGATION } from "@/lib/athlete-iq-os";
import { ATHLETE_IQ_GDS_THEME_PRESET } from "@/lib/product-surface-branding";

export type ProductSurfaceId = "habigoal" | "athlete-iq";

export type ProductSurfaceAudience = "client" | "athlete" | "coach" | "academy" | "operator";

export type ProductFunctionStatus = "active" | "phase-1" | "planned";

export type ProductFunction = {
  id: string;
  name: string;
  status: ProductFunctionStatus;
  audience: ProductSurfaceAudience[];
  summary: string;
  runtimeFlow: string[];
  contracts: string[];
  accessibility: string[];
  observability: string[];
  failureMode: string;
};

export type ProductNavigationItem = {
  id: string;
  label: string;
  path: string;
  description: string;
  audience: ProductSurfaceAudience[];
  sharedFunctionId?: string;
};

export type ProductTheme = {
  name: string;
  mode: "supportive-light" | "professional-dark";
  gdsPresetId?: GdsThemePresetId;
  accent: string;
  secondaryAccent: string;
  surfaceTone: string;
  typographyTone: string;
};

export type SharedDataContract = {
  id: string;
  name: string;
  owner: "shared-foundation";
  description: string;
  usedBy: ProductSurfaceId[];
  syncBehavior: string;
};

export type ProductLiveSignal = {
  id: string;
  label: string;
  value: string;
  state: "good" | "watch" | "risk" | "neutral";
  source: string;
};

export type ProductSurface = {
  id: ProductSurfaceId;
  name: string;
  shortName: string;
  headline: string;
  summary: string;
  promise: string;
  primaryPath: string;
  includedSurfaceIds: ProductSurfaceId[];
  audiences: ProductSurfaceAudience[];
  operatingMode: string;
  theme: ProductTheme;
  navigation: ProductNavigationItem[];
  sharedDataContracts: SharedDataContract[];
  liveSignals: ProductLiveSignal[];
  functionRegistry: ProductFunction[];
};

const sharedDataContracts = [
  {
    id: "daily-status",
    name: "Daily status ledger",
    owner: "shared-foundation",
    description: "Wellbeing, readiness, pain, recovery, habits, and context answers stored once and projected differently per product.",
    usedBy: ["habigoal", "athlete-iq"],
    syncBehavior: "Habigoal writes simple check-ins; AthleteIQ reads the same ledger for professional dashboards and reports."
  },
  {
    id: "function-registry",
    name: "Product-aware function registry",
    owner: "shared-foundation",
    description: "One feature directory filtered by product surface, role, entitlement, and module maturity.",
    usedBy: ["habigoal", "athlete-iq"],
    syncBehavior: "Habigoal receives only client-safe functions; AthleteIQ includes Habigoal plus pro modules."
  },
  {
    id: "guidance-events",
    name: "Guidance and audit events",
    owner: "shared-foundation",
    description: "Recommendations, coach actions, escalations, and dismissals are logged with product surface and source confidence.",
    usedBy: ["habigoal", "athlete-iq"],
    syncBehavior: "Client guidance and professional interventions remain auditable without duplicating data."
  }
] satisfies SharedDataContract[];

const habigoalFunctions = [
  {
    id: "hbg-check-in",
    name: "Simple daily status check-in",
    status: "active",
    audience: ["client", "athlete"],
    summary: "Fast wellbeing, sport, and life status capture that can run without professional staff.",
    runtimeFlow: [
      "Start daily support surface",
      "Capture today status",
      "Validate completion and missing data",
      "Calculate daily status and support state",
      "Return simple next action"
    ],
    contracts: [
      "Inputs use the shared check-in schema",
      "Scores use the shared daily status rules",
      "Missing data must be represented explicitly instead of inferred as healthy"
    ],
    accessibility: [
      "All controls must be keyboard reachable",
      "Score states must include text labels, not color alone",
      "Mobile targets must remain at least 44px high"
    ],
    observability: [
      "Track check-in start, submit, validation failure, and completion",
      "Log missing-data reasons without sensitive free-text content"
    ],
    failureMode: "If scoring cannot complete, keep the submitted answers and show a recoverable pending state."
  },
  {
    id: "hbg-habits",
    name: "Habit tracker and accountability loop",
    status: "active",
    audience: ["client", "athlete"],
    summary: "Daily habit list for movement, recovery, learning, nutrition, hydration, sleep, and personal goals.",
    runtimeFlow: [
      "Load active habit plan",
      "Render daily checklist",
      "Persist completed items",
      "Update streak and weighted habit score",
      "Surface one priority gap"
    ],
    contracts: [
      "Habit keys must be versioned",
      "Unknown habit keys are ignored by scoring",
      "Streaks are derived from dated records, never from client-only state"
    ],
    accessibility: [
      "Checkboxes use native checked state",
      "Streak and score changes are announced as text",
      "Habit groups have visible headings"
    ],
    observability: [
      "Track habit completion rate by category",
      "Track scoring version with every computed summary"
    ],
    failureMode: "If habit persistence fails, keep the local selection visible and allow retry."
  },
  {
    id: "hbg-support-feedback",
    name: "Automatic life and sport support feedback",
    status: "active",
    audience: ["client", "athlete"],
    summary: "Plain-language feedback that turns status and habits into safe daily guidance.",
    runtimeFlow: [
      "Read status, habit, and daily check-in signals",
      "Apply support rules",
      "Rank one to three next actions",
      "Explain why the action was selected",
      "Offer escalation only when rules require it"
    ],
    contracts: [
      "Feedback must identify source inputs",
      "Medical claims are prohibited",
      "Escalation language must remain conservative"
    ],
    accessibility: [
      "Guidance is rendered as readable text before visual badges",
      "Urgent states use role-aware alert regions",
      "Action cards preserve logical heading order"
    ],
    observability: [
      "Track recommendation key, source confidence, and user dismissal",
      "Track blocked guidance when saved data is insufficient"
    ],
    failureMode: "If recommendations fail, show the latest known daily status and ask for manual review."
  },
  {
    id: "hbg-progress",
    name: "Client progress and streak reflection",
    status: "phase-1",
    audience: ["client", "athlete"],
    summary: "A simple progress view that shows consistency, wellbeing direction, and completed support actions.",
    runtimeFlow: [
      "Read the daily status ledger",
      "Compare the last seven days with the current day",
      "Summarize progress in client-safe copy",
      "Highlight one habit or support action to keep"
    ],
    contracts: [
      "Trend text must cite the source window",
      "Progress summaries cannot expose coach-only notes",
      "Low-confidence trends must render as neutral"
    ],
    accessibility: [
      "Progress is available as text before visual meters",
      "Streaks and deltas include explicit labels",
      "Reduced-motion users receive static summaries"
    ],
    observability: [
      "Track progress panel view and selected summary",
      "Track incomplete trend windows without exposing raw sensitive notes"
    ],
    failureMode: "If historical data is unavailable, show today's support state and a first-week onboarding message."
  }
] satisfies ProductFunction[];

const athleteIqOnlyFunctions = [
  {
    id: "aiq-professional-dashboard",
    name: "Professional athlete, coach, and academy dashboard",
    status: "active",
    audience: ["athlete", "coach", "academy", "operator"],
    summary: "Role-based operating surface for professional monitoring, planning, reporting, and interventions.",
    runtimeFlow: [
      "Resolve role and permissions",
      "Load athlete or team scope",
      "Aggregate readiness, habit, training, testing, and coach action data",
      "Prioritize risks and opportunities",
      "Route to planning, reporting, or athlete profile workflows"
    ],
    contracts: [
      "Role scopes are enforced server-side",
      "Professional views consume Habigoal data through shared contracts",
      "Coach actions are auditable and tied to source recommendations"
    ],
    accessibility: [
      "Dashboard summaries are available as text before dense visual layouts",
      "Tables support keyboard focus and sortable labels",
      "Critical states cannot depend on color alone"
    ],
    observability: [
      "Track page load health, data-source availability, and empty-state causes",
      "Track coach action acknowledgement and applied state"
    ],
    failureMode: "If professional aggregates fail, keep role shell available and degrade each module independently."
  },
  {
    id: "aiq-performance-intelligence",
    name: "Performance intelligence and Digital Athlete Twin",
    status: "phase-1",
    audience: ["athlete", "coach", "academy"],
    summary: "Advanced scoring, profile evolution, benchmarks, forecast, and explainable development priorities.",
    runtimeFlow: [
      "Normalize status, training, testing, and coach feedback",
      "Update athlete twin dimensions",
      "Calculate maturity and confidence",
      "Produce priority development plan",
      "Generate coach and athlete-safe summaries"
    ],
    contracts: [
      "Every score includes confidence and source metadata",
      "Forecasting must expose claim boundaries",
      "Manual override must be auditable"
    ],
    accessibility: [
      "Radar and chart data must have table alternatives",
      "Changes over time must include plain language summaries",
      "Report exports must preserve semantic headings"
    ],
    observability: [
      "Track pipeline version, source freshness, and confidence distribution",
      "Track report generation success, failure, and retry"
    ],
    failureMode: "If advanced intelligence is unavailable, preserve Habigoal status and show professional review required."
  },
  {
    id: "aiq-service-command",
    name: "Service package and report command center",
    status: "phase-1",
    audience: ["coach", "academy", "operator"],
    summary: "Operational workspace for service packages, reports, lab tasks, partner modules, and stakeholder delivery.",
    runtimeFlow: [
      "Select service package",
      "Validate entitlement and required data",
      "Run the service checklist",
      "Generate report-ready artifacts",
      "Publish to the correct stakeholder surface"
    ],
    contracts: [
      "Service modules declare data requirements before launch",
      "Report payloads are versioned and redacted by audience",
      "Commercial modules cannot mutate athlete source truth without approval"
    ],
    accessibility: [
      "Service workflows expose clear step progress",
      "Reports include accessible summaries",
      "Partner dashboards support reduced-motion and keyboard navigation"
    ],
    observability: [
      "Track service package launch, completion, export, and entitlement failures",
      "Track partner report publication and rollback events"
    ],
    failureMode: "If a service module is unavailable, isolate it from the core professional dashboard."
  },
  {
    id: "aiq-ecosystem",
    name: "CogLeague, GameFlow, partners, and academy ecosystem",
    status: "planned",
    audience: ["coach", "academy", "operator"],
    summary: "Expansion layer for cognitive products, match intelligence, education, licensing, CRM, and partner operations.",
    runtimeFlow: [
      "Resolve enabled ecosystem module",
      "Check organization and partner scope",
      "Load the product-specific workflow",
      "Publish outputs back to the professional OS",
      "Keep Habigoal client experience untouched"
    ],
    contracts: [
      "Ecosystem modules cannot bypass product-surface permissions",
      "Partner exports must identify source, version, and redaction policy",
      "Future modules must register in the same product-aware function directory"
    ],
    accessibility: [
      "Every module must declare keyboard and screen-reader states",
      "Dashboard data must include accessible table alternatives",
      "Client-safe and professional-only language must be separated"
    ],
    observability: [
      "Track module availability and blocked entitlement attempts",
      "Track export scope, report target, and rollback state"
    ],
    failureMode: "If an ecosystem module is inactive, it remains visible only as roadmap context and cannot affect live guidance."
  }
] satisfies ProductFunction[];

const athleteIqFunctions = [
  ...athleteIqOnlyFunctions,
  ...ATHLETE_IQ_OS_FUNCTIONS
] satisfies ProductFunction[];

export const productSurfaces = [
  {
    id: "habigoal",
    name: "Habigoal",
    shortName: "Habigoal",
    headline: "Simple habit tracking and wellbeing support",
    summary:
      "A client-facing daily system for living better, training smarter, and receiving clear feedback about current status.",
    promise:
      "Habigoal keeps the daily loop simple: check in, complete habits, understand status, and get one safe next action.",
    primaryPath: "/habigoal",
    includedSurfaceIds: [],
    audiences: ["client", "athlete"],
    operatingMode: "Consumer wellbeing and habit support",
    theme: {
      name: "Habigoal daily",
      mode: "supportive-light",
      accent: "Mint",
      secondaryAccent: "Sky",
      surfaceTone: "Bright, calm, mobile-first support",
      typographyTone: "Plain language and low-pressure status"
    },
    navigation: [
      {
        id: "today",
        label: "Today",
        path: "/habigoal",
        description: "Daily check-in, habits, and simple status.",
        audience: ["client", "athlete"],
        sharedFunctionId: "hbg-check-in"
      },
      {
        id: "habits",
        label: "Habits",
        path: "/athletes",
        description: "Client-safe habit loop using shared scoring.",
        audience: ["client", "athlete"],
        sharedFunctionId: "hbg-habits"
      },
      {
        id: "support",
        label: "Support",
        path: "/habigoal",
        description: "Automatic life and sport feedback.",
        audience: ["client", "athlete"],
        sharedFunctionId: "hbg-support-feedback"
      }
    ],
    sharedDataContracts,
    liveSignals: [
      { id: "readiness", label: "Today status", value: "Ready with one watch item", state: "watch", source: "daily-status" },
      { id: "habits", label: "Habit completion", value: "4 / 6", state: "neutral", source: "daily-status" },
      { id: "next-action", label: "Next action", value: "Hydrate and keep training easy", state: "good", source: "guidance-events" }
    ],
    functionRegistry: habigoalFunctions
  },
  {
    id: "athlete-iq",
    name: "Athlete IQ",
    shortName: "AIQ",
    headline: "Professional performance operating system",
    summary:
      "The professional layer for athletes, coaches, academies, dashboards, reports, services, CogLeague, GameFlow, and advanced intelligence.",
    promise:
      "Athlete IQ includes Habigoal as its daily signal layer, then adds professional workflows, role-based dashboards, and service modules.",
    primaryPath: "/athlete-iq",
    includedSurfaceIds: ["habigoal"],
    audiences: ["athlete", "coach", "academy", "operator"],
    operatingMode: "Professional athlete, coach, academy, and service operations",
    theme: {
      name: "Athlete Gold",
      mode: "professional-dark",
      gdsPresetId: ATHLETE_IQ_GDS_THEME_PRESET,
      accent: "Gold",
      secondaryAccent: "Black performance shell",
      surfaceTone: "Premium black-and-gold performance control",
      typographyTone: "Performance language with explicit decision rationale"
    },
    navigation: ATHLETE_IQ_OS_NAVIGATION,
    sharedDataContracts,
    liveSignals: [
      { id: "queue", label: "Priority queue", value: "3 athletes", state: "watch", source: "daily-status" },
      { id: "reports", label: "Reports due", value: "2 packages", state: "neutral", source: "guidance-events" },
      { id: "scope", label: "Shared Habigoal signals", value: "Included", state: "good", source: "function-registry" }
    ],
    functionRegistry: [...habigoalFunctions, ...athleteIqFunctions]
  }
] satisfies ProductSurface[];

export function getProductSurface(id: ProductSurfaceId) {
  return productSurfaces.find((surface) => surface.id === id);
}

export function getProductSurfaceOrThrow(id: ProductSurfaceId) {
  const surface = getProductSurface(id);

  if (!surface) {
    throw new Error(`Unknown product surface: ${id}`);
  }

  return surface;
}

export function getSurfaceFunctionIds(id: ProductSurfaceId) {
  return getProductSurfaceOrThrow(id).functionRegistry.map((item) => item.id);
}

export function getSurfaceNavigation(id: ProductSurfaceId) {
  return getProductSurfaceOrThrow(id).navigation;
}

export function getSurfaceFunctions(id: ProductSurfaceId) {
  return getProductSurfaceOrThrow(id).functionRegistry;
}

export function isProductSurfaceId(value: string): value is ProductSurfaceId {
  return value === "habigoal" || value === "athlete-iq";
}
