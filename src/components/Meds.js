"use client";
import { weekDots, weekAdherence } from "@/lib/client/schedule";
import { fmtTime, fmtDays } from "@/lib/client/time";

export default function Meds({ meds, log, tz, onEdit, onAdd }) {
  const { due, taken } = weekAdherence(meds, log, tz);
  const sorted = [...meds].sort((a, b) => a.times[0].localeCompare(b.times[0]));

  return (
    <>
      <header className="row-between">
        <div>
          <h1>Medicines</h1>
          <p className="muted">
            {due ? `${Math.round((taken / due) * 100)}% taken this week (${taken} of ${due})` : ""}
          </p>
        </div>
        <button className="btn" onClick={onAdd}>Add</button>
      </header>

      {sorted.length ? (
        sorted.map((med) => (
          <button key={med.id} className="item" onClick={() => onEdit(med)} aria-label={`Edit ${med.name}`}>
            <div className="info">
              <div className="name">{med.name}</div>
              <div className="muted">{`${med.dose} · ${med.times.map(fmtTime).join(", ")}`}</div>
              <div className="muted">{fmtDays(med.days)}</div>
              <div className="dots" aria-hidden="true">
                {weekDots(log, med, tz).map((s, i) => <i key={i} className={s} />)}
              </div>
            </div>
          </button>
        ))
      ) : (
        <p className="empty">No medicines yet.</p>
      )}
    </>
  );
}
