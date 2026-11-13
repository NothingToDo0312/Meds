"use client";
import { weekDots, weekAdherence } from "@/lib/client/schedule";
import { fmtTime, fmtDays, DAY_NAMES } from "@/lib/client/time";
import { ChevronRight, Pill, Plus } from "./Icons";

export default function Meds({ meds, log, tz, onEdit, onAdd }) {
  const { due, taken } = weekAdherence(meds, log, tz);
  const sorted = [...meds].sort((a, b) => a.times[0].localeCompare(b.times[0]));

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Medicines</h1>
          <p className="muted">
            {due ? `${Math.round((taken / due) * 100)}% taken this week (${taken} of ${due})` : `${meds.length} ${meds.length === 1 ? "medicine" : "medicines"}`}
          </p>
        </div>
        <button className="btn" onClick={onAdd}><Plus width={16} height={16} /> Add medicine</button>
      </header>

      {sorted.length ? (
        <div className="med-list">
          {sorted.map((med) => (
            <button key={med.id} className="med-card" onClick={() => onEdit(med)} aria-label={`Edit ${med.name}`}>
              <span className="dose-icon"><Pill width={18} height={18} /></span>
              <span className="med-main">
                <b>{med.name}</b>
                <span className="muted">{`${med.dose} · ${med.times.map(fmtTime).join(", ")}`}</span>
                <span className="daychips" title={fmtDays(med.days)} aria-label={fmtDays(med.days)}>
                  {DAY_NAMES.map((n, i) => <i key={n} className={med.days.includes(i) ? "on" : ""}>{n[0]}</i>)}
                </span>
              </span>
              <span className="med-side" aria-hidden="true">
                <span className="dots">{weekDots(log, med, tz).map((s, i) => <i key={i} className={s} />)}</span>
                <small>Last 7 days</small>
              </span>
              <ChevronRight width={18} height={18} className="chev" />
            </button>
          ))}
        </div>
      ) : (
        <p className="empty">No medicines yet. Add your first one to start getting reminders.</p>
      )}
    </>
  );
}
