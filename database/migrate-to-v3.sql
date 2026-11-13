-- Upgrade a database created from the OLD schema (medicines.amt/unit/time,
-- dose_logs early/on_time/late + offset_minutes) to the current one, keeping data.
-- Run once in the Supabase SQL editor. It is a single transaction: any error rolls back.
BEGIN;

-- ---- medicines: amt + unit -> dose, time -> times[], plus days / notes ------
ALTER TABLE medicines ADD COLUMN dose  TEXT       NOT NULL DEFAULT '1 tablet';
ALTER TABLE medicines ADD COLUMN times TEXT[];
ALTER TABLE medicines ADD COLUMN days  SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}';
ALTER TABLE medicines ADD COLUMN notes TEXT       NOT NULL DEFAULT '';

UPDATE medicines SET dose = amt || ' ' || lower(unit), times = ARRAY["time"];

ALTER TABLE medicines ALTER COLUMN times SET NOT NULL;
ALTER TABLE medicines ADD CHECK (cardinality(times) BETWEEN 1 AND 12);
ALTER TABLE medicines ADD CHECK (cardinality(days)  BETWEEN 1 AND 7);
ALTER TABLE medicines ADD CHECK (days <@ ARRAY[0,1,2,3,4,5,6]::smallint[]);

-- The API doesn't set an owner yet, so patient_id must allow NULL for now.
ALTER TABLE medicines ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE medicines
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz,
  ALTER COLUMN created_at SET DEFAULT now();

-- ---- dose_logs: slot, taken/skipped, logged_at, real DATE -------------------
ALTER TABLE dose_logs ADD COLUMN slot TEXT;
UPDATE dose_logs d SET slot = m."time" FROM medicines m WHERE m.id = d.medicine_id;
ALTER TABLE dose_logs ALTER COLUMN slot SET NOT NULL;
ALTER TABLE dose_logs ADD CHECK (slot ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- early / on_time / late were all "taken"; the new model only has taken / skipped.
ALTER TABLE dose_logs DROP CONSTRAINT IF EXISTS dose_logs_status_check;
UPDATE dose_logs SET status = 'taken';
ALTER TABLE dose_logs ALTER COLUMN status DROP DEFAULT;
ALTER TABLE dose_logs ADD CONSTRAINT dose_logs_status_check CHECK (status IN ('taken', 'skipped'));

ALTER TABLE dose_logs DROP COLUMN offset_minutes;
ALTER TABLE dose_logs RENAME COLUMN taken_at TO logged_at;
ALTER TABLE dose_logs
  ALTER COLUMN logged_at DROP DEFAULT,
  ALTER COLUMN logged_at TYPE TIMESTAMPTZ USING logged_at::timestamptz,
  ALTER COLUMN logged_at SET DEFAULT now();

ALTER TABLE dose_logs ALTER COLUMN date TYPE DATE USING date::date;

-- Keep only the newest log per (medicine, date, slot) so the unique key can be added.
DELETE FROM dose_logs a USING dose_logs b
 WHERE a.medicine_id = b.medicine_id AND a.date = b.date AND a.slot = b.slot
   AND (a.logged_at, a.id) < (b.logged_at, b.id);

ALTER TABLE dose_logs ADD UNIQUE (medicine_id, date, slot);
CREATE INDEX IF NOT EXISTS idx_dose_logs_date ON dose_logs (date);

ALTER TABLE medicines DROP COLUMN amt, DROP COLUMN unit, DROP COLUMN "time", DROP COLUMN updated_at;

-- ---- foreign keys: deleting a parent removes its children ------------------
ALTER TABLE dose_logs DROP CONSTRAINT dose_logs_medicine_id_fkey;
ALTER TABLE dose_logs ADD CONSTRAINT dose_logs_medicine_id_fkey
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE;

ALTER TABLE medicines DROP CONSTRAINT medicines_patient_id_fkey;
ALTER TABLE medicines ADD CONSTRAINT medicines_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE sessions DROP CONSTRAINT sessions_user_id_fkey;
ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE guardian_links DROP CONSTRAINT guardian_links_patient_id_fkey;
ALTER TABLE guardian_links ADD CONSTRAINT guardian_links_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE guardian_links DROP CONSTRAINT guardian_links_guardian_id_fkey;
ALTER TABLE guardian_links ADD CONSTRAINT guardian_links_guardian_id_fkey
  FOREIGN KEY (guardian_id) REFERENCES users(id) ON DELETE CASCADE;

-- ---- uniqueness, checks and indexes the old schema lacked ------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email       ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_invite_code ON users (invite_code) WHERE invite_code IS NOT NULL;
ALTER TABLE guardian_links ADD UNIQUE (patient_id, guardian_id);
ALTER TABLE guardian_links ADD CHECK (patient_id <> guardian_id);

CREATE INDEX IF NOT EXISTS idx_medicines_patient_id    ON medicines (patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id        ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at     ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_guardian_links_guardian ON guardian_links (guardian_id);

-- ---- RLS: API uses the service-role key; no policies blocks the anon key ----
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_logs      ENABLE ROW LEVEL SECURITY;

COMMIT;
