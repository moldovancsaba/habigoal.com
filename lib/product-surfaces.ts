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
  functionRegistry: ProductFunction[];
};

const habigoalFunctions = [
  {
    id: "hbg-check-in",
    name: "Simple daily status check-in",
    status: "phase-1",
    audience: ["client", "athlete"],
    summary: "Fast wellbeing, readiness, sport, and life status capture that can run without professional staff.",
    runtimeFlow: [
      "Open Habigoal surface",
      "Capture today status",
      "Validate completion and missing data",
      "Calculate readiness and support state",
      "Return simple next action"
    ],
    contracts: [
      "Inputs use the shared check-in schema",
      "Scores use the shared readiness model",
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
    status: "phase-1",
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
    status: "phase-1",
    audience: ["client", "athlete"],
    summary: "Plain-language feedback that turns status and habits into safe daily guidance.",
    runtimeFlow: [
      "Read status, habit, and readiness signals",
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
      "Track blocked guidance when source data is insufficient"
    ],
    failureMode: "If recommendations fail, show the latest known readiness state and ask for manual review."
  }
] satisfies ProductFunction[];

const athleteIqOnlyFunctions = [
  {
    id: "aiq-professional-dashboard",
    name: "Professional athlete, coach, and academy dashboard",
    status: "phase-1",
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
    status: "planned",
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
    id: "aiq-services-ecosystem",
    name: "Professional services, CogLeague, GameFlow, and partner ecosystem",
    status: "planned",
    audience: ["coach", "academy", "operator"],
    summary: "Expansion layer for assessments, competitions, match intelligence, education, licensing, CRM, and partner products.",
    runtimeFlow: [
      "Select service module",
      "Validate entitlement and data availability",
      "Run service-specific workflow",
      "Generate artifacts and reports",
      "Publish outcomes to stakeholder dashboards"
    ],
    contracts: [
      "Service modules must declare data requirements before execution",
      "Partner exports must be redacted by audience",
      "Commercial modules cannot mutate athlete source truth without approval"
    ],
    accessibility: [
      "Service workflows expose clear step progress",
      "Reports include accessible summaries",
      "Partner dashboards support reduced-motion and keyboard navigation"
    ],
    observability: [
      "Track module adoption, completion, export, and entitlement failures",
      "Track partner report publication and rollback events"
    ],
    failureMode: "If an expansion module is unavailable, isolate it from the core professional dashboard."
  }
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
    functionRegistry: [...habigoalFunctions, ...athleteIqOnlyFunctions]
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
