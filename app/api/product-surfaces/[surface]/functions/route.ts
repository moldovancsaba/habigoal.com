import { NextResponse } from "next/server";
import { getSurfaceFunctions, isProductSurfaceId } from "@/lib/product-surfaces";

export async function GET(_request: Request, { params }: { params: Promise<{ surface: string }> }) {
  const { surface } = await params;

  if (!isProductSurfaceId(surface)) {
    return NextResponse.json({ error: "Unknown product surface" }, { status: 404 });
  }

  return NextResponse.json(
    {
      productSurface: surface,
      functions: getSurfaceFunctions(surface)
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=1800"
      }
    }
  );
}
