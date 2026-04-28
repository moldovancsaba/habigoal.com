"use client";

import { useEffect, useState, use } from "react";
import { useTranslations } from "next-intl";
import type { AssessmentRecord } from "@/types/assessment";
import { sectionsForMode } from "@/lib/kidex-schema";
import { formatScore } from "@/lib/utils";

export default function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");
  
  const [record, setRecord] = useState<AssessmentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assessments/${id}`)
      .then(res => res.json())
      .then(data => setRecord(data.assessment))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">{tc("loading")}</div>;
  if (!record) return <div className="error">{tc("error")}</div>;

  const sections = sectionsForMode(record.mode);

  return (
    <div className="record-detail print-container">
      <header className="panelHeader no-print">
        <div>
          <h1>Assessment Record</h1>
          <p className="muted">{record.session.date} · {record.child.name}</p>
        </div>
        <div className="topActions">
          <button className="btn ghost" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </header>

      <div className="print-header only-print">
        <h1>KIDEX Bio-Psycho-Social Report</h1>
        <p>{record.child.name} · {record.session.date}</p>
      </div>

      <section className="metrics">
        <div className="metric">
          <span>{ts("movement")}</span>
          <strong>{formatScore(record.computed.movementAverage)}</strong>
        </div>
        <div className="metric">
          <span>{ts("social")}</span>
          <strong>{formatScore(record.computed.socialAverage)}</strong>
        </div>
        <div className="metric">
          <span>{ts("mental")}</span>
          <strong>{formatScore(record.computed.mentalAverage)}</strong>
        </div>
        <div className="metric">
          <span>SKI</span>
          <strong>{formatScore(record.computed.ski)}</strong>
        </div>
      </section>

      <section className="panel">
        <h2>{t("setupTitle")}</h2>
        <div className="formGrid">
          <div><strong>{t("childName")}:</strong> {record.child.name}</div>
          <div><strong>{t("birthDate")}:</strong> {record.child.birthDate}</div>
          <div><strong>{t("ageGroup")}:</strong> {record.child.ageGroup}</div>
          <div><strong>{t("mode")}:</strong> {record.mode}</div>
          <div><strong>{t("location")}:</strong> {record.session.location}</div>
          <div><strong>{t("conductor")}:</strong> {record.session.conductor}</div>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.key} className="panel">
          <h3>{ts(section.key)}</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Observation</th>
                  <th className="score-col">Score</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {section.items.map((item) => {
                  const entry = record.scores[item.key];
                  return (
                    <tr key={item.key}>
                      <td>{ts(`${item.key}.title`)}</td>
                      <td className="score-value">{entry?.score || "-"}</td>
                      <td className="muted">{entry?.note || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="panel">
        <h2>{t("professionalNotes")}</h2>
        <div className="notes-grid">
          <div>
            <strong>{t("generalObservation")}:</strong>
            <p className="muted note-content">{record.notes.general || "-"}</p>
          </div>
          <div>
            <strong>{t("adaptationNeeds")}:</strong>
            <p className="muted note-content">{record.notes.adaptations || "-"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
