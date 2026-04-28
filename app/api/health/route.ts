import { NextResponse } from "next/server";
import { env } from "@/config/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    services: {
      mongodb: Boolean(env.mongodbUri),
      imgbb: Boolean(env.imgbbApiKey)
    }
  });
}
