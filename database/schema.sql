-- MediReminder schema (v3 + accounts with admin / patient / guardian roles).
-- Run in the Supabase SQL editor on an EMPTY database.
--   Have the older schema (amt/unit/time columns)?  Run migrate-to-v3.sql, then migrate-add-auth.sql.
--   Already on v3 without the admin role?           Run migrate-add-auth.sql only.
-- The first account created in the app becomes the admin.

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'patient', 'guardian')),
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  invite_code   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email       ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_invite_code ON users (invite_code) WHERE invite_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  remember     BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS guardian_links (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guardian_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, guardian_id),
  CHECK (patient_id <> guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_guardian_links_guardian ON guardian_links (guardian_id);

-- ---------------------------------------------------------------------------
-- Medicines and dose history (what the API reads and writes today)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicines (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT       NOT NULL,
  dose       TEXT       NOT NULL DEFAULT '1 tablet',          -- free text: "1 tablet", "5 ml"
  times      TEXT[]     NOT NULL,                             -- {'08:00','20:00'}
  days       SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',   -- 0 = Sunday
  notes      TEXT       NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- owner (a user with role 'patient')
  CHECK (cardinality(times) BETWEEN 1 AND 12),
  CHECK (cardinality(days)  BETWEEN 1 AND 7),
  CHECK (days <@ ARRAY[0,1,2,3,4,5,6]::smallint[])
);

CREATE INDEX IF NOT EXISTS idx_medicines_patient_id ON medicines (patient_id);

-- One row per scheduled dose that was acted on. No row = still pending.
CREATE TABLE IF NOT EXISTS dose_logs (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  date        DATE    NOT NULL,                               -- user's local day
  slot        TEXT    NOT NULL CHECK (slot ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),  -- scheduled HH:MM
  status      TEXT    NOT NULL CHECK (status IN ('taken', 'skipped')),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medicine_id, date, slot)                            -- required by the API's upsert
);

CREATE INDEX IF NOT EXISTS idx_dose_logs_date ON dose_logs (date);

-- ---------------------------------------------------------------------------
-- The API uses the service-role key (bypasses RLS). RLS with no policies
-- blocks direct access with the public anon key.
-- ---------------------------------------------------------------------------
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_logs      ENABLE ROW LEVEL SECURITY;
