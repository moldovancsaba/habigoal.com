"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AssessmentRecord } from "@/types/assessment";

function fmt(value: number | null) {
  return value === null ? "-" : value.toFixed(2);
}

export default function RecordsPage() {
  const t = useTranslations("Dashboard");
  const [savedRecords, setSavedRecords] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    void refreshRecords();
  }, []);

  async function refreshRecords() {
    const response = await fetch("/api/assessments").catch(() => null);
    if (!response?.ok) return;
    const data = await response.json() as { assessments?: AssessmentRecord[] };
    setSavedRecords(data.assessments || []);
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>{t("records")}</h2>
      </div>
      <div className="records">
        {savedRecords.length === 0 && <span className="empty">No saved records loaded.</span>}
        {savedRecords.map((record) => (
          <div key={record._id} className="record-item">
            <div className="record-info">
              {record.childId ? (
                <Link href={`/dashboard/children/${record.childId}`}>
                  <strong>{record.child.name || "Unnamed child"}</strong>
                </Link>
              ) : (
                <strong>{record.child.name || "Unnamed child"}</strong>
              )}
              <span>{record.mode} · SKI {fmt(record.computed.ski)} · {record.updatedAt?.slice(0, 10)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
