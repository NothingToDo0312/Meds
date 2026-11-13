"use client";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { deviceTimezone } from "@/lib/client/time";
import PasswordInput from "./PasswordInput";
import NotifySettings from "./NotifySettings";
import InstallButton from "./InstallButton";
import { useInstall } from "@/lib/client/install";

const ROLE_HELP = {
  patient: "You manage your own medicines. Share your invite code to let a guardian follow along.",
  guardian: "You can view and manage the medicines of your linked patients, and create accounts for patients.",
  admin: "You manage users and can view any patient's schedule.",
};

// Shown only when this browser can install the app and it isn't installed yet.
function InstallCard({ toast }) {
  const { available } = useInstall();
  if (!available) return null;
  return (
    <div className="card">
      <div className="row-between install-row">
        <div>
          <h3>Install MediReminder</h3>
          <p className="muted">Add it to your device for its own icon and window, and more reliable reminders.</p>
        </div>
        <InstallButton onDone={(o) => o === "accepted" && toast("MediReminder installed")} />
      </div>
    </div>
  );
}

function ChangePassword({ toast }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.changePassword({ current, next });
      setCurrent("");
      setNext("");
      toast("Password changed. Other devices were signed out.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h3>Change password</h3>
      <label>Current password
        <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </label>
      <label>New password <span className="muted">(8+ characters)</span>
        <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </label>
      <p className="error" role="alert">{error}</p>
      <button className="btn small" type="submit">Update password</button>
    </form>
  );
}

function PatientSection({ user, guardians, toast, onUserChange, onLinksChange }) {
  async function regenerate() {
    if (!confirm("Create a new invite code? The old one stops working. Guardians already linked stay linked.")) return;
    try {
      const { invite_code } = await api.regenerateCode();
      onUserChange({ ...user, invite_code });
      toast("New invite code created");
    } catch (e) { toast(e.message); }
  }

  async function remove(g) {
    if (!confirm(`Remove ${g.name}? They will no longer see your medicines.`)) return;
    try {
      await api.removeLink(g.linkId);
      await onLinksChange();
      toast(`${g.name} removed`);
    } catch (e) { toast(e.message); }
  }

  return (
    <>
      <div className="card">
        <h3>Invite code</h3>
        <p className="muted">Give this to a guardian so they can follow your medicines.</p>
        <p className="code" aria-label="Invite code">{user.invite_code}</p>
        <button className="link" onClick={regenerate}>Create a new code</button>
      </div>

      <div className="card">
        <h3>Your guardians</h3>
        {guardians.length ? guardians.map((g) => (
          <div className="person" key={g.linkId}>
            <div className="info"><div className="name">{g.name}</div><div className="muted">{g.email}</div></div>
            <button className="link" onClick={() => remove(g)}>Remove</button>
          </div>
        )) : <p className="muted">No guardians linked yet.</p>}
      </div>
    </>
  );
}

function CreatePatient({ toast, onLinksChange }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { patient } = await api.createPatient({ name, email, password, timezone: deviceTimezone() });
      setName(""); setEmail(""); setPassword(""); setOpen(false);
      await onLinksChange();
      toast(`Account created for ${patient.name}. Share the email and password with them.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <div className="card">
        <h3>Create a patient account</h3>
        <p className="muted">Set up an account for someone who can't do it themselves. You are linked to them automatically.</p>
        <button className="btn small" onClick={() => setOpen(true)}>Create account</button>
      </div>
    );

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h3>Create a patient account</h3>
      <label>Patient's name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" />
      </label>
      <label>Patient's email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
      </label>
      <label>Password <span className="muted">(8+ characters)</span>
        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
      </label>
      <p className="muted">They can sign in with this email and password and change it under Account.</p>
      <p className="error" role="alert">{error}</p>
      <button className="btn small" type="submit" disabled={busy}>{busy ? "Creating..." : "Create and link"}</button>{" "}
      <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}

function GuardianSection({ patients, toast, onLinksChange }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function link(e) {
    e.preventDefault();
    setError("");
    try {
      const { patient } = await api.linkByCode(code);
      setCode("");
      await onLinksChange();
      toast(`Linked to ${patient.name}`);
    } catch (err) { setError(err.message); }
  }

  async function unlink(p) {
    if (!confirm(`Stop following ${p.name}?`)) return;
    try {
      await api.removeLink(p.linkId);
      await onLinksChange();
      toast(`Unlinked from ${p.name}`);
    } catch (e) { toast(e.message); }
  }

  return (
    <>
      <CreatePatient toast={toast} onLinksChange={onLinksChange} />

      <form className="card" onSubmit={link} noValidate>
        <h3>Link to an existing patient</h3>
        <label>Invite code
          <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} placeholder="e.g. K7M2PQ9X" autoComplete="off" />
        </label>
        <p className="error" role="alert">{error}</p>
        <button className="btn small" type="submit">Link</button>
      </form>

      <div className="card">
        <h3>Your patients</h3>
        {patients.length ? patients.map((p) => (
          <div className="person" key={p.id}>
            <div className="info"><div className="name">{p.name}</div><div className="muted">{p.timezone}</div></div>
            <button className="link" onClick={() => unlink(p)}>Unlink</button>
          </div>
        )) : <p className="muted">Not linked to anyone yet.</p>}
      </div>
    </>
  );
}

export default function Account({ user, guardians, patients, toast, onUserChange, onSignOut, onLinksChange }) {
  const device = deviceTimezone();

  async function useDeviceTimezone() {
    try {
      const { user: updated } = await api.updateMe({ timezone: device });
      onUserChange(updated);
      toast("Timezone updated");
    } catch (e) { toast(e.message); }
  }

  return (
    <>
      <header className="page-head"><div><h1>Account</h1><p className="muted">Your profile, links and security.</p></div></header>

      <div className="card">
        <div className="profile">
          <span className="avatar lg" aria-hidden="true">{(user.name || "?").trim().charAt(0).toUpperCase()}</span>
          <div className="info"><div className="name">{user.name}</div><div className="muted">{user.email}</div></div>
          <span className="chip">{user.role}</span>
        </div>
        <p className="muted help">{ROLE_HELP[user.role]}</p>
        <p className="muted">Timezone: {user.timezone}</p>
        {user.timezone !== device && (
          <button className="link" onClick={useDeviceTimezone}>Use this device's timezone ({device})</button>
        )}
      </div>

      {user.role === "patient" && (
        <PatientSection user={user} guardians={guardians} toast={toast} onUserChange={onUserChange} onLinksChange={onLinksChange} />
      )}
      {user.role === "guardian" && <GuardianSection patients={patients} toast={toast} onLinksChange={onLinksChange} />}

      <InstallCard toast={toast} />
      {user.role === "patient" && <NotifySettings toast={toast} />}

      <ChangePassword toast={toast} />
      <button className="btn ghost wide" onClick={onSignOut}>Sign out</button>
    </>
  );
}
