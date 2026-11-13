"use client";
import { useCallback, useEffect, useState } from "react";

// What can this browser do about installing the app?
//   installed -> already running as an installed app (hide every install button)
//   event     -> the browser offered a real install prompt (Chrome, Edge, Android)
//   ios       -> iPhone/iPad Safari: no prompt exists, so we show "Add to Home Screen" steps
export function useInstall() {
  const [state, setState] = useState({ installed: false, ios: false, event: null });

  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // Shared through `window` so every install button on the page updates together.
    const sync = () => setState({ installed: standalone || Boolean(window.__mrInstalled), ios, event: window.__mrInstall || null });
    const done = () => { window.__mrInstall = null; window.__mrInstalled = true; window.dispatchEvent(new Event("mr:install")); };

    sync();
    window.addEventListener("mr:install", sync);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("mr:install", sync); window.removeEventListener("appinstalled", done); };
  }, []);

  const install = useCallback(async () => {
    const e = state.event;
    if (!e) return null;
    e.prompt();
    const { outcome } = await e.userChoice; // "accepted" | "dismissed"
    window.__mrInstall = null; // the browser only allows one prompt per event
    if (outcome === "accepted") window.__mrInstalled = true;
    window.dispatchEvent(new Event("mr:install")); // tell every install button
    return outcome;
  }, [state.event]);

  const available = !state.installed && (Boolean(state.event) || state.ios);
  return { ...state, available, install };
}
