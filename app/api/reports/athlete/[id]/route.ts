import { NextResponse } from "next/server";
import { ReportingService } from "../../../../../services/reporting.service";
import { AthleteTwin } from "../../../../../types/athlete-twin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate role/permissions here in a real implementation
    console.log(`Fetching report for athlete ${id}`);
    
    const reportingService = new ReportingService();
    // Mock twin
    const mockTwin = { athleteId: id, recovery: { recoveryReadinessScore: 85, sleepQualityScore7d: 90 }, performance: { sprint10mMs: 1400 } } as unknown as AthleteTwin;
    
    const report = await reportingService.generateAthleteReport(id, mockTwin);

    return NextResponse.json({ success: true, report });
  } catch {
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
