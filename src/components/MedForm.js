"use client";
import { useEffect, useRef, useState } from "react";
import { DAY_NAMES } from "@/lib/client/time";

let nextId = 0;
const row = (value) => ({ id: ++nextId, value });

// Rendered only while open; mounting opens the native <dialog>, closing unmounts it.
export default function MedForm({ med, onSave, onDelete, onClose }) {
  const dialog = useRef(null);
  const nameInput = useRef(null);
  const [name, setName] = useState(med?.name ?? "");
  const [dose, setDose] = useState(med?.dose ?? "");
  const [notes, setNotes] = useState(med?.notes ?? "");
  const [times, setTimes] = useState(() => (med?.times ?? ["08:00"]).map(row));
  const [days, setDays] = useState(med?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d.open) d.showModal();
    if (!med) nameInput.current?.focus();
  }, [med]);

  const setTime = (id, value) => setTimes((ts) => ts.map((t) => (t.id === id ? { ...t, value } : t)));
  const removeTime = (id) => setTimes((ts) => (ts.length > 1 ? ts.filter((t) => t.id !== id) : ts));
  const toggleDay = (i) => setDays((ds) => (ds.includes(i) ? ds.filter((d) => d !== i) : [...ds, i].sort()));

  async function submit(e) {
    e.preventDefault();
    const data = {
      name: name.trim(),
      dose: dose.trim(),
      notes: notes.trim(),
      times: times.map((t) => t.value).filter(Boolean),
      days,
    };
    if (!data.name) return setError("Enter the medicine name.");
    if (!data.times.length) return setError("Add at least one time.");
    if (!data.days.length) return setError("Pick at least one day.");

    setSaving(true);
    try {
      await onSave(med?.id ?? null, data);
      dialog.current.close();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${med.name}? Its history is removed too.`)) return;
    try {
      await onDelete(med);
      dialog.current.close();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <dialog ref={dialog} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <h2>{med ? "Edit medicine" : "Add medicine"}</h2>

        <label>Name
          <input ref={nameInput} value={name} onChange={(e) => setName(e.target.value)}
            maxLength={40} placeholder="e.g. Vitamin D" autoComplete="off" required />
        </label>

        <label>Dose
          <input value={dose} onChange={(e) => setDose(e.target.value)}
            maxLength={30} placeholder="e.g. 1 tablet, 5 ml" autoComplete="off" />
        </label>

        <fieldset>
          <legend>Times</legend>
          <div>
            {times.map((t) => (
              <div className="time-row" key={t.id}>
                <input type="time" value={t.value} required aria-label="Reminder time"
                  onChange={(e) => setTime(t.id, e.target.value)} />
                <button type="button" aria-label="Remove time" onClick={() => removeTime(t.id)}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="link" onClick={() => setTimes((ts) => [...ts, row("12:00")])}>
            + Add another time
          </button>
        </fieldset>

        <fieldset>
          <legend>Days</legend>
          <div className="days">
            {DAY_NAMES.map((n, i) => (
              <label key={n} title={n}>
                <input type="checkbox" value={i} checked={days.includes(i)} onChange={() => toggleDay(i)} />
                <span>{n[0]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>Note <span className="muted">(optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            maxLength={200} placeholder="e.g. With food" autoComplete="off" />
        </label>

        <p className="error" role="alert">{error}</p>

        <div className="actions">
          {med && <button type="button" className="btn danger" onClick={remove}>Delete</button>}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={() => dialog.current.close()}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>Save</button>
        </div>
      </form>
    </dialog>
  );
}
