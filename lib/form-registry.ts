import registrySnapshot from "@/config/form-registry.json";

export type FormArtifactLifecycleState = "discovered" | "migrate" | "ready" | "blocked" | "retired";

export type FormArtifact = {
  id: string;
  domain: string;
  route: string;
  fields: string[];
  gdsComponentSet: string[];
  locales: string[];
  requiresAuth: string[];
  ownerTeam: string[];
  lifecycleState?: FormArtifactLifecycleState;
  blockers?: string[];
};

export type FormRegistrySnapshot = {
  schemaVersion: number;
  generatedAt: string;
  migrationHash: string;
  artifacts: FormArtifact[];
};

export type FormRegistrySummary = {
  formArtifactCount: number;
  migrationBlockerCount: number;
  inconsistentRouteCount: number;
  domains: string[];
  owners: string[];
};

export type FormRegistryResponse = {
  snapshot: FormRegistrySnapshot;
  summary: FormRegistrySummary;
  status: "ready" | "blocked";
};

const fallbackSnapshot = registrySnapshot as FormRegistrySnapshot;

export function getFormRegistrySnapshot(snapshot: FormRegistrySnapshot = fallbackSnapshot): FormRegistryResponse {
  const canonical = canonicalizeFormRegistry(snapshot);
  const summary = summarizeFormRegistry(canonical);

  return {
    snapshot: canonical,
    summary,
    status: summary.migrationBlockerCount > 0 || summary.inconsistentRouteCount > 0 ? "blocked" : "ready"
  };
}

export function canonicalizeFormRegistry(snapshot: FormRegistrySnapshot): FormRegistrySnapshot {
  const deduped = new Map<string, FormArtifact>();

  for (const artifact of snapshot.artifacts) {
    const normalized = normalizeArtifact(artifact);
    const existing = deduped.get(normalized.id);
    if (!existing || artifactRank(normalized) > artifactRank(existing)) {
      deduped.set(normalized.id, normalized);
    }
  }

  return {
    schemaVersion: snapshot.schemaVersion,
    generatedAt: snapshot.generatedAt,
    migrationHash: snapshot.migrationHash,
    artifacts: [...deduped.values()].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export function summarizeFormRegistry(snapshot: FormRegistrySnapshot): FormRegistrySummary {
  const routeCounts = new Map<string, number>();
  for (const artifact of snapshot.artifacts) {
    routeCounts.set(artifact.route, (routeCounts.get(artifact.route) ?? 0) + 1);
  }

  return {
    formArtifactCount: snapshot.artifacts.length,
    migrationBlockerCount: snapshot.artifacts.reduce((count, artifact) => count + (artifact.blockers?.length ?? 0), 0),
    inconsistentRouteCount: [...routeCounts.values()].filter((count) => count > 1).length,
    domains: uniqueSorted(snapshot.artifacts.map((artifact) => artifact.domain)),
    owners: uniqueSorted(snapshot.artifacts.flatMap((artifact) => artifact.ownerTeam))
  };
}

export async function withFormRegistryFallback(
  buildSnapshot: () => Promise<FormRegistrySnapshot>,
  lastKnownGood: FormRegistrySnapshot = fallbackSnapshot
): Promise<FormRegistryResponse & { recoveredFromFailure: boolean }> {
  try {
    return { ...getFormRegistrySnapshot(await buildSnapshot()), recoveredFromFailure: false };
  } catch {
    return { ...getFormRegistrySnapshot(lastKnownGood), status: "blocked", recoveredFromFailure: true };
  }
}

function normalizeArtifact(artifact: FormArtifact): FormArtifact {
  return {
    id: normalizeRequired(artifact.id),
    domain: normalizeRequired(artifact.domain),
    route: normalizeRoute(artifact.route),
    fields: uniqueSorted(artifact.fields.map(normalizeRequired)),
    gdsComponentSet: uniqueSorted(artifact.gdsComponentSet.map(normalizeRequired)),
    locales: uniqueSorted(artifact.locales.map(normalizeRequired)),
    requiresAuth: uniqueSorted(artifact.requiresAuth.map(normalizeRequired)),
    ownerTeam: uniqueSorted(artifact.ownerTeam.map(normalizeRequired)),
    lifecycleState: artifact.lifecycleState ?? "discovered",
    blockers: uniqueSorted((artifact.blockers ?? []).map(normalizeRequired))
  };
}

function artifactRank(artifact: FormArtifact): number {
  return (artifact.fields.length * 3) + artifact.gdsComponentSet.length + artifact.ownerTeam.length - (artifact.blockers?.length ?? 0);
}

function normalizeRoute(route: string): string {
  const normalized = normalizeRequired(route);
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeRequired(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}
