"use client";
import { slotsFor } from "@/lib/client/schedule";
import { fmtTime, toMin, nowMin, todayLabel } from "@/lib/client/time";
import { Bell, Check, Minus } from "./Icons";

const detail = (med) => [med.dose, med.notes].filter(Boolean).join(" · ");

function PendingRow({ med, slot, due, onAct }) {
  return (
    <div className={`dose${due ? " is-due" : ""}`}>
      <span className="dose-icon"><Bell width={18} height={18} /></span>
      <div className="dose-info">
        <b>{med.name}</b>
        <span>{fmtTime(slot)} · {detail(med)}</span>
      </div>
      <div className="dose-actions">
        <button className="btn ghost small" onClick={() => onAct(med, slot, "skipped", "Skipped")}>Skip</button>
        <button className="btn small" onClick={() => onAct(med, slot, "taken", "Marked as taken")}>
          <Check width={14} height={14} /> Taken
        </button>
      </div>
    </div>
  );
}

function DoneRow({ med, slot, status, onAct }) {
  const taken = status === "taken";
  return (
    <div className={`dose done ${status}`}>
      <span className="dose-icon">{taken ? <Check width={18} height={18} /> : <Minus width={18} height={18} />}</span>
      <div className="dose-info">
        <b>{med.name}</b>
        <span>{fmtTime(slot)} · {taken ? "Taken" : "Skipped"}</span>
      </div>
      <button className="link" onClick={() => onAct(med, slot, null)}>Undo</button>
    </div>
  );
}

function Group({ title, cls = "", count, children }) {
  if (!count) return null;
  return (
    <section className="group">
      <h2 className={`group-title ${cls}`}>{title} <span className="group-count">{count}</span></h2>
      {children}
    </section>
  );
}

export default function Today({ meds, log, tz, name, onAct, banner }) {
  const now = nowMin(tz);
  const greet = now < 12 * 60 ? "Good morning" : now < 18 * 60 ? "Good afternoon" : "Good evening";

  const slots = slotsFor(meds, log, tz);
  const done = slots.filter((s) => s.status);
  const pending = slots.filter((s) => !s.status);
  const due = pending.filter((s) => toMin(s.slot) <= now);
  const later = pending.filter((s) => toMin(s.slot) > now);
  const key = (s) => `${s.med.id}@${s.slot}`;
  const next = due[0] ?? later[0];
  const pct = slots.length ? Math.round((done.length / slots.length) * 100) : 0;

  return (
    <>
      <header className="hero-card">
        <div className="hero-top">
          <div>
            <p className="hero-date">{todayLabel(tz)}</p>
            <h1>{greet}{name ? `, ${name}` : ""}</h1>
          </div>
          {slots.length > 0 && <span className="hero-pct">{pct}%</span>}
        </div>
        <div className="progress" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <p className="hero-sub">
          {slots.length
            ? pending.length
              ? `${done.length} of ${slots.length} doses done${next ? ` · ${due.length ? "Due now" : "Next"}: ${next.med.name} at ${fmtTime(next.slot)}` : ""}`
              : `All ${slots.length} doses done. Nicely on schedule.`
            : "No doses scheduled today."}
        </p>
      </header>

      {banner}

      {slots.length ? (
        <>
          <Group title="Due now" cls="due" count={due.length}>
            {due.map((s) => <PendingRow key={key(s)} {...s} due onAct={onAct} />)}
          </Group>
          <Group title="Later today" count={later.length}>
            {later.map((s) => <PendingRow key={key(s)} {...s} onAct={onAct} />)}
          </Group>
          <Group title="Done" count={done.length}>
            {done.map((s) => <DoneRow key={key(s)} {...s} onAct={onAct} />)}
          </Group>
        </>
      ) : (
        <p className="empty">Nothing scheduled today. Add a medicine in the Medicines tab.</p>
      )}
    </>
  );
}
