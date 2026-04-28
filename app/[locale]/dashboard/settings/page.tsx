"use client";

import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations("Dashboard");

  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>{t("settings")}</h2>
      </div>
      <p>Management of Conductors and Observers list will be here.</p>
      <div className="muted">Currently using mock data for predictive search.</div>
    </section>
  );
}
