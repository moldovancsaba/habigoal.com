import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import { upsertTrainersService, countTrainersServices } from "@/repositories/trainers-service.repository";
import { TrainersServicePayload } from "@/types/trainers-service";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.substring(7);
  if (token !== env.trainersIngestApiKey) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { draftId, entityKind, draftPayload, adapterVersion, workflowMetadata, idempotencyKey } = body;

    if (!draftId) {
      return NextResponse.json({ ok: false, error: "Missing draftId" }, { status: 400 });
    }

    const payload: TrainersServicePayload = {
      id: draftId,
      draftId,
      entityKind,
      draftPayload,
      adapterVersion,
      workflowMetadata,
      idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await upsertTrainersService(payload);
    const count = await countTrainersServices();

    return NextResponse.json({
      ok: true,
      publicUrl: `https://habigoal.com/en/services/${encodeURIComponent(draftId)}`,
      publicVisibleCards: count,
    });
  } catch (error) {
    console.error("[API:Ingest] Publish failed:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
