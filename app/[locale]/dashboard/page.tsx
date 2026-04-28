import { MainDashboard } from "@/components/dashboard/MainDashboard";
import { APP_VERSION } from "@/lib/company";

export default function DashboardHomePage() {
  return <MainDashboard appVersion={APP_VERSION} />;
}
