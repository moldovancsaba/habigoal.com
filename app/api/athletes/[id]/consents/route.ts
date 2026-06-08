import { NextRequest, NextResponse } from "next/server";
import { findConsentsByAthleteId, upsertConsent } from "@/repositories/consent.repository";
import { ConsentRecord, ConsentPurpose } from "@/types/consent";
import { CURRENT_PRIVACY_NOTICE_VERSION } from "@/lib/consent";
import crypto from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    // Auth check should happen here...

    const consents = await findConsentsByAthleteId(athleteId);
    return NextResponse.json({ data: consents }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching athlete consents:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;
    // Auth check should happen here...
    
    const body = await request.json();
    const { purpose, method = "api", guardianRequired = false, guardianEmail } = body;

    if (!purpose) {
      return NextResponse.json({ error: "Missing purpose" }, { status: 400 });
    }

    const ipAddressRaw = request.headers.get("x-forwarded-for") || "unknown";
    const ipAddress = crypto.createHash("sha256").update(ipAddressRaw).digest("hex");
    const consentId = crypto.randomUUID();
    const now = new Date().toISOString();

    const consentRecord: ConsentRecord = {
      consentId,
      athleteId,
      organisationId: "default", // Should come from session
      purpose: purpose as ConsentPurpose,
      status: guardianRequired ? "pending_guardian" : "active",
      privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
      consentVersion: "1.0.0",
      guardianRequired,
      guardianEmail,
      consentedAt: guardianRequired ? undefined : now,
      method,
      ipAddress,
      createdAt: now,
      updatedAt: now,
    };

    await upsertConsent(consentRecord);

    return NextResponse.json({ data: consentRecord }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating consent:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
