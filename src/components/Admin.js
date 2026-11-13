"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { deviceTimezone } from "@/lib/client/time";

const ROLES = ["admin", "patient", "guardian"];

function NewUser({ onCreated, toast }) {
  const [f, setF] = useState({ name: "", email: "", password: "", role: "patient" });
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.adminCreateUser({ ...f, timezone: deviceTimezone() });
      setF({ name: "", email: "", password: "", role: f.role });
      toast("User created");
      onCreated();
    } catch (err) { setError(err.message); }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h3>Add a user</h3>
      <label>Name<input value={f.name} onChange={set("name")} maxLength={60} /></label>
      <label>Email<input type="email" value={f.email} onChange={set("email")} autoComplete="off" /></label>
      <label>Password <span className="muted">(8+ characters)</span>
        <input type="password" value={f.password} onChange={set("password")} autoComplete="new-password" />
      </label>
      <label>Role
        <select value={f.role} onChange={set("role")}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
      </label>
      <p className="error" role="alert">{error}</p>
      <button className="btn small" type="submit">Create user</button>
    </form>
  );
}

function Links({ users, links, reload, toast }) {
  const patients = users.filter((u) => u.role === "patient");
  const guardians = users.filter((u) => u.role === "guardian");
  const [patientId, setPatientId] = useState("");
  const [guardianId, setGuardianId] = useState("");

  async function add(e) {
    e.preventDefault();
    try {
      await api.adminAddLink(Number(patientId), Number(guardianId));
      toast("Linked");
      reload();
    } catch (err) { toast(err.message); }
  }

  async function remove(l) {
    try {
      await api.removeLink(l.id);
      toast("Link removed");
      reload();
    } catch (err) { toast(err.message); }
  }

  return (
    <div className="card">
      <h3>Guardian links</h3>
      {links.length ? links.map((l) => (
        <div className="person" key={l.id}>
          <div className="info"><div className="name">{l.guardianName}</div><div className="muted">looks after {l.patientName}</div></div>
          <button className="link" onClick={() => remove(l)}>Remove</button>
        </div>
      )) : <p className="muted">No links yet.</p>}

      <form className="row link-form" onSubmit={add}>
        <select aria-label="Guardian" value={guardianId} onChange={(e) => setGuardianId(e.target.value)} required>
          <option value="">Guardian…</option>
          {guardians.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select aria-label="Patient" value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
          <option value="">Patient…</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn small" type="submit" disabled={!patientId || !guardianId}>Link</button>
      </form>
    </div>
  );
}

export default function Admin({ me, toast, onChanged }) {
  const [users, setUsers] = useState([]);
  const [links, setLinks] = useState([]);

  const reload = useCallback(async () => {
    try {
      const [u, l] = await Promise.all([api.adminUsers(), api.adminLinks()]);
      setUsers(u);
      setLinks(l);
      onChanged?.(); // the patient list used by the Today / Medicines tabs may have changed
    } catch (e) { toast(e.message); }
  }, [toast, onChanged]);

  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function changeRole(u, role) {
    try {
      await api.adminUpdateUser(u.id, { role });
      toast(`${u.name} is now ${role}`);
    } catch (e) { toast(e.message); }
    reload();
  }

  async function resetPassword(u) {
    const password = prompt(`New password for ${u.name} (8+ characters):`);
    if (!password) return;
    try {
      await api.adminUpdateUser(u.id, { password });
      toast("Password reset. They were signed out everywhere.");
    } catch (e) { toast(e.message); }
  }

  async function remove(u) {
    if (!confirm(`Delete ${u.name}? Their medicines and history are deleted too.`)) return;
    try {
      await api.adminDeleteUser(u.id);
      toast(`${u.name} deleted`);
    } catch (e) { toast(e.message); }
    reload();
  }

  return (
    <>
      <header><h1>Admin</h1><p className="muted">{users.length} users</p></header>

      <div className="group-title">Users</div>
      {users.map((u) => (
        <div className="card user" key={u.id}>
          <div className="row-between">
            <div className="info"><div className="name">{u.name}{u.id === me.id && " (you)"}</div><div className="muted">{u.email}</div></div>
            <select aria-label={`Role for ${u.name}`} value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="row">
            <button className="link" onClick={() => resetPassword(u)}>Reset password</button>
            {u.id !== me.id && <button className="link danger-text" onClick={() => remove(u)}>Delete</button>}
          </div>
        </div>
      ))}

      <Links users={users} links={links} reload={reload} toast={toast} />
      <NewUser onCreated={reload} toast={toast} />
    </>
  );
}
