import { deleteSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  await deleteSession();
  
  // Redirect directly to the Kidex landing page
  return NextResponse.redirect(new URL("/", request.url));
}

export async function POST() {
  await deleteSession();
  return NextResponse.json({ success: true });
}
