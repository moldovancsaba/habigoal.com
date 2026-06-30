import DashboardShell from "@/components/layout/DashboardShell";
import { SessionRunner } from "@/components/product/session/SessionRunner";

// Athlete-facing blueprint session runner (TRN-002, #83). Rendered inside the
// shared persona shell so the single persona menu stays present.
export default async function AthleteSessionRunnerPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return (
    <DashboardShell>
      <SessionRunner athleteId={id} />
    </DashboardShell>
  );
}
