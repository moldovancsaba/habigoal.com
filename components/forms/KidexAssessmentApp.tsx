"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { sectionsForMode } from "@/lib/kidex-schema";
import { computeAssessment } from "@/lib/scoring";
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

function fmt(value: number | null) {
  return value === null ? "-" : value.toFixed(2);
}

export function KidexAssessmentApp() {
  const [assessment, setAssessment] = useState<AssessmentPayload>(() => cloneAssessment(emptyAssessment));
  const [recordId, setRecordId] = useState<string>("");
  const [savedRecords, setSavedRecords] = useState<AssessmentRecord[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const sections = sectionsForMode(assessment.mode);
  const computed = useMemo(() => computeAssessment(assessment), [assessment]);

  useEffect(() => {
    const raw = localStorage.getItem("kidex-draft");
    if (raw) {
      setAssessment({ ...cloneAssessment(emptyAssessment), ...JSON.parse(raw) });
    }
    void refreshRecords();
  }, []);

  useEffect(() => {
    localStorage.setItem("kidex-draft", JSON.stringify(assessment));
  }, [assessment]);

  async function refreshRecords() {
    const response = await fetch("/api/assessments").catch(() => null);
    if (!response?.ok) return;
    const data = await response.json() as { assessments?: AssessmentRecord[] };
    setSavedRecords(data.assessments || []);
  }

  function update<T extends keyof AssessmentPayload>(group: T, key: keyof AssessmentPayload[T], value: unknown) {
    setAssessment((current) => ({
      ...current,
      [group]: {
        ...(current[group] as object),
        [key]: value
      }
    }));
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
      const data = await response?.json().catch(() => null) as { error?: string } | null;
      setSaveState("error");
      setMessage(data?.error || "Save failed. Check MongoDB Atlas environment variables.");
      return;
    }

    const data = await response.json() as { assessment: AssessmentRecord };
    setRecordId(data.assessment._id || "");
    setSaveState("saved");
    setMessage("Assessment saved to MongoDB Atlas.");
    await refreshRecords();
  }

  async function loadAssessment(id: string) {
    const response = await fetch(`/api/assessments/${id}`);
    if (!response.ok) return;
    const data = await response.json() as { assessment: AssessmentRecord };
    const { _id, createdAt, updatedAt, computed: _computed, ...payload } = data.assessment;
    void createdAt;
    void updatedAt;
    void _computed;
    setRecordId(_id || "");
    setAssessment(payload);
    setSaveState("idle");
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
      setMessage("Image upload requires video/photo consent.");
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
      const data = await response?.json().catch(() => null) as { error?: string } | null;
      setMessage(data?.error || "ImgBB upload failed.");
      return;
    }
    const data = await response.json() as { attachment: EvidenceAttachment };
    setAssessment((current) => ({
      ...current,
      attachments: [...current.attachments, data.attachment]
    }));
    setMessage("Image uploaded to ImgBB and attached to this assessment.");
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
          <a className="active" href="#setup">Setup</a>
          <a href="#scoring">Scoring</a>
          <a href="#report">Report</a>
          <a href="#records">Records</a>
        </nav>
        <div className="sidePanel">
          <span className="eyebrow">Current status</span>
          <strong>{computed.completion.done}/{computed.completion.total}</strong>
          <small>items scored</small>
          <small>{assessment.session.consentPhoto ? "Media consent OK" : "Media consent missing"}</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">Bio-psycho-social sport assessment</span>
            <h1>KIDEX conductor survey</h1>
          </div>
          <div className="topActions">
            <button className="btn ghost" onClick={newAssessment}>New</button>
            <button className="btn primary" onClick={saveAssessment} disabled={saveState === "saving"}>
              {saveState === "saving" ? "Saving..." : recordId ? "Update" : "Save"}
            </button>
          </div>
        </header>

        {message && <div className={`notice ${saveState === "error" ? "error" : ""}`}>{message}</div>}

        <section className="metrics">
          <Metric label="Movement" value={fmt(computed.movementAverage)} />
          <Metric label="Social" value={fmt(computed.socialAverage)} />
          <Metric label="Mental" value={fmt(computed.mentalAverage)} />
          <Metric label="SKI" value={fmt(computed.ski)} />
        </section>

        <section className="grid two" id="setup">
          <Panel title="Assessment setup">
            <div className="formGrid">
              <Field label="Child name" value={assessment.child.name} onChange={(value) => update("child", "name", value)} />
              <Field label="Birth date" type="date" value={assessment.child.birthDate} onChange={(value) => update("child", "birthDate", value)} />
              <Select label="Age group" value={assessment.child.ageGroup} onChange={(value) => update("child", "ageGroup", value)} options={["4-6", "7-9", "10-12"]} />
              <Select label="Mode" value={assessment.mode} onChange={(value) => setAssessment((current) => ({ ...current, mode: value as AssessmentPayload["mode"] }))} options={["rapid", "full"]} />
              <Field label="Conductor" value={assessment.session.conductor} onChange={(value) => update("session", "conductor", value)} />
              <Field label="Location" value={assessment.session.location} onChange={(value) => update("session", "location", value)} />
              <Field label="Observers" value={assessment.session.observers} onChange={(value) => update("session", "observers", value)} />
              <Select label="Context" value={assessment.session.context} onChange={(value) => update("session", "context", value)} options={["event", "structured", "spontaneous", "mixed"]} />
              <TextArea label="Known traits" value={assessment.child.knownTraits} onChange={(value) => update("child", "knownTraits", value)} />
              <TextArea label="Parent / pedagogue signals" value={assessment.child.parentSignals} onChange={(value) => update("child", "parentSignals", value)} />
              <label className="check"><input type="checkbox" checked={assessment.session.consentPhoto} onChange={(event) => update("session", "consentPhoto", event.target.checked)} /> Video/photo consent</label>
              <label className="check"><input type="checkbox" checked={assessment.session.consentReport} onChange={(event) => update("session", "consentReport", event.target.checked)} /> Parent report consent</label>
            </div>
          </Panel>

          <Panel title="Evidence images">
            <p className="muted">Images are uploaded to ImgBB through the server route. Upload is blocked until photo/video consent is checked.</p>
            <label className={`upload ${assessment.session.consentPhoto ? "" : "disabled"}`}>
              <input type="file" accept="image/*" onChange={uploadImage} disabled={!assessment.session.consentPhoto || uploading} />
              {uploading ? "Uploading..." : "Upload image to ImgBB"}
            </label>
            <div className="attachments">
              {assessment.attachments.length === 0 && <span className="empty">No evidence images attached.</span>}
              {assessment.attachments.map((attachment) => (
                <div className="attachment" key={attachment.id}>
                  <img src={attachment.thumbUrl || attachment.url} alt={attachment.name} />
                  <div>
                    <a href={attachment.url} target="_blank" rel="noreferrer">{attachment.name || "Image"}</a>
                    <button onClick={() => removeAttachment(attachment.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <div id="scoring" />
        {sections.map((section, sectionIndex) => (
          <Panel
            key={section.key}
            title={`${section.title} (${Math.round(section.weight * 100)}%)`}
            right={<span className={`badge ${section.key}`}>{section.key}</span>}
          >
            <div className="scoreList">
              {section.items.map((item, itemIndex) => {
                const entry = assessment.scores[item.key];
                return (
                  <div className="scoreRow" key={item.key}>
                    <div className="scoreNum">{sectionIndex * 25 + itemIndex + 1}</div>
                    <div className="scoreText">
                      <strong>{item.title}</strong>
                      <span>{item.prompt}</span>
                      <textarea
                        value={entry?.note || ""}
                        onChange={(event) => updateScore(item.key, { note: event.target.value })}
                        aria-label={`${item.title} observation note`}
                      />
                    </div>
                    <select
                      value={scoreValue(entry)}
                      onChange={(event) => updateScore(item.key, { score: event.target.value ? Number(event.target.value) : "" })}
                    >
                      <option value="">-</option>
                      {[1, 2, 3, 4, 5, 6].map((value) => <option value={value} key={value}>{value}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}

        <section className="grid two" id="report">
          <Panel title="Professional notes">
            <TextArea label="General observation" value={assessment.notes.general} onChange={(value) => update("notes", "general", value)} />
            <TextArea label="Adaptation needs" value={assessment.notes.adaptations} onChange={(value) => update("notes", "adaptations", value)} />
            <TextArea label="Referral-safe note" value={assessment.notes.referral} onChange={(value) => update("notes", "referral", value)} />
          </Panel>
          <Panel title="Report preview">
            <ReportList title="Strengths" items={strengths.map(([key, entry]) => `${labelFor(key)} (${entry.score})`)} />
            <ReportList title="Development priorities" items={needs.map(([key, entry]) => `${labelFor(key)} (${entry.score})`)} />
            <p className="muted">Next step: {computed.ski === null ? "Complete all dimensions." : computed.ski < 3.5 ? "Stabilizing and coordination-focused program." : "Sport orientation and follow-up measurement."}</p>
          </Panel>
        </section>

        <Panel title="Saved MongoDB Atlas records" id="records">
          <div className="records">
            {savedRecords.length === 0 && <span className="empty">No saved records loaded.</span>}
            {savedRecords.map((record) => (
              <button key={record._id} onClick={() => record._id && loadAssessment(record._id)}>
                <strong>{record.child.name || "Unnamed child"}</strong>
                <span>{record.mode} · SKI {fmt(record.computed.ski)} · {record.updatedAt?.slice(0, 10)}</span>
              </button>
            ))}
          </div>
        </Panel>
      </main>
    </div>
  );
}

function labelFor(key: string) {
  for (const mode of ["rapid", "full"] as const) {
    for (const section of sectionsForMode(mode)) {
      const item = section.items.find((candidate) => candidate.key === key);
      if (item) return item.title;
    }
  }
  return key;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>/ 6</small></div>;
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

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field full"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="reportBlock">
      <strong>{title}</strong>
      {items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <span className="empty">No data yet.</span>}
    </div>
  );
}
