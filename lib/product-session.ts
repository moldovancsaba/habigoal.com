import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { normalizeRoles, type AppRole } from "@/lib/access";

export type ProductLoginPersona = "athlete" | "trainer";

export async function requireProductSession(input: {
  allowedRoles: AppRole[];
  locale: string;
  path: string;
  persona: ProductLoginPersona;
}) {
  const session = await getSession();
  const activeRoles = normalizeRoles(session?.role?.split(",") ?? []);
  const hasAllowedRole = input.allowedRoles.some((role) => activeRoles.includes(role));

  if (!session?.email || !hasAllowedRole) {
    redirect(`/${input.locale}/login?next=${encodeURIComponent(input.path)}&persona=${input.persona}`);
  }
}
