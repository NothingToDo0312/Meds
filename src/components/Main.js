"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { dateKey, fmtTime, historyStart, nowMin, safeTz, toMin } from "@/lib/client/time";
import { slotKey, slotsFor, withStatus } from "@/lib/client/schedule";
import { chime, enable, onChange as onNotifyChange, permission, registerWorker, sendTest, showNotification, unlockAudio } from "@/lib/client/notify";
import Today from "./Today";
import Calendar from "./Calendar";
import Meds from "./Meds";
import MedForm from "./MedForm";
import Account from "./Account";
import Admin from "./Admin";
import ThemeToggle from "./ThemeToggle";
import InstallButton from "./InstallButton";
import { NAV_ICONS, Pill, LogOut } from "./Icons";

const CHECK_MS = 20_000;
const NUDGE_EVERY_MIN = 10; // remind again while a dose is still pending...
const MAX_NUDGES = 3;       // ...up to this many times (due time, +10, +20)

// Number of doses waiting, shown in the tab title and (where supported) on the installed app's icon.
const setBadge = (n) => {
  try { const p = n ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.(); p?.catch?.(() => {}); } catch { /* unsupported */ }
};

const savedKey = (userId) => `mr_patient_${userId}`;
const readSaved = (userId) => { try { return Number(localStorage.getItem(savedKey(userId))) || null; } catch { return null; } };
const writeSaved = (userId, id) => { try { localStorage.setItem(savedKey(userId), String(id)); } catch { /* storage unavailable */ } };

// The signed-in app. `user.role` decides what is shown:
//   patient  -> their own schedule, reminders, and who their guardians are
//   guardian -> the schedules of the patients who linked them
//   admin    -> every patient's schedule, plus user management
export default function Main({ user, onUserChange, onSignOut }) {
  const isPatient = user.role === "patient";
  const [mounted, setMounted] = useState(false); // date/time UI is client-only; avoids hydration mismatch
  const [tab, setTab] = useState("today");
  const [patients, setPatients] = useState(isPatient ? [{ id: user.id, name: user.name, timezone: user.timezone }] : []);
  const [guardians, setGuardians] = useState([]);
  const [patientId, setPatientId] = useState(isPatient ? user.id : null);
  const [meds, setMeds] = useState([]);
  const [log, setLog] = useState({});
  const [loadedFrom, setLoadedFrom] = useState("1970-01-01"); // first day of dose history we have
  const [form, setForm] = useState(null); // null = closed, { med } = open (med null when adding)
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const [perm, setPerm] = useState("unsupported"); // browser notification permission
  const [blockedHidden, setBlockedHidden] = useState(false);
  const [, setTick] = useState(0);

  const data = useRef({ meds, log });
  data.current = { meds, log };
  const fired = useRef(new Set());
  const pendingAction = useRef(null); // a Taken/Skip tapped on a notification while the app was closed
  const toastTimer = useRef();

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setToastOn(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 2500);
  }, []);

  const viewed = patients.find((p) => p.id === patientId) ?? null;
  const tz = safeTz(isPatient ? user.timezone : viewed?.timezone ?? user.timezone);

  // Who can this user look after? Re-run after links change.
  const refreshLinks = useCallback(async () => {
    try {
      const r = await api.links();
      setPatients(r.patients);
      setGuardians(r.guardians);
      if (!isPatient)
        setPatientId((cur) => {
          if (r.patients.some((p) => p.id === cur)) return cur;
          const saved = readSaved(user.id);
          return (r.patients.find((p) => p.id === saved) ?? r.patients[0])?.id ?? null;
        });
    } catch (e) {
      toast(e.message);
    }
  }, [isPatient, user.id, toast]);

  useEffect(() => {
    setMounted(true);
    refreshLinks();
  }, [isPatient, refreshLinks]);

  // Notification permission, service worker, and a Taken/Skip pressed on a notification that opened the app.
  useEffect(() => {
    const sync = () => setPerm(permission());
    sync();
    if (!isPatient) return onNotifyChange(sync);
    registerWorker();
    const q = new URLSearchParams(location.search);
    if (q.get("dose")) {
      const a = { action: q.get("dose"), medId: Number(q.get("med")), slot: q.get("slot") || "", date: q.get("date") || "" };
      if ((a.action === "taken" || a.action === "skip") && a.medId && /^\d\d:\d\d$/.test(a.slot) && /^\d{4}-\d\d-\d\d$/.test(a.date))
        pendingAction.current = a;
      history.replaceState(null, "", location.pathname);
    }
    return onNotifyChange(sync);
  }, [isPatient]);

  // Browsers only allow sound after the person has touched the page once.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);

  // ---- load the viewed patient's medicines and last 7 days of doses
  useEffect(() => {
    setMeds([]);
    setLog({});
    if (!patientId) return;
    let stale = false;
    (async () => {
      try {
        const from = historyStart(tz); // this month and last month, for the calendar
        const [m, rows] = await Promise.all([api.listMeds(patientId), api.listDoses(patientId, from)]);
        if (stale) return;
        const l = {};
        rows.forEach((r) => { (l[r.date] ||= {})[slotKey(r.medicine_id, r.slot)] = r.status; });
        setMeds(m);
        setLog(l);
        setLoadedFrom(from);

        const pa = pendingAction.current;
        if (pa && isPatient && patientId === user.id) {
          pendingAction.current = null;
          const status = pa.action === "taken" ? "taken" : "skipped";
          try {
            await setDoseRef.current(pa.medId, pa.slot, status, pa.date);
            toast(status === "taken" ? "Marked as taken" : "Skipped");
          } catch (e) { toast(e.message); }
        }
      } catch (e) {
        if (!stale) toast(e.message || "Can't reach the server");
      }
    })();
    return () => { stale = true; };
  }, [patientId, tz, toast]);

  // ---- reminders
  // For every dose that is due and not yet marked: an in-app toast + chime, and a system notification when the
  // app isn't in front of the person. Repeats every NUDGE_EVERY_MIN minutes (MAX_NUDGES times in total).
  function checkReminders() {
    if (!isPatient) return;
    const now = nowMin(tz);
    const watching = document.visibilityState === "visible" && document.hasFocus();
    let rang = false;
    for (const { med, slot, status, date } of slotsFor(data.current.meds, data.current.log, tz)) {
      if (status) continue;
      const late = now - toMin(slot);
      if (late < 0) continue;

      const nudge = Math.floor(late / NUDGE_EVERY_MIN);
      const key = `${date}|${med.id}|${slot}|${nudge}`;
      if (nudge >= MAX_NUDGES || fired.current.has(key)) continue;
      fired.current.add(key);
      rang = true;

      toast(`Time to take ${med.name}`);
      if (!watching)
        showNotification({
          title: nudge ? "Reminder: dose still pending" : "Time for your medicine",
          body: `${med.name} \u00b7 ${med.dose} \u00b7 ${fmtTime(slot)}`,
          tag: `dose-${date}-${med.id}-${slot}`,
          data: { medId: med.id, slot, date, name: med.name },
        });
    }
    if (rang) chime();
  }
  const checkRef = useRef(checkReminders);
  checkRef.current = checkReminders;
  const setDoseRef = useRef();
  setDoseRef.current = setDose;

  // Every 20 seconds, and straight away when the person returns to the app, so a phone that was asleep catches up.
  useEffect(() => {
    const run = () => { checkRef.current(); setTick((t) => t + 1); }; // re-render keeps Due now / Later today current
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    const id = setInterval(run, CHECK_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", run);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", run); };
  }, []);

  // Check as soon as the schedule has loaded or changed.
  useEffect(() => { checkRef.current(); }, [meds]);

  // Taken / Skip pressed on a notification while the app is open in another tab or window.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e) => {
      const m = e.data;
      if (m?.type !== "dose-action" || !isPatient) return;
      const status = m.action === "taken" ? "taken" : "skipped";
      setDoseRef.current(m.medId, m.slot, status, m.date)
        .then(() => toast(`${m.name ?? "Dose"} ${status === "taken" ? "marked as taken" : "skipped"}`))
        .catch((err) => toast(err.message));
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [isPatient, toast]);

  // Tab title and app-icon badge show how many doses are waiting.
  useEffect(() => {
    if (!isPatient) return;
    const now = nowMin(tz);
    const due = slotsFor(meds, log, tz).filter((s) => !s.status && toMin(s.slot) <= now).length;
    document.title = due ? `(${due}) Due now \u00b7 MediReminder` : "MediReminder";
    setBadge(due);
  });
  useEffect(() => () => { document.title = "MediReminder"; setBadge(0); }, []);

  // ---- actions
  // status: "taken" | "skipped" | null (undo). Updates the UI first, rolls back on failure.
  async function setDose(medId, slot, status, date = dateKey(tz)) {
    const key = slotKey(medId, slot);
    const before = data.current.log[date]?.[key] ?? null;
    setLog((l) => withStatus(l, date, key, status));
    try {
      await api.setDose({ medicineId: medId, date, slot, status });
    } catch (e) {
      setLog((l) => withStatus(l, date, key, before));
      throw e;
    }
  }

  const act = (med, slot, status, message) =>
    setDose(med.id, slot, status)
      .then(() => message && toast(message))
      .catch((e) => toast(e.message));

  async function saveMedicine(id, payload) {
    const med = id ? await api.updateMed(id, payload) : await api.createMed({ ...payload, patientId });
    setMeds((ms) => (id ? ms.map((m) => (m.id === id ? med : m)) : [...ms, med]));
    toast(id ? "Changes saved" : "Medicine added");
  }

  async function removeMedicine(med) {
    await api.deleteMed(med.id);
    setMeds((ms) => ms.filter((m) => m.id !== med.id));
    toast(`${med.name} deleted`);
  }

  if (!mounted) return null;

  async function turnOnNotifications() {
    const result = await enable();
    if (result === "granted") { await sendTest(); toast("Notifications are on"); }
    else if (result === "denied") toast("Notifications were blocked");
  }

  const needsPatient = !patientId;
  const pickPatient = (e) => { const id = Number(e.target.value); setPatientId(id); writeSaved(user.id, id); };

  const viewing = !isPatient && patients.length > 0 && (
    <div className="viewing">
      <label htmlFor="viewing-patient" className="muted">Viewing</label>
      <select id="viewing-patient" value={patientId ?? ""} onChange={pickPatient}>
        {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  );

  const noPatient = (
    <p className="empty">
      {user.role === "admin"
        ? "No patients yet. Create one in the Admin tab."
        : "You aren't linked to a patient yet. Open the Account tab and enter their invite code."}
    </p>
  );

  const tabs = [
    ["today", "Today"],
    ["calendar", "Calendar"],
    ["meds", "Medicines"],
    ["account", "Account"],
    ...(user.role === "admin" ? [["admin", "Admin"]] : []),
  ];

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark"><Pill width={20} height={20} /></span>
          <span className="brand-name">MediReminder</span>
        </div>
        <ThemeToggle variant="inline" />
        <button type="button" className="topbar-out" onClick={onSignOut}><LogOut width={16} height={16} /> Sign out</button>
      </div>

      <main>
        {(tab === "today" || tab === "calendar" || tab === "meds") && viewing}

        <section className="view" hidden={tab !== "today"}>
          {needsPatient ? noPatient : (
            <Today meds={meds} log={log} tz={tz} name={isPatient ? user.name.trim().split(" ")[0] : ""} onAct={act} banner={
              isPatient && perm === "default" ? (
                <div className="banner">
                  <span>Get a notification when a dose is due.</span>
                  <button className="btn small" onClick={turnOnNotifications}>Turn on</button>
                </div>
              ) : isPatient && perm === "denied" && !blockedHidden ? (
                <div className="banner">
                  <span>Notifications are blocked in your browser, so reminders can&rsquo;t reach you. Allow them in your site settings.</span>
                  <button className="link" onClick={() => setBlockedHidden(true)}>Dismiss</button>
                </div>
              ) : null
            } />
          )}
        </section>

        {tab === "calendar" && (
          <section className="view">
            {needsPatient ? noPatient : <Calendar meds={meds} log={log} tz={tz} loadedFrom={loadedFrom} />}
          </section>
        )}

        <section className="view" hidden={tab !== "meds"}>
          {needsPatient ? noPatient : (
            <Meds meds={meds} log={log} tz={tz} onAdd={() => setForm({ med: null })} onEdit={(med) => setForm({ med })} />
          )}
        </section>

        {tab === "account" && (
          <section className="view">
            <Account user={user} guardians={guardians} patients={patients} toast={toast}
              onUserChange={onUserChange} onSignOut={onSignOut} onLinksChange={refreshLinks} />
          </section>
        )}

        {tab === "admin" && user.role === "admin" && (
          <section className="view">
            <Admin me={user} toast={toast} onChanged={refreshLinks} />
          </section>
        )}
      </main>

      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Pill width={20} height={20} /></span>
          <span className="brand-name side-label">MediReminder</span>
        </div>

        <div className="side-user" title={`${user.name} (${user.role})`}>
          <span className="avatar" aria-hidden="true">{(user.name || "?").trim().charAt(0).toUpperCase()}</span>
          <span className="side-label side-user-text">
            <b>{user.name}</b>
            <span className="muted">{user.role === "admin" ? "Admin" : user.role === "guardian" ? "Guardian" : "Patient"}</span>
          </span>
        </div>

        <nav aria-label="Main menu">
          <div className="side-title side-label">Menu</div>
          {tabs.map(([id, label]) => {
            const Icon = NAV_ICONS[id];
            return (
              <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)} title={label}
                aria-current={tab === id ? "page" : undefined}>
                {Icon && <Icon />}
                <span className="side-label">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="side-foot">
          <div className="side-title side-label">Appearance</div>
          <ThemeToggle variant="sidebar" />
          <InstallButton className="side-install" label="Install app" />
          <button type="button" className="side-signout" onClick={onSignOut} title="Sign out">
            <LogOut />
            <span className="side-label">Sign out</span>
          </button>
        </div>
      </aside>

      <nav className="tabbar" aria-label="Main menu (mobile)">
        {tabs.map(([id, label]) => {
          const Icon = NAV_ICONS[id];
          return (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}>
              {Icon && <Icon width={22} height={22} />}
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {form && (
        <MedForm key={form.med?.id ?? "new"} med={form.med} onSave={saveMedicine}
          onDelete={removeMedicine} onClose={() => setForm(null)} />
      )}

      <div className={`toast${toastOn ? " on" : ""}`} role="status">{toastMsg}</div>
    </div>
  );
}
