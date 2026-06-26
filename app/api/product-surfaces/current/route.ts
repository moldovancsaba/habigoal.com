import { NextRequest, NextResponse } from "next/server";
import { getProductSurfaceOrThrow, isProductSurfaceId } from "@/lib/product-surfaces";

export async function GET(request: NextRequest) {
  const requestedSurface = request.nextUrl.searchParams.get("surface") ?? "habigoal";
  const surfaceId = isProductSurfaceId(requestedSurface) ? requestedSurface : "habigoal";
  const surface = getProductSurfaceOrThrow(surfaceId);

  return NextResponse.json(
    {
      productSurface: surface.id,
      allowedShell: surface.name,
      allowedFunctions: surface.functionRegistry.map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        audience: item.audience
      })),
      copyNamespace: surface.id === "habigoal" ? "Habigoal" : "AthleteIQ",
      theme: surface.theme,
      sharedDataContracts: surface.sharedDataContracts
    },
    {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=600"
      }
    }
  );
}
