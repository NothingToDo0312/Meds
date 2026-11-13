"use client";
import { useEffect, useState } from "react";
import { applyTheme, currentTheme, savedTheme, setTheme, systemTheme } from "@/lib/client/theme";

const Sun = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);
const Moon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

// Floating light / dark switch, bottom left.
export default function ThemeToggle() {
  const [mode, setMode] = useState("light");

  useEffect(() => {
    setMode(currentTheme());
    applyTheme(currentTheme());
    // Until a choice is saved, follow the device if it changes.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!savedTheme()) { setMode(systemTheme()); applyTheme(systemTheme()); }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function pick(m) {
    setMode(m);
    setTheme(m);
  }

  return (
    <div className="theme-fab" role="radiogroup" aria-label="Color theme">
      <button type="button" role="radio" aria-checked={mode === "light"} aria-label="Light theme" title="Light"
        className={mode === "light" ? "on" : ""} onClick={() => pick("light")}><Sun /></button>
      <button type="button" role="radio" aria-checked={mode === "dark"} aria-label="Dark theme" title="Dark"
        className={mode === "dark" ? "on" : ""} onClick={() => pick("dark")}><Moon /></button>
    </div>
  );
}
