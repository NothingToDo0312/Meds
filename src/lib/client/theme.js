// Two themes: "light" and "dark". Until the person picks one, the device setting is followed.
// A saved choice lives in this browser only.
const KEY = "mr_theme";

export function savedTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

export const systemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

// The theme actually showing right now.
export const currentTheme = () => savedTheme() || systemTheme();

export function setTheme(mode) {
  try { localStorage.setItem(KEY, mode); } catch { /* storage unavailable: applies for this visit only */ }
  applyTheme(mode);
}

export function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) =>
    m.setAttribute("content", mode === "dark" ? "#0e1312" : "#0f766e")
  );
}
