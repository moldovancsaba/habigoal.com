"use client";

import { useEffect, useState } from "react";

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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
