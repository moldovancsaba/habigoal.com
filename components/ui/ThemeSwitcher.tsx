"use client";

import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark";
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggle = (next: "light" | "dark") => {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  return (
    <div className="theme-switcher">
      <button 
        className={theme === "light" ? "active" : ""} 
        onClick={() => toggle("light")}
        title="Light Mode"
      >
        ☀️
      </button>
      <button 
        className={theme === "dark" ? "active" : ""} 
        onClick={() => toggle("dark")}
        title="Dark Mode"
      >
        🌙
      </button>
    </div>
  );
}
