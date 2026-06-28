import { NextResponse } from "next/server";
import { getCapabilities } from "@/lib/capabilities";

// Client-readable capability contract (#440). The client uses this to decide
// whether to render a real feature or the honest "not available yet" state.
export async function GET() {
  return NextResponse.json({ capabilities: getCapabilities() });
}
