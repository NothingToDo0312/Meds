"use client";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { deviceTimezone } from "@/lib/client/time";
import PasswordInput from "./PasswordInput";
import ThemeToggle from "./ThemeToggle";
import { Pill, Bell, Check } from "./Icons";

export default function AuthScreen({ setup, signupOpen, onAuthed }) {
  const [mode, setMode] = useState(setup ? "register" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "patient", inviteCode: "", remember: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false); // shows how to get a password reset (an admin resets it)
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

  const title = setup ? "Welcome" : registering ? "Create your account" : "Welcome back";
  const subtitle = setup ? "Create the admin account to get started." : registering ? "A few details and you're in." : "Sign in to continue.";

  return (
    <div className="login">
      {/* Left: what the app does (decorative sample card) */}
      <aside className="login-hero">
        <div className="login-brand">
          <span className="login-logo"><Pill width={20} height={20} /></span>
          <span>MediReminder</span>
        </div>

        <div className="login-pitch">
          <h2>Take the right dose, right on time.</h2>
          <p>Reminders for every medicine, refill alerts, and a simple history of what you've taken.</p>
          <div className="login-sample" aria-hidden="true">
            <span className="sample-bell"><Bell width={18} height={18} /></span>
            <span className="sample-info"><b>Metformin 500 mg</b><span>6:00 PM · with dinner</span></span>
            <span className="sample-taken"><Check width={14} height={14} /> Taken</span>
          </div>
        </div>

        <div className="login-foot">Your medicines, always on schedule.</div>
      </aside>

      {/* Right: the form */}
      <section className="login-panel">
        <ThemeToggle />
        <div className="login-box">
          <h1>{title}</h1>
          <p className="muted login-sub">{subtitle}</p>

          <form onSubmit={submit} noValidate>
            {registering && (
              <label>Name
                <input value={form.name} onChange={set("name")} maxLength={60} autoComplete="name" required />
              </label>
            )}
            <label>Email
              <input type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" required />
            </label>
            <label>
              <span className="label-row">
                <span>Password</span>
                {!registering && <button type="button" className="link small" onClick={() => setForgot((v) => !v)}>Forgot password?</button>}
              </span>
              <PasswordInput value={form.password} onChange={set("password")} placeholder="Your password"
                autoComplete={registering ? "new-password" : "current-password"} required />
            </label>
            {forgot && !registering && <p className="muted hint forgot">Ask your admin to reset your password. You can change it afterwards in Account.</p>}
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
              <button type="button" className="link" onClick={() => { setMode(registering ? "login" : "register"); setError(""); setForgot(false); }}>
                {registering ? "Sign in" : "Create an account"}
              </button>
            </p>
          )}
          {!setup && !registering && !signupOpen && <p className="switch muted">Accounts are created by an admin.</p>}
        </div>
      </section>
    </div>
  );
}
