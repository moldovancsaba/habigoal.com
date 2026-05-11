import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { pingDatabase } from "@/lib/mongodb";

export async function GET() {
  let mongodbReachable = false;

  if (env.mongodbUri) {
    try {
      await pingDatabase();
      mongodbReachable = true;
    } catch {
      mongodbReachable = false;
    }
  }

  return NextResponse.json({
    ok: mongodbReachable || !env.mongodbUri,
    services: {
      mongodb: {
        configured: Boolean(env.mongodbUri),
        reachable: mongodbReachable,
        database: env.mongodbDb,
        appName: env.mongodbAppName
      },
      imgbb: Boolean(env.imgbbApiKey)
    }
  });
}
