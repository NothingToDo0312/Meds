export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// CSRF guard for cookie auth: a state-changing request must come from this site.
function assertSameOrigin(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  let originHost;
  try { originHost = new URL(origin).host; } catch { originHost = null; }
  if (originHost !== host) throw new HttpError(403, "Cross-site request blocked.");
}

// Wraps a route handler: HttpErrors are returned as-is, anything else is a 500.
export const route = (handler) => async (req, ctx) => {
  try {
    assertSameOrigin(req);
    return await handler(req, ctx);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    return Response.json(
      { error: status === 500 ? "Something went wrong." : err.message },
      { status }
    );
  }
};

export const readJson = (req) => req.json().catch(() => ({}));

// supabase-js returns { data, error } instead of throwing; turn the error into an exception.
export function unwrap({ data, error }) {
  if (error) {
    const err = new Error(error.message || "Database error");
    err.code = error.code;
    throw err;
  }
  return data;
}

export const FOREIGN_KEY_VIOLATION = "23503";
export const UNIQUE_VIOLATION = "23505";
