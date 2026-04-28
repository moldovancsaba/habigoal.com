"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatScore } from "@/lib/utils";
import type { AssessmentRecord } from "@/types/assessment";

export default function RecordsPage() {
  const t = useTranslations("Dashboard");
  const ta = useTranslations("Assessment");
  const [savedRecords, setSavedRecords] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/assessments").catch(() => null);
      if (!response?.ok) return;
      const data = await response.json() as { assessments?: AssessmentRecord[] };
      setSavedRecords(data.assessments || []);
    })();
  }, []);

  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>{t("records")}</h2>
      </div>
      <div className="records">
        {savedRecords.length === 0 && <span className="empty">{ta("noHistory")}</span>}
        {savedRecords.map((record) => (
          <div key={record._id} className="attachment record-card">
            <div className="record-info record-info-grow">
              {record.childId ? (
                <Link href={`/dashboard/children/${record.childId}`}>
                  <strong className="record-name">{record.child.name || "---"}</strong>
                </Link>
              ) : (
                <strong className="record-name">{record.child.name || "---"}</strong>
              )}
              <div className="muted record-meta">
                {record.mode} · SKI {formatScore(record.computed.ski)} · {record.session.date}
              </div>
            </div>
            <Link href={`/dashboard/records/${record._id}`} className="btn ghost">View</Link>
          </div>
        ))}
      </div>
    </section>
  );
}
