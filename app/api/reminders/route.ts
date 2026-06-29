import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { getDueReminders } from "@/services/reminders.service";

// Outstanding daily nudges (check-in / habits / reflection) for the signed-in
// athlete. Empty for users without an athlete profile.
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const timezone = new URL(request.url).searchParams.get("timezone") || undefined;
    const reminders = await getDueReminders(user, { timezone });
    return NextResponse.json({ reminders });
  } catch {
    return NextResponse.json({ reminders: [] });
  }
}
