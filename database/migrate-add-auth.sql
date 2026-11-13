-- Adds the 'admin' role and makes every medicine belong to a patient.
-- Run once, after migrate-to-v3.sql (or on any v3 database). Safe to re-run.
BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'patient', 'guardian'));

-- Patients need an invite code so guardians can link to them.
-- (The app generates codes for new patients; this fills any that are missing.)
UPDATE users
   SET invite_code = upper(substr(md5(random()::text || id::text), 1, 8))
 WHERE role = 'patient' AND invite_code IS NULL;

-- Medicines created before logins existed have no owner. Make patient_id
-- required only once none are left; otherwise print how to assign them.
DO $$
DECLARE orphans integer;
BEGIN
  SELECT count(*) INTO orphans FROM medicines WHERE patient_id IS NULL;
  IF orphans = 0 THEN
    ALTER TABLE medicines ALTER COLUMN patient_id SET NOT NULL;
  ELSE
    RAISE NOTICE '% medicine(s) have no owner. Assign them, then re-run this file:', orphans;
    RAISE NOTICE '  UPDATE medicines SET patient_id = <patient user id> WHERE patient_id IS NULL;';
  END IF;
END $$;

COMMIT;
