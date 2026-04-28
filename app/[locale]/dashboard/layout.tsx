import DashboardShell from "@/components/layout/DashboardShell";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
