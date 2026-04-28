"use client";

import { useEffect, useState, use } from "react";
import { useTranslations } from "next-intl";
import type { AssessmentRecord } from "@/types/assessment";
import type { ChildProfile } from "@/repositories/child.repository";
import { calculateTrend, TrendPoint } from "@/lib/utils/trends";

export default function ChildHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");
  
  const [data, setData] = useState<{ child: ChildProfile; assessments: AssessmentRecord[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/children/${id}/history`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">{tc("loading")}</div>;
  if (!data) return <div className="error">{tc("error")}</div>;

  const trend = calculateTrend(data.assessments);

  return (
    <div className="child-history">
      <header className="panelHeader">
        <div>
          <h1>{data.child.name}</h1>
          <p className="muted">{data.child.birthDate}</p>
        </div>
      </header>

      <section className="panel">
        <h2>{t("longitudinalTrends")}</h2>
        <div className="trend-viz">
          {trend.map((point, i) => (
            <div key={i} className="trend-point">
              <div className="trend-bars">
                <div className="bar movement" style={{ height: `${(point.movement / 6) * 100}%` }} title={`Movement: ${point.movement.toFixed(1)}`} />
                <div className="bar social" style={{ height: `${(point.social / 6) * 100}%` }} title={`Social: ${point.social.toFixed(1)}`} />
                <div className="bar mental" style={{ height: `${(point.mental / 6) * 100}%` }} title={`Mental: ${point.mental.toFixed(1)}`} />
              </div>
              <span className="trend-date">{point.date}</span>
            </div>
          ))}
          {trend.length === 0 && <p className="empty">No historical data available.</p>}
        </div>
      </section>

      <section className="panel">
        <h2>Assessment History</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Movement</th>
                <th>Social</th>
                <th>Mental</th>
                <th>SKI</th>
              </tr>
            </thead>
            <tbody>
              {data.assessments.map((a) => (
                <tr key={a._id}>
                  <td>{a.session.date}</td>
                  <td>{a.mode}</td>
                  <td>{a.computed.movementAverage?.toFixed(2)}</td>
                  <td>{a.computed.socialAverage?.toFixed(2)}</td>
                  <td>{a.computed.mentalAverage?.toFixed(2)}</td>
                  <td><strong>{a.computed.ski?.toFixed(2)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
