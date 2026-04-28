"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { sectionsForMode } from "@/lib/kidex-schema";
import { computeAssessment } from "@/lib/scoring";
import { calculateAgeGroup } from "@/lib/utils/age";
import { getStandardForAgeGroup } from "@/lib/standards";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { getSettings, saveSettings } from "@/services/settings-service";
import { getConductors, getObservers } from "@/services/user-service";
import type { AssessmentPayload, AssessmentRecord, EvidenceAttachment, ScoreEntry } from "@/types/assessment";

const emptyAssessment: AssessmentPayload = {
  mode: "rapid",
  child: {
    name: "",
    birthDate: "",
    ageGroup: "7-9",
    dominantHand: "",
    dominantEye: "",
    dominantFoot: "",
    knownTraits: "",
    parentSignals: ""
  },
  session: {
    date: new Date().toISOString().slice(0, 10),
    location: "",
    conductor: "",
    observers: "",
    groupSize: "6-8",
    context: "event",
    consentPhoto: false,
    consentReport: false
  },
  scores: {},
  notes: {
    general: "",
    movement: "",
    social: "",
    mental: "",
    adaptations: "",
    referral: ""
  },
  attachments: []
};

type SaveState = "idle" | "saving" | "saved" | "error";

function cloneAssessment(source: AssessmentPayload): AssessmentPayload {
  return JSON.parse(JSON.stringify(source)) as AssessmentPayload;
}

function scoreValue(entry?: ScoreEntry) {
  return typeof entry?.score === "number" ? entry.score : "";
}

function fmt(value: number | null | undefined) {
  return (value === null || value === undefined || typeof value !== "number") ? "-" : value.toFixed(2);
}

export function KidexAssessmentApp() {
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");
  
  const [assessment, setAssessment] = useState<AssessmentPayload>(() => cloneAssessment(emptyAssessment));
  const [recordId, setRecordId] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const [conductors, setConductors] = useState<string[]>([]);
  const [observers, setObservers] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const sections = sectionsForMode(assessment.mode);
  const computed = useMemo(() => computeAssessment(assessment), [assessment]);
  const standard = getStandardForAgeGroup(assessment.child.ageGroup);

  useEffect(() => {
    const raw = localStorage.getItem("kidex-draft");
    if (raw) {
      setAssessment({ ...cloneAssessment(emptyAssessment), ...JSON.parse(raw) });
    }
    
    void Promise.all([
      getSettings(),
      getConductors(),
      getObservers()
    ]).then(([settingsData, conductorUsers, observerUsers]) => {
      const allConductors = Array.from(new Set([...settingsData.conductors, ...conductorUsers.map(u => u.name)]));
      const allObservers = Array.from(new Set([...settingsData.observers, ...observerUsers.map(u => u.name)]));
      
      setConductors(allConductors);
      setObservers(allObservers);
      setLocations(settingsData.locations);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("kidex-draft", JSON.stringify(assessment));
  }, [assessment]);

  function update<T extends keyof AssessmentPayload>(group: T, key: keyof AssessmentPayload[T], value: unknown) {
    setAssessment((current) => {
      const next = {
        ...current,
        [group]: {
          ...(current[group] as object),
          [key]: value
        }
      };

      if (group === "child" && key === "birthDate") {
        const ageGroup = calculateAgeGroup(value as string);
        if (ageGroup) {
          next.child.ageGroup = ageGroup;
        }
      }

      return next;
    });
    setSaveState("idle");
  }

  function updateScore(key: string, patch: Partial<ScoreEntry>) {
    setAssessment((current) => ({
      ...current,
      scores: {
        ...current.scores,
        [key]: { ...(current.scores[key] || { score: "", note: "" }), ...patch }
      }
    }));
    setSaveState("idle");
  }

  async function saveAssessment() {
    setSaveState("saving");
    setMessage("");
    const url = recordId ? `/api/assessments/${recordId}` : "/api/assessments";
    const response = await fetch(url, {
      method: recordId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assessment)
    }).catch((error: Error) => {
      setMessage(error.message);
      return null;
    });

    if (!response?.ok) {
      setSaveState("error");
      setMessage(t("saveError"));
      return;
    }

    const data = await response.json() as { assessment: AssessmentRecord };
    setRecordId(data.assessment._id || "");
    setSaveState("saved");
    localStorage.removeItem("kidex-draft");
    
    const settings = await getSettings();
    await saveSettings({ ...settings, locations });

    setMessage(t("saved"));
  }

  function newAssessment() {
    setRecordId("");
    setAssessment(cloneAssessment(emptyAssessment));
    setSaveState("idle");
    setMessage("");
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!assessment.session.consentPhoto) {
      setMessage(t("consentRequired"));
      return;
    }
    setUploading(true);
    setMessage("");
    const form = new FormData();
    form.set("image", file);
    const response = await fetch("/api/uploads/imgbb", { method: "POST", body: form }).catch((error: Error) => {
      setMessage(error.message);
      return null;
    });
    setUploading(false);
    if (!response?.ok) {
      setMessage(t("uploadFailed"));
      return;
    }
    const data = await response.json() as { attachment: EvidenceAttachment };
    setAssessment((current) => ({
      ...current,
      attachments: [...current.attachments, data.attachment]
    }));
    setMessage(t("uploadSuccess"));
  }

  function removeAttachment(id: string) {
    setAssessment((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== id)
    }));
  }

  const strengths = Object.entries(assessment.scores)
    .filter(([, entry]) => typeof entry.score === "number" && entry.score >= 5)
    .slice(0, 3);
  const needs = Object.entries(assessment.scores)
    .filter(([, entry]) => typeof entry.score === "number" && entry.score <= 2)
    .slice(0, 3);

  return (
    <div className="assessment-page">
      <header className="panelHeader">
        <div>
          <span className="eyebrow">{t("appSubtitle")}</span>
          <h1>{t("appTitle")}</h1>
        </div>
        <div className="topActions">
          <button className="btn ghost" onClick={newAssessment}>{tc("new")}</button>
          <button className="btn primary" onClick={saveAssessment} disabled={saveState === "saving"}>
            {saveState === "saving" ? tc("saving") : recordId ? tc("update") : tc("save")}
          </button>
        </div>
      </header>

      {message && <div className={`notice ${saveState === "error" ? "error" : ""}`}>{message}</div>}

      <section className="metrics">
        <Metric label={ts("movement")} value={fmt(computed.movementAverage)} target={standard?.movement.target} />
        <Metric label={ts("social")} value={fmt(computed.socialAverage)} target={standard?.social.target} />
        <Metric label={ts("mental")} value={fmt(computed.mentalAverage)} target={standard?.mental.target} />
        <Metric label="SKI" value={fmt(computed.ski)} target={standard?.ski.target} />
      </section>

      <section className="formGrid" id="setup">
        <Panel title={t("setupTitle")}>
          <div className="formGrid">
            <Field label={t("childName")} value={assessment.child.name} onChange={(value) => update("child", "name", value)} />
            <Field label={t("birthDate")} type="date" value={assessment.child.birthDate} onChange={(value) => update("child", "birthDate", value)} />
            <Select label={t("ageGroup")} value={assessment.child.ageGroup} onChange={(value) => update("child", "ageGroup", value)} options={["4-6", "7-9", "10-12"]} />
            <Select 
              label={t("mode")} 
              value={assessment.mode} 
              onChange={(value) => setAssessment((current) => ({ ...current, mode: value as AssessmentPayload["mode"] }))} 
              options={[
                { id: "rapid", name: t("modeRapid") },
                { id: "full", name: t("modeFull") }
              ]} 
            />
            
            <SearchableSelect 
              label={t("conductor")} 
              value={assessment.session.conductor} 
              options={conductors.map(c => ({ id: c, name: c }))} 
              onChange={(value) => update("session", "conductor", value)} 
            />
            
            <SearchableSelect 
              label={t("location")} 
              value={assessment.session.location} 
              options={locations.map(l => ({ id: l, name: l }))} 
              onChange={(value) => {
                if (value && !locations.includes(value)) {
                  setLocations(prev => [...prev, value]);
                }
                update("session", "location", value);
              }}
              allowAdd
            />
            
            <SearchableSelect 
              label={t("observers")} 
              value={assessment.session.observers} 
              options={observers.map(o => ({ id: o, name: o }))} 
              onChange={(value) => update("session", "observers", value)} 
            />
            
            <Select 
              label={t("context")} 
              value={assessment.session.context} 
              onChange={(value) => update("session", "context", value)} 
              options={[
                { id: "event", name: t("contextEvent") },
                { id: "structured", name: t("contextStructured") },
                { id: "spontaneous", name: t("contextSpontaneous") },
                { id: "mixed", name: t("contextMixed") }
              ]} 
            />
            <TextArea label={t("knownTraits")} value={assessment.child.knownTraits} onChange={(value) => update("child", "knownTraits", value)} />
            <TextArea label={t("parentSignals")} value={assessment.child.parentSignals} onChange={(value) => update("child", "parentSignals", value)} />
            <label className="check"><input type="checkbox" checked={assessment.session.consentPhoto} onChange={(event) => update("session", "consentPhoto", event.target.checked)} /> {t("consentPhoto")}</label>
            <label className="check"><input type="checkbox" checked={assessment.session.consentReport} onChange={(event) => update("session", "consentReport", event.target.checked)} /> {t("consentReport")}</label>
          </div>
        </Panel>

        <Panel title={t("evidenceImages")}>
          <p className="muted">{t("uploadSecurityNote")}</p>
          <label className={`btn ghost ${assessment.session.consentPhoto ? "" : "disabled"}`}>
            <input type="file" accept="image/*" onChange={uploadImage} disabled={!assessment.session.consentPhoto || uploading} style={{ display: 'none' }} />
            {uploading ? t("uploading") : t("uploadImage")}
          </label>
          <div className="attachments">
            {assessment.attachments.length === 0 && <span className="empty">{t("noImages")}</span>}
            {assessment.attachments.map((attachment) => (
              <div className="attachment" key={attachment.id}>
                <img src={attachment.thumbUrl || attachment.url} alt={attachment.name} />
                <div className="attachment-info">
                  <a href={attachment.url} target="_blank" rel="noreferrer" className="muted">{attachment.name || "Image"}</a>
                </div>
                <button className="btn ghost" onClick={() => removeAttachment(attachment.id)}>{tc("remove")}</button>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <div id="scoring" />
      {sections.map((section, sectionIndex) => (
        <Panel
          key={section.key}
          title={`${ts(section.key)} (${Math.round(section.weight * 100)}%)`}
          right={<span className={`badge ${section.domain}`}>{ts(section.domain)}</span>}
        >
          <div className="scoreList">
            {section.items.map((item, itemIndex) => {
              const entry = assessment.scores[item.key];
              return (
                <div className="scoreRow" key={item.key}>
                  <div className="scoreNum">{sectionIndex * 25 + itemIndex + 1}</div>
                  <div className="scoreText">
                    <strong>{ts(`${item.key}.title`)}</strong>
                    <span>{ts(`${item.key}.prompt`)}</span>
                    <textarea
                      value={entry?.note || ""}
                      onChange={(event) => updateScore(item.key, { note: event.target.value })}
                      placeholder={t("observationNote")}
                    />
                  </div>
                  <div className="scoreAction">
                    <select
                      value={scoreValue(entry)}
                      onChange={(event) => updateScore(item.key, { score: event.target.value ? Number(event.target.value) : "" })}
                    >
                      <option value="">-</option>
                      {[1, 2, 3, 4, 5, 6].map((value) => <option value={value} key={value}>{value}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ))}

      <section className="formGrid" id="report">
        <Panel title={t("professionalNotes")}>
          <TextArea label={t("generalObservation")} value={assessment.notes.general} onChange={(value) => update("notes", "general", value)} />
          <TextArea label={t("adaptationNeeds")} value={assessment.notes.adaptations} onChange={(value) => update("notes", "adaptations", value)} />
          <TextArea label={t("referralNote")} value={assessment.notes.referral} onChange={(value) => update("notes", "referral", value)} />
        </Panel>
        <Panel title={t("reportPreview")}>
          <ReportList title={t("strengths")} items={strengths.map(([key, entry]) => `${ts(`${key}.title`)} (${entry.score})`)} emptyText={t("noData")} />
          <ReportList title={t("developmentPriorities")} items={needs.map(([key, entry]) => `${ts(`${key}.title`)} (${entry.score})`)} emptyText={t("noData")} />
          <div className="ski-summary">
            <p className="muted">{t("nextStep")}:</p>
            <p className="ski-result">
              {computed.ski === null ? t("completeAll") : computed.ski < 3.5 ? t("stabilizing") : t("sportOrientation")}
            </p>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Metric({ label, value, target }: { label: string; value: string; target?: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {target && <small>target: {target.toFixed(1)}</small>}
    </div>
  );
}

function Panel({ title, children, right, id }: { title: string; children: React.ReactNode; right?: React.ReactNode; id?: string }) {
  return (
    <section className="panel" id={id}>
      <div className="panelHeader">
        <h2>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, options }: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  options: (string | { id: string; name: string })[] 
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => {
          const id = typeof option === "string" ? option : option.id;
          const name = typeof option === "string" ? option : option.name;
          return <option key={id} value={id}>{name}</option>;
        })}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field full"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ReportList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="report-block">
      <strong>{title}</strong>
      {items.length ? (
        <ul>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <span className="empty">{emptyText}</span>
      )}
    </div>
  );
}
