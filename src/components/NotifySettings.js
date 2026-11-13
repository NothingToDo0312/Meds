"use client";
import { useEffect, useState } from "react";
import { enable, onChange, permission, readPrefs, sendTest, writePrefs } from "@/lib/client/notify";
import { Bell } from "./Icons";

const STATUS = {
  granted: ["On", "on"],
  default: ["Off", "off"],
  denied: ["Blocked", "off"],
  unsupported: ["Not available", "off"],
};

// Account card: turn dose reminders on or off for this device, choose sound, send a test.
export default function NotifySettings({ toast }) {
  const [perm, setPerm] = useState("default");
  const [prefs, setPrefs] = useState({ enabled: true, sound: true });

  useEffect(() => {
    const sync = () => { setPerm(permission()); setPrefs(readPrefs()); };
    sync();
    return onChange(sync);
  }, []);

  const on = perm === "granted" && prefs.enabled;
  const [label, tone] = on ? ["On", "on"] : perm === "granted" ? ["Paused", "off"] : STATUS[perm];

  async function turnOn() {
    const result = await enable();
    if (result === "granted") { await sendTest(); toast("Notifications are on"); }
    else if (result === "denied") toast("Notifications were blocked");
  }

  return (
    <div className="card">
      <div className="row-between">
        <h3><Bell width={16} height={16} className="h-icon" /> Dose reminders</h3>
        <span className={`status ${tone}`}>{label}</span>
      </div>
      <p className="muted help">
        {perm === "unsupported"
          ? "This browser can't show notifications. On iPhone or iPad, add MediReminder to your Home Screen first, then open it from there."
          : perm === "denied"
          ? "Notifications are blocked for this site. Allow them in your browser's site settings, then reload this page."
          : "When a dose is due you get a notification with Taken and Skip buttons. It repeats up to 3 times, 10 minutes apart, until you mark the dose."}
      </p>

      {perm === "default" && <button className="btn small" onClick={turnOn}>Turn on notifications</button>}

      {perm === "granted" && (
        <>
          <label className="tgl">
            <span>Show reminders on this device</span>
            <input type="checkbox" className="tgl-input" checked={prefs.enabled} onChange={(e) => writePrefs({ enabled: e.target.checked })} />
          </label>
          <label className="tgl">
            <span>Play a sound</span>
            <input type="checkbox" className="tgl-input" checked={prefs.sound} onChange={(e) => writePrefs({ sound: e.target.checked })} />
          </label>
          <button className="btn ghost small" disabled={!prefs.enabled} onClick={async () => { const ok = await sendTest(); toast(ok ? "Test sent" : "Couldn't show a notification"); }}>
            Send a test
          </button>
        </>
      )}

      <p className="muted help">Reminders arrive while MediReminder is open or running in the background on this device. Installing it on your phone&rsquo;s Home Screen helps keep it running.</p>
    </div>
  );
}
