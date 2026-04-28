import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const t = useTranslations("Dashboard");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">K</div>
          <div>
            <strong>KIDEX</strong>
            <span>Assessment OS</span>
          </div>
        </div>
        <nav className="nav">
          <Link href="/dashboard/assessment">{t("setup")}</Link>
          <Link href="/dashboard/assessment#scoring">{t("scoring")}</Link>
          <Link href="/dashboard/assessment#report">{t("report")}</Link>
          <Link href="/dashboard/records">{t("records")}</Link>
          <Link href="/dashboard/children">{t("children")}</Link>
          <Link href="/dashboard/settings">{t("settings")}</Link>
        </nav>
        <LocaleSwitcher />
      </aside>
      <main className="main">
        {children}
      </main>
    </div>
  );
}
