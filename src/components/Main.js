"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { dateKey, nowMin, safeTz, toMin } from "@/lib/client/time";
import { slotKey, slotsFor, withStatus } from "@/lib/client/schedule";
import Today from "./Today";
import Meds from "./Meds";
import MedForm from "./MedForm";
import Account from "./Account";
import Admin from "./Admin";

const CHECK_MS = 20_000;
const NUDGE_EVERY_MIN = 10; // remind again while a dose is still pending...
const MAX_NUDGES = 3;       // ...up to this many times (due time, +10, +20)

const canNotify = () => typeof Notification !== "undefined";
const notifyAvailable = () => canNotify() && Notification.permission === "default";

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
  const [form, setForm] = useState(null); // null = closed, { med } = open (med null when adding)
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const [canAskNotify, setCanAskNotify] = useState(false);
  const [, setTick] = useState(0);

  const data = useRef({ meds, log });
  data.current = { meds, log };
  const fired = useRef(new Set());
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
    setCanAskNotify(isPatient && notifyAvailable());
    refreshLinks();
  }, [isPatient, refreshLinks]);

  // ---- load the viewed patient's medicines and last 7 days of doses
  useEffect(() => {
    setMeds([]);
    setLog({});
    if (!patientId) return;
    let stale = false;
    (async () => {
      try {
        const [m, rows] = await Promise.all([api.listMeds(patientId), api.listDoses(patientId, dateKey(tz, 6))]);
        if (stale) return;
        const l = {};
        rows.forEach((r) => { (l[r.date] ||= {})[slotKey(r.medicine_id, r.slot)] = r.status; });
        setMeds(m);
        setLog(l);
      } catch (e) {
        if (!stale) toast(e.message || "Can't reach the server");
      }
    })();
    return () => { stale = true; };
  }, [patientId, tz, toast]);

  // ---- reminders (only fire while the page is open)
  useEffect(() => {
    const id = setInterval(() => {
      if (isPatient) fireReminders();
      setTick((t) => t + 1); // re-render so Due now / Later today stay current
    }, CHECK_MS);

    function fireReminders() {
      const now = nowMin(tz);
      for (const { med, slot, status, date } of slotsFor(data.current.meds, data.current.log, tz)) {
        if (status) continue;
        const late = now - toMin(slot);
        if (late < 0) continue;

        const nudge = Math.floor(late / NUDGE_EVERY_MIN);
        const key = `${date}|${med.id}|${slot}|${nudge}`;
        if (nudge >= MAX_NUDGES || fired.current.has(key)) continue;
        fired.current.add(key);

        toast(`Time to take ${med.name}`);
        try {
          if (canNotify() && Notification.permission === "granted")
            new Notification("Time for your medicine", { body: `${med.name} · ${med.dose}` });
        } catch { /* notifications unavailable */ }
      }
    }
    return () => clearInterval(id);
  }, [toast, isPatient, tz]);

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
    ["meds", "Medicines"],
    ["account", "Account"],
    ...(user.role === "admin" ? [["admin", "Admin"]] : []),
  ];

  return (
    <div className="app">
      <main>
        {(tab === "today" || tab === "meds") && viewing}

        <section className="view" hidden={tab !== "today"}>
          {needsPatient ? noPatient : (
            <Today meds={meds} log={log} tz={tz} onAct={act} banner={canAskNotify && (
              <div className="banner">
                <span>Get a notification when a dose is due.</span>
                <button className="btn small"
                  onClick={() => Notification.requestPermission().finally(() => setCanAskNotify(notifyAvailable()))}>
                  Turn on
                </button>
              </div>
            )} />
          )}
        </section>

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

      <nav>
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      {form && (
        <MedForm key={form.med?.id ?? "new"} med={form.med} onSave={saveMedicine}
          onDelete={removeMedicine} onClose={() => setForm(null)} />
      )}

      <div className={`toast${toastOn ? " on" : ""}`} role="status">{toastMsg}</div>
    </div>
  );
}
