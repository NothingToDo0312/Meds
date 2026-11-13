// The browser only talks to this app's own /api routes; no database keys here.
let unauthorizedHandler = () => {};
const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/password"];

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch("/api" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    // Session expired or revoked: send the user back to the sign-in screen.
    if (res.status === 401 && !AUTH_PATHS.includes(path)) unauthorizedHandler();
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

const q = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null)).toString();
  return s ? `?${s}` : "";
};

export const api = {
  onUnauthorized: (fn) => { unauthorizedHandler = fn; },

  // auth
  me: () => request("/auth/me"),
  login: (data) => request("/auth/login", { method: "POST", body: data }),
  register: (data) => request("/auth/register", { method: "POST", body: data }),
  logout: () => request("/auth/logout", { method: "POST" }),
  updateMe: (data) => request("/auth/me", { method: "PATCH", body: data }),
  changePassword: (data) => request("/auth/password", { method: "POST", body: data }),

  // medicines and doses (patientId is required for guardians and admins)
  listMeds: (patientId) => request(`/meds${q({ patientId })}`),
  createMed: (data) => request("/meds", { method: "POST", body: data }),
  updateMed: (id, data) => request(`/meds/${id}`, { method: "PUT", body: data }),
  deleteMed: (id) => request(`/meds/${id}`, { method: "DELETE" }),
  listDoses: (patientId, from) => request(`/doses${q({ patientId, from })}`),
  setDose: (body) => request("/doses", { method: "PUT", body }),

  // guardian links
  links: () => request("/links"),
  linkByCode: (inviteCode) => request("/links", { method: "POST", body: { inviteCode } }),
  createPatient: (data) => request("/links/patients", { method: "POST", body: data }),
  removeLink: (id) => request(`/links/${id}`, { method: "DELETE" }),
  regenerateCode: () => request("/links/regenerate", { method: "POST" }),

  // admin
  adminUsers: () => request("/admin/users"),
  adminCreateUser: (data) => request("/admin/users", { method: "POST", body: data }),
  adminUpdateUser: (id, data) => request(`/admin/users/${id}`, { method: "PATCH", body: data }),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: "DELETE" }),
  adminLinks: () => request("/admin/links"),
  adminAddLink: (patientId, guardianId) => request("/admin/links", { method: "POST", body: { patientId, guardianId } }),
};
