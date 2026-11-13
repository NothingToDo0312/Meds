"use client";
import { useState } from "react";
import { slotsOn, summarize, dayTone } from "@/lib/client/schedule";
import { DAY_NAMES, dateKey, fmtTime, longDate, nowMin } from "@/lib/client/time";
import { Check, ChevronLeft, ChevronRight, Minus, Pill, X } from "./Icons";

const pad = (n) => String(n).padStart(2, "0");
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthTitle = (y, m) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
const MAX_DOTS = 6;

const STATE_LABEL = { taken: "Taken", skipped: "Skipped", missed: "Missed", upcoming: "Upcoming" };
const STATE_ICON = { taken: Check, skipped: Minus, missed: X, upcoming: null };

// Month view of the viewed patient's dose history. `loadedFrom` is the first day the app has history for.
export default function Calendar({ meds, log, tz, loadedFrom }) {
  const today = dateKey(tz);
  const now = nowMin(tz);
  const [ty, tm] = today.split("-").map(Number);
  const [view, setView] = useState({ y: ty, m: tm - 1 });
  const [sel, setSel] = useState(today);

  const { y, m } = view;
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const isCurrent = y === ty && m === tm - 1;
  const prevEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const canPrev = prevEnd >= loadedFrom;

  function go(delta) {
    const d = new Date(Date.UTC(y, m + delta, 1));
    const next = { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    setView(next);
    setSel(next.y === ty && next.m === tm - 1 ? today : keyOf(next.y, next.m, 1));
  }

  // One entry per day of the month, plus the month's totals.
  const totals = { taken: 0, skipped: 0, missed: 0 };
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const key = keyOf(y, m, i + 1);
    const hasData = key >= loadedFrom;
    const sum = summarize(hasData ? slotsOn(meds, log, key, tz) : [], today, now);
    if (key <= today) {
      totals.taken += sum.taken;
      totals.skipped += sum.skipped;
      totals.missed += sum.missed;
    }
    return { key, n: i + 1, hasData, sum, tone: dayTone(sum, key, today) };
  });
  const due = totals.taken + totals.skipped + totals.missed;
  const rate = due ? Math.round((totals.taken / due) * 100) : null;

  const selSlots = sel >= loadedFrom ? slotsOn(meds, log, sel, tz) : [];
  const selSum = summarize(selSlots, today, now);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Calendar</h1>
          <p className="muted">Every dose, day by day.</p>
        </div>
      </header>

      <div className="stats">
        <div className="stat"><span className="stat-num">{rate === null ? "–" : `${rate}%`}</span><span className="stat-label">Adherence</span></div>
        <div className="stat good"><span className="stat-num">{totals.taken}</span><span className="stat-label">Taken</span></div>
        <div className="stat warn"><span className="stat-num">{totals.skipped}</span><span className="stat-label">Skipped</span></div>
        <div className="stat bad"><span className="stat-num">{totals.missed}</span><span className="stat-label">Missed</span></div>
      </div>

      <div className="cal-layout">
        <section className="panel cal" aria-label={`Calendar for ${monthTitle(y, m)}`}>
          <div className="cal-head">
            <h2>{monthTitle(y, m)}</h2>
            <div className="cal-nav">
              <button type="button" className="icon-btn" onClick={() => go(-1)} disabled={!canPrev} aria-label="Previous month"><ChevronLeft width={18} height={18} /></button>
              <button type="button" className="icon-btn" onClick={() => go(1)} disabled={isCurrent} aria-label="Next month"><ChevronRight width={18} height={18} /></button>
            </div>
          </div>

          <div className="cal-grid cal-weekdays" aria-hidden="true">
            {DAY_NAMES.map((n) => <span key={n}>{n}</span>)}
          </div>

          <div className="cal-grid">
            {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} className="cal-blank" />)}
            {days.map(({ key, n, hasData, sum, tone }) => {
              const shown = key > today ? [] : sum.states.slice(0, MAX_DOTS);
              const label = !sum.total
                ? `${longDate(key)}: nothing scheduled`
                : `${longDate(key)}: ${sum.taken} of ${sum.total} taken`;
              return (
                <button key={key} type="button" disabled={!hasData || key > today}
                  className={`cal-day tone-${tone}${key === today ? " today" : ""}${key === sel ? " sel" : ""}`}
                  onClick={() => setSel(key)} aria-label={label} aria-pressed={key === sel}>
                  <span className="cal-n">{n}</span>
                  {shown.length > 0 && (
                    <span className="cal-dots" aria-hidden="true">
                      {shown.map((s, i) => <i key={i} className={s} />)}
                      {sum.states.length > MAX_DOTS && <em>+{sum.states.length - MAX_DOTS}</em>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <ul className="legend" aria-label="Legend">
            <li><i className="dot taken" /> Taken</li>
            <li><i className="dot skipped" /> Skipped</li>
            <li><i className="dot missed" /> Missed</li>
            <li><i className="dot upcoming" /> Upcoming</li>
          </ul>
        </section>

        <aside className="panel day-detail" aria-live="polite">
          <p className="eyebrow">{sel === today ? "Today" : "Selected day"}</p>
          <h2>{longDate(sel)}</h2>
          {sel < loadedFrom ? (
            <p className="muted day-empty">No history is loaded for this day.</p>
          ) : selSlots.length ? (
            <>
              <p className="muted day-sum">{selSum.taken} of {selSum.total} doses taken</p>
              <ul className="day-list">
                {selSlots.map((s, i) => {
                  const st = selSum.states[i];
                  const Icon = STATE_ICON[st];
                  return (
                    <li key={`${s.med.id}@${s.slot}`} className={`day-row ${st}`}>
                      <span className="dose-icon"><Pill width={18} height={18} /></span>
                      <span className="dose-info">
                        <b>{s.med.name}</b>
                        <span>{fmtTime(s.slot)} · {s.med.dose}</span>
                      </span>
                      <span className={`badge ${st}`}>{Icon && <Icon width={12} height={12} strokeWidth={3} />}{STATE_LABEL[st]}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="muted day-empty">Nothing scheduled this day.</p>
          )}
        </aside>
      </div>
    </>
  );
}
