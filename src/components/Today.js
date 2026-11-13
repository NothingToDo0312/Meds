"use client";
import { slotsFor } from "@/lib/client/schedule";
import { fmtTime, toMin, nowMin, todayLabel } from "@/lib/client/time";

function PendingRow({ med, slot, onAct }) {
  return (
    <div className="item">
      <div className="time">{fmtTime(slot)}</div>
      <div className="info">
        <div className="name">{med.name}</div>
        <div className="muted">{[med.dose, med.notes].filter(Boolean).join(" · ")}</div>
      </div>
      <div className="btns">
        <button className="btn ghost small" onClick={() => onAct(med, slot, "skipped", "Skipped")}>Skip</button>
        <button className="btn small" onClick={() => onAct(med, slot, "taken", "Marked as taken")}>Take</button>
      </div>
    </div>
  );
}

function DoneRow({ med, slot, status, onAct }) {
  return (
    <div className={`item done ${status}`}>
      <div className="time">{fmtTime(slot)}</div>
      <div className="info">
        <div className="name">{med.name}</div>
        <div className="status">{status === "taken" ? "Taken" : "Skipped"}</div>
      </div>
      <button className="link" onClick={() => onAct(med, slot, null)}>Undo</button>
    </div>
  );
}

function Group({ title, cls = "", children, count }) {
  if (!count) return null;
  return (
    <>
      <div className={`group-title ${cls}`}>{title}</div>
      {children}
    </>
  );
}

export default function Today({ meds, log, tz, onAct, banner }) {
  const now = nowMin(tz);
  const greet = now < 12 * 60 ? "Good morning" : now < 18 * 60 ? "Good afternoon" : "Good evening";
  const date = todayLabel(tz);

  const slots = slotsFor(meds, log, tz);
  const done = slots.filter((s) => s.status);
  const pending = slots.filter((s) => !s.status);
  const due = pending.filter((s) => toMin(s.slot) <= now);
  const later = pending.filter((s) => toMin(s.slot) > now);
  const key = (s) => `${s.med.id}@${s.slot}`;

  return (
    <>
      <header>
        <h1>{greet}</h1>
        <p className="muted">{date}</p>
        <div className="progress" aria-hidden="true">
          <i style={{ width: slots.length ? `${(done.length / slots.length) * 100}%` : 0 }} />
        </div>
        <p className="muted">{slots.length ? `${done.length} of ${slots.length} doses done` : ""}</p>
      </header>

      {banner}

      {slots.length ? (
        <>
          <Group title="Due now" cls="due" count={due.length}>
            {due.map((s) => <PendingRow key={key(s)} {...s} onAct={onAct} />)}
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
