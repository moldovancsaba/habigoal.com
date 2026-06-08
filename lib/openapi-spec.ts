const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Habigoal API",
    version: "2.0.0",
    description: "Athlete IQ platform API — athletes, check-ins, digital twin, training, vision, reports.",
  },
  servers: [{ url: "/api" }],
  paths: {
    "/health": { get: { summary: "Health check", tags: ["System"] } },
    "/athletes": { get: { summary: "List athletes", tags: ["Athletes"] }, post: { summary: "Create athlete", tags: ["Athletes"] } },
    "/athletes/{id}": { get: { summary: "Get athlete", tags: ["Athletes"] }, patch: { summary: "Update athlete", tags: ["Athletes"] } },
    "/athletes/{id}/twin": { get: { summary: "Digital twin", tags: ["Twin"] } },
    "/athletes/{id}/export": { get: { summary: "GDPR export", tags: ["Privacy"] } },
    "/athletes/{id}/erase": { post: { summary: "GDPR erase", tags: ["Privacy"] } },
    "/athletes/{id}/media": { get: { summary: "List media assets", tags: ["Vision"] } },
    "/athletes/{id}/media/upload": { post: { summary: "Upload media", tags: ["Vision"] } },
    "/check-ins": { get: { summary: "List check-ins", tags: ["Check-in"] }, post: { summary: "Create check-in", tags: ["Check-in"] } },
    "/check-ins/sync": { post: { summary: "Offline sync batch", tags: ["Check-in"] } },
    "/settings/check-in-config": { get: { summary: "Get check-in config", tags: ["Settings"] }, post: { summary: "Update check-in config", tags: ["Settings"] } },
    "/training-sessions": { get: { summary: "List training sessions", tags: ["Training"] }, post: { summary: "Create session", tags: ["Training"] } },
    "/microcycles": { get: { summary: "List microcycles", tags: ["Training"] }, post: { summary: "Create microcycle", tags: ["Training"] } },
    "/concerns": { get: { summary: "Daily concern flags", tags: ["Coach"] } },
    "/coach-actions": { get: { summary: "Coach actions", tags: ["Coach"] }, post: { summary: "Update coach action", tags: ["Coach"] } },
    "/reports/athlete/{id}": { get: { summary: "Athlete report", tags: ["Reports"] } },
    "/reports/team": { get: { summary: "Team report", tags: ["Reports"] }, post: { summary: "Team report for IDs", tags: ["Reports"] } },
    "/audit/events": { get: { summary: "Audit log", tags: ["Security"] } },
    "/ai/models": { get: { summary: "AI model registry", tags: ["AI"] } },
    "/openapi": { get: { summary: "This specification", tags: ["System"] } },
  },
  components: {
    securitySchemes: {
      sessionCookie: { type: "apiKey", in: "cookie", name: "habigoal_session" },
    },
  },
  security: [{ sessionCookie: [] }],
};

export function getOpenApiSpec() {
  return OPENAPI_SPEC;
}
