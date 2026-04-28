"use client";

import { CSSProperties, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getSettings, KidexSettings, saveSettings } from "@/services/settings-service";
import { getUsers, saveUser, User } from "@/services/user-service";

const centerAlignStyle: CSSProperties = { textAlign: "center" };

export default function SettingsPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  
  const [settings, setSettings] = useState<KidexSettings>({
    conductors: [],
    observers: [],
    locations: []
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [sData, uData] = await Promise.all([getSettings(), getUsers()]);
        setSettings(sData);
        setUsers(uData);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSaveSettings() {
    setSaving(true);
    const ok = await saveSettings(settings);
    setMessage(ok ? tc("success") : tc("error"));
    setSaving(false);
  }

  async function toggleRole(user: User, role: "conductor" | "observer") {
    const nextRoles = user.roles.includes(role)
      ? user.roles.filter(r => r !== role)
      : [...user.roles, role];
    
    const updatedUser = { ...user, roles: nextRoles };
    
    const previousUsers = users;
    setUsers(prev => prev.map(u => u.name === user.name ? updatedUser : u));
    
    const ok = await saveUser(updatedUser);
    if (!ok) {
      setUsers(previousUsers);
      setMessage(tc("error"));
      return;
    }
    setMessage(tc("success"));
  }

  function addNewUser() {
    const name = window.prompt(t("userName"))?.trim();
    if (name) {
      const newUser: User = { name, roles: [] };
      setUsers(prev => [...prev, newUser]);
      void saveUser(newUser).then((ok) => {
        if (!ok) {
          setUsers((prev) => prev.filter((u) => u.name !== name));
          setMessage(tc("error"));
        } else {
          setMessage(tc("success"));
        }
      });
    }
  }

  function removeLocation(index: number) {
    setSettings(prev => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index)
    }));
  }

  function addLocation() {
    const loc = window.prompt(t("addLocation"))?.trim();
    if (loc) {
      setSettings(prev => ({
        ...prev,
        locations: [...prev.locations, loc]
      }));
    }
  }

  if (loading) return <div className="loading">{tc("loading")}</div>;

  return (
    <div className="settings-page">
      <header className="panelHeader">
        <h1>{t("settings")}</h1>
      </header>
      {message && <div className="notice">{message}</div>}

      <section className="panel">
        <div className="panelHeader">
          <h2>{t("userRights")}</h2>
          <button className="btn ghost" onClick={addNewUser}>+ {t("addUser")}</button>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>{t("userName")}</th>
                <th style={centerAlignStyle}>{t("canConduct")}</th>
                <th style={centerAlignStyle}>{t("canObserve")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.name}>
                  <td><strong>{user.name}</strong></td>
                  <td style={centerAlignStyle}>
                    <input 
                      type="checkbox" 
                      checked={user.roles.includes("conductor")} 
                      onChange={() => toggleRole(user, "conductor")}
                    />
                  </td>
                  <td style={centerAlignStyle}>
                    <input 
                      type="checkbox" 
                      checked={user.roles.includes("observer")} 
                      onChange={() => toggleRole(user, "observer")}
                    />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty">{t("noUsers")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <h2>{t("locations")}</h2>
          <div className="topActions">
            <button className="btn ghost" onClick={addLocation}>+ {t("addLocation")}</button>
            <button className="btn primary" onClick={handleSaveSettings} disabled={saving}>
              {saving ? tc("saving") : tc("save")}
            </button>
          </div>
        </div>
        <div className="settings-list" style={{ display: 'grid', gap: '0.5rem' }}>
          {settings.locations.map((loc, i) => (
            <div key={i} className="attachment" style={{ padding: '0.75rem 1rem' }}>
              <div style={{ flex: 1 }}>{loc}</div>
              <button className="btn ghost" onClick={() => removeLocation(i)}>×</button>
            </div>
          ))}
          {settings.locations.length === 0 && <div className="empty">{t("noLocations")}</div>}
        </div>
      </section>
    </div>
  );
}
