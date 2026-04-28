"use client";

import { useEffect, useState, use } from "react";
import { useTranslations } from "next-intl";
import type { AssessmentRecord } from "@/types/assessment";
import type { ChildProfile } from "@/repositories/child.repository";
import { calculateTrend } from "@/lib/utils/trends";
import { getStandardForAgeGroup } from "@/lib/standards";
import { calculateAgeGroup } from "@/lib/utils/age";
import { formatScore } from "@/lib/utils";

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
  const currentAgeGroup = calculateAgeGroup(data.child.birthDate);
  const standard = getStandardForAgeGroup(currentAgeGroup || "");

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
              <div className="trend-values">
                <TrendMetric
                  label={ts("movement")}
                  value={point.movement || 0}
                  target={standard?.movement.target}
                  variant="movement"
                />
                <TrendMetric
                  label={ts("social")}
                  value={point.social || 0}
                  target={standard?.social.target}
                  variant="social"
                />
                <TrendMetric
                  label={ts("mental")}
                  value={point.mental || 0}
                  target={standard?.mental.target}
                  variant="mental"
                />
              </div>
              <span className="trend-date">{point.date}</span>
            </div>
          ))}
          {trend.length === 0 && <p className="empty">{t("noHistory")}</p>}
        </div>
      </section>

      <section className="panel">
        <h2>{t("assessmentHistory")}</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>{tc("date")}</th>
                <th>{tc("mode")}</th>
                <th>{ts("movement")}</th>
                <th>{ts("social")}</th>
                <th>{ts("mental")}</th>
                <th>{ts("ski")}</th>
              </tr>
            </thead>
            <tbody>
              {data.assessments.map((a) => (
                <tr key={a._id}>
                  <td>{a.session.date}</td>
                  <td>{a.mode}</td>
                  <td>{formatScore(a.computed.movementAverage)}</td>
                  <td>{formatScore(a.computed.socialAverage)}</td>
                  <td>{formatScore(a.computed.mentalAverage)}</td>
                  <td><strong>{formatScore(a.computed.ski)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TrendMetric({
  label,
  value,
  target,
  variant
}: {
  label: string;
  value: number;
  target?: number;
  variant: "movement" | "social" | "mental";
}) {
  return (
    <div className="trend-metric">
      <div className="trend-metric-label">
        <span>{label}</span>
        <strong>{formatScore(value)}</strong>
      </div>
      <progress className={`trend-progress ${variant}`} max={6} value={value} aria-label={label} />
      {typeof target === "number" && (
        <small className="trend-target">Target: {formatScore(target)}</small>
      )}
    </div>
  );
}
