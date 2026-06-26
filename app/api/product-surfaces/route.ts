import { NextResponse } from "next/server";
import { productSurfaces } from "@/lib/product-surfaces";

export async function GET() {
  return NextResponse.json(
    {
      version: "phase-1",
      generatedAt: new Date().toISOString(),
      surfaces: productSurfaces
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600"
      }
    }
  );
}
