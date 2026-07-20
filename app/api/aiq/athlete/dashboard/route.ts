import { NextResponse } from "next/server";
import { canOpenProductSurface, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { getAthleteIqProductDashboardProjection } from "@/services/athleteiq-product-dashboard.service";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });
  if (!canOpenProductSurface(user, "athlete-iq")) return athleteIqJsonError("PRODUCT_ACCESS_DENIED", 403, correlationId);
  if (user.primaryRole !== "athlete") return athleteIqJsonError("FORBIDDEN", 403, correlationId);

  try {
    const { searchParams } = new URL(request.url);
    const projection = await getAthleteIqProductDashboardProjection({
      localDate: searchParams.get("date")?.trim() || undefined,
      timezone: searchParams.get("timezone")?.trim() || undefined,
      user
    });
    console.info(JSON.stringify({
      event: "aiq.athlete.dashboard.loaded",
      athleteCount: projection.athleteCount,
      correlationId,
      latencyMs: Date.now() - startedAt
    }));
    return NextResponse.json({ projection, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { details: (error as Error).message, retryable: true });
  }
}
