import { NextResponse } from "next/server";
import { listAllUsers, upsertUser } from "@/repositories/user.repository";

export async function GET() {
  const users = await listAllUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  try {
    const user = await request.json();
    await upsertUser(user);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
