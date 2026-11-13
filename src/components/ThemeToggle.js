"use client";
import { useEffect, useState } from "react";
import { applyTheme, currentTheme, savedTheme, setTheme, systemTheme } from "@/lib/client/theme";
import { Sun, Moon } from "./Icons";

// Light / dark choice.
//   variant "sidebar": a labelled switch (Light | Dark) at the bottom of the left sidebar.
//   variant "floating" (default): the small sun / moon pill for screens that have no sidebar (sign-in).
export default function ThemeToggle({ variant = "floating" }) {
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

  const options = [["light", "Light", Sun], ["dark", "Dark", Moon]];
  return (
    <div className={variant === "sidebar" ? "theme-switch" : variant === "inline" ? "theme-fab theme-inline" : "theme-fab"} role="radiogroup" aria-label="Color theme">
      {options.map(([id, label, Icon]) => (
        <button key={id} type="button" role="radio" aria-checked={mode === id} aria-label={`${label} theme`} title={label}
          className={mode === id ? "on" : ""} onClick={() => pick(id)}>
          <Icon width={variant === "sidebar" ? 16 : 18} height={variant === "sidebar" ? 16 : 18} />
          {variant === "sidebar" && <span className="side-label">{label}</span>}
        </button>
      ))}
    </div>
  );
}
