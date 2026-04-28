"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getSettings, KidexSettings, saveSettings } from "@/services/settings-service";

export default function SettingsPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  
  const [settings, setSettings] = useState<KidexSettings>({
    conductors: [],
    observers: [],
    locations: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getSettings().then((data) => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await saveSettings(settings);
    setSaving(false);
  }

  function addItem(key: keyof KidexSettings) {
    const item = window.prompt(`Add new ${key}`);
    if (item) {
      setSettings((prev) => ({
        ...prev,
        [key]: [...prev[key], item]
      }));
    }
  }

  function removeItem(key: keyof KidexSettings, index: number) {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index)
    }));
  }

  if (loading) return <div className="loading">{tc("loading")}</div>;

  return (
    <div className="settings-container">
      <header className="panelHeader">
        <h2>{t("settings")}</h2>
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? tc("saving") : tc("save")}
        </button>
      </header>

      <div className="grid three">
        <SettingsList 
          title="Conductors" 
          items={settings.conductors} 
          onAdd={() => addItem("conductors")} 
          onRemove={(i) => removeItem("conductors", i)} 
        />
        <SettingsList 
          title="Observers" 
          items={settings.observers} 
          onAdd={() => addItem("observers")} 
          onRemove={(i) => removeItem("observers", i)} 
        />
        <SettingsList 
          title="Locations" 
          items={settings.locations} 
          onAdd={() => addItem("locations")} 
          onRemove={(i) => removeItem("locations", i)} 
        />
      </div>
    </div>
  );
}

function SettingsList({ title, items, onAdd, onRemove }: { 
  title: string; 
  items: string[]; 
  onAdd: () => void; 
  onRemove: (index: number) => void;
}) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <h3>{title}</h3>
        <button className="btn ghost sm" onClick={onAdd}>+</button>
      </div>
      <div className="settings-list">
        {items.map((item, i) => (
          <div key={i} className="settings-item">
            <span>{item}</span>
            <button onClick={() => onRemove(i)}>×</button>
          </div>
        ))}
        {items.length === 0 && <div className="empty">No items added.</div>}
      </div>
    </section>
  );
}
