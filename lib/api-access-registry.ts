export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type ApiAccessClass =
  | "public"
  | "auth_required"
  | "habigoal_user"
  | "athlete_iq_athlete"
  | "athlete_iq_trainer"
  | "admin"
  | "webhook_signed"
  | "cron_secret"
  | "internal";

export type ApiRouteProductSurface = "habigoal" | "athlete_iq" | "shared";
export type ApiPersonaScope = "self" | "assigned_athletes" | "team" | "org" | "none";

export type ApiRouteContract = {
  accessClass: ApiAccessClass;
  denialCodes: readonly string[];
  guard:
    | "none"
    | "requireAuthUser"
    | "requireHabigoalApiUser"
    | "requireAthleteIqApiUser"
    | "requireAthleteIqTrainerApiUser"
    | "requireAdminApiUser"
    | "signedWebhook"
    | "cronSecret"
    | "serverOnly";
  methods: readonly HttpMethod[];
  observability: readonly string[];
  pattern: string;
  personaScope: ApiPersonaScope;
  productSurface: ApiRouteProductSurface;
  publicJustification?: string;
  rollback: string;
  timeoutMs: number;
};

export const allHttpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const satisfies readonly HttpMethod[];
const readOnly = ["GET"] as const satisfies readonly HttpMethod[];
const formWrite = ["POST"] as const satisfies readonly HttpMethod[];
const readWrite = ["GET", "POST", "PATCH", "DELETE"] as const satisfies readonly HttpMethod[];

export const apiAccessRegistry = [
  publicContract("/api/health", readOnly, "Health endpoint exposes service liveness only."),
  publicContract("/api/openapi", readOnly, "OpenAPI document is a public contract artifact."),
  publicContract("/api/capabilities", readOnly, "Capability metadata is client-readable feature availability."),
  publicContract("/api/product-surfaces/**", readOnly, "Product surface metadata is the public route/function/navigation contract."),
  publicContract("/api/ai/models", readOnly, "Model registry response contains public model availability metadata only."),
  publicContract("/api/auth/login", ["GET", "POST"], "Login start and local login entrypoint must be reachable before a session exists."),
  publicContract("/api/auth/logout", ["GET", "POST"], "Logout must be callable to clear a session."),
  publicContract("/api/oauth/callback", readOnly, "SSO callback is externally invoked and validates signed cookie state before creating a session."),
  publicContract("/api/oauth/wearable/callback", readOnly, "Wearable OAuth callback validates signed URL and cookie states before token exchange."),
  publicContract("/api/forms/validate", formWrite, "Read-only form contract validation endpoint; performs no protected data read or write."),
  contract({
    accessClass: "webhook_signed",
    denialCodes: ["SIGNATURE_REQUIRED", "SIGNATURE_INVALID", "VALIDATION_ERROR"],
    guard: "signedWebhook",
    methods: ["POST"],
    observability: ["webhook.received", "webhook.denied", "webhook.accepted"],
    pattern: "/api/performance/vald/webhook",
    personaScope: "none",
    productSurface: "athlete_iq",
    rollback: "Disable the provider secret or route consumer; never accept unsigned payloads.",
    timeoutMs: 10_000
  }),
  contract({
    accessClass: "cron_secret",
    denialCodes: ["CRON_SECRET_REQUIRED", "UNAUTHORIZED"],
    guard: "cronSecret",
    methods: readOnly,
    observability: ["cron.queue.started", "cron.queue.denied", "cron.queue.completed"],
    pattern: "/api/cron/**",
    personaScope: "none",
    productSurface: "shared",
    rollback: "Disable the scheduler or rotate CRON_SECRET; do not make cron endpoints public.",
    timeoutMs: 30_000
  }),
  contract({
    accessClass: "internal",
    denialCodes: ["AUTH_REQUIRED", "FORBIDDEN"],
    guard: "serverOnly",
    methods: formWrite,
    observability: ["internal.operation.started", "internal.operation.denied", "internal.operation.completed"],
    pattern: "/api/content-intelligence/**",
    personaScope: "org",
    productSurface: "shared",
    rollback: "Disable the internal worker action and leave public surfaces read-only.",
    timeoutMs: 30_000
  }),
  contract({
    accessClass: "admin",
    denialCodes: ["AUTH_REQUIRED", "FORBIDDEN"],
    guard: "requireAdminApiUser",
    methods: allHttpMethods,
    observability: ["admin.request.allowed", "admin.request.denied"],
    pattern: "/api/admin/**",
    personaScope: "org",
    productSurface: "shared",
    rollback: "Revert the affected admin endpoint while keeping admin-only guards enforced.",
    timeoutMs: 15_000
  }),
  contract({
    accessClass: "admin",
    denialCodes: ["AUTH_REQUIRED", "FORBIDDEN"],
    guard: "requireAdminApiUser",
    methods: readWrite,
    observability: ["admin.users.allowed", "admin.users.denied"],
    pattern: "/api/users",
    personaScope: "org",
    productSurface: "shared",
    rollback: "Disable user mutations before weakening admin authorization.",
    timeoutMs: 10_000
  }),
  contract({
    accessClass: "admin",
    denialCodes: ["AUTH_REQUIRED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireAdminApiUser",
    methods: allHttpMethods,
    observability: ["ops.request.allowed", "ops.request.denied"],
    pattern: "/api/ops/**",
    personaScope: "org",
    productSurface: "shared",
    rollback: "Disable the operational endpoint and keep admin authorization in place.",
    timeoutMs: 30_000
  }),
  contract({
    accessClass: "habigoal_user",
    denialCodes: ["AUTH_REQUIRED", "PRODUCT_ACCESS_DENIED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireHabigoalApiUser",
    methods: readWrite,
    observability: ["habigoal.api.allowed", "habigoal.api.denied", "habigoal.daily.write"],
    pattern: "/api/habigoal/**",
    personaScope: "self",
    productSurface: "habigoal",
    rollback: "Revert the Habigoal endpoint only after preserving Habigoal entitlement and self-scope checks.",
    timeoutMs: 10_000
  }),
  contract({
    accessClass: "athlete_iq_trainer",
    denialCodes: ["AUTH_REQUIRED", "PRODUCT_ACCESS_DENIED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireAthleteIqTrainerApiUser",
    methods: allHttpMethods,
    observability: ["aiq.trainer.api.allowed", "aiq.trainer.api.denied", "aiq.trainer.scope_miss"],
    pattern: "/api/athleteiq/coach/**",
    personaScope: "assigned_athletes",
    productSurface: "athlete_iq",
    rollback: "Disable the trainer endpoint family; do not allow Habigoal entitlement to authorize it.",
    timeoutMs: 15_000
  }),
  contract({
    accessClass: "athlete_iq_trainer",
    denialCodes: ["AUTH_REQUIRED", "PRODUCT_ACCESS_DENIED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireAthleteIqTrainerApiUser",
    methods: allHttpMethods,
    observability: ["aiq.team.api.allowed", "aiq.team.api.denied"],
    pattern: "/api/athleteiq/team/**",
    personaScope: "team",
    productSurface: "athlete_iq",
    rollback: "Disable the team projection endpoint while keeping team scope checks.",
    timeoutMs: 15_000
  }),
  contract({
    accessClass: "athlete_iq_trainer",
    denialCodes: ["AUTH_REQUIRED", "PRODUCT_ACCESS_DENIED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireAthleteIqTrainerApiUser",
    methods: readWrite,
    observability: ["aiq.trainer.legacy.allowed", "aiq.trainer.legacy.denied"],
    pattern: "/api/aiq/trainer/**",
    personaScope: "assigned_athletes",
    productSurface: "athlete_iq",
    rollback: "Move the legacy trainer adapter back behind the Athlete IQ shell; never expose it through Habigoal.",
    timeoutMs: 15_000
  }),
  contract({
    accessClass: "athlete_iq_athlete",
    denialCodes: ["AUTH_REQUIRED", "PRODUCT_ACCESS_DENIED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireAthleteIqApiUser",
    methods: allHttpMethods,
    observability: ["aiq.api.allowed", "aiq.api.denied", "aiq.api.scope_miss"],
    pattern: "/api/athleteiq/**",
    personaScope: "assigned_athletes",
    productSurface: "athlete_iq",
    rollback: "Rollback by endpoint family while preserving Athlete IQ entitlement and athlete scope checks.",
    timeoutMs: 15_000
  }),
  contract({
    accessClass: "athlete_iq_athlete",
    denialCodes: ["AUTH_REQUIRED", "PRODUCT_ACCESS_DENIED", "FORBIDDEN"],
    guard: "requireAthleteIqApiUser",
    methods: readOnly,
    observability: ["aiq.athlete.api.allowed", "aiq.athlete.api.denied"],
    pattern: "/api/aiq/athlete/**",
    personaScope: "self",
    productSurface: "athlete_iq",
    rollback: "Disable the Athlete IQ athlete adapter; never serve it from Habigoal.",
    timeoutMs: 10_000
  }),
  contract({
    accessClass: "athlete_iq_trainer",
    denialCodes: ["AUTH_REQUIRED", "PRODUCT_ACCESS_DENIED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireAthleteIqTrainerApiUser",
    methods: allHttpMethods,
    observability: ["aiq.legacy.api.allowed", "aiq.legacy.api.denied", "aiq.legacy.scope_miss"],
    pattern: "/api/athletes/**",
    personaScope: "assigned_athletes",
    productSurface: "athlete_iq",
    rollback: "Disable the legacy professional athlete endpoint family before weakening product guards.",
    timeoutMs: 15_000
  }),
  contract({
    accessClass: "athlete_iq_trainer",
    denialCodes: ["AUTH_REQUIRED", "PRODUCT_ACCESS_DENIED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireAthleteIqTrainerApiUser",
    methods: allHttpMethods,
    observability: ["aiq.legacy.api.allowed", "aiq.legacy.api.denied"],
    pattern: "/api/children/**",
    personaScope: "assigned_athletes",
    productSurface: "athlete_iq",
    rollback: "Disable the legacy children endpoint family while preserving Athlete IQ scope checks.",
    timeoutMs: 15_000
  }),
  contract({
    accessClass: "athlete_iq_trainer",
    denialCodes: ["AUTH_REQUIRED", "PRODUCT_ACCESS_DENIED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireAthleteIqTrainerApiUser",
    methods: allHttpMethods,
    observability: ["aiq.professional.api.allowed", "aiq.professional.api.denied"],
    pattern: "/api/{assessments,reports,teams,session-plans,training-sessions,coach-actions,check-ins,invitations,concerns,microcycles,media}/**",
    personaScope: "assigned_athletes",
    productSurface: "athlete_iq",
    rollback: "Disable the affected professional route family; do not serve professional data through Habigoal.",
    timeoutMs: 15_000
  }),
  contract({
    accessClass: "auth_required",
    denialCodes: ["AUTH_REQUIRED", "PRODUCT_ACCESS_DENIED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireAuthUser",
    methods: readWrite,
    observability: ["shared.api.allowed", "shared.api.denied"],
    pattern: "/api/daily-state",
    personaScope: "self",
    productSurface: "shared",
    rollback: "Disable shared daily-state writes while retaining product-specific projections.",
    timeoutMs: 10_000
  }),
  contract({
    accessClass: "auth_required",
    denialCodes: ["AUTH_REQUIRED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireAuthUser",
    methods: allHttpMethods,
    observability: ["shared.authenticated.allowed", "shared.authenticated.denied"],
    pattern: "/api/{auth/me,onboarding,audit,reminders,settings,uploads}/**",
    personaScope: "self",
    productSurface: "shared",
    rollback: "Disable the affected authenticated utility endpoint instead of removing auth.",
    timeoutMs: 10_000
  }),
  contract({
    accessClass: "auth_required",
    denialCodes: ["AUTH_REQUIRED", "FORBIDDEN", "VALIDATION_ERROR"],
    guard: "requireAuthUser",
    methods: allHttpMethods,
    observability: ["shared.authenticated.allowed", "shared.authenticated.denied"],
    pattern: "/api/{auth/me,reminders,settings,uploads/imgbb,session-blueprints}",
    personaScope: "self",
    productSurface: "shared",
    rollback: "Disable the affected authenticated utility endpoint instead of removing auth.",
    timeoutMs: 10_000
  }),
  contract({
    accessClass: "webhook_signed",
    denialCodes: ["API_KEY_REQUIRED", "UNAUTHORIZED", "VALIDATION_ERROR"],
    guard: "signedWebhook",
    methods: readOnly,
    observability: ["partner.metrics.allowed", "partner.metrics.denied"],
    pattern: "/api/v1/metrics",
    personaScope: "assigned_athletes",
    productSurface: "athlete_iq",
    rollback: "Rotate or disable the partner API key; never make metric data public.",
    timeoutMs: 10_000
  })
] as const satisfies readonly ApiRouteContract[];

export function resolveApiRouteContract(routePattern: string): ApiRouteContract | null {
  return apiAccessRegistry.find((entry) => matchesContractPattern(entry.pattern, routePattern)) ?? null;
}

export function methodAllowedByContract(contract: ApiRouteContract, method: HttpMethod) {
  return contract.methods.includes(method);
}

function publicContract(pattern: string, methods: readonly HttpMethod[], publicJustification: string): ApiRouteContract {
  return contract({
    accessClass: "public",
    denialCodes: ["VALIDATION_ERROR", "STATE_INVALID"],
    guard: "none",
    methods,
    observability: ["public.api.requested"],
    pattern,
    personaScope: "none",
    productSurface: "shared",
    publicJustification,
    rollback: "Remove the public route from navigation or disable the provider callback; do not expose protected data.",
    timeoutMs: 10_000
  });
}

function contract(input: ApiRouteContract): ApiRouteContract {
  return input;
}

function matchesContractPattern(contractPattern: string, routePattern: string) {
  const alternatives = expandBracePattern(contractPattern);
  return alternatives.some((pattern) => {
    if (pattern.endsWith("/**")) {
      const prefix = pattern.slice(0, -3);
      return routePattern === prefix || routePattern.startsWith(`${prefix}/`);
    }
    return routePattern === pattern;
  });
}

function expandBracePattern(pattern: string) {
  const match = pattern.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (!match) return [pattern];
  const [, before, alternatives, after] = match;
  return alternatives.split(",").map((alternative) => `${before}${alternative}${after}`);
}
