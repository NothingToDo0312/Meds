// Theme: "system" (follow the device), "light" or "dark". Stored in this browser only.
const KEY = "mr_theme";
export const THEMES = ["system", "light", "dark"];

export function getTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return THEMES.includes(t) ? t : "system";
  } catch {
    return "system";
  }
}

export function setTheme(mode) {
  try {
    if (mode === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch { /* storage unavailable: applies for this visit only */ }
  applyTheme(mode);
}

export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "light" || mode === "dark") root.dataset.theme = mode;
  else delete root.dataset.theme;

  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", dark ? "#0e1312" : "#0f766e"));
}
