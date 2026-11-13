"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import AuthScreen from "./AuthScreen";
import Main from "./Main";

// Decides between the sign-in screen and the app.
export default function App() {
  const [status, setStatus] = useState({ loading: true, user: null, setup: false, signupOpen: true, error: "" });

  const refresh = useCallback(() => {
    setStatus((s) => ({ ...s, loading: true, error: "" }));
    api.me()
      .then((r) => setStatus({ loading: false, user: r.user, setup: !!r.setup, signupOpen: r.signupOpen !== false, error: "" }))
      .catch((e) => setStatus((s) => ({ ...s, loading: false, error: e.message || "Can't reach the server." })));
  }, []);

  useEffect(() => {
    api.onUnauthorized(() => setStatus((s) => ({ ...s, user: null, setup: false })));
    refresh();
  }, [refresh]);

  const setUser = (user) => setStatus((s) => ({ ...s, user, setup: false }));

  async function signOut() {
    try { await api.logout(); } catch { /* the session is dropped either way */ }
    setUser(null);
  }

  if (status.loading) return null;

  if (status.error)
    return (
      <div className="auth">
        <h1>MediReminder</h1>
        <p className="error" role="alert">{status.error}</p>
        <button className="btn" onClick={refresh}>Try again</button>
      </div>
    );

  if (!status.user)
    return <AuthScreen setup={status.setup} signupOpen={status.signupOpen} onAuthed={setUser} />;

  return <Main key={status.user.id} user={status.user} onUserChange={setUser} onSignOut={signOut} />;
}
