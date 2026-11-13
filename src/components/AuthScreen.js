"use client";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { deviceTimezone } from "@/lib/client/time";
import PasswordInput from "./PasswordInput";

export default function AuthScreen({ setup, signupOpen, onAuthed }) {
  const [mode, setMode] = useState(setup ? "register" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "patient", inviteCode: "", remember: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const registering = mode === "register";

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { user } = registering
        ? await api.register({ ...form, timezone: deviceTimezone() })
        : await api.login({ email: form.email, password: form.password, remember: form.remember });
      onAuthed(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <h1>MediReminder</h1>
      <p className="muted">
        {setup ? "Welcome. Create the admin account to get started." : registering ? "Create your account." : "Sign in to continue."}
      </p>

      <form onSubmit={submit} noValidate>
        {registering && (
          <label>Name
            <input value={form.name} onChange={set("name")} maxLength={60} autoComplete="name" required />
          </label>
        )}
        <label>Email
          <input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
        </label>
        <label>Password
          <PasswordInput value={form.password} onChange={set("password")}
            autoComplete={registering ? "new-password" : "current-password"} required />
        </label>
        {registering && <p className="muted hint">At least 8 characters.</p>}

        {registering && !setup && (
          <>
            <label>I am a
              <select value={form.role} onChange={set("role")}>
                <option value="patient">Patient (I take medicine)</option>
                <option value="guardian">Guardian (I look after someone)</option>
              </select>
            </label>
            {form.role === "guardian" && (
              <label>Patient's invite code <span className="muted">(optional, you can add it later)</span>
                <input value={form.inviteCode} onChange={set("inviteCode")} maxLength={20}
                  placeholder="e.g. K7M2PQ9X" autoComplete="off" />
              </label>
            )}
          </>
        )}

        <label className="check">
          <input type="checkbox" checked={form.remember} onChange={set("remember")} />
          Keep me signed in on this device
        </label>

        <p className="error" role="alert">{error}</p>
        <button className="btn wide" type="submit" disabled={busy}>
          {registering ? (setup ? "Create admin account" : "Create account") : "Sign in"}
        </button>
      </form>

      {!setup && (registering || signupOpen) && (
        <p className="switch muted">
          {registering ? "Already have an account? " : "New here? "}
          <button type="button" className="link" onClick={() => { setMode(registering ? "login" : "register"); setError(""); }}>
            {registering ? "Sign in" : "Create an account"}
          </button>
        </p>
      )}
      {!setup && !registering && !signupOpen && <p className="switch muted">Accounts are created by an admin.</p>}
    </div>
  );
}
