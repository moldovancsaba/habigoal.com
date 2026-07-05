import DashboardShell from "@/components/layout/DashboardShell";
import { TrainingLoadLogger } from "@/components/athletes/TrainingLoadLogger";

export default async function RpeLoggerPage({
  params
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;

  return (
    <DashboardShell>
      <TrainingLoadLogger athleteId={id} />
    </DashboardShell>
  );
}
