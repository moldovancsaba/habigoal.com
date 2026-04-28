"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ChildProfile } from "@/repositories/child.repository";

export default function ChildrenListPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/children")
      .then(res => res.json())
      .then(setChildren)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">{tc("loading")}</div>;

  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>{t("children")}</h2>
      </div>
      <div className="records">
        {children.length === 0 && <span className="empty">{tc("noChildren")}</span>}
        {children.map((child) => (
          <div key={child._id} className="record-item">
            <div className="record-info">
              <Link href={`/dashboard/children/${child._id}`}>
                <strong>{child.name}</strong>
              </Link>
              <span>Born: {child.birthDate}</span>
            </div>
            <Link href={`/dashboard/children/${child._id}`} className="btn ghost sm">
              {t("viewHistory")}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
