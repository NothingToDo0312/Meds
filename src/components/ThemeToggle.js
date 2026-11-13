"use client";
import { useEffect, useState } from "react";
import { THEMES, getTheme, setTheme } from "@/lib/client/theme";

const LABEL = { system: "Auto", light: "Light", dark: "Dark" };

// Three-way switch: follow the device, or force light / dark.
export default function ThemeToggle() {
  const [mode, setMode] = useState("system");
  useEffect(() => setMode(getTheme()), []);

  function pick(m) {
    setMode(m);
    setTheme(m);
  }

  return (
    <div className="seg" role="radiogroup" aria-label="Color theme">
      {THEMES.map((m) => (
        <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? "on" : ""} onClick={() => pick(m)}>
          {LABEL[m]}
        </button>
      ))}
    </div>
  );
}
