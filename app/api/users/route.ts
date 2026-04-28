import { NextResponse } from "next/server";
import { getUsers } from "@/services/user-service";

export async function GET() {
  const users = await getUsers();
  return NextResponse.json({ users });
}
