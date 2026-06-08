import { NextResponse } from "next/server";
import { getOpenApiSpec } from "@/lib/openapi-spec";

export async function GET() {
  return NextResponse.json(getOpenApiSpec());
}
