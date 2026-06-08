import { NextResponse } from "next/server";
import { CanonicalMetric } from "../../../../../../types/canonical-metric";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { source, payload } = body;
    if (!['apple_health', 'google_health'].includes(source)) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    console.log(`Received health sync from ${source} for athlete ${id}`);
    
    // Mock normalisation
    const metrics: CanonicalMetric[] = [];
    const date = new Date().toISOString().split('T')[0];

    metrics.push({
      metricId: `${id}:${date}:${source}:steps`,
      athleteId: id,
      date,
      source: source as 'apple_health' | 'google_health',
      sourceMetric: "steps",
      canonicalKey: "total_distance_meters", // placeholder
      value: payload.steps ?? 0,
      unit: "count",
      confidence: "high",
      periodStart: `${date}T00:00:00Z`,
      periodEnd: `${date}T23:59:59Z`,
      normalisedAt: new Date().toISOString(),
      normalisationVersion: "1.0.0",
      processingState: "normalised",
      organisationId: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, metricsCount: metrics.length });
  } catch {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
